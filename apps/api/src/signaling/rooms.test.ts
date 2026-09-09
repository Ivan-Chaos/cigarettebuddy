import { describe, expect, it } from 'vitest';
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
