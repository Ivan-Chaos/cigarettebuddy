import { createHmac } from 'node:crypto';
import type { IceServer } from '@cigbuddy/shared';
import { env } from './env.js';

export interface IceConfig {
  stunUrls: string[];
  turnUrls: string[];
  /** Static username (lt-cred-mech) or the user part of an HMAC username. */
  turnUsername?: string;
  /** Static password (lt-cred-mech). Ignored when `turnSecret` is set. */
  turnCredential?: string;
  /** coturn `static-auth-secret` for `use-auth-secret`. Wins over static creds. */
  turnSecret?: string;
  turnTtlSeconds: number;
}

const FALLBACK_STUN = 'stun:stun.l.google.com:19302';
const DEFAULT_HMAC_USER = 'cigbuddy';

/**
 * Builds the `iceServers` list handed to browsers. Pure so it can be tested
 * with a fixed clock; `iceServersFromEnv()` is the runtime entry point.
 */
export function buildIceServers(cfg: IceConfig, now: number = Date.now()): IceServer[] {
  const servers: IceServer[] = [];

  if (cfg.stunUrls.length > 0) {
    servers.push({ urls: cfg.stunUrls });
  }

  if (cfg.turnUrls.length > 0) {
    if (cfg.turnSecret) {
      // coturn use-auth-secret: username = "<unix expiry>:<user>",
      // credential = base64(HMAC-SHA1(secret, username)).
      const expiry = Math.floor(now / 1000) + cfg.turnTtlSeconds;
      const username = `${expiry}:${cfg.turnUsername || DEFAULT_HMAC_USER}`;
      const credential = createHmac('sha1', cfg.turnSecret).update(username).digest('base64');
      servers.push({ urls: cfg.turnUrls, username, credential });
    } else if (cfg.turnUsername && cfg.turnCredential) {
      servers.push({
        urls: cfg.turnUrls,
        username: cfg.turnUsername,
        credential: cfg.turnCredential,
      });
    }
  }

  return servers.length > 0 ? servers : [{ urls: [FALLBACK_STUN] }];
}

/** Fresh list every call, so time-limited TURN credentials are minted per peer. */
export function iceServersFromEnv(): IceServer[] {
  return buildIceServers({
    stunUrls: env.stunUrls,
    turnUrls: env.turnUrls,
    turnUsername: env.TURN_USERNAME,
    turnCredential: env.TURN_CREDENTIAL,
    turnSecret: env.TURN_SECRET,
    turnTtlSeconds: env.TURN_TTL_SECONDS,
  });
}
