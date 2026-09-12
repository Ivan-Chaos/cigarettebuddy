import { Router, type Router as RouterType } from 'express';
import { env } from '../env.js';
import { healthRouter } from './health.js';
import { iceRouter } from './ice.js';

export const apiRouter: RouterType = Router();

apiRouter.use('/health', healthRouter);

// Debugging aid only. In production the sole way to obtain TURN credentials
// is to actually join a room over the signaling socket, which is rate-limited
// per address and mints a credential that expires after TURN_TTL_SECONDS.
if (!env.isProduction) {
  apiRouter.use('/ice', iceRouter);
}
