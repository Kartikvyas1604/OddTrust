import { NextResponse } from 'next/server';
import { ensureInit } from '../../lib/init';
import { getPostgresPool } from '../../lib/postgres';
import { getRedis } from '../../lib/redis';
import { getLogger } from '../../lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const startTime = Date.now();

export async function GET() {
  try {
    ensureInit();

    const status: {
      status: 'ok' | 'degraded' | 'error';
      timestamp: string;
      uptime: number;
      components: {
        database: { status: string; latency?: number };
        redis: { status: string; latency?: number };
        lastCheck: { timestamp: string | null };
      };
    } = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: (Date.now() - startTime) / 1000,
      components: {
        database: { status: 'unknown' },
        redis: { status: 'unknown' },
        lastCheck: { timestamp: null },
      },
    };

    let degraded = false;

    try {
      const pool = getPostgresPool();
      const start = Date.now();
      await pool.query('SELECT 1');
      status.components.database = { status: 'ok', latency: Date.now() - start };
    } catch {
      status.components.database = { status: 'error' };
      degraded = true;
    }

    try {
      const redis = getRedis();
      const start = Date.now();
      await redis.ping();
      status.components.redis = { status: 'ok', latency: Date.now() - start };
    } catch {
      status.components.redis = { status: 'error' };
      degraded = true;
    }

    try {
      const pool = getPostgresPool();
      const result = await pool.query('SELECT MAX(created_at) as last_check FROM consistency_checks');
      status.components.lastCheck = {
        timestamp: result.rows[0]?.last_check ? new Date(result.rows[0].last_check).toISOString() : null,
      };
    } catch {
      status.components.lastCheck = { timestamp: null };
    }

    const httpStatus = degraded ? 503 : 200;
    return NextResponse.json(status, {
      status: httpStatus,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    getLogger().error({ err }, 'Health check error');
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: (Date.now() - startTime) / 1000,
        components: {
          database: { status: 'error' },
          redis: { status: 'error' },
          lastCheck: { timestamp: null },
        },
      },
      { status: 503, headers: { 'Access-Control-Allow-Origin': '*' } },
    );
  }
}
