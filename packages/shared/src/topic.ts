import { z } from 'zod';

/**
 * Conversation topics: the icebreaker a room puts on screen. The kinds are the
 * contract; the labels live next to them so the card and any later admin view
 * agree on the wording. Stored as plain text server-side, so adding a kind is a
 * change here and nowhere else.
 *
 * `divisive` doubles as the heat tag. It is a column rather than a flag inside
 * the text so that retiring the whole spicy half is one statement --
 * `update topics set active = false where kind = 'divisive'` -- with no deploy.
 */
export const TOPIC_KINDS = [
  'opener',
  'wyr',
  'take',
  'confession',
  'hypothetical',
  'divisive',
] as const;

export const topicKindSchema = z.enum(TOPIC_KINDS);

export type TopicKind = z.infer<typeof topicKindSchema>;

/** Long enough for a sentence, short enough that the card never pushes the
 *  button row off a phone screen. */
export const TOPIC_TEXT_MAX = 160;

export const topicSchema = z.object({
  /** Stable catalogue key, e.g. `t-042`. Survives a reword; never reused. */
  id: z.string().min(1).max(32),
  kind: topicKindSchema,
  text: z.string().min(1).max(TOPIC_TEXT_MAX),
});

export type Topic = z.infer<typeof topicSchema>;

export const TOPIC_KIND_LABELS: Record<TopicKind, string> = {
  opener: 'an opener',
  wyr: 'would you rather',
  take: 'a small opinion',
  confession: 'a confession',
  hypothetical: 'a hypothetical',
  divisive: 'a real argument',
};
