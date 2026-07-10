import pg from 'pg';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { getLogger } from './logger';

const { Pool } = pg;

let pool: pg.Pool;

export interface DbConfig {
  connectionString: string;
  max?: number;
}

export function createPostgresPool(config: DbConfig): pg.Pool {
  pool = new Pool({
    connectionString: config.connectionString,
    max: config.max ?? 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err) => {
    try {
      getLogger().error({ err }, 'Unexpected Postgres pool error');
    } catch {
      console.error('Postgres pool error:', err.message);
    }
  });

  // Test connection synchronously by attempting a query
  pool.query('SELECT 1').catch(() => {
    // Connection failed — will be caught by ensureInit
  });

  return pool;
}

export function getPostgresPool(): pg.Pool {
  if (!pool) {
    throw new Error('Postgres pool not created. Call createPostgresPool() first.');
  }
  return pool;
}

export async function runMigrations(migrationsDir: string): Promise<void> {
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

    const migrationFiles = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      const name = file.replace('.sql', '');
      if (applied.has(name)) continue;
      log.info({ migration: name }, 'Applying migration');
      const sql = readFileSync(join(migrationsDir, file), 'utf-8');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [name]);
      log.info({ migration: name }, 'Migration applied');
    }
  } finally {
    client.release();
  }
}

export async function closePostgresPool(): Promise<void> {
  if (pool) {
    await pool.end();
  }
}
