import { Router, type Router as RouterType } from 'express';
import type { Stats } from '@cigbuddy/shared';

/** Reads the live numbers. Wired in `index.ts`, where the socket server lives. */
export type StatsSource = () => Stats;

export function createStatsRouter(source?: StatsSource): RouterType {
  const router = Router();

  router.get('/', (_req, res) => {
    // The landing page polls this; a cached zero would be a lie.
    res.set('Cache-Control', 'no-store');

    if (!source) {
      res.status(503).json({
        error: { message: 'Stats are not available on this server', code: 'stats_unavailable' },
      });
      return;
    }

    res.json({ data: source() });
  });

  return router;
}
