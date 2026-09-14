import { topicSchema, type Topic } from '@cigbuddy/shared';
import { logger, type Logger } from '../logger.js';

/**
 * Where topics are kept between restarts. The store in front of it does the
 * caching, so these are the only two operations that touch a database.
 */
export interface TopicSource {
  /** Every active topic. */
  load(): Promise<Topic[]>;
  /** Idempotent seed: writes the catalogue and retires rows that have left it. */
  sync(catalog: readonly Topic[]): Promise<void>;
}

export interface Topics {
  /** Synchronous and total: null only when there is genuinely nothing to pick. */
  random(exclude?: readonly string[]): Topic | null;
  /** Seeds the source, then warms the cache. Failure is logged, not thrown. */
  sync(): Promise<void>;
  size(): number;
}

/**
 * Topics with an in-memory cache in front of storage, like `counters`. Two
 * differences from that one, both deliberate:
 *
 * The cache starts full. It is seeded from the compiled-in catalogue at
 * construction rather than at the end of `sync()`, so there is no window after
 * boot where a room opens and gets nothing -- and a database that is down, or
 * a table that the migrate step has not created yet, costs nothing at all. The
 * catalogue is already in the bundle; falling back to it is free.
 *
 * Rows are validated on the way *out* of storage rather than trusted. `topics`
 * is hand-editable by design, so a row someone typed badly is dropped here
 * rather than broadcast to a room.
 */
export function createTopics(
  source: TopicSource,
  catalog: readonly Topic[],
  log: Logger = logger,
): Topics {
  let cache: Topic[] = [...catalog];

  return {
    random(exclude = []) {
      if (cache.length === 0) return null;

      // Fall back to the whole list rather than returning null: a button that
      // does nothing because you have seen everything looks broken.
      const pool = cache.filter((topic) => !exclude.includes(topic.id));
      const from = pool.length > 0 ? pool : cache;
      return from[Math.floor(Math.random() * from.length)] ?? null;
    },

    async sync() {
      // Seeding and reading are separate attempts on purpose. They share no
      // data, and a table this process cannot *write* is very often still one
      // it can read -- a read-only replica, a read-only transaction, one
      // constraint violation from a hand-edited row. Gating the read on the
      // write would throw away every retirement the operator made, which is
      // the one thing the database is here to own.
      try {
        await source.sync(catalog);
      } catch (err) {
        log.warn({ err }, 'Topics not seeded; reading the table anyway');
      }

      try {
        const rows = await source.load();

        const valid: Topic[] = [];
        for (const row of rows) {
          const parsed = topicSchema.safeParse(row);
          if (parsed.success) valid.push(parsed.data);
          // The issues, not just the id: this is the only check a hand-edited
          // row gets, and "it did not parse" is not an actionable thing to read
          // at three in the morning. The Zod caps are tighter than the columns.
          else log.warn({ id: row.id, issues: parsed.error.issues }, 'Skipped a topic row');
        }

        // An empty table means every topic was retired by hand, which is a
        // choice; an empty *catalogue* would be a bug. Either way, adopting an
        // empty list over a full one is never what the operator meant.
        if (valid.length > 0) cache = valid;
        else log.warn('No active topics in storage; keeping the built-in catalogue');
      } catch (err) {
        log.warn({ err }, 'Topics not loaded; serving the built-in catalogue');
      }
    },

    size: () => cache.length,
  };
}

/** Keeps topics in the process only. For tests and databaseless runs. */
export function memoryTopicSource(initial: Topic[] = []): TopicSource {
  let rows = [...initial];
  return {
    load: () => Promise.resolve([...rows]),
    sync(catalog) {
      const known = new Set(rows.map((topic) => topic.id));
      rows = [...rows, ...catalog.filter((topic) => !known.has(topic.id))];
      return Promise.resolve();
    },
  };
}
