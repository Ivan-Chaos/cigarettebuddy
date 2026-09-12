import { createApp } from './app.js';
import { env } from './env.js';
import { iceServersFromEnv } from './ice.js';
import { logger } from './logger.js';
import { closeDatabase } from './db.js';
import { clientIpFrom } from './lib/client-ip.js';
import { attachSignaling } from './signaling/attach.js';

const app = createApp();
const server = app.listen(env.API_PORT, env.API_HOST, () => {
  logger.info(`API listening on http://${env.API_HOST}:${env.API_PORT} (${env.NODE_ENV})`);
});

// Browsers open the signaling socket directly, so in production only the
// configured web origins may upgrade. In development the Vite proxy sits in
// between and the Origin check would only get in the way — and every socket
// would share the proxy's address, so the per-IP cap is lifted there too.
const signaling = attachSignaling(server, {
  iceServers: iceServersFromEnv,
  allowedOrigins: env.isProduction ? env.corsOrigins : undefined,
  clientIp: (req) => clientIpFrom(req, env.trustProxy, env.CLIENT_IP_HEADER),
  maxConnectionsPerIp: env.isProduction ? undefined : Infinity,
});

async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down`);

  // Open WebSockets would otherwise keep server.close() pending until the
  // hard exit below.
  await signaling.close().catch((err) => logger.error({ err }, 'Error while closing signaling'));

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
