import { NextResponse } from 'next/server';
import { ensureInit } from '../../../../../lib/init';
import { getPostgresPool } from '../../../../../lib/postgres';
import { getLogger } from '../../../../../lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fixtureId: string }> },
) {
  try {
    ensureInit();

    const { fixtureId } = await params;

    if (!fixtureId || fixtureId.length > 64) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid fixtureId' }, { status: 400, headers: corsHeaders });
    }

    const pool = getPostgresPool();

    const [fixtureResult, latestResult, allFlagsResult] = await Promise.all([
      pool.query('SELECT id, home_team, away_team, status, start_time FROM fixtures WHERE id = $1', [fixtureId]),
      pool.query(
        `SELECT is_consistent, summed_implied_probability, margin, optimal_stakes,
                on_chain_tx, created_at
         FROM consistency_checks
         WHERE fixture_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [fixtureId],
      ),
      pool.query(
        `SELECT COUNT(*) as flagged_count
         FROM consistency_checks
         WHERE fixture_id = $1 AND is_consistent = false`,
        [fixtureId],
      ),
    ]);

    if (fixtureResult.rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Fixture not found' }, { status: 404, headers: corsHeaders });
    }

    const fixture = fixtureResult.rows[0];
    const latest = latestResult.rows[0] ?? null;

    return NextResponse.json({
      fixture: {
        id: fixture.id,
        homeTeam: fixture.home_team,
        awayTeam: fixture.away_team,
        status: fixture.status,
        startTime: new Date(fixture.start_time).toISOString(),
      },
      trustScore: latest ? (latest.is_consistent ? 100 : 0) : null,
      latestCheck: latest ? {
        isConsistent: latest.is_consistent,
        summedImpliedProbability: parseFloat(latest.summed_implied_probability),
        margin: parseFloat(latest.margin),
        arbitrageAvailable: !latest.is_consistent,
        optimalStakes: latest.optimal_stakes,
        onChainTx: latest.on_chain_tx,
        checkedAt: new Date(latest.created_at).toISOString(),
      } : null,
      totalFlaggedMarkets: parseInt(allFlagsResult.rows[0].flagged_count, 10),
      queriedAt: new Date().toISOString(),
      version: '0.1.0',
    }, { headers: corsHeaders });
  } catch (err) {
    getLogger().error({ err }, 'Oracle query API error');
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Internal Server Error' },
      { status: 500, headers: corsHeaders },
    );
  }
}
