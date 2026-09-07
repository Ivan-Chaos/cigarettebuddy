import { Router, type Router as RouterType } from 'express';
import { healthRouter } from './health.js';
import { usersRouter } from './users.js';

export const apiRouter: RouterType = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/users', usersRouter);
