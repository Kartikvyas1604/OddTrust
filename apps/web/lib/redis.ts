import Redis from 'ioredis';
import { getLogger } from './logger';

let redis: Redis;
let subscriber: Redis;

export function createRedis(url: string): Redis {
  redis = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
    retryStrategy(times) {
      return Math.min(times * 200, 5000);
    },
  });

  redis.on('error', (err) => {
    try {
      getLogger().error({ err }, 'Redis connection error');
    } catch {
      console.error('Redis error:', err.message);
    }
  });

  redis.on('connect', () => {
    try {
      getLogger().info('Redis connected');
    } catch {
      console.log('Redis connected');
    }
  });

  return redis;
}

export function getRedis(): Redis {
  if (!redis) {
    throw new Error('Redis not created. Call createRedis() first.');
  }
  return redis;
}

export function createRedisSubscriber(url: string): Redis {
  subscriber = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  subscriber.on('error', (err) => {
    getLogger().error({ err }, 'Redis subscriber connection error');
  });

  return subscriber;
}

export function getRedisSubscriber(): Redis {
  if (!subscriber) {
    throw new Error('Redis subscriber not created. Call createRedisSubscriber() first.');
  }
  return subscriber;
}

export async function closeRedis(): Promise<void> {
  await Promise.allSettled([
    redis?.quit(),
    subscriber?.quit(),
  ]);
}
