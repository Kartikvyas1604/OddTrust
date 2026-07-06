import pg from 'pg';
import { getEnv } from '../config/env.js';
import { getLogger } from './logger.js';

const { Pool } = pg;

let pool: pg.Pool;

export function createPostgresPool(): pg.Pool {
  const env = getEnv();
  pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err) => {
    getLogger().error({ err }, 'Unexpected Postgres pool error');
  });

  return pool;
}

export async function runMigrations(): Promise<void> {
  const log = getLogger();
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const { rows } = await client.query('SELECT name FROM _migrations ORDER BY id');
    const applied = new Set(rows.map((r: { name: string }) => r.name));

    const migrations = [
      { name: '001_initial', file: '001_initial.sql' },
    ];

    for (const m of migrations) {
      if (applied.has(m.name)) continue;
      log.info({ migration: m.name }, 'Applying migration');
      const { readFileSync } = await import('node:fs');
      const { join, dirname } = await import('node:path');
      const { fileURLToPath } = await import('node:url');
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const sql = readFileSync(join(__dirname, '../../migrations', m.file), 'utf-8');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [m.name]);
      log.info({ migration: m.name }, 'Migration applied');
    }
  } finally {
    client.release();
  }
}

export function getPostgresPool(): pg.Pool {
  if (!pool) {
    throw new Error('Postgres pool not created. Call createPostgresPool() first.');
  }
  return pool;
}

export async function closePostgresPool(): Promise<void> {
  if (pool) {
    await pool.end();
  }
}
