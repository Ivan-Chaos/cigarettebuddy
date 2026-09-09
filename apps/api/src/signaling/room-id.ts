import { randomInt } from 'node:crypto';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const LENGTH = 10;

/** Random, URL-safe id that satisfies `roomIdSchema` in `@cigbuddy/shared`. */
export function generateRoomId(): string {
  let id = '';
  for (let i = 0; i < LENGTH; i += 1) id += ALPHABET[randomInt(ALPHABET.length)];
  return id;
}
