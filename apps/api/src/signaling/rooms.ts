import { randomUUID } from 'node:crypto';
import { CHAT_DURATION_MS, TOPIC_COOLDOWN_MS, type TimerState, type Topic } from '@cigbuddy/shared';
import { generateRoomId } from './room-id.js';

export const MAX_PEERS = 2;

/**
 * How many recently shown topics a room remembers. With a few hundred to pick
 * from and a button people press in bursts, a bare uniform pick repeats often
 * enough to look broken; this is the whole fix.
 */
export const RECENT_TOPICS = 12;

export interface Peer<T> {
  id: string;
  roomId: string;
  conn: T;
}

/** The clock on a full room. Absent while the room has a free seat. */
interface Burn {
  deadline: number;
  /** Cigarettes finished so far, i.e. relights. */
  lit: number;
  /** Peer ids that voted to light another one this cigarette. */
  votes: Set<string>;
}

/**
 * The room's icebreaker. Unlike the burn this belongs to the room rather than
 * to the pairing, so it survives a peer walking off.
 */
interface TopicState {
  current: Topic;
  /** When it last changed, for the cooldown. */
  changedAt: number;
  /** Ids shown lately, newest first, so a re-roll does not repeat itself. */
  recent: string[];
}

interface Room<T> {
  peers: Set<Peer<T>>;
  /** Invariant: non-null exactly when `peers.size === MAX_PEERS`. */
  burn: Burn | null;
  topic: TopicState | null;
}

export type JoinResult<T> =
  | { ok: true; peer: Peer<T>; other: Peer<T> | null }
  | { ok: false; code: 'room_full' | 'already_joined' };

export interface LeaveResult<T> {
  peer: Peer<T>;
  other: Peer<T> | null;
}

export type VoteResult =
  | { ok: true; relit: boolean; state: TimerState }
  | { ok: false; code: 'not_in_room' | 'not_burning' };

export type ShuffleResult =
  | { ok: true; topic: Topic }
  | { ok: false; code: 'not_in_room' | 'cooling_down' | 'stale' | 'no_topics' };

export interface RoomManagerOptions {
  /** Picks an index in `[0, count)` among the open rooms. Injectable for tests. */
  pick?: (count: number) => number;
  /** Produces a candidate id for a brand-new room. Injectable for tests. */
  newRoomId?: () => string;
  /** Wall clock in ms. Injectable for tests. */
  now?: () => number;
  /** Length of one cigarette. */
  durationMs?: number;
  /**
   * Supplies icebreakers, skipping the ids it is given. Synchronous and total:
   * it returns null rather than throwing when there is nothing to pick, which
   * is what keeps this class free of I/O. Defaults to "no topics at all", so a
   * manager built without one behaves exactly as it did before topics existed.
   */
  pickTopic?: (exclude: readonly string[]) => Topic | null;
  /** Minimum gap between topic changes in one room. */
  topicCooldownMs?: number;
}

/**
 * In-memory room bookkeeping, generic over the connection handle so it can be
 * unit-tested with plain objects and used with `WebSocket` at runtime.
 *
 * Owns the per-room clock as data only: it never schedules anything. The
 * caller reads `timerState()` and decides when to call `expire()`.
 */
export class RoomManager<T> {
  private readonly rooms = new Map<string, Room<T>>();
  private readonly byConn = new Map<T, Peer<T>>();
  private readonly pick: (count: number) => number;
  private readonly newRoomId: () => string;
  private readonly now: () => number;
  private readonly durationMs: number;
  private readonly pickTopic: (exclude: readonly string[]) => Topic | null;
  private readonly topicCooldownMs: number;

  constructor(options: RoomManagerOptions = {}) {
    this.pick = options.pick ?? ((count) => Math.floor(Math.random() * count));
    this.newRoomId = options.newRoomId ?? generateRoomId;
    this.now = options.now ?? Date.now;
    this.durationMs = options.durationMs ?? CHAT_DURATION_MS;
    this.pickTopic = options.pickTopic ?? (() => null);
    this.topicCooldownMs = options.topicCooldownMs ?? TOPIC_COOLDOWN_MS;
  }

