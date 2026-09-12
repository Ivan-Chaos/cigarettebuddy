/**
 * Drizzle schema. Empty for v1: rooms live in the API's memory and nothing is
 * persisted yet. Postgres stays in the stack because the first real table
 * (reports) is coming, and keeping the migration pipeline warm costs nothing.
 *
 * Adding a table: declare it here, run `pnpm db:generate`, commit the SQL.
 */
export {};
