import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createDatabase } from './client.js';

/**
 * Migrations live next to this module, which holds true both when running from
 * source (`packages/db/src/migrations`) and from a bundle that copies the SQL
 * files alongside itself (`dist/migrations`).
 */
export const migrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'migrations',
);

export interface RunMigrationsOptions {
  connectionString: string;
  folder?: string;
}

export async function runMigrations({
  connectionString,
  folder = migrationsFolder,
}: RunMigrationsOptions): Promise<void> {
  const { db, close } = createDatabase({ connectionString, max: 1 });

  try {
    await migrate(db, { migrationsFolder: folder });
  } finally {
    await close();
  }
}
