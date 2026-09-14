import { Router, type Router as RouterType } from 'express';
import type { Topic } from '@cigbuddy/shared';

/** Reads one topic. Wired in `index.ts`, next to the socket server. */
export type TopicSourceFn = () => Topic | null;

export function createTopicsRouter(source?: TopicSourceFn): RouterType {
  const router = Router();

  router.get('/random', (_req, res) => {
    // A cached random topic is not a random topic.
    res.set('Cache-Control', 'no-store');

    const topic = source?.();
    if (!topic) {
      res.status(503).json({
        error: { message: 'No topics on this server', code: 'topics_unavailable' },
      });
      return;
    }

    res.json({ data: topic });
  });

  return router;
}
