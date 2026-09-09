const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const LENGTH = 10;

/** Random, URL-safe id that satisfies `roomIdSchema`. */
export function generateRoomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(LENGTH));
  let id = '';
  for (const byte of bytes) id += ALPHABET[byte % ALPHABET.length];
  return id;
}
