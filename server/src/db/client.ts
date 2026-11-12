import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { schema } from './schema.js';

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export interface DbHandle {
  db: Db;
  kind: 'postgres' | 'pglite';
  migrate: () => Promise<void>;
  close: () => Promise<void>;
}

const here = path.dirname(fileURLToPath(import.meta.url));
export const MIGRATIONS_DIR = path.resolve(here, '../../drizzle');

// postgres://... - обычный Postgres, pglite:<папка> или pglite:memory - встроенный.
// Без DATABASE_URL поднимается pglite в .data, чтобы локально ничего не ставить.
export async function createDb(url = process.env.DATABASE_URL): Promise<DbHandle> {
  const conn = url && url.trim() !== '' ? url.trim() : 'pglite:.data/pglite';

  if (conn.startsWith('postgres://') || conn.startsWith('postgresql://')) {
    const { Pool } = await import('pg');
    const { drizzle } = await import('drizzle-orm/node-postgres');
    const { migrate } = await import('drizzle-orm/node-postgres/migrator');
    const pool = new Pool({ connectionString: conn, max: 5 });
    const db = drizzle(pool, { schema });
    return {
      db: db as unknown as Db,
      kind: 'postgres',
      migrate: () => migrate(db, { migrationsFolder: MIGRATIONS_DIR }),
      close: () => pool.end(),
    };
  }

  if (conn.startsWith('pglite:')) {
    const target = conn.slice('pglite:'.length);
    const { PGlite } = await import('@electric-sql/pglite');
    const { drizzle } = await import('drizzle-orm/pglite');
    const { migrate } = await import('drizzle-orm/pglite/migrator');
    let client: InstanceType<typeof PGlite>;
    if (target === 'memory') client = new PGlite();
    else {
      const dir = path.resolve(target);
      fs.mkdirSync(dir, { recursive: true });
      client = new PGlite(dir);
    }
    const db = drizzle(client, { schema });
    return {
      db: db as unknown as Db,
      kind: 'pglite',
      migrate: () => migrate(db, { migrationsFolder: MIGRATIONS_DIR }),
      close: () => client.close(),
    };
  }

  throw new Error(`Unsupported DATABASE_URL: ${conn}`);
}
