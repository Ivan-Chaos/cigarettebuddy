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
 *
 * `clientHeader` short-circuits all of that: when a CDN such as Cloudflare
 * sits in front, X-Forwarded-For only ever names its edge nodes, and hundreds
 * of visitors would share one address. The CDN's own header (Cloudflare:
 * `cf-connecting-ip`) is the client, provided only the CDN can reach the box.
 */
export function clientIpFrom(
  req: IncomingMessage,
  trustProxy: TrustProxy,
  clientHeader?: string,
): string {
  const remote = req.socket.remoteAddress ?? 'unknown';
  if (!trustProxy) return remote;

  if (clientHeader) {
    const direct = req.headers[clientHeader.toLowerCase()];
    const value = Array.isArray(direct) ? direct[0] : direct;
    if (value?.trim()) return value.trim();
  }

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
