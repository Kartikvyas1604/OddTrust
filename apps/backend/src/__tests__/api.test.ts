import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { loadEnv } from '../config/env.js';
import { createLogger } from '../lib/logger.js';
import { createPostgresPool, runMigrations, closePostgresPool } from '../lib/postgres.js';
import { createRedis, closeRedis } from '../lib/redis.js';
import { createServer } from '../api/server.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

beforeAll(async () => {
  loadEnv();
  createLogger();
  createPostgresPool();
  try {
    const redis = createRedis();
    await redis.connect();
  } catch {}
  try { await runMigrations(); } catch {}
  app = await createServer();
});

afterAll(async () => {
  try { await app.close(); } catch {}
  try { await closeRedis(); } catch {}
  try { await closePostgresPool(); } catch {}
});

describe('GET /health', () => {
  it('returns health status with all components', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBeGreaterThanOrEqual(200);
    expect(res.statusCode).toBeLessThanOrEqual(503);
    const body = JSON.parse(res.payload);
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('components');
    expect(body.components).toHaveProperty('database');
    expect(body.components).toHaveProperty('redis');
    expect(body.components).toHaveProperty('txline');
    expect(body.components).toHaveProperty('submissionQueue');
  });
});

describe('GET /api/overview', () => {
  it('returns 200 with overview data', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/overview' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body).toHaveProperty('trustScore');
    expect(body).toHaveProperty('totalChecks');
    expect(body).toHaveProperty('flaggedMarkets');
    expect(body).toHaveProperty('consistencyRate');
    expect(typeof body.trustScore).toBe('number');
    expect(typeof body.totalChecks).toBe('number');
  });
});

describe('GET /api/matches', () => {
  it('returns 200 with match list', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/matches' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body).toHaveProperty('matches');
    expect(body).toHaveProperty('pagination');
    expect(Array.isArray(body.matches)).toBe(true);
  });

  it('accepts status and sort query params', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/matches?status=flagged&sort=margin',
    });
    expect(res.statusCode).toBe(200);
  });

  it('accepts limit and offset', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/matches?limit=10&offset=0',
    });
    expect(res.statusCode).toBe(200);
  });
});

describe('GET /api/matches/:id', () => {
  it('returns 404 for non-existent fixture', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/matches/nonexistent' });
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /api/oracle/query/:fixtureId', () => {
  it('returns 400 for empty fixtureId', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/oracle/query/' });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for fixtureId > 64 chars', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/oracle/query/${'a'.repeat(65)}`,
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.error).toBe('BAD_REQUEST');
  });

  it('returns 404 for unknown fixture', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/oracle/query/00000000000000000000000000000000',
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /api/proof-feed', () => {
  it('returns 200 with proof entries', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/proof-feed' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body).toHaveProperty('entries');
    expect(body).toHaveProperty('pagination');
    expect(Array.isArray(body.entries)).toBe(true);
  });

  it('rejects invalid cursor with 400', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/proof-feed?cursor=not-a-date&limit=5',
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.error).toBe('BAD_REQUEST');
  });
});

describe('GET /api/network-health', () => {
  it('returns 200 with network status', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/network-health' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body).toHaveProperty('totalChecks');
    expect(body).toHaveProperty('consistencyRate');
    expect(body).toHaveProperty('networkStatus');
    expect(typeof body.totalChecks).toBe('number');
  });
});

describe('Rate limiting', () => {
  it('applies rate limit headers', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-forwarded-for': '10.0.0.1' },
    });
    expect(res.headers['x-ratelimit-limit']).toBe('100');
    expect(res.headers['x-ratelimit-remaining']).toBeDefined();
  });
});

describe('GET /metrics', () => {
  it('returns prometheus metrics', async () => {
    const res = await app.inject({ method: 'GET', url: '/metrics' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
  });
});

describe('404 handling', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await app.inject({ method: 'GET', url: '/nonexistent' });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.payload).error).toBe('Not Found');
  });
});
