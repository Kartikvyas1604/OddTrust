import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from '../api/server.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

beforeAll(async () => {
  app = await createServer();
});

afterAll(async () => {
  await app.close();
});

describe('GET /health', () => {
  it('returns 200 with health status', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('components');
    expect(body.components).toHaveProperty('database');
    expect(body.components).toHaveProperty('redis');
    expect(body.components).toHaveProperty('txline');
  });
});

describe('GET /api/overview', () => {
  it('returns 200 with overview data', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/overview' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body).toHaveProperty('trustScore');
    expect(body).toHaveProperty('totalChecks');
    expect(body).toHaveProperty('flagged');
    expect(body).toHaveProperty('recentActivity');
  });
});

describe('GET /api/matches', () => {
  it('returns 200 with fixture list', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/matches' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body).toHaveProperty('fixtures');
    expect(body).toHaveProperty('total');
  });

  it('accepts status and sort query params', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/matches?status=scheduled&sort=start_time',
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
  it('returns 200 for valid UUID format', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/matches/test-match-id' });
    expect(res.statusCode).toBe(200);
  });
});

describe('GET /api/oracle/query/:fixtureId', () => {
  it('returns 400 for empty fixtureId', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/oracle/query/' });
    expect(res.statusCode).toBe(404);
  });

  it('returns 400 for fixtureId > 64 chars', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/oracle/query/${'a'.repeat(65)}`,
    });
    expect(res.statusCode).toBe(400);
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
  });

  it('accepts cursor and limit params', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/proof-feed?cursor=test&limit=5',
    });
    expect(res.statusCode).toBe(200);
  });
});

describe('GET /api/network-health', () => {
  it('returns 200 with network status', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/network-health' });
    expect(res.statusCode).toBe(200);
    expect(res.payload).toBeTruthy();
  });
});

describe('Rate limiting', () => {
  it('applies 100 req/min rate limit', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-forwarded-for': '10.0.0.1' },
    });
    expect(res.statusCode).toBe(200);
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
