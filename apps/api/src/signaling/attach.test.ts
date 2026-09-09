import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import { roomIdSchema, type ServerMessage } from '@cigbuddy/shared';
import { createApp } from '../app.js';
import { attachSignaling, type Signaling } from './attach.js';

const ICE = [{ urls: ['stun:test.example.com:3478'] }];

let server: Server;
let signaling: Signaling;
let baseUrl: string;

beforeAll(async () => {
  server = createServer(createApp());
  signaling = attachSignaling(server, { iceServers: () => ICE, heartbeatMs: 60_000 });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `ws://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await signaling.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

// Client-side close is asynchronous, so a lone peer from the previous test can
// still be seated when the next one starts, and `join-random` would find it.
beforeEach(() => vi.waitFor(() => expect(signaling.roomCount()).toBe(0)));

function connect(path = '/api/ws'): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(baseUrl + path);
    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}

function nextMessage(ws: WebSocket): Promise<ServerMessage> {
  return new Promise((resolve) => {
    ws.once('message', (raw) => resolve(JSON.parse(raw.toString()) as ServerMessage));
  });
}

function closed(ws: WebSocket): Promise<number> {
  return new Promise((resolve) => ws.once('close', (code) => resolve(code)));
}

function send(ws: WebSocket, msg: unknown) {
  ws.send(JSON.stringify(msg));
}

function closeAll(...sockets: WebSocket[]) {
  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN) ws.close();
  }
}

describe('signaling', () => {
  it('rejects upgrades on other paths', async () => {
    await expect(connect('/somewhere-else')).rejects.toThrow();
  });

  it('makes the first peer polite and the second the initiator', async () => {
    const a = await connect();
    send(a, { type: 'join', roomId: 'pair-test' });
    const joinedA = await nextMessage(a);

    expect(joinedA).toMatchObject({
      type: 'joined',
      roomId: 'pair-test',
      polite: true,
      peerPresent: false,
      iceServers: ICE,
    });

    const b = await connect();
    const peerJoined = nextMessage(a);
    send(b, { type: 'join', roomId: 'pair-test' });
    const joinedB = await nextMessage(b);

    expect(joinedB).toMatchObject({ type: 'joined', polite: false, peerPresent: true });
    if (joinedA.type === 'joined') {
      expect(await peerJoined).toEqual({
        type: 'peer-joined',
        peerId: joinedB.type === 'joined' ? joinedB.peerId : '',
      });
    }

    closeAll(a, b);
  });

  it('turns a third peer away with room_full', async () => {
    const a = await connect();
    const b = await connect();
    send(a, { type: 'join', roomId: 'full-test' });
    await nextMessage(a);
    send(b, { type: 'join', roomId: 'full-test' });
    await nextMessage(b);

    const c = await connect();
    const closeCode = closed(c);
    send(c, { type: 'join', roomId: 'full-test' });

    expect(await nextMessage(c)).toMatchObject({ type: 'error', code: 'room_full' });
    expect(await closeCode).toBe(4001);

    closeAll(a, b);
  });

  it('relays offers with the sender id and reports no_peer when alone', async () => {
    const a = await connect();
    send(a, { type: 'join', roomId: 'relay-test' });
    const joinedA = await nextMessage(a);

    send(a, { type: 'offer', description: { type: 'offer', sdp: 'v=0' } });
    expect(await nextMessage(a)).toMatchObject({ type: 'error', code: 'no_peer' });

    const b = await connect();
    send(b, { type: 'join', roomId: 'relay-test' });
    await Promise.all([nextMessage(a), nextMessage(b)]);

    const relayed = nextMessage(b);
    send(a, { type: 'offer', description: { type: 'offer', sdp: 'v=0' } });

    expect(await relayed).toEqual({
      type: 'offer',
      from: joinedA.type === 'joined' ? joinedA.peerId : '',
      description: { type: 'offer', sdp: 'v=0' },
    });

    closeAll(a, b);
  });

  it('notifies the survivor when a peer disconnects', async () => {
    const a = await connect();
    const b = await connect();
    send(a, { type: 'join', roomId: 'leave-test' });
    await nextMessage(a);
    send(b, { type: 'join', roomId: 'leave-test' });
    await Promise.all([nextMessage(a), nextMessage(b)]);

    const left = nextMessage(a);
    b.close();

    expect(await left).toMatchObject({ type: 'peer-left' });
    closeAll(a);
  });

  it('requires joining before signaling', async () => {
    const a = await connect();
    send(a, { type: 'ice-candidate', candidate: null });

    expect(await nextMessage(a)).toMatchObject({ type: 'error', code: 'not_in_room' });
    closeAll(a);
  });

  it('opens a fresh room for a random join when nothing is open', async () => {
    const a = await connect();
    send(a, { type: 'join-random' });
    const joined = await nextMessage(a);

    expect(joined).toMatchObject({ type: 'joined', polite: true, peerPresent: false });
    if (joined.type === 'joined') {
      expect(roomIdSchema.safeParse(joined.roomId).success).toBe(true);
    }

    closeAll(a);
  });

  it('pairs two random joiners in the same room', async () => {
    const a = await connect();
    send(a, { type: 'join-random' });
    const joinedA = await nextMessage(a);

    const b = await connect();
    const peerJoined = nextMessage(a);
    send(b, { type: 'join-random' });
    const joinedB = await nextMessage(b);

    expect(joinedB).toMatchObject({
      type: 'joined',
      roomId: joinedA.type === 'joined' ? joinedA.roomId : '',
      polite: false,
      peerPresent: true,
    });
    expect(await peerJoined).toEqual({
      type: 'peer-joined',
      peerId: joinedB.type === 'joined' ? joinedB.peerId : '',
    });

    closeAll(a, b);
  });

  it('matches a random joiner into a room someone joined by id', async () => {
    const a = await connect();
    send(a, { type: 'join', roomId: 'open-test' });
    await nextMessage(a);

    const b = await connect();
    send(b, { type: 'join-random' });

    expect(await nextMessage(b)).toMatchObject({
      type: 'joined',
      roomId: 'open-test',
      peerPresent: true,
    });

    closeAll(a, b);
  });

  it('flags malformed frames and bad room ids', async () => {
    const a = await connect();
    a.send('not json');
    expect(await nextMessage(a)).toMatchObject({ type: 'error', code: 'invalid_message' });

    const b = await connect();
    const closeCode = closed(b);
    send(b, { type: 'join', roomId: 'NOT VALID' });
    expect(await nextMessage(b)).toMatchObject({ type: 'error', code: 'invalid_room' });
    expect(await closeCode).toBe(4002);

    closeAll(a);
  });
});
