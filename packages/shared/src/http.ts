import { z } from 'zod';

/** Envelope every error handler in apps/api responds with. */
export const apiErrorSchema = z.object({
  error: z.object({
    message: z.string(),
    code: z.string(),
    details: z.unknown().optional(),
  }),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
