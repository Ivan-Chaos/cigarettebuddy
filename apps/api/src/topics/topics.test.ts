import { describe, expect, it } from 'vitest';
import { pino } from 'pino';
import type { Topic } from '@cigbuddy/shared';
import { createTopics, memoryTopicSource, type TopicSource } from './topics.js';

const quiet = pino({ enabled: false });

const CATALOG: Topic[] = [
  { id: 't-001', kind: 'opener', text: 'what did you have for breakfast' },
  { id: 't-002', kind: 'take', text: 'cereal is soup' },
  { id: 't-003', kind: 'divisive', text: 'should voting be compulsory' },
];

/** A source that fails at everything, i.e. a database that is down. */
const broken: TopicSource = {
  load: () => Promise.reject(new Error('no database')),
  sync: () => Promise.reject(new Error('no database')),
};

describe('topics', () => {
  it('serves the built-in catalogue before anything is synced', () => {
    const topics = createTopics(memoryTopicSource(), CATALOG, quiet);

    // The property that matters: no cold window. A room opened in the first
    // millisecond after boot still gets an icebreaker.
    expect(topics.size()).toBe(3);
    expect(topics.random()).not.toBeNull();
  });

  it('adopts what storage holds once synced', async () => {
    const stored: Topic = { id: 't-900', kind: 'opener', text: 'a topic somebody typed by hand' };
    const topics = createTopics(memoryTopicSource([stored]), [], quiet);

    await topics.sync();

    expect(topics.size()).toBe(1);
    expect(topics.random()).toEqual(stored);
  });

  it('seeds storage with the catalogue', async () => {
    const source = memoryTopicSource();
    const topics = createTopics(source, CATALOG, quiet);

    await topics.sync();

    expect(await source.load()).toHaveLength(3);
  });

  it('keeps serving the catalogue when the database is down', async () => {
    const topics = createTopics(broken, CATALOG, quiet);

    await expect(topics.sync()).resolves.toBeUndefined();

    expect(topics.size()).toBe(3);
    expect(topics.random()).not.toBeNull();
  });

  it('keeps the catalogue rather than adopting an empty table', async () => {
    // An operator who retired every row gets the built-ins back, not silence.
    const emptied: TopicSource = { load: () => Promise.resolve([]), sync: () => Promise.resolve() };
    const topics = createTopics(emptied, CATALOG, quiet);

    await topics.sync();

    expect(topics.size()).toBe(3);
    expect(topics.random()).not.toBeNull();
  });

  it('still reads the table when seeding it fails', async () => {
    const stored: Topic = { id: 't-900', kind: 'opener', text: 'the only one left active' };
    const readOnly: TopicSource = {
      // A read-only replica, or one constraint violation from a hand-edited
      // row. The rows are perfectly readable; a failed write must not cost the
      // operator every retirement they made.
      sync: () => Promise.reject(new Error('read-only transaction')),
      load: () => Promise.resolve([stored]),
    };
    const topics = createTopics(readOnly, CATALOG, quiet);

    await topics.sync();

    expect(topics.size()).toBe(1);
    expect(topics.random()).toEqual(stored);
  });

  it('drops rows that do not match the schema', async () => {
    const source: TopicSource = {
      sync: () => Promise.resolve(),
      load: () =>
        Promise.resolve([
          { id: 't-001', kind: 'opener', text: 'fine' },
          // A hand-edited row with a kind nobody defined.
          { id: 't-002', kind: 'nonsense', text: 'not fine' } as unknown as Topic,
        ]),
    };
    const topics = createTopics(source, CATALOG, quiet);

    await topics.sync();

    expect(topics.size()).toBe(1);
    expect(topics.random()?.id).toBe('t-001');
  });

  it('avoids the topics it is told to skip', () => {
    const topics = createTopics(memoryTopicSource(), CATALOG, quiet);

    for (let i = 0; i < 40; i++) {
      expect(topics.random(['t-001', 't-002'])?.id).toBe('t-003');
    }
  });

  it('still returns something when everything is excluded', () => {
    const topics = createTopics(memoryTopicSource(), CATALOG, quiet);

    // A button that does nothing because you have seen them all looks broken.
    expect(topics.random(['t-001', 't-002', 't-003'])).not.toBeNull();
  });

  it('returns null only when there is genuinely nothing', () => {
    const topics = createTopics(memoryTopicSource(), [], quiet);

    expect(topics.size()).toBe(0);
    expect(topics.random()).toBeNull();
  });
});
