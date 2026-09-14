import { describe, expect, it } from 'vitest';
import { TOPIC_KINDS, TOPIC_TEXT_MAX, topicSchema, type TopicKind } from '@cigbuddy/shared';
import { TOPIC_CATALOG } from './catalog.js';

/**
 * The voice, made mechanical. Everything about these topics that a machine can
 * check, a machine should check -- the rest is taste, and taste belongs in
 * review. This is the file that stops the catalogue drifting into sentence case
 * and exclamation marks two hundred entries from now.
 */
describe('the topic catalogue', () => {
  it('has enough to keep a room going', () => {
    expect(TOPIC_CATALOG.length).toBeGreaterThanOrEqual(200);
  });

  it('uses every kind', () => {
    const counts = new Map<TopicKind, number>();
    for (const topic of TOPIC_CATALOG) {
      counts.set(topic.kind, (counts.get(topic.kind) ?? 0) + 1);
    }

    for (const kind of TOPIC_KINDS) {
      expect(counts.get(kind) ?? 0, `no topics of kind ${kind}`).toBeGreaterThan(0);
    }
  });

  it('matches the wire shape', () => {
    for (const topic of TOPIC_CATALOG) {
      const parsed = topicSchema.safeParse(topic);
      expect(parsed.success, `${topic.id} does not parse`).toBe(true);
    }
  });

  it('keeps every key unique, because keys are never reused', () => {
    const keys = TOPIC_CATALOG.map((topic) => topic.id);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('never says the same thing twice', () => {
    const normalised = TOPIC_CATALOG.map((topic) =>
      topic.text.toLowerCase().replace(/\s+/g, ' ').trim(),
    );
    const seen = new Set<string>();
    for (const [index, text] of normalised.entries()) {
      expect(seen.has(text), `${TOPIC_CATALOG[index]?.id} duplicates an earlier topic`).toBe(false);
      seen.add(text);
    }
  });

  it('fits on a card', () => {
    for (const topic of TOPIC_CATALOG) {
      expect(topic.text.length, `${topic.id} is too long`).toBeLessThanOrEqual(TOPIC_TEXT_MAX);
    }
  });

  it('never raises its voice', () => {
    for (const topic of TOPIC_CATALOG) {
      expect(topic.text, `${topic.id} has an exclamation mark`).not.toMatch(/!/);
      // Shouting, as opposed to an initialism, which none of these need either.
      expect(topic.text, `${topic.id} shouts`).not.toMatch(/\b[A-Z]{2,}\b/);
    }
  });

  it('stays lowercase, like the slogans', () => {
    for (const topic of TOPIC_CATALOG) {
      expect(topic.text[0], `${topic.id} starts with a capital`).toBe(topic.text[0]?.toLowerCase());
    }
  });

  it('is trimmed', () => {
    for (const topic of TOPIC_CATALOG) {
      expect(topic.text, `${topic.id} has stray whitespace`).toBe(topic.text.trim());
    }
  });
});
