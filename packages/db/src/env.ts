import { loadEnv } from '@cigbuddy/env';

// The database is shared infrastructure, so the CLI scripts and drizzle-kit
// deliberately read only the repo-root .env — never an individual app's, which
// would let migrations run against a different database than the API uses.
loadEnv();

export function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env at the repo root.');
  }
  return url;
}
