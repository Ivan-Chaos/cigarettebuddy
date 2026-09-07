import { defineConfig } from 'drizzle-kit';
import { requireDatabaseUrl } from './src/env.js';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './src/migrations',
  casing: 'snake_case',
  dbCredentials: {
    url: requireDatabaseUrl(),
  },
  strict: true,
  verbose: true,
});
