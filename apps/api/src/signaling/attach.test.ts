import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import { CHAT_DURATION_MS, roomIdSchema, type ServerMessage, type Topic } from '@cigbuddy/shared';
import { createApp } from '../app.js';
import { attachSignaling, type Signaling } from './attach.js';

const ICE = [{ urls: ['stun:test.example.com:3478'] }];

let server: Server;
let signaling: Signaling;
let baseUrl: string;
const onReport = vi.fn();
const onBreakCompleted = vi.fn();

beforeAll(async () => {
  server = createServer(createApp());
  signaling = attachSignaling(server, {
    iceServers: () => ICE,
    heartbeatMs: 60_000,
    onReport,
    onBreakCompleted,
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `ws://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await signaling.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

// Client-side close is asynchronous, so a lone peer from the previous test can
// still be seated when the next one starts, and `join-random` would find it.
beforeEach(async () => {
  await vi.waitFor(() => expect(signaling.roomCount()).toBe(0));
  vi.clearAllMocks();
});

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
    // One vote is not a finished cigarette.
    expect(onBreakCompleted).not.toHaveBeenCalled();

    onA = waitFor(a, 'timer');
    onB = waitFor(b, 'timer');
    send(b, { type: 'light-another' });
    const relitA = await onA;
    expect(relitA).toMatchObject({ lit: 1, wantsAnother: [] });
    expect(relitA.remainingMs).toBeGreaterThan(CHAT_DURATION_MS - 1000);
    expect(await onB).toMatchObject({ lit: 1, wantsAnother: [] });
    expect(joinedB.peerId).not.toBe(joinedA.peerId);
    expect(onBreakCompleted).toHaveBeenCalledTimes(1);
    expect(onBreakCompleted).toHaveBeenCalledWith({ roomId: 'vote-test', via: 'relit', lit: 1 });

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
    send(a, { type: 'report', reason: 'spam' });
    expect(await nextMessage(a)).toMatchObject({ type: 'error', code: 'not_in_room' });
    expect(onReport).not.toHaveBeenCalled();
    closeAll(a);
  });

  it('takes a report quietly and leaves the room standing', async () => {
    const { a, b, joinedA, joinedB } = await pair('report-test');

    send(a, { type: 'report', reason: 'harassment', note: '  said things  ' });
    send(a, { type: 'offer', description: { type: 'offer', sdp: 'v=0' } });

    // No frame answers the report; the offer still relays, so the room is intact.
    expect(await nextMessage(b)).toMatchObject({ type: 'offer' });
    expect(signaling.roomCount()).toBe(1);

    expect(onReport).toHaveBeenCalledTimes(1);
    expect(onReport).toHaveBeenCalledWith({
      roomId: 'report-test',
      reporterId: joinedA.peerId,
      reportedId: joinedB.peerId,
      reason: 'harassment',
      note: 'said things',
    });

    closeAll(a, b);
  });

  it('stores no note when the note is blank', async () => {
    const { a, b } = await pair('blank-note');

    send(a, { type: 'report', reason: 'other', note: '   ' });
    send(a, { type: 'offer', description: { type: 'offer', sdp: 'v=0' } });
    expect(await nextMessage(b)).toMatchObject({ type: 'offer' });

    expect(onReport).toHaveBeenCalledWith(expect.objectContaining({ reason: 'other', note: null }));

    closeAll(a, b);
  });

  it('rejects a report with no reason', async () => {
    const { a, b } = await pair('bare-report');

    send(a, { type: 'report' });
    expect(await nextMessage(a)).toMatchObject({ type: 'error', code: 'invalid_message' });
    expect(onReport).not.toHaveBeenCalled();

    closeAll(a, b);
  });

  it('counts open sockets', async () => {
    expect(signaling.connectionCount()).toBe(0);

    const a = await connect();
    const b = await connect();
    expect(signaling.connectionCount()).toBe(2);

    closeAll(a, b);
    await vi.waitFor(() => expect(signaling.connectionCount()).toBe(0));
  });
});

// Its own server so the short cigarette cannot make the pairing tests racy.
describe('expiry', () => {
  let quick: Server;
  let quickSignaling: Signaling;
  let quickUrl: string;
  const quickBreak = vi.fn();

  beforeAll(async () => {
    quick = createServer(createApp());
    quickSignaling = attachSignaling(quick, {
      heartbeatMs: 60_000,
      chatDurationMs: 250,
      onBreakCompleted: quickBreak,
    });
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
    expect(quickBreak).toHaveBeenCalledTimes(1);
    expect(quickBreak).toHaveBeenCalledWith({ roomId: 'burn-out', via: 'expired', lit: 0 });
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
    // A break somebody walked out of is not a finished one.
    expect(quickBreak).not.toHaveBeenCalledWith(expect.objectContaining({ roomId: 'put-out' }));

    closeAll(a);
    await vi.waitFor(() => expect(quickSignaling.roomCount()).toBe(0));
  });
});

describe('per-address connection cap', () => {
  let capped: Server;
  let cappedSignaling: Signaling;
  let cappedUrl: string;

  beforeAll(async () => {
    capped = createServer(createApp());
    cappedSignaling = attachSignaling(capped, {
      iceServers: () => ICE,
      heartbeatMs: 60_000,
      maxConnectionsPerIp: 2,
      // Every test socket comes from 127.0.0.1, so a forwarded header is the
      // only way to tell "clients" apart — exactly what the resolver is for.
      clientIp: (req) => String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress),
    });
    await new Promise<void>((resolve) => capped.listen(0, '127.0.0.1', resolve));
    cappedUrl = `ws://127.0.0.1:${(capped.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await cappedSignaling.close();
    await new Promise<void>((resolve) => capped.close(() => resolve()));
  });

  function connectAs(ip: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${cappedUrl}/api/ws`, { headers: { 'x-forwarded-for': ip } });
      ws.once('open', () => resolve(ws));
      ws.once('error', reject);
    });
  }

  it('refuses the socket that would exceed the cap and frees the slot on close', async () => {
    const a = await connectAs('203.0.113.7');
    const b = await connectAs('203.0.113.7');

    await expect(connectAs('203.0.113.7')).rejects.toThrow(/429/);
    // Another address is unaffected.
    const other = await connectAs('203.0.113.8');

    a.close();
    await closed(a);
    const c = await connectAs('203.0.113.7');

    closeAll(b, c, other);
  });
});

/**
 * Its own server, because the one above is wired without a topic source and
 * every test in it asserts on a frame sequence that topics would sit inside.
 */
describe('signaling topics', () => {
  const CATALOG: Topic[] = [
    { id: 't-001', kind: 'opener', text: 'one' },
    { id: 't-002', kind: 'take', text: 'two' },
    { id: 't-003', kind: 'divisive', text: 'three' },
  ];

  let cursor = 0;
  /** Hands out the catalogue in order so assertions can be exact. */
  const pickTopic = (exclude: readonly string[]) => {
    for (let i = 0; i < CATALOG.length; i++) {
      const topic = CATALOG[(cursor + i) % CATALOG.length];
      if (topic && !exclude.includes(topic.id)) {
        cursor = (cursor + i + 1) % CATALOG.length;
        return topic;
      }
    }
    return null;
  };

  let topicServer: Server;
  let topicSignaling: Signaling;
  let topicUrl: string;

  // A second server whose cooldown never elapses during a test, for asserting
  // that a refused change produces no frame at all.
  let frozenServer: Server;
  let frozenSignaling: Signaling;
  let frozenUrl: string;

  beforeAll(async () => {
    topicServer = createServer(createApp());
    topicSignaling = attachSignaling(topicServer, {
      heartbeatMs: 60_000,
      pickTopic,
      // Nought, so a change lands immediately: the cooldown itself is covered
      // by the unit tests, and by the frozen server below.
      topicCooldownMs: 0,
      // Every socket here is 127.0.0.1, and the default cap is 8. These tests
      // open nine across the block, and a close handshake that lands a tick
      // late would surface as an opaque 429 in whichever test ran last.
      maxConnectionsPerIp: Infinity,
    });
    await new Promise<void>((resolve) => topicServer.listen(0, '127.0.0.1', resolve));
    topicUrl = `ws://127.0.0.1:${(topicServer.address() as AddressInfo).port}`;

    frozenServer = createServer(createApp());
    frozenSignaling = attachSignaling(frozenServer, {
      heartbeatMs: 60_000,
      pickTopic,
      topicCooldownMs: 60_000,
      maxConnectionsPerIp: Infinity,
    });
    await new Promise<void>((resolve) => frozenServer.listen(0, '127.0.0.1', resolve));
    frozenUrl = `ws://127.0.0.1:${(frozenServer.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await topicSignaling.close();
    await frozenSignaling.close();
    await new Promise<void>((resolve) => topicServer.close(() => resolve()));
    await new Promise<void>((resolve) => frozenServer.close(() => resolve()));
  });

  // Same reason as the block above: a socket closed client-side at the end of
  // one test can still be seated when the next one starts.
  beforeEach(async () => {
    await vi.waitFor(() => expect(topicSignaling.roomCount()).toBe(0));
    await vi.waitFor(() => expect(frozenSignaling.roomCount()).toBe(0));
    cursor = 0;
  });

  /** Resolves true when no frame of that type turns up in `ms`. */
  function quiet(ws: WebSocket, type: ServerMessage['type'], ms = 150): Promise<boolean> {
    return new Promise((resolve) => {
      const onMessage = (raw: Buffer | ArrayBuffer | Buffer[]) => {
        if ((JSON.parse(raw.toString()) as ServerMessage).type !== type) return;
        clearTimeout(timer);
        ws.off('message', onMessage);
        resolve(false);
      };
      const timer = setTimeout(() => {
        ws.off('message', onMessage);
        resolve(true);
      }, ms);
      ws.on('message', onMessage);
    });
  }

  it('gives somebody waiting alone something to read', async () => {
    const a = await connect('/api/ws', topicUrl);
    const topic = waitFor(a, 'topic');
    send(a, { type: 'join', roomId: 'topic-alone' });

    expect(await topic).toEqual({ type: 'topic', topic: CATALOG[0], from: null });
    closeAll(a);
  });

  it('puts the same subject in front of both peers when the room fills', async () => {
    const a = await connect('/api/ws', topicUrl);
    const firstA = waitFor(a, 'topic');
    send(a, { type: 'join', roomId: 'topic-pair' });
    await firstA;

    const b = await connect('/api/ws', topicUrl);
    const refreshedA = waitFor(a, 'topic');
    const topicB = waitFor(b, 'topic');
    send(b, { type: 'join', roomId: 'topic-pair' });

    const onA = await refreshedA;
    const onB = await topicB;
    // A new pairing gets a fresh subject, and both read the identical one.
    expect(onA.topic).toEqual(onB.topic);
    expect(onA.topic).not.toEqual(CATALOG[0]);
    expect(onA.from).toBeNull();

    closeAll(a, b);
  });

  it('changes the subject for both when one of them asks', async () => {
    const a = await connect('/api/ws', topicUrl);
    const firstA = waitFor(a, 'topic');
    send(a, { type: 'join', roomId: 'topic-change' });
    await firstA;

    const b = await connect('/api/ws', topicUrl);
    const settledA = waitFor(a, 'topic');
    const joinedB = waitFor(b, 'joined');
    const settledB = waitFor(b, 'topic');
    send(b, { type: 'join', roomId: 'topic-change' });
    const current = (await settledA).topic;
    await settledB;
    const peerB = (await joinedB).peerId;

    const changedA = waitFor(a, 'topic');
    const changedB = waitFor(b, 'topic');
    send(b, { type: 'next-topic', afterId: current.id });

    const onA = await changedA;
    const onB = await changedB;
    expect(onA.topic).toEqual(onB.topic);
    expect(onA.topic).not.toEqual(current);
    // Named, so the other side can say who moved it.
    expect(onA.from).toBe(peerB);
    expect(onB.from).toBe(peerB);

    closeAll(a, b);
  });

  it('ignores a request aimed at a subject that has already gone', async () => {
    const a = await connect('/api/ws', topicUrl);
    const first = waitFor(a, 'topic');
    send(a, { type: 'join', roomId: 'topic-stale' });
    await first;

    // Both peers clicked at once: the loser's frame names a topic nobody is
    // still reading, and it must not roll a second time.
    const changed = waitFor(a, 'topic');
    send(a, { type: 'next-topic', afterId: CATALOG[0]?.id });
    await changed;

    send(a, { type: 'next-topic', afterId: CATALOG[0]?.id });
    expect(await quiet(a, 'topic')).toBe(true);

    closeAll(a);
  });

  it('says nothing at all to a change inside the cooldown', async () => {
    const a = await connect('/api/ws', frozenUrl);
    const first = waitFor(a, 'topic');
    send(a, { type: 'join', roomId: 'topic-cooldown' });
    const current = (await first).topic;

    // Both watchers armed before the send, and awaited together. Checking them
    // one after the other would let the first window swallow the very frame the
    // second is looking for, which would make this assertion unfailable.
    const noTopic = quiet(a, 'topic');
    const noError = quiet(a, 'error');
    send(a, { type: 'next-topic', afterId: current.id });

    // Silence, not an error: a red box over an icebreaker would be absurd.
    expect(await noTopic).toBe(true);
    expect(await noError).toBe(true);

    closeAll(a);
  });

  it('refuses a change before joining', async () => {
    const a = await connect('/api/ws', topicUrl);
    send(a, { type: 'next-topic' });

    expect(await nextMessage(a)).toMatchObject({ type: 'error', code: 'not_in_room' });
    closeAll(a);
  });

  it('rolls a new subject when the pair light another one', async () => {
    const a = await connect('/api/ws', topicUrl);
    const firstA = waitFor(a, 'topic');
    send(a, { type: 'join', roomId: 'topic-relight' });
    await firstA;

    const b = await connect('/api/ws', topicUrl);
    const settledA = waitFor(a, 'topic');
    const settledB = waitFor(b, 'topic');
    send(b, { type: 'join', roomId: 'topic-relight' });
    const current = (await settledA).topic;
    await settledB;

    send(a, { type: 'light-another' });
    const relitA = waitFor(a, 'topic');
    const relitB = waitFor(b, 'topic');
    send(b, { type: 'light-another' });

    const onA = await relitA;
    expect(onA.topic).not.toEqual(current);
    // Nobody clicked the topic button, so nobody is named.
    expect(onA.from).toBeNull();
    expect((await relitB).topic).toEqual(onA.topic);

    closeAll(a, b);
  });
});
