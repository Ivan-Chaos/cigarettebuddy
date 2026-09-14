import { createApp } from './app.js';
import { closeDatabase, db } from './db.js';
import { env } from './env.js';
import { iceServersFromEnv } from './ice.js';
import { clientIpFrom } from './lib/client-ip.js';
import { logger } from './logger.js';
import { createDbReportStore } from './reports/store.js';
import { attachSignaling, type Signaling } from './signaling/attach.js';
import { createCounters } from './stats/counters.js';
import { dbPersistence } from './stats/db-counters.js';
import { TOPIC_CATALOG } from './topics/catalog.js';
import { dbTopicSource } from './topics/db-topics.js';
import { createTopics } from './topics/topics.js';

const counters = createCounters(dbPersistence(db));
// Not awaited: a slow database must not hold the port. The first increment
// heals the cache if this lost the race.
void counters.load();
const reportStore = createDbReportStore(db);

const topics = createTopics(dbTopicSource(db), TOPIC_CATALOG);
// Also not awaited, and safer than the counters: the cache already holds the
// built-in catalogue, so rooms opened before this lands are fully served.
void topics.sync();

// The Express app is built before the socket server exists, so the stats
// getter reads `signaling` lazily rather than at construction.
let signaling: Signaling | null = null;
const app = createApp({
  stats: () => ({
    online: signaling?.connectionCount() ?? 0,
    breaks: counters.get('breaks'),
  }),
  topic: () => topics.random(),
});
const server = app.listen(env.API_PORT, env.API_HOST, () => {
  logger.info(`API listening on http://${env.API_HOST}:${env.API_PORT} (${env.NODE_ENV})`);
});

// Browsers open the signaling socket directly, so in production only the
// configured web origins may upgrade. In development the Vite proxy sits in
// between and the Origin check would only get in the way — and every socket
// would share the proxy's address, so the per-IP cap is lifted there too.
signaling = attachSignaling(server, {
  iceServers: iceServersFromEnv,
  allowedOrigins: env.isProduction ? env.corsOrigins : undefined,
  clientIp: (req) => clientIpFrom(req, env.trustProxy, env.CLIENT_IP_HEADER),
  maxConnectionsPerIp: env.isProduction ? undefined : Infinity,
  pickTopic: (exclude) => topics.random(exclude),
  onReport: (report) =>
    void reportStore
      .save(report)
      .catch((err: unknown) => logger.error({ err, report }, 'Report not persisted')),
  onBreakCompleted: () => counters.increment('breaks'),
});

async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down`);

  // Open WebSockets would otherwise keep server.close() pending until the
  // hard exit below.
  await signaling
    ?.close()
    .catch((err: unknown) => logger.error({ err }, 'Error while closing signaling'));

  server.close(async (err) => {
    if (err) logger.error({ err }, 'Error while closing HTTP server');
    await closeDatabase().catch((closeErr: unknown) =>
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
