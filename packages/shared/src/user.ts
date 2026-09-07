import { z } from 'zod';

/**
 * The wire shape of a user. Dates travel as ISO strings over HTTP, so this is
 * deliberately not the same type as the database row.
 */
export const userSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string().min(1).max(120),
  createdAt: z.iso.datetime(),
});

export const createUserSchema = z.object({
  email: z.email(),
  name: z.string().min(1).max(120),
});

export const updateUserSchema = createUserSchema.partial();

export type User = z.infer<typeof userSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
