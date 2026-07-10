import { NextResponse } from 'next/server';
import { ensureInit } from '../../../lib/init';
import { getPostgresPool } from '../../../lib/postgres';
import { getRedis } from '../../../lib/redis';
import { getLogger } from '../../../lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_KEY = 'api:network-health';
const CACHE_TTL = 15;
const corsHeaders = { 'Access-Control-Allow-Origin': '*' };

const fallbackHealth = {
  totalChecks: 0,
  consistencyRate: 100,
  currentSlot: 0,
  connectedAgents: 0,
  txlineConnected: false,
  queueDepth: 0,
  networkStatus: 'degraded' as const,
  updatedAt: new Date().toISOString(),
  degraded: true,
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function GET() {
  try {
    ensureInit();

    let redis;
    try { redis = getRedis(); } catch { return NextResponse.json(fallbackHealth, { headers: corsHeaders }); }

    try {
      const cached = await redis.get(CACHE_KEY);
      if (cached) {
        return NextResponse.json(JSON.parse(cached), { headers: { 'X-Cache': 'HIT', ...corsHeaders } });
      }
    } catch { /* Redis unavailable */ }

    let pool;
    try { pool = getPostgresPool(); } catch { return NextResponse.json(fallbackHealth, { headers: corsHeaders }); }

    const [totalResult, consistentResult, slotResult, txlineResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM consistency_checks'),
      pool.query('SELECT COUNT(*) as count FROM consistency_checks WHERE is_consistent = true'),
      pool.query('SELECT MAX(slot) as latest_slot FROM proof_log WHERE slot IS NOT NULL'),
      pool.query(`SELECT MAX(created_at) as ts FROM odds_snapshots WHERE created_at > NOW() - INTERVAL '5 minutes'`),
    ]);

    const totalChecks = parseInt(totalResult.rows[0].count, 10);
    const consistentCount = parseInt(consistentResult.rows[0].count, 10);
    const consistencyRate = totalChecks > 0 ? Math.round((consistentCount / totalChecks) * 10000) / 100 : 100;
    const currentSlot = slotResult.rows[0]?.latest_slot ? parseInt(slotResult.rows[0].latest_slot, 10) : 0;
    const txlineConnected = txlineResult.rows[0]?.ts !== null;

    let connectedAgents = 0;
    try {
      const wsCount = await redis.get('metrics:ws-connections');
      connectedAgents = parseInt(wsCount || '0', 10);
    } catch { /* Redis unavailable */ }

    let queueDepth = 0;
    try {
      const { getSubmissionQueue } = await import('../../../lib/worker/queue');
      const queue = getSubmissionQueue();
      const counts = await queue.getJobCounts();
      queueDepth = (counts.waiting || 0) + (counts.active || 0);
    } catch {
      queueDepth = -1;
    }

    const health = {
      totalChecks,
      consistencyRate,
      currentSlot,
      connectedAgents,
      txlineConnected,
      queueDepth,
      networkStatus: txlineConnected ? 'operational' : 'degraded',
      updatedAt: new Date().toISOString(),
    };

    try { await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(health)); } catch {}

    return NextResponse.json(health, { headers: corsHeaders });
  } catch (err) {
    getLogger().error({ err }, 'Network health API error');
    return NextResponse.json(fallbackHealth, { headers: corsHeaders });
  }
}
