import { Router, type Router as RouterType } from 'express';
import { healthRouter } from './health.js';
import { iceRouter } from './ice.js';
import { usersRouter } from './users.js';

export const apiRouter: RouterType = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/ice', iceRouter);
apiRouter.use('/users', usersRouter);
