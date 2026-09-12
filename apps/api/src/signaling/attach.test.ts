import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import { CHAT_DURATION_MS, roomIdSchema, type ServerMessage } from '@cigbuddy/shared';
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

function connect(path = '/api/ws', url = baseUrl): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url + path);
    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}

function nextMessage(ws: WebSocket): Promise<ServerMessage> {
  return new Promise((resolve) => {
    ws.once('message', (raw) => resolve(JSON.parse(raw.toString()) as ServerMessage));
  });
}

type Of<K extends ServerMessage['type']> = Extract<ServerMessage, { type: K }>;

/** Resolves with the first frame of the given type, skipping the rest. */
function waitFor<K extends ServerMessage['type']>(ws: WebSocket, type: K): Promise<Of<K>> {
  return new Promise((resolve) => {
    const onMessage = (raw: Buffer | ArrayBuffer | Buffer[]) => {
      const message = JSON.parse(raw.toString()) as ServerMessage;
      if (message.type !== type) return;
      ws.off('message', onMessage);
      resolve(message as Of<K>);
    };
    ws.on('message', onMessage);
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

/**
 * Seats two sockets in one room and drains the pairing frames on both. Every
 * listener is attached before the join is sent: `ws` emits back-to-back frames
 * synchronously, so a listener added after an `await` can miss the second one.
 */
async function pair(roomId: string, url = baseUrl) {
  const a = await connect('/api/ws', url);
  const joinedA = waitFor(a, 'joined');
  send(a, { type: 'join', roomId });
  await joinedA;

  const b = await connect('/api/ws', url);
  const peerJoined = waitFor(a, 'peer-joined');
  const timerA = waitFor(a, 'timer');
  const joinedB = waitFor(b, 'joined');
  const timerB = waitFor(b, 'timer');
  send(b, { type: 'join', roomId });
  await Promise.all([peerJoined, timerA, joinedB, timerB]);

  return { a, b, joinedA: await joinedA, joinedB: await joinedB, timerB: await timerB };
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
    expect(await peerJoined).toEqual({
      type: 'peer-joined',
      peerId: joinedB.type === 'joined' ? joinedB.peerId : '',
    });

    closeAll(a, b);
  });

  it('turns a third peer away with room_full', async () => {
    const { a, b } = await pair('full-test');

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
    const joinedA = await waitFor(a, 'joined');

    send(a, { type: 'offer', description: { type: 'offer', sdp: 'v=0' } });
    expect(await nextMessage(a)).toMatchObject({ type: 'error', code: 'no_peer' });

    const b = await connect();
    const timerA = waitFor(a, 'timer');
    const timerB = waitFor(b, 'timer');
    send(b, { type: 'join', roomId: 'relay-test' });
    await Promise.all([timerB, timerA]);

    const relayed = nextMessage(b);
    send(a, { type: 'offer', description: { type: 'offer', sdp: 'v=0' } });

    expect(await relayed).toEqual({
      type: 'offer',
      from: joinedA.peerId,
      description: { type: 'offer', sdp: 'v=0' },
    });

    closeAll(a, b);
  });

  it('notifies the survivor when a peer disconnects', async () => {
    const { a, b } = await pair('leave-test');

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

  it('keeps a random joiner out of the room they just left', async () => {
    const a = await connect();
    send(a, { type: 'join', roomId: 'just-left' });
    await nextMessage(a);

    const b = await connect();
    send(b, { type: 'join-random', avoidRoomId: 'just-left' });
    const joined = await nextMessage(b);

    expect(joined).toMatchObject({ type: 'joined', peerPresent: false });
    if (joined.type === 'joined') expect(joined.roomId).not.toBe('just-left');

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

describe('the clock', () => {
  it('starts a full cigarette for both once the room fills, after the newcomer is told it joined', async () => {
    const a = await connect();
    send(a, { type: 'join', roomId: 'clock-test' });
    await waitFor(a, 'joined');

    const b = await connect();
    const timerA = waitFor(a, 'timer');
    const frames: ServerMessage['type'][] = [];
    b.on('message', (raw) => frames.push((JSON.parse(raw.toString()) as ServerMessage).type));
    const pendingTimerB = waitFor(b, 'timer');
    send(b, { type: 'join', roomId: 'clock-test' });
    const timerB = await pendingTimerB;

    expect(frames).toEqual(['joined', 'timer']);
    expect(timerB).toMatchObject({ lit: 0, wantsAnother: [] });
    expect(timerB.remainingMs).toBeGreaterThan(0);
    expect(timerB.remainingMs).toBeLessThanOrEqual(CHAT_DURATION_MS);
    expect(await timerA).toMatchObject({ lit: 0, wantsAnother: [] });

    closeAll(a, b);
  });

  it('relights only once both have voted', async () => {
    const { a, b, joinedA, joinedB } = await pair('vote-test');

    let onA = waitFor(a, 'timer');
    let onB = waitFor(b, 'timer');
    send(a, { type: 'light-another' });
    expect(await onA).toMatchObject({ lit: 0, wantsAnother: [joinedA.peerId] });
    expect(await onB).toMatchObject({ lit: 0, wantsAnother: [joinedA.peerId] });

    onA = waitFor(a, 'timer');
    onB = waitFor(b, 'timer');
    send(b, { type: 'light-another' });
    const relitA = await onA;
    expect(relitA).toMatchObject({ lit: 1, wantsAnother: [] });
    expect(relitA.remainingMs).toBeGreaterThan(CHAT_DURATION_MS - 1000);
    expect(await onB).toMatchObject({ lit: 1, wantsAnother: [] });
    expect(joinedB.peerId).not.toBe(joinedA.peerId);

    closeAll(a, b);
  });

  it('ignores a vote from somebody who is alone', async () => {
    const a = await connect();
    send(a, { type: 'join', roomId: 'lonely-vote' });
    await waitFor(a, 'joined');

    send(a, { type: 'light-another' });
    send(a, { type: 'offer', description: { type: 'offer', sdp: 'v=0' } });

    // The first thing back is the offer's no_peer, so the vote produced nothing.
    expect(await nextMessage(a)).toMatchObject({ type: 'error', code: 'no_peer' });
    closeAll(a);
  });

  it('refuses votes and reports before joining', async () => {
    const a = await connect();
    send(a, { type: 'light-another' });
    expect(await nextMessage(a)).toMatchObject({ type: 'error', code: 'not_in_room' });
    send(a, { type: 'report' });
    expect(await nextMessage(a)).toMatchObject({ type: 'error', code: 'not_in_room' });
    closeAll(a);
  });

  it('takes a report quietly and leaves the room standing', async () => {
    const { a, b } = await pair('report-test');

    send(a, { type: 'report' });
    send(a, { type: 'offer', description: { type: 'offer', sdp: 'v=0' } });

    // No frame answers the report; the offer still relays, so the room is intact.
    expect(await nextMessage(b)).toMatchObject({ type: 'offer' });
    expect(signaling.roomCount()).toBe(1);

    closeAll(a, b);
  });
});

// Its own server so the short cigarette cannot make the pairing tests racy.
describe('expiry', () => {
  let quick: Server;
  let quickSignaling: Signaling;
  let quickUrl: string;

  beforeAll(async () => {
    quick = createServer(createApp());
    quickSignaling = attachSignaling(quick, { heartbeatMs: 60_000, chatDurationMs: 250 });
    await new Promise<void>((resolve) => quick.listen(0, '127.0.0.1', resolve));
    quickUrl = `ws://127.0.0.1:${(quick.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await quickSignaling.close();
    await new Promise<void>((resolve) => quick.close(() => resolve()));
  });

  it('ends the room for both when the cigarette burns out', async () => {
    const { a, b } = await pair('burn-out', quickUrl);
    const closes = Promise.all([closed(a), closed(b)]);
    const expiries = Promise.all([waitFor(a, 'expired'), waitFor(b, 'expired')]);

    const [expiredA, expiredB] = await expiries;

    expect(expiredA).toEqual({ type: 'expired' });
    expect(expiredB).toEqual({ type: 'expired' });
    expect(await closes).toEqual([4004, 4004]);
    expect(quickSignaling.roomCount()).toBe(0);
  });

  it('does not fire once a peer has left', async () => {
    const { a, b } = await pair('put-out', quickUrl);
    const left = waitFor(a, 'peer-left');
    b.close();
    await left;

    let expired = false;
    a.on('message', (raw) => {
      if ((JSON.parse(raw.toString()) as ServerMessage).type === 'expired') expired = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(expired).toBe(false);
    expect(a.readyState).toBe(WebSocket.OPEN);
    expect(quickSignaling.roomCount()).toBe(1);

    closeAll(a);
    await vi.waitFor(() => expect(quickSignaling.roomCount()).toBe(0));
  });
});
