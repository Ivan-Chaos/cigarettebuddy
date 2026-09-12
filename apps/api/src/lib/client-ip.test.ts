import type { IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';
import { clientIpFrom } from './client-ip.js';

function req(forwarded: string | undefined, remote = '10.0.0.1'): IncomingMessage {
  return {
    headers: forwarded === undefined ? {} : { 'x-forwarded-for': forwarded },
    socket: { remoteAddress: remote },
  } as unknown as IncomingMessage;
}

describe('clientIpFrom', () => {
  it('ignores forwarded headers when no proxy is trusted', () => {
    expect(clientIpFrom(req('198.51.100.9'), false)).toBe('10.0.0.1');
  });

  it('walks back the configured number of hops', () => {
    expect(clientIpFrom(req('198.51.100.9, 192.0.2.1'), 1)).toBe('192.0.2.1');
    expect(clientIpFrom(req('198.51.100.9, 192.0.2.1'), 2)).toBe('198.51.100.9');
    // More hops than entries: the leftmost is the best available guess.
    expect(clientIpFrom(req('198.51.100.9'), 3)).toBe('198.51.100.9');
  });

  it('takes the leftmost entry when the whole chain is trusted', () => {
    expect(clientIpFrom(req('198.51.100.9, 192.0.2.1'), true)).toBe('198.51.100.9');
    expect(clientIpFrom(req('198.51.100.9, 192.0.2.1'), 'loopback')).toBe('198.51.100.9');
  });

  it('falls back to the socket peer without a header', () => {
    expect(clientIpFrom(req(undefined), 1)).toBe('10.0.0.1');
  });

  it('prefers the CDN header when one is configured and a proxy is trusted', () => {
    const r = req('198.51.100.9, 192.0.2.1');
    r.headers['cf-connecting-ip'] = '203.0.113.42';

    expect(clientIpFrom(r, 1, 'CF-Connecting-IP')).toBe('203.0.113.42');
    // Not trusted: the header is ignored like every other forwarded header.
    expect(clientIpFrom(r, false, 'cf-connecting-ip')).toBe('10.0.0.1');
    // Configured but absent: fall through to X-Forwarded-For.
    expect(clientIpFrom(req('198.51.100.9, 192.0.2.1'), 1, 'cf-connecting-ip')).toBe('192.0.2.1');
  });
});
