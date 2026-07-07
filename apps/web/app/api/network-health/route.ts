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

    const redis = getRedis();

    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      return NextResponse.json(JSON.parse(cached), { headers: { 'X-Cache': 'HIT', ...corsHeaders } });
    }

    const pool = getPostgresPool();

    const [totalResult, consistentResult, slotResult, txlineResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM consistency_checks'),
      pool.query('SELECT COUNT(*) as count FROM consistency_checks WHERE is_consistent = true'),
      pool.query('SELECT MAX(on_chain_slot) as latest_slot FROM proof_log WHERE on_chain_slot IS NOT NULL'),
      pool.query(`SELECT MAX(ingested_at) as ts FROM odds_snapshots WHERE ingested_at > NOW() - INTERVAL '5 minutes'`),
    ]);

    const totalChecks = parseInt(totalResult.rows[0].count, 10);
    const consistentCount = parseInt(consistentResult.rows[0].count, 10);
    const consistencyRate = totalChecks > 0 ? Math.round((consistentCount / totalChecks) * 10000) / 100 : 100;
    const currentSlot = slotResult.rows[0]?.latest_slot ? parseInt(slotResult.rows[0].latest_slot, 10) : 0;
    const txlineConnected = txlineResult.rows[0]?.ts !== null;

    const wsCount = await redis.get('metrics:ws-connections');
    const connectedAgents = parseInt(wsCount || '0', 10);

    const health = {
      totalChecks,
      consistencyRate,
      currentSlot,
      connectedAgents,
      txlineConnected,
      networkStatus: txlineConnected ? 'operational' : 'degraded',
      updatedAt: new Date().toISOString(),
    };

    await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(health));

    return NextResponse.json(health, { headers: corsHeaders });
  } catch (err) {
    getLogger().error({ err }, 'Network health API error');
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Internal Server Error' },
      { status: 500, headers: corsHeaders },
    );
  }
}
