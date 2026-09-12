import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocket, WebSocketServer } from 'ws';
import {
  SIGNALING_CLOSE_CODES,
  clientMessageSchema,
  type ClientMessage,
  type IceServer,
  type ServerMessage,
  type SignalingErrorCode,
} from '@cigbuddy/shared';
import { logger } from '../logger.js';
import { RoomManager, type JoinResult } from './rooms.js';

export interface SignalingOptions {
  /** URL path the upgrade must target. */
  path?: string;
  /** Called per `joined` message so time-limited TURN credentials stay fresh. */
  iceServers?: () => IceServer[];
  /** When set, upgrades whose Origin is not listed are refused with 403. */
  allowedOrigins?: string[];
  /**
   * Open sockets allowed per client address before upgrades are refused with
   * 429. Two tabs are legitimate; dozens are someone filling waiting rooms
   * with ghosts. `Infinity` disables the cap.
   */
  maxConnectionsPerIp?: number;
  /** How a client address is derived; defaults to the socket peer. */
  clientIp?: (req: IncomingMessage) => string;
  /**
   * Ping interval. A peer that vanished without closing is reaped within two
   * intervals, which is how long a newcomer can be stuck facing a ghost.
   */
  heartbeatMs?: number;
  /** Length of one cigarette. Defaults to `CHAT_DURATION_MS`; tests shorten it. */
  chatDurationMs?: number;
}

export interface Signaling {
  close(): Promise<void>;
  roomCount(): number;
}

const MAX_INVALID_FRAMES = 3;
const MAX_PAYLOAD_BYTES = 64 * 1024;
const DEFAULT_MAX_CONNECTIONS_PER_IP = 8;
const DEFAULT_HEARTBEAT_MS = 15_000;

interface ConnState {
  isAlive: boolean;
  invalidFrames: number;
  ip: string;
}

/**
 * Attaches the room signaling WebSocket to an existing http.Server. Kept out of
 * `createApp()` so the Express app stays testable with supertest alone.
 */
