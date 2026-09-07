import { createApp } from './app.js';
import { env } from './env.js';
import { logger } from './logger.js';
import { closeDatabase } from './db.js';

const app = createApp();
const server = app.listen(env.API_PORT, env.API_HOST, () => {
  logger.info(`API listening on http://${env.API_HOST}:${env.API_PORT} (${env.NODE_ENV})`);
});

async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down`);

  server.close(async (err) => {
    if (err) logger.error({ err }, 'Error while closing HTTP server');
    await closeDatabase().catch((closeErr) =>
      logger.error({ err: closeErr }, 'Error while closing database pool'),
    );
    process.exit(err ? 1 : 0);
  });

  // Don't hang forever on lingering keep-alive sockets.
  setTimeout(() => process.exit(1), 10_000).unref();
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => void shutdown(signal));
}
