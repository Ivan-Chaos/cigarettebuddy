import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

export type Database = ReturnType<typeof createDatabase>['db'];

export interface CreateDatabaseOptions {
  connectionString: string;
  /** postgres.js pool size. Keep it at 1 for one-shot scripts and migrations. */
  max?: number;
}

export function createDatabase({ connectionString, max = 10 }: CreateDatabaseOptions) {
  const sql = postgres(connectionString, { max, onnotice: () => {} });
  const db = drizzle(sql, { schema, casing: 'snake_case' });

  return {
    db,
    sql,
    /** Close the pool — call this on server shutdown. */
    close: () => sql.end({ timeout: 5 }),
  };
}
