import { Router, type Router as RouterType } from 'express';
import { env } from '../env.js';
import { healthRouter } from './health.js';
import { iceRouter } from './ice.js';
import { createStatsRouter, type StatsSource } from './stats.js';

export interface ApiRouterOptions {
  /** Live counts for `/api/stats`. Absent in tests that only need the HTTP surface. */
  stats?: StatsSource;
}

export function createApiRouter({ stats }: ApiRouterOptions = {}): RouterType {
  const router = Router();

  router.use('/health', healthRouter);
  router.use('/stats', createStatsRouter(stats));

  // Debugging aid only. In production the sole way to obtain TURN credentials
  // is to actually join a room over the signaling socket, which is rate-limited
  // per address and mints a credential that expires after TURN_TTL_SECONDS.
  if (!env.isProduction) {
    router.use('/ice', iceRouter);
  }

  return router;
}
