import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './env.js';
import { logger } from './logger.js';
import { createApiRouter, type ApiRouterOptions } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

export type AppOptions = ApiRouterOptions;

export function createApp(options: AppOptions = {}): Express {
  const app = express();

  app.disable('x-powered-by');
  // Behind Caddy/nginx `req.ip` and `req.protocol` come from X-Forwarded-*;
  // off by default so a direct client cannot forge them.
  app.set('trust proxy', env.trustProxy);
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/api/health/live' } }));

  app.use('/api', createApiRouter(options));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
