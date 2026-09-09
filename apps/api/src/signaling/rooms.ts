import { randomUUID } from 'node:crypto';

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

/**
 * In-memory room bookkeeping, generic over the connection handle so it can be
 * unit-tested with plain objects and used with `WebSocket` at runtime.
 */
export class RoomManager<T> {
  private readonly rooms = new Map<string, Set<Peer<T>>>();
  private readonly byConn = new Map<T, Peer<T>>();

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
}

function firstOf<T>(room: Set<Peer<T>>): Peer<T> | null {
  for (const peer of room) return peer;
  return null;
}
