import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getPostgresPool } from '../../lib/postgres.js';
import { getRedis } from '../../lib/redis.js';

const OVERVIEW_CACHE_KEY = 'api:overview';
const OVERVIEW_CACHE_TTL = 30;

export default async function overviewRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/overview', async (_req: FastifyRequest, reply: FastifyReply) => {
    const redis = getRedis();

    const cached = await redis.get(OVERVIEW_CACHE_KEY);
    if (cached) {
      return reply.send(JSON.parse(cached));
    }

    const pool = getPostgresPool();

    const totalResult = await pool.query('SELECT COUNT(*) as count FROM consistency_checks');
    const total = parseInt(totalResult.rows[0].count, 10);

    const flaggedResult = await pool.query(
      "SELECT COUNT(*) as count FROM consistency_checks WHERE is_consistent = false",
    );
    const flagged = parseInt(flaggedResult.rows[0].count, 10);

    const fixtureResult = await pool.query('SELECT COUNT(*) as count FROM fixtures');
    const fixtureCount = parseInt(fixtureResult.rows[0].count, 10);

    const avgMarginResult = await pool.query(
      'SELECT COALESCE(AVG(ABS(margin)), 0) as avg_margin FROM consistency_checks WHERE is_consistent = false',
    );
    const avgMargin = parseFloat(avgMarginResult.rows[0].avg_margin);

    const latestResult = await pool.query(
      'SELECT MAX(created_at) as ts FROM consistency_checks',
    );
    const lastCheck = latestResult.rows[0]?.ts ?? null;

    const consistencyRate = total > 0 ? ((total - flagged) / total) * 100 : 100;
    const trustScore = Math.round(consistencyRate);

    const overview = {
      trustScore,
      totalChecks: total,
      fixturesTracked: fixtureCount,
      flaggedMarkets: flagged,
      averageMargin: Math.round(avgMargin * 10000) / 10000,
      consistencyRate: Math.round(consistencyRate * 100) / 100,
      lastCheckTimestamp: lastCheck ? new Date(lastCheck).toISOString() : null,
      updatedAt: new Date().toISOString(),
    };

    await redis.setex(OVERVIEW_CACHE_KEY, OVERVIEW_CACHE_TTL, JSON.stringify(overview));

    return reply.send(overview);
  });
}
