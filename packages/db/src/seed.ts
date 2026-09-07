import { requireDatabaseUrl } from './env.js';
import { createDatabase } from './client.js';
import { users } from './schema.js';

const { db, close } = createDatabase({ connectionString: requireDatabaseUrl(), max: 1 });

try {
  const inserted = await db
    .insert(users)
    .values([
      { email: 'ada@example.com', name: 'Ada Lovelace' },
      { email: 'alan@example.com', name: 'Alan Turing' },
    ])
    .onConflictDoNothing({ target: users.email })
    .returning();

  console.log(`Seeded ${inserted.length} user(s).`);
} finally {
  await close();
}