export function attachSignaling(server: Server, options: SignalingOptions = {}): Signaling {
  const path = options.path ?? '/api/ws';
  const iceServers = options.iceServers ?? (() => []);
  const allowedOrigins = options.allowedOrigins;
  const maxConnectionsPerIp = options.maxConnectionsPerIp ?? DEFAULT_MAX_CONNECTIONS_PER_IP;
  const clientIp = options.clientIp ?? ((req) => req.socket.remoteAddress ?? 'unknown');
  const heartbeatMs = options.heartbeatMs ?? DEFAULT_HEARTBEAT_MS;
  const log = logger.child({ module: 'signaling' });

  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD_BYTES });
  const rooms = new RoomManager<WebSocket>({ durationMs: options.chatDurationMs });
  const states = new WeakMap<WebSocket, ConnState>();
  /** Open sockets per client address, for the connection cap. */
  const perIp = new Map<string, number>();
  /** One pending expiry per full room. `RoomManager` holds the deadline as data. */
  const timers = new Map<string, NodeJS.Timeout>();

  function onUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer) {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname !== path) {
      reject(socket, 404, 'Not Found');
      return;
    }

    if (allowedOrigins && !allowedOrigins.includes(req.headers.origin ?? '')) {
      log.warn({ origin: req.headers.origin }, 'Rejected WebSocket upgrade from unknown origin');
      reject(socket, 403, 'Forbidden');
      return;
    }

    const ip = clientIp(req);
    if ((perIp.get(ip) ?? 0) >= maxConnectionsPerIp) {
      log.warn({ ip }, 'Rejected WebSocket upgrade: too many connections from one address');
      reject(socket, 429, 'Too Many Requests');
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      // Counted only once the handshake succeeded: `ws` aborts a malformed
      // upgrade itself without ever calling back, and that must not leak a slot.
      perIp.set(ip, (perIp.get(ip) ?? 0) + 1);
      states.set(ws, { isAlive: true, invalidFrames: 0, ip });
      wss.emit('connection', ws, req);
    });
  }

  server.on('upgrade', onUpgrade);

  function release(ws: WebSocket) {
    const state = states.get(ws);
    if (!state) return;
    states.delete(ws);
    const remaining = (perIp.get(state.ip) ?? 1) - 1;
    if (remaining <= 0) perIp.delete(state.ip);
    else perIp.set(state.ip, remaining);
  }

  wss.on('connection', (ws) => {
    ws.on('pong', () => {
      const state = states.get(ws);
      if (state) state.isAlive = true;
    });

    ws.on('message', (raw) => {
      let json: unknown;
      try {
        json = JSON.parse(raw.toString());
      } catch {
        json = undefined;
      }

      const parsed = clientMessageSchema.safeParse(json);
      if (!parsed.success) {
        onInvalidFrame(ws, json);
        return;
      }

      handleMessage(ws, parsed.data);
    });

    // `ws` always emits 'close' after 'error', so the slot is released once.
    ws.on('close', () => {
      dropPeer(ws);
      release(ws);
    });
    ws.on('error', (err) => {
      log.warn({ err }, 'WebSocket error');
      dropPeer(ws);
    });
  });

  function onInvalidFrame(ws: WebSocket, json: unknown) {
    const state = states.get(ws);
    if (!state) return;
    state.invalidFrames += 1;

    // A `join` with a malformed room id is the one invalid frame worth a
    // dedicated code, since the client can show "invalid room" for it.
    const isJoin =
      typeof json === 'object' && json !== null && (json as { type?: unknown }).type === 'join';
    if (isJoin) {
      sendError(ws, 'invalid_room', 'Room id must be 4–32 chars of a-z, 0-9 or -');
      ws.close(SIGNALING_CLOSE_CODES.invalidRoom, 'invalid room');
      return;
    }

    sendError(ws, 'invalid_message', 'Malformed signaling message');
    if (state.invalidFrames >= MAX_INVALID_FRAMES) {
      ws.close(SIGNALING_CLOSE_CODES.invalidMessage, 'too many invalid messages');
    }
  }

  function handleMessage(ws: WebSocket, msg: ClientMessage) {
    switch (msg.type) {
      case 'join':
        return handleJoin(ws, rooms.join(msg.roomId, ws));
      case 'join-random':
        return handleJoin(ws, rooms.joinRandom(ws, undefined, msg.avoidRoomId));
      case 'leave':
        return dropPeer(ws);
      case 'light-another':
        return handleVote(ws);
      case 'report':
        return handleReport(ws);
      case 'offer':
      case 'answer':
      case 'ice-candidate':
        return relay(ws, msg);
    }
  }

  function handleJoin(ws: WebSocket, result: JoinResult<WebSocket>) {
    if (!result.ok) {
      if (result.code === 'room_full') {
        sendError(ws, 'room_full', 'This room already has two participants');
        ws.close(SIGNALING_CLOSE_CODES.roomFull, 'room full');
      } else {
        sendError(ws, 'already_joined', 'This connection is already in a room');
      }
      return;
    }

    const { peer, other } = result;
    const roomId = peer.roomId;
    log.info({ roomId, peerId: peer.id, peers: rooms.roomSize(roomId) }, 'Peer joined');

    // Tell the existing peer first so its RTCPeerConnection exists (as the
    // polite side) before the newcomer's offer can possibly arrive.
    if (other) {
      send(other.conn, { type: 'peer-joined', peerId: peer.id });
    }

    send(ws, {
      type: 'joined',
      peerId: peer.id,
      roomId,
      polite: other === null,
      peerPresent: other !== null,
      iceServers: iceServers(),
    });

    // After `joined`, so the newcomer knows its own peer id when it reads
    // `wantsAnother`. Frames on one socket arrive in order.
    if (other) syncTimer(roomId);
  }

  /**
   * Re-arms the expiry for a room and tells both peers the clock. A room with
   * a free seat has no clock, so this just clears any leftover timeout.
   */
  function syncTimer(roomId: string) {
    const pending = timers.get(roomId);
    if (pending) {
      clearTimeout(pending);
      timers.delete(roomId);
    }

    const state = rooms.timerState(roomId);
    if (!state) return;

    timers.set(
      roomId,
      setTimeout(() => expire(roomId), state.remainingMs),
    );
    for (const peer of rooms.peersOf(roomId)) {
      send(peer.conn, { type: 'timer', ...state });
    }
  }

  function expire(roomId: string) {
    timers.delete(roomId);
    const peers = rooms.expire(roomId);
    if (peers.length === 0) return;

    log.info({ roomId, peers: peers.length }, 'Room expired');
    for (const peer of peers) {
      send(peer.conn, { type: 'expired' });
      peer.conn.close(SIGNALING_CLOSE_CODES.expired, 'break over');
    }
  }

  function handleVote(ws: WebSocket) {
    const result = rooms.vote(ws);
    if (!result.ok) {
      if (result.code === 'not_in_room') {
        sendError(ws, 'not_in_room', 'Join a room before lighting another one');
      } else {
        // Alone, or the room drained between click and arrival. Nothing to do.
        log.debug({ peerId: rooms.peerOf(ws)?.id }, 'Ignored vote in a room that is not burning');
      }
      return;
    }

    const roomId = rooms.peerOf(ws)?.roomId;
    if (!roomId) return;
    if (result.relit) log.info({ roomId, lit: result.state.lit }, 'Relit');
    syncTimer(roomId);
  }

  /** Nothing is stored yet; the log line is the whole report. */
  function handleReport(ws: WebSocket) {
    const peer = rooms.peerOf(ws);
    if (!peer) {
      sendError(ws, 'not_in_room', 'Join a room before reporting anyone');
      return;
    }

    log.warn(
      { roomId: peer.roomId, reporterId: peer.id, reportedId: rooms.otherPeer(ws)?.id ?? null },
      'Peer reported',
    );
  }

  function relay(
    ws: WebSocket,
    msg: Extract<ClientMessage, { type: 'offer' | 'answer' | 'ice-candidate' }>,
  ) {
    const peer = rooms.peerOf(ws);
    if (!peer) {
      sendError(ws, 'not_in_room', 'Join a room before sending signaling messages');
      return;
    }

    const other = rooms.otherPeer(ws);
    if (!other) {
      sendError(ws, 'no_peer', 'No other participant in the room');
      return;
    }

    send(other.conn, { ...msg, from: peer.id });
  }

  function dropPeer(ws: WebSocket) {
    const left = rooms.leave(ws);
    if (!left) return;

    log.info({ roomId: left.peer.roomId, peerId: left.peer.id }, 'Peer left');
    // The room now has a free seat, so it has no clock: this only clears the
    // pending expiry. The survivor hears `peer-left`, which says enough.
    syncTimer(left.peer.roomId);
    if (left.other) {
      send(left.other.conn, { type: 'peer-left', peerId: left.peer.id });
    }
  }

  function send(ws: WebSocket, msg: ServerMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  function sendError(ws: WebSocket, code: SignalingErrorCode, message: string) {
    send(ws, { type: 'error', code, message });
  }

  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      const state = states.get(ws);
      if (!state) continue;
      if (!state.isAlive) {
        ws.terminate();
        continue;
      }
      state.isAlive = false;
      ws.ping();
    }
  }, heartbeatMs);
  heartbeat.unref();

  return {
    roomCount: () => rooms.roomCount(),
    close() {
      clearInterval(heartbeat);
      for (const pending of timers.values()) clearTimeout(pending);
      timers.clear();
      server.off('upgrade', onUpgrade);
      for (const ws of wss.clients) {
        ws.close(1001, 'server shutting down');
      }
      return new Promise<void>((resolve) => wss.close(() => resolve()));
    },
  };
}

function reject(socket: Duplex, status: number, reason: string) {
  socket.write(`HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
}
