import { migrationsFolder, runMigrations } from '@cigbuddy/db';
import { env } from './env.js';
import { logger } from './logger.js';

/**
 * Container entrypoint for the release migration step. `pnpm db:migrate` runs
 * the equivalent script in packages/db for local development.
 */
try {
  await runMigrations({ connectionString: env.DATABASE_URL });
  logger.info(`Migrations applied from ${migrationsFolder}`);
} catch (err) {
  logger.error({ err }, 'Migration failed');
  process.exit(1);
}
