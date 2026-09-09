import { describe, expect, it } from 'vitest';
import { roomIdSchema } from '@cigbuddy/shared';
import { RoomManager } from './rooms.js';

type Conn = { name: string };

describe('RoomManager', () => {
  it('lets the first peer in alone', () => {
    const rooms = new RoomManager<Conn>();
    const a = { name: 'a' };

    const result = rooms.join('room-1', a, 'peer-a');

    expect(result).toEqual({
      ok: true,
      peer: { id: 'peer-a', roomId: 'room-1', conn: a },
      other: null,
    });
    expect(rooms.roomSize('room-1')).toBe(1);
  });

  it('pairs the second peer with the first', () => {
    const rooms = new RoomManager<Conn>();
    const a = { name: 'a' };
    const b = { name: 'b' };
    rooms.join('room-1', a, 'peer-a');

    const result = rooms.join('room-1', b, 'peer-b');

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.other?.id).toBe('peer-a');
    expect(rooms.otherPeer(a)?.id).toBe('peer-b');
    expect(rooms.otherPeer(b)?.id).toBe('peer-a');
  });

  it('rejects a third peer', () => {
    const rooms = new RoomManager<Conn>();
    rooms.join('room-1', { name: 'a' });
    rooms.join('room-1', { name: 'b' });

    expect(rooms.join('room-1', { name: 'c' })).toEqual({ ok: false, code: 'room_full' });
    expect(rooms.roomSize('room-1')).toBe(2);
  });

  it('rejects the same connection joining twice', () => {
    const rooms = new RoomManager<Conn>();
    const a = { name: 'a' };
    rooms.join('room-1', a);

    expect(rooms.join('room-2', a)).toEqual({ ok: false, code: 'already_joined' });
  });

  it('reports the remaining peer on leave and deletes empty rooms', () => {
    const rooms = new RoomManager<Conn>();
    const a = { name: 'a' };
    const b = { name: 'b' };
    rooms.join('room-1', a, 'peer-a');
    rooms.join('room-1', b, 'peer-b');

    expect(rooms.leave(a)?.other?.id).toBe('peer-b');
    expect(rooms.roomSize('room-1')).toBe(1);
    expect(rooms.leave(b)?.other).toBeNull();
    expect(rooms.roomSize('room-1')).toBe(0);
    expect(rooms.roomCount()).toBe(0);
  });

  it('is idempotent for unknown connections', () => {
    const rooms = new RoomManager<Conn>();
    expect(rooms.leave({ name: 'ghost' })).toBeNull();
  });

  it('accepts a new peer once a full room drains', () => {
    const rooms = new RoomManager<Conn>();
    const a = { name: 'a' };
    rooms.join('room-1', a);
    rooms.join('room-1', { name: 'b' });
    rooms.leave(a);

    const result = rooms.join('room-1', { name: 'c' });
    expect(result.ok).toBe(true);
  });
});

describe('RoomManager.joinRandom', () => {
  const first = () => 0;

  it('opens a fresh room with a valid id when nothing is open', () => {
    const rooms = new RoomManager<Conn>();
    const a = { name: 'a' };

    const result = rooms.joinRandom(a, 'peer-a');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.other).toBeNull();
    expect(roomIdSchema.safeParse(result.peer.roomId).success).toBe(true);
    expect(rooms.roomCount()).toBe(1);
  });

  it('seats the second random joiner with the first', () => {
    const rooms = new RoomManager<Conn>();
    const a = { name: 'a' };
    const b = { name: 'b' };
    const joinedA = rooms.joinRandom(a, 'peer-a');
    const joinedB = rooms.joinRandom(b, 'peer-b');

    expect(joinedA.ok && joinedB.ok).toBe(true);
    if (!joinedA.ok || !joinedB.ok) return;
    expect(joinedB.peer.roomId).toBe(joinedA.peer.roomId);
    expect(joinedB.other?.id).toBe('peer-a');
    expect(rooms.roomCount()).toBe(1);
  });

  it('matches into a room that was joined directly by id', () => {
    const rooms = new RoomManager<Conn>();
    rooms.join('shared-link', { name: 'a' });

    const result = rooms.joinRandom({ name: 'b' });

    expect(result.ok && result.peer.roomId).toBe('shared-link');
  });

  it('skips full rooms and opens a new one instead', () => {
    const rooms = new RoomManager<Conn>({ pick: first });
    rooms.join('full', { name: 'a' });
    rooms.join('full', { name: 'b' });

    const result = rooms.joinRandom({ name: 'c' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.peer.roomId).not.toBe('full');
    expect(result.other).toBeNull();
    expect(rooms.roomCount()).toBe(2);
  });

  it('picks among the open rooms with the injected picker', () => {
    const picks: number[] = [];
    const rooms = new RoomManager<Conn>({
      pick: (count) => {
        picks.push(count);
        return count - 1;
      },
    });
    rooms.join('open-1', { name: 'a' });
    rooms.join('open-2', { name: 'b' });

    const result = rooms.joinRandom({ name: 'c' });

    expect(picks).toEqual([2]);
    expect(result.ok && result.peer.roomId).toBe('open-2');
  });

  it('retries generated ids that collide with existing rooms', () => {
    const ids = ['taken', 'taken', 'fresh'];
    const rooms = new RoomManager<Conn>({ newRoomId: () => ids.shift() ?? 'exhausted' });
    rooms.join('taken', { name: 'a' });
    rooms.join('taken', { name: 'b' });

    const result = rooms.joinRandom({ name: 'c' });

    expect(result.ok && result.peer.roomId).toBe('fresh');
  });

  it('rejects a connection that is already in a room', () => {
    const rooms = new RoomManager<Conn>();
    const a = { name: 'a' };
    rooms.join('room-1', a);

    expect(rooms.joinRandom(a)).toEqual({ ok: false, code: 'already_joined' });
  });

  it('matches a survivor once their peer leaves', () => {
    const rooms = new RoomManager<Conn>();
    const a = { name: 'a' };
    const b = { name: 'b' };
    const joinedA = rooms.joinRandom(a, 'peer-a');
    rooms.joinRandom(b, 'peer-b');
    rooms.leave(b);

    const result = rooms.joinRandom({ name: 'c' }, 'peer-c');

    expect(result.ok).toBe(true);
    if (!result.ok || !joinedA.ok) return;
    expect(result.peer.roomId).toBe(joinedA.peer.roomId);
    expect(result.other?.id).toBe('peer-a');
  });
});
