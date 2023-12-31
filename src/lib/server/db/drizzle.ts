import Pg from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_URL } from '$env/static/private';
import * as schema from './schema';

declare let global: typeof globalThis & {
  db: NodePgDatabase<typeof schema> | undefined;
};

const db: NodePgDatabase<typeof schema> =
  global.db ||
  drizzle(
    new Pg.Pool({
      connectionString: DATABASE_URL + '?sslmode=require',
    }),
    {
      schema,
    },
  );

// Save the instance outside of the scope of this script for reuse
if (process.env.NODE_ENV === 'development') {
  global.db = db;
}

export { db };
