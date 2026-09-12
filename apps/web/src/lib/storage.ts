import { roomIdSchema } from '@cigbuddy/shared';

/**
 * The room this browser was last in. Written the moment a room is joined and
 * again on every way out, so it always names either the current room or the
 * one just left. `join-random` sends it as `avoidRoomId` so "next" and a fresh
 * visit never land straight back with the same person.
 *
 * `localStorage` can be missing or throw (Safari private mode, blocked site
 * data), so every access is guarded, as for `cb:age-ok` and `cb:visits`.
 */
export const LAST_ROOM_KEY = 'cb:last-room';

export function readLastRoom(): string | null {
  try {
    const parsed = roomIdSchema.safeParse(localStorage.getItem(LAST_ROOM_KEY));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeLastRoom(roomId: string): void {
  try {
    localStorage.setItem(LAST_ROOM_KEY, roomId);
  } catch {
    // Nothing to do: the guard is best-effort.
  }
}