  join(roomId: string, conn: T, id: string = randomUUID()): JoinResult<T> {
    if (this.byConn.has(conn)) {
      return { ok: false, code: 'already_joined' };
    }

    const room = this.rooms.get(roomId) ?? { peers: new Set<Peer<T>>(), burn: null, topic: null };
    if (room.peers.size >= MAX_PEERS) {
      return { ok: false, code: 'room_full' };
    }

    const other = firstOf(room.peers);
    const peer: Peer<T> = { id, roomId, conn };
    room.peers.add(peer);
    this.rooms.set(roomId, room);
    this.byConn.set(conn, peer);

    // A brand-new room gets a subject straight away, so somebody waiting alone
    // still has something to read.
    if (room.topic === null) this.assignTopic(room);

    // The clock starts the moment the second person turns up.
    if (room.peers.size === MAX_PEERS) {
      room.burn = { deadline: this.now() + this.durationMs, lit: 0, votes: new Set() };
      // A new pairing deserves a fresh subject, whatever the survivor of the
      // last one was left staring at.
      this.assignTopic(room);
    }

    return { ok: true, peer, other };
  }

  /**
   * Joins a random room that still has a free seat, or a fresh room when none
   * does. Empty rooms are deleted on leave, so every known room has 1 or 2
   * peers and a lone survivor is automatically matchable again.
   *
   * `avoidRoomId` is skipped even when it is the only open room: the caller
   * just left it, and a fresh room beats an awkward reunion.
   */
  joinRandom(conn: T, id?: string, avoidRoomId?: string): JoinResult<T> {
    if (this.byConn.has(conn)) {
      return { ok: false, code: 'already_joined' };
    }

    const open = [...this.rooms.keys()].filter(
      (roomId) => roomId !== avoidRoomId && this.roomSize(roomId) < MAX_PEERS,
    );
    const roomId = open[this.pick(open.length)] ?? this.freshRoomId();
    return this.join(roomId, conn, id);
  }

  /** Idempotent. Stops the clock and deletes the room once it is empty. */
  leave(conn: T): LeaveResult<T> | null {
    const peer = this.byConn.get(conn);
    if (!peer) return null;

    this.byConn.delete(conn);
    const room = this.rooms.get(peer.roomId);
    if (!room) return { peer, other: null };

    room.peers.delete(peer);
    room.burn = null;
    // `room.topic` is deliberately left alone. The symmetry with the burn is
    // tempting and wrong: the subject belongs to the room, and blanking it
    // would take the card off the screen of the person now waiting alone.
    const other = firstOf(room.peers);
    if (room.peers.size === 0) this.rooms.delete(peer.roomId);

    return { peer, other };
  }

  /**
   * Records a vote to light another one. Voting twice changes nothing. Once
   * every peer has voted the clock resets, the count goes up and the votes
   * clear for the next cigarette.
   */
  vote(conn: T): VoteResult {
    const peer = this.byConn.get(conn);
    if (!peer) return { ok: false, code: 'not_in_room' };

    const room = this.rooms.get(peer.roomId);
    if (!room?.burn) return { ok: false, code: 'not_burning' };

    const burn = room.burn;
    burn.votes.add(peer.id);

    let relit = false;
    if (burn.votes.size >= room.peers.size) {
      burn.lit += 1;
      burn.votes.clear();
      burn.deadline = this.now() + this.durationMs;
      relit = true;
    }

    return { ok: true, relit, state: this.stateOf(burn) };
  }

  /** The room's current subject, or null when it has none. */
  topicOf(roomId: string): Topic | null {
    return this.rooms.get(roomId)?.topic?.current ?? null;
  }

