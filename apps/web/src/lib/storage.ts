import { roomIdSchema } from '@cigbuddy/shared';

/*
 * Everything this browser remembers, all under `cb:`. `localStorage` can be
 * missing or throw (Safari private mode, blocked site data), so every access
 * is guarded and best-effort. `cb:age-ok` stays in AgeGate and app.html
 * because the no-flash script has to read it before any module runs.
 */

/**
 * The room this browser was last in. Written the moment a room is joined and
 * again on every way out, so it always names either the current room or the
 * one just left. `join-random` sends it as `avoidRoomId` so "next" and a fresh
 * visit never land straight back with the same person.
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

/**
 * How many times this browser has opened the front page. The old-web hit
 * counter joke, told honestly: it counts you, not the world.
 */
export const VISITS_KEY = 'cb:visits';

/** Adds one and returns the new total. Call it once per page load. */
export function bumpVisits(): number {
  try {
    const next = Number(localStorage.getItem(VISITS_KEY) ?? '0') + 1;
    localStorage.setItem(VISITS_KEY, String(next));
    return next;
  } catch {
    return 0;
  }
}
