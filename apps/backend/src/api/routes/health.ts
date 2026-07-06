import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getPostgresPool } from '../../lib/postgres.js';
import { getRedis } from '../../lib/redis.js';
import { getSubmissionQueue } from '../../lib/queue.js';
import { getLogger } from '../../lib/logger.js';

interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  components: {
    database: { status: string; latency?: number };
    redis: { status: string; latency?: number };
    txline: { status: string };
    submissionQueue: { status: string; depth?: number };
    lastCheck: { timestamp: string | null };
  };
}

export default async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (_req: FastifyRequest, reply: FastifyReply) => {
    const log = getLogger();
    const status: HealthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      components: {
        database: { status: 'unknown' },
        redis: { status: 'unknown' },
        txline: { status: 'unknown' },
        submissionQueue: { status: 'unknown' },
        lastCheck: { timestamp: null },
      },
    };

    let degraded = false;

    try {
      const pool = getPostgresPool();
      const start = Date.now();
      await pool.query('SELECT 1');
      status.components.database = { status: 'ok', latency: Date.now() - start };
    } catch (err) {
      status.components.database = { status: 'error' };
      degraded = true;
      log.error({ err }, 'Health check: database unreachable');
    }

    try {
      const redis = getRedis();
      const start = Date.now();
      await redis.ping();
      status.components.redis = { status: 'ok', latency: Date.now() - start };
    } catch (err) {
      status.components.redis = { status: 'error' };
      degraded = true;
      log.error({ err }, 'Health check: redis unreachable');
    }

    try {
      const queue = getSubmissionQueue();
      const counts = await queue.getJobCounts();
      status.components.submissionQueue = {
        status: 'ok',
        depth: counts.waiting + counts.active,
      };
    } catch (err) {
      status.components.submissionQueue = { status: 'error' };
      degraded = true;
    }

    try {
      const pool = getPostgresPool();
      const result = await pool.query(
        'SELECT MAX(created_at) as last_check FROM consistency_checks',
      );
      status.components.lastCheck = {
        timestamp: result.rows[0]?.last_check
          ? new Date(result.rows[0].last_check).toISOString()
          : null,
      };
    } catch {
      status.components.lastCheck = { timestamp: null };
    }

    if (degraded) {
      status.status = 'degraded';
      reply.code(503);
    }

    return reply.send(status);
  });
}
