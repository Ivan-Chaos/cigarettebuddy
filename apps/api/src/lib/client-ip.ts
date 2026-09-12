import type { IncomingMessage } from 'node:http';

export type TrustProxy = boolean | number | string;

/**
 * Resolves the client address for a raw `IncomingMessage` — the WebSocket
 * upgrade never goes through Express, so `req.ip` is not available there.
 *
 * Mirrors the useful subset of Express's `trust proxy`: `false` means the
 * socket peer is the client; a hop count `n` picks the address `n` hops from
 * the right of X-Forwarded-For; anything else truthy trusts the whole chain
 * and takes the leftmost entry.
 */
export function clientIpFrom(req: IncomingMessage, trustProxy: TrustProxy): string {
  const remote = req.socket.remoteAddress ?? 'unknown';
  if (!trustProxy) return remote;

  const header = req.headers['x-forwarded-for'];
  const raw = Array.isArray(header) ? header.join(',') : header;
  const chain = (raw ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (chain.length === 0) return remote;

  if (typeof trustProxy === 'number') {
    // `remote` is the last proxy; hop 1 is the rightmost forwarded entry.
    const index = chain.length - trustProxy;
    return chain[Math.max(0, index)] ?? remote;
  }

  return chain[0] ?? remote;
}
