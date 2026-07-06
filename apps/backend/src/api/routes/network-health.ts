import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getPostgresPool } from '../../lib/postgres.js';
import { getRedis } from '../../lib/redis.js';
import { getSubmissionQueue } from '../../lib/queue.js';

const NETWORK_HEALTH_CACHE_KEY = 'api:network-health';
const NETWORK_HEALTH_CACHE_TTL = 15;

export default async function networkHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/network-health', async (_req: FastifyRequest, reply: FastifyReply) => {
    const redis = getRedis();

    const cached = await redis.get(NETWORK_HEALTH_CACHE_KEY);
    if (cached) {
      return reply.send(JSON.parse(cached));
    }

    const pool = getPostgresPool();
    const queue = getSubmissionQueue();

    const totalResult = await pool.query('SELECT COUNT(*) as count FROM consistency_checks');
    const totalChecks = parseInt(totalResult.rows[0].count, 10);

    const consistentResult = await pool.query(
      "SELECT COUNT(*) as count FROM consistency_checks WHERE is_consistent = true",
    );
    const consistentCount = parseInt(consistentResult.rows[0].count, 10);

    const consistencyRate = totalChecks > 0
      ? Math.round((consistentCount / totalChecks) * 10000) / 100
      : 100;

    const slotResult = await pool.query(
      'SELECT MAX(on_chain_slot) as latest_slot FROM proof_log WHERE on_chain_slot IS NOT NULL',
    );
    const currentSlot = slotResult.rows[0]?.latest_slot
      ? parseInt(slotResult.rows[0].latest_slot, 10)
      : 0;

    const wsCount = await redis.get('metrics:ws-connections');
    const connectedAgents = parseInt(wsCount || '0', 10);

    const queueCounts = await queue.getJobCounts();
    const pendingSubmissions = (queueCounts.waiting || 0) + (queueCounts.active || 0);

    const txlineResult = await pool.query(
      "SELECT MAX(ingested_at) as ts FROM odds_snapshots WHERE ingested_at > NOW() - INTERVAL '5 minutes'",
    );
    const txlineConnected = txlineResult.rows[0]?.ts !== null;

    const health = {
      totalChecks,
      consistencyRate,
      currentSlot,
      connectedAgents,
      pendingSubmissions,
      txlineConnected,
      networkStatus: txlineConnected ? 'operational' : 'degraded',
      updatedAt: new Date().toISOString(),
    };

    await redis.setex(NETWORK_HEALTH_CACHE_KEY, NETWORK_HEALTH_CACHE_TTL, JSON.stringify(health));

    return reply.send(health);
  });
}
