import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildIceServers } from './ice.js';

const base = { stunUrls: [], turnUrls: [], turnTtlSeconds: 3600 };

describe('buildIceServers', () => {
  it('falls back to a public STUN server when nothing is configured', () => {
    expect(buildIceServers(base)).toEqual([{ urls: ['stun:stun.l.google.com:19302'] }]);
  });

  it('returns only the configured STUN servers', () => {
    const servers = buildIceServers({ ...base, stunUrls: ['stun:stun.example.com:3478'] });
    expect(servers).toEqual([{ urls: ['stun:stun.example.com:3478'] }]);
  });

  it('passes static TURN credentials through', () => {
    const servers = buildIceServers({
      ...base,
      turnUrls: ['turn:turn.example.com:3478', 'turns:turn.example.com:5349'],
      turnUsername: 'alice',
      turnCredential: 'secret',
    });

    expect(servers).toEqual([
      {
        urls: ['turn:turn.example.com:3478', 'turns:turn.example.com:5349'],
        username: 'alice',
        credential: 'secret',
      },
    ]);
  });

  it('mints coturn use-auth-secret credentials with an expiry', () => {
    const now = 1_700_000_000_000;
    const [turn] = buildIceServers(
      { ...base, turnUrls: ['turn:turn.example.com:3478'], turnSecret: 'shh', turnUsername: 'bob' },
      now,
    );

    const expectedUsername = `${1_700_000_000 + 3600}:bob`;
    expect(turn?.username).toBe(expectedUsername);
    expect(turn?.credential).toBe(
      createHmac('sha1', 'shh').update(expectedUsername).digest('base64'),
    );
  });

  it('prefers the shared secret over static credentials and defaults the user', () => {
    const [turn] = buildIceServers(
      {
        ...base,
        turnUrls: ['turn:turn.example.com:3478'],
        turnSecret: 'shh',
        turnCredential: 'ignored',
      },
      0,
    );

    expect(turn?.username).toBe('3600:cigbuddy');
    expect(turn?.credential).not.toBe('ignored');
  });

  it('produces different credentials at different times', () => {
    const cfg = { ...base, turnUrls: ['turn:turn.example.com:3478'], turnSecret: 'shh' };
    const [first] = buildIceServers(cfg, 0);
    const [second] = buildIceServers(cfg, 60_000);

    expect(first?.credential).not.toBe(second?.credential);
  });

  it('omits TURN when credentials are missing', () => {
    const servers = buildIceServers({
      ...base,
      stunUrls: ['stun:stun.example.com:3478'],
      turnUrls: ['turn:turn.example.com:3478'],
    });

    expect(servers).toEqual([{ urls: ['stun:stun.example.com:3478'] }]);
  });
});
