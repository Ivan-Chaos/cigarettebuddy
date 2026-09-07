import type { RequestHandler } from 'express';

/**
 * Express 5 forwards rejected promises to the error middleware on its own, but
 * wrapping keeps handler signatures explicit and works for nested callbacks too.
 */
export function asyncHandler<H extends RequestHandler>(handler: H): RequestHandler {
  return (req, res, next) => {
    void Promise.resolve(handler(req, res, next)).catch(next);
  };
}
