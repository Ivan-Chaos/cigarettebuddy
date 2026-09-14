import { and, eq, notInArray, schema, sql, type Database } from '@cigbuddy/db';
import type { Topic, TopicKind } from '@cigbuddy/shared';
import type { TopicSource } from './topics.js';

const { topics } = schema;

/**
 * Postgres-backed topics. The row is not the wire type: `key` is the wire
 * `id`, and `active`/`source`/`createdAt` never leave this file.
 */
export function dbTopicSource(db: Database): TopicSource {
  return {
    async load() {
      const rows = await db.select().from(topics).where(eq(topics.active, true));
      // `kind` is widened here and narrowed by `topicSchema` in `createTopics`,
      // which is the one place a hand-edited row gets checked.
      return rows.map((row) => ({ id: row.key, kind: row.kind as TopicKind, text: row.text }));
    },

    async sync(catalog: readonly Topic[]) {
      if (catalog.length === 0) return;

      // Four bind parameters per row: a few hundred topics is nowhere near
      // Postgres' 65535 ceiling. Chunk this if the catalogue ever passes ~10k.
      await db
        .insert(topics)
        .values(
          catalog.map((topic) => ({
            key: topic.id,
            text: topic.text,
            kind: topic.kind,
            source: 'catalog',
          })),
        )
        .onConflictDoUpdate({
          target: topics.key,
          // `active` is pointedly not in here. The sync owns it in one
          // direction only: it can retire a topic (below), never revive one.
          // Setting it true on every boot would undo the whole point of the
          // column -- `update topics set active = false where kind =
          // 'divisive'` has to survive the next deploy, or it is not a switch.
          // The cost is that a topic which leaves the catalogue and comes back
          // stays off until somebody turns it on, which is the right way round.
          set: { text: sql`excluded.text`, kind: sql`excluded.kind` },
          // A row someone edited or added by hand is theirs, not the
          // catalogue's, so a redeploy never stamps on it.
          setWhere: sql`${topics.source} = 'catalog'`,
        });

      // Dropped from the catalogue: retired, not deleted. The row stays for the
      // record, and a topic that comes back gets its old key and its history.
      await db
        .update(topics)
        .set({ active: false })
        .where(
          and(
            eq(topics.source, 'catalog'),
            notInArray(
              topics.key,
              catalog.map((topic) => topic.id),
            ),
          ),
        );
    },
  };
}
