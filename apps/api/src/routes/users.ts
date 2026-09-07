import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { createUserSchema, paginationSchema, updateUserSchema } from '@cigbuddy/shared';
import type { User } from '@cigbuddy/shared';
import { asc, count, eq, users, type UserRow } from '@cigbuddy/db';
import { db } from '../db.js';
import { asyncHandler } from '../lib/async-handler.js';
import { HttpError } from '../lib/http-error.js';

export const usersRouter: RouterType = Router();

const idParamSchema = z.object({ id: z.uuid('Expected a UUID') });

/** Rows carry Date objects; the API contract in @cigbuddy/shared uses ISO strings. */
function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
  };
}

usersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { limit, offset } = paginationSchema.parse(req.query);

    const [rows, [totals]] = await Promise.all([
      db.select().from(users).orderBy(asc(users.createdAt)).limit(limit).offset(offset),
      db.select({ value: count() }).from(users),
    ]);

    res.json({
      data: rows.map(toUser),
      meta: { total: totals?.value ?? 0, limit, offset },
    });
  }),
);

usersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!row) throw HttpError.notFound(`No user with id ${id}`);

    res.json({ data: toUser(row) });
  }),
);

usersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = createUserSchema.parse(req.body);

    const [row] = await db.insert(users).values(input).onConflictDoNothing().returning();

    if (!row) throw HttpError.conflict(`A user with email ${input.email} already exists`);

    res.status(201).json({ data: toUser(row) });
  }),
);

usersRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const input = updateUserSchema.parse(req.body);

    if (Object.keys(input).length === 0) {
      throw HttpError.badRequest('Provide at least one field to update');
    }

    const [row] = await db
      .update(users)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    if (!row) throw HttpError.notFound(`No user with id ${id}`);

    res.json({ data: toUser(row) });
  }),
);

usersRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const [row] = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });

    if (!row) throw HttpError.notFound(`No user with id ${id}`);

    res.status(204).send();
  }),
);
