import { bigint, boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Drizzle schema. Rooms still live in the API's memory; only what has to
 * outlive a restart, or be editable without a deploy, lands here. Column names
 * are derived (`casing: 'snake_case'` in both the client and drizzle-kit), so
 * `roomId` is `room_id`.
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

/**
 * Icebreakers a room puts on screen. The canonical list is the catalogue in
 * `apps/api/src/topics/catalog.ts`; this table is its seeded, editable copy,
 * and the first table the API reads back rather than only writing.
 *
 * `source` decides who owns a row. The API's boot sync rewrites `catalog` rows
 * and retires ones that have left the catalogue, but never touches a `manual`
 * row added by hand here -- so an operator can add or reword a topic in the
 * database and a redeploy will not stamp on it.
 *
 * The key is natural, like `counters`: a surrogate id on a few hundred rows
 * whose stable key you already have is noise, and it lets the wire `topic.id`
 * simply be the row's key.
 */
export const topics = pgTable('topics', {
  /** Catalogue key, e.g. `t-042`. Survives a reword of `text`; never reused. */
  key: text().primaryKey(),
  text: text().notNull(),
  /** Plain text rather than a pg enum: a new kind is a `@cigbuddy/shared` change, not a migration. */
  kind: text().notNull(),
  /** Retired topics stay for the record and are never picked. */
  active: boolean().notNull().default(true),
  /**
   * Defaults to `manual` so a hand-written `insert` is owned by whoever wrote
   * it. `catalog` would be the dangerous default: the boot sync retires every
   * `catalog` row that is not in the catalogue, so an operator's new topic
   * would serve fine until the next restart and then silently vanish. The sync
   * writes `catalog` explicitly, so it never relies on this.
   */
  source: text().notNull().default('manual'),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
