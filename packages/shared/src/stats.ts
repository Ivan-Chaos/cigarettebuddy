import { z } from 'zod';

/** Body of `GET /api/stats`, under the usual `{ data }` envelope. */
export const statsSchema = z.object({
  /** Open signaling sockets: people sitting in or waiting in a room. */
  online: z.number().int().nonnegative(),
  /** Cigarettes finished together since the counter started. */
  breaks: z.number().int().nonnegative(),
});

export type Stats = z.infer<typeof statsSchema>;
