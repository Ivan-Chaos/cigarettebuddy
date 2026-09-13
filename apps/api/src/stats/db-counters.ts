import { schema, sql, type Database } from '@cigbuddy/db';
import type { CounterKey, CounterPersistence } from './counters.js';

const { counters } = schema;

/**
 * Postgres-backed counters. Stays on the query builder: `bigint` comes back as
 * a number through `mode: 'number'`, whereas a raw `db.execute` would hand
 * back the driver's string.
 */
export function dbPersistence(db: Database): CounterPersistence {
  return {
    async load() {
      const rows = await db.select().from(counters);
      const out: Partial<Record<CounterKey, number>> = {};
      for (const row of rows) out[row.key as CounterKey] = row.value;
      return out;
    },

    async increment(key) {
      const [row] = await db
        .insert(counters)
        .values({ key, value: 1 })
        .onConflictDoUpdate({ target: counters.key, set: { value: sql`${counters.value} + 1` } })
        .returning({ value: counters.value });
      return row?.value ?? 0;
    },
  };
}
