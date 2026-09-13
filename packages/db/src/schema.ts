import { bigint, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Drizzle schema. Rooms still live in the API's memory; only what has to
 * outlive a restart lands here. Column names are derived (`casing:
 * 'snake_case'` in both the client and drizzle-kit), so `roomId` is `room_id`.
 *
 * Adding a table: declare it here, run `pnpm db:generate`, commit the SQL.
 * Rows are not wire types: the API maps them to the shared Zod shapes.
 */

/** One "Leave and report". Ids are the signaling peer ids, which are per-visit. */
export const reports = pgTable('reports', {
  id: uuid().primaryKey().defaultRandom(),
  roomId: text().notNull(),
  reporterId: text().notNull(),
  /** Null when the reporter was alone in the room. */
  reportedId: text(),
  /** Plain text rather than a pg enum: a new reason is a `@cigbuddy/shared` change, not a migration. */
  reason: text().notNull(),
  note: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** Global tallies, one row per key. `breaks` is the first. */
export const counters = pgTable('counters', {
  key: text().primaryKey(),
  value: bigint({ mode: 'number' }).notNull().default(0),
});
