import { Router, type Router as RouterType } from 'express';
import { iceServersFromEnv } from '../ice.js';

export const iceRouter: RouterType = Router();

/**
 * The same ICE config the signaling server sends on `joined`. Handy for
 * checking TURN credentials from the command line; exposure is bounded by
 * CORS and the TURN credential TTL.
 */
iceRouter.get('/', (_req, res) => {
  res.json({ data: { iceServers: iceServersFromEnv() } });
});