  /**
   * A peer asking to change the subject. Honours the room's cooldown, and
   * ignores a request aimed at a topic that is already gone: two people
   * clicking at once get one change rather than two, and the second click was
   * a reaction to something neither of them is still reading.
   */
  shuffleTopic(conn: T, afterId?: string): ShuffleResult {
    const peer = this.byConn.get(conn);
    if (!peer) return { ok: false, code: 'not_in_room' };

    const room = this.rooms.get(peer.roomId);
    if (!room) return { ok: false, code: 'not_in_room' };

    const topic = room.topic;
    if (topic) {
      if (afterId !== undefined && afterId !== topic.current.id) {
        return { ok: false, code: 'stale' };
      }
      if (this.now() - topic.changedAt < this.topicCooldownMs) {
        return { ok: false, code: 'cooling_down' };
      }
    }

    const next = this.assignTopic(room);
    return next ? { ok: true, topic: next } : { ok: false, code: 'no_topics' };
  }

  /**
   * A re-roll the server decided on: the room filled, or the pair lit another
   * one. Ignores the cooldown, since nobody clicked anything.
   */
  rollTopic(roomId: string): Topic | null {
    const room = this.rooms.get(roomId);
    return room ? this.assignTopic(room) : null;
  }

  /** Null while the room is not full (or does not exist). */
  timerState(roomId: string): TimerState | null {
    const burn = this.rooms.get(roomId)?.burn;
    return burn ? this.stateOf(burn) : null;
  }

  /**
   * Ends the room outright: every peer is forgotten and the room deleted.
   * Returns the peers so the caller can tell them, without `leave()` raising a
   * `peer-left` for a room that no longer exists.
   */
  expire(roomId: string): Peer<T>[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    const peers = [...room.peers];
    for (const peer of peers) this.byConn.delete(peer.conn);
    this.rooms.delete(roomId);
    return peers;
  }

  peerOf(conn: T): Peer<T> | undefined {
    return this.byConn.get(conn);
  }

  otherPeer(conn: T): Peer<T> | undefined {
    const peer = this.byConn.get(conn);
    if (!peer) return undefined;
    for (const candidate of this.rooms.get(peer.roomId)?.peers ?? []) {
      if (candidate !== peer) return candidate;
    }
    return undefined;
  }

  peersOf(roomId: string): Peer<T>[] {
    return [...(this.rooms.get(roomId)?.peers ?? [])];
  }

  roomSize(roomId: string): number {
    return this.rooms.get(roomId)?.peers.size ?? 0;
  }

  roomCount(): number {
    return this.rooms.size;
  }

  /**
   * Rolls a new subject for the room, remembering the last few so a re-roll
   * does not hand back what it just took away. Returns null, leaving the room
   * as it was, when there is nothing to pick.
   */
  private assignTopic(room: Room<T>): Topic | null {
    const previous = room.topic;
    const exclude = previous ? [previous.current.id, ...previous.recent] : [];
    const next = this.pickTopic(exclude);
    if (!next) return null;
    // `pickTopic` is asked to skip these, but it is allowed to give up and hand
    // back anything rather than nothing -- with only a handful of topics left
    // active, "anything" can be the one already on screen. Treat that as no
    // change: broadcasting it would tell the other peer "they changed the
    // subject" over identical text, and kill both buttons for the cooldown.
    if (previous && next.id === previous.current.id) return null;

    room.topic = {
      current: next,
      changedAt: this.now(),
      recent: previous ? [previous.current.id, ...previous.recent].slice(0, RECENT_TOPICS) : [],
    };
    return next;
  }

  private stateOf(burn: Burn): TimerState {
    return {
      remainingMs: Math.max(0, burn.deadline - this.now()),
      lit: burn.lit,
      wantsAnother: [...burn.votes],
    };
  }

  private freshRoomId(): string {
    let roomId = this.newRoomId();
    while (this.rooms.has(roomId)) roomId = this.newRoomId();
    return roomId;
  }
}

function firstOf<T>(room: Set<Peer<T>>): Peer<T> | null {
  for (const peer of room) return peer;
  return null;
}
