import { requireDatabaseUrl } from './env.js';
import { migrationsFolder, runMigrations } from './migrator.js';

await runMigrations({ connectionString: requireDatabaseUrl() });
console.log(`Migrations applied from ${migrationsFolder}`);
