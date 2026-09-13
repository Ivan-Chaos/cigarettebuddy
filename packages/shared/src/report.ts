import { z } from 'zod';

/**
 * Why somebody hit "Leave and report". The enum is the contract; the labels
 * live next to it so the room's dialog and any later admin view agree on the
 * wording. Stored as plain text server-side, so adding a reason is a change
 * here and nowhere else.
 */
export const REPORT_REASONS = ['nudity', 'harassment', 'underage', 'spam', 'other'] as const;

export const reportReasonSchema = z.enum(REPORT_REASONS);

export type ReportReason = z.infer<typeof reportReasonSchema>;

export const REPORT_NOTE_MAX = 500;

/** Trimmed on the way in, so a note of spaces arrives as an empty string. */
export const reportNoteSchema = z.string().trim().max(REPORT_NOTE_MAX);

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  nudity: 'Nudity or sexual behaviour',
  harassment: 'Harassment, threats or hate',
  underage: 'Looks underage',
  spam: 'Spam, scams or selling something',
  other: 'Something else',
};
