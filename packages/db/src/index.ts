export * from './client.js';
export * from './migrator.js';
export * as schema from './schema.js';
export { users } from './schema.js';
export type { UserRow, NewUserRow } from './schema.js';

// Re-exported so consumers can build queries without depending on drizzle-orm directly.
export { and, asc, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
