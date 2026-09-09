import { randomUUID } from 'node:crypto';
import { generateRoomId } from './room-id.js';

export const MAX_PEERS = 2;

export interface Peer<T> {
  id: string;
  roomId: string;
  conn: T;
}

export type JoinResult<T> =
  | { ok: true; peer: Peer<T>; other: Peer<T> | null }
  | { ok: false; code: 'room_full' | 'already_joined' };

export interface LeaveResult<T> {
  peer: Peer<T>;
  other: Peer<T> | null;
}

export interface RoomManagerOptions {
  /** Picks an index in `[0, count)` among the open rooms. Injectable for tests. */
  pick?: (count: number) => number;
  /** Produces a candidate id for a brand-new room. Injectable for tests. */
  newRoomId?: () => string;
}

/**
 * In-memory room bookkeeping, generic over the connection handle so it can be
 * unit-tested with plain objects and used with `WebSocket` at runtime.
 */
export class RoomManager<T> {
  private readonly rooms = new Map<string, Set<Peer<T>>>();
  private readonly byConn = new Map<T, Peer<T>>();
  private readonly pick: (count: number) => number;
  private readonly newRoomId: () => string;

  constructor(options: RoomManagerOptions = {}) {
    this.pick = options.pick ?? ((count) => Math.floor(Math.random() * count));
    this.newRoomId = options.newRoomId ?? generateRoomId;
  }

  join(roomId: string, conn: T, id: string = randomUUID()): JoinResult<T> {
    if (this.byConn.has(conn)) {
      return { ok: false, code: 'already_joined' };
    }

    const room = this.rooms.get(roomId) ?? new Set<Peer<T>>();
    if (room.size >= MAX_PEERS) {
      return { ok: false, code: 'room_full' };
    }

    const other = firstOf(room);
    const peer: Peer<T> = { id, roomId, conn };
    room.add(peer);
    this.rooms.set(roomId, room);
    this.byConn.set(conn, peer);

    return { ok: true, peer, other };
  }

  /**
   * Joins a random room that still has a free seat, or a fresh room when none
   * does. Empty rooms are deleted on leave, so every known room has 1 or 2
   * peers and a lone survivor is automatically matchable again.
   */
  joinRandom(conn: T, id?: string): JoinResult<T> {
    if (this.byConn.has(conn)) {
      return { ok: false, code: 'already_joined' };
    }

    const open = [...this.rooms.keys()].filter((roomId) => this.roomSize(roomId) < MAX_PEERS);
    const roomId = open[this.pick(open.length)] ?? this.freshRoomId();
    return this.join(roomId, conn, id);
  }

  /** Idempotent. Deletes the room once it is empty. */
  leave(conn: T): LeaveResult<T> | null {
    const peer = this.byConn.get(conn);
    if (!peer) return null;

    this.byConn.delete(conn);
    const room = this.rooms.get(peer.roomId);
    if (!room) return { peer, other: null };

    room.delete(peer);
    const other = firstOf(room);
    if (room.size === 0) this.rooms.delete(peer.roomId);

    return { peer, other };
  }

  peerOf(conn: T): Peer<T> | undefined {
    return this.byConn.get(conn);
  }

  otherPeer(conn: T): Peer<T> | undefined {
    const peer = this.byConn.get(conn);
    if (!peer) return undefined;
    for (const candidate of this.rooms.get(peer.roomId) ?? []) {
      if (candidate !== peer) return candidate;
    }
    return undefined;
  }

  roomSize(roomId: string): number {
    return this.rooms.get(roomId)?.size ?? 0;
  }

  roomCount(): number {
    return this.rooms.size;
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
