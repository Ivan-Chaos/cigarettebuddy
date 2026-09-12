import { appDirFrom, loadEnv } from '@cigbuddy/env';
import { z } from 'zod';

// apps/api/.env wins over the shared .env at the repo root; real environment
// variables (Docker, CI) win over both.
loadEnv({ appDir: appDirFrom(import.meta.url) });

/** Compose passes unset variables as empty strings; treat those as absent. */
const optionalString = z
  .string()
  .optional()
  .transform((value) => (value ? value : undefined));

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PORT: z.coerce.number().int().positive().default(3000),
    API_HOST: z.string().default('0.0.0.0'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    // Express `trust proxy` setting: a hop count ("1" behind Caddy/nginx),
    // "true", or a subnet keyword like "loopback". Unset means no proxy, so
    // X-Forwarded-* headers are ignored and cannot be spoofed.
    TRUST_PROXY: optionalString,
    // Header carrying the real client address when a CDN sits in front, e.g.
    // "cf-connecting-ip" for Cloudflare. Only honoured when TRUST_PROXY is set.
    CLIENT_IP_HEADER: optionalString,

    // ICE servers handed to browsers for WebRTC. Comma-separated URL lists.
    STUN_URLS: z.string().default(''),
    TURN_URLS: z.string().default(''),
    // Static credentials (coturn lt-cred-mech) ...
    TURN_USERNAME: optionalString,
    TURN_CREDENTIAL: optionalString,
    // ... or a shared secret (coturn use-auth-secret); wins when both are set.
    TURN_SECRET: optionalString,
    TURN_TTL_SECONDS: z.coerce.number().int().positive().default(86_400),
  })
  .refine(
    (value) =>
      !value.TURN_URLS.trim() ||
      Boolean(value.TURN_SECRET) ||
      Boolean(value.TURN_USERNAME && value.TURN_CREDENTIAL),
    {
      path: ['TURN_URLS'],
      message: 'TURN_URLS requires either TURN_SECRET or TURN_USERNAME + TURN_CREDENTIAL',
    },
  );

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  console.error(z.prettifyError(parsed.error));
  process.exit(1);
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Express accepts a boolean, a hop count, or a subnet keyword / CIDR list. */
function parseTrustProxy(value: string | undefined): boolean | number | string {
  if (!value) return false;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^\d+$/.test(value)) return Number(value);
  return value;
}

export const env = {
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === 'production',
  corsOrigins: splitList(parsed.data.CORS_ORIGIN),
  trustProxy: parseTrustProxy(parsed.data.TRUST_PROXY),
  stunUrls: splitList(parsed.data.STUN_URLS),
  turnUrls: splitList(parsed.data.TURN_URLS),
};

export type Env = typeof env;
