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
  heartbeatMs?: number;
}

export interface Signaling {
  close(): Promise<void>;
  roomCount(): number;
}

const MAX_INVALID_FRAMES = 3;
const MAX_PAYLOAD_BYTES = 64 * 1024;

interface ConnState {
  isAlive: boolean;
  invalidFrames: number;
}

/**
 * Attaches the room signaling WebSocket to an existing http.Server. Kept out of
 * `createApp()` so the Express app stays testable with supertest alone.
 */
export function attachSignaling(server: Server, options: SignalingOptions = {}): Signaling {
  const path = options.path ?? '/api/ws';
  const iceServers = options.iceServers ?? (() => []);
  const allowedOrigins = options.allowedOrigins;
  const heartbeatMs = options.heartbeatMs ?? 30_000;
  const log = logger.child({ module: 'signaling' });

  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD_BYTES });
  const rooms = new RoomManager<WebSocket>();
  const states = new WeakMap<WebSocket, ConnState>();

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

    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  }

  server.on('upgrade', onUpgrade);

  wss.on('connection', (ws) => {
    states.set(ws, { isAlive: true, invalidFrames: 0 });

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

    ws.on('close', () => dropPeer(ws));
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
        return handleJoin(ws, rooms.joinRandom(ws));
      case 'leave':
        return dropPeer(ws);
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
