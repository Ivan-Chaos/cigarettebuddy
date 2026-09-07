import { Router, type Router as RouterType } from 'express';
import { sql } from '@cigbuddy/db';
import { db } from '../db.js';
import { asyncHandler } from '../lib/async-handler.js';

export const healthRouter: RouterType = Router();

/** Liveness: the process is up. */
healthRouter.get('/live', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

/** Readiness: the process is up *and* Postgres answers. */
healthRouter.get(
  '/ready',
  asyncHandler(async (_req, res) => {
    try {
      await db.execute(sql`select 1`);
      res.json({ status: 'ok', database: 'up' });
    } catch {
      res.status(503).json({ status: 'degraded', database: 'down' });
    }
  }),
);
