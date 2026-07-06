import Redis from 'ioredis';
import { getEnv } from '../config/env.js';
import { getLogger } from './logger.js';

let redis: Redis;

export function createRedis(): Redis {
  const env = getEnv();
  redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 5000);
      return delay;
    },
  });

  redis.on('error', (err) => {
    getLogger().error({ err }, 'Redis connection error');
  });

  redis.on('connect', () => {
    getLogger().info('Redis connected');
  });

  return redis;
}

export function getRedis(): Redis {
  if (!redis) {
    throw new Error('Redis not created. Call createRedis() first.');
  }
  return redis;
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
  }
}
