import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError, z } from 'zod';
import type { ApiError } from '@cigbuddy/shared';
import { HttpError } from '../lib/http-error.js';
import { env } from '../env.js';
import { logger } from '../logger.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(HttpError.notFound(`Cannot ${req.method} ${req.originalUrl}`));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const { status, body } = toApiError(err);

  if (status >= 500) {
    logger.error({ err }, 'Unhandled request error');
  }

  res.status(status).json(body);
};

function toApiError(err: unknown): { status: number; body: ApiError } {
  if (err instanceof ZodError) {
    return {
      status: 400,
      body: {
        error: {
          message: 'Request validation failed',
          code: 'validation_error',
          details: z.treeifyError(err),
        },
      },
    };
  }

  if (err instanceof HttpError) {
    return {
      status: err.status,
      body: { error: { message: err.message, code: err.code, details: err.details } },
    };
  }

  return {
    status: 500,
    body: {
      error: {
        message: env.isProduction ? 'Internal server error' : String(err),
        code: 'internal_error',
      },
    },
  };
}
