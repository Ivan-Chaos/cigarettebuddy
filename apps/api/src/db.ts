import { createDatabase } from '@cigbuddy/db';
import { env } from './env.js';

const connection = createDatabase({ connectionString: env.DATABASE_URL });

export const db = connection.db;
export const closeDatabase = connection.close;
