import { loadEnv, getEnv } from './config';
import { createLogger, getLogger } from './logger';
import { createPostgresPool } from './postgres';
import { createRedis } from './redis';

let initialized = false;
let degraded = false;

export function ensureInit(): void {
  if (initialized) return;
  initialized = true;

  try {
    loadEnv();
  } catch {
    degraded = true;
    return;
  }
  createLogger();

  const env = getEnv();

  try {
    createPostgresPool({ connectionString: env.DATABASE_URL });
  } catch (err) {
    getLogger().warn({ err }, 'Postgres unavailable — running in degraded mode');
    degraded = true;
    return;
  }

  try {
    createRedis(env.REDIS_URL);
  } catch (err) {
    getLogger().warn({ err }, 'Redis unavailable — running in degraded mode');
    degraded = true;
  }

  if (!degraded) {
    getLogger().info('OddsTrust API initialized');
  }
}

export function isDegraded(): boolean {
  return degraded;
}

export function isReady(): boolean {
  return initialized && !degraded;
}

export function setDegraded(value: boolean): void {
  degraded = value;
}

export async function shutdown(): Promise<void> {
  const { closePostgresPool } = await import('./postgres');
  const { closeRedis } = await import('./redis');
  await Promise.allSettled([closePostgresPool(), closeRedis()]);
}
