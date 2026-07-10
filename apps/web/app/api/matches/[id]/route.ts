import { NextResponse } from 'next/server';
import { ensureInit } from '../../../../lib/init';
import { getPostgresPool } from '../../../../lib/postgres';
import { getLogger } from '../../../../lib/logger';

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
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    ensureInit();

    const { id } = await params;

    if (!id || id.length > 128) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid fixture ID' }, { status: 400, headers: corsHeaders });
    }

    let pool;
    try { pool = getPostgresPool(); } catch {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Fixture not found' }, { status: 404, headers: corsHeaders });
    }

    const [fixtureResult, checksResult, oddsResult] = await Promise.all([
      pool.query('SELECT * FROM fixtures WHERE id = $1', [id]),
      pool.query(
        `SELECT * FROM consistency_checks
         WHERE fixture_id = $1
         ORDER BY created_at DESC
         LIMIT 20`,
        [id],
      ),
      pool.query(
        `SELECT * FROM odds_snapshots
         WHERE fixture_id = $1
         ORDER BY ingested_at DESC
         LIMIT 5`,
        [id],
      ),
    ]);

    if (fixtureResult.rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Fixture not found' }, { status: 404, headers: corsHeaders });
    }

    const fixture = fixtureResult.rows[0];

    return NextResponse.json({
      fixture: {
        id: fixture.id,
        homeTeam: fixture.home_team,
        awayTeam: fixture.away_team,
        startTime: new Date(fixture.start_time).toISOString(),
        status: fixture.status,
        homeScore: fixture.home_score,
        awayScore: fixture.away_score,
      },
      recentChecks: checksResult.rows.map((r: Record<string, unknown>) => ({
        id: r.id,
        marketSet: r.market_set,
        summedImpliedProbability: parseFloat(r.summed_implied_probability as string),
        isConsistent: r.is_consistent,
        margin: parseFloat(r.margin as string),
        optimalStakes: r.optimal_stakes,
        onChainStatus: r.on_chain_status,
        onChainTx: r.on_chain_tx,
        createdAt: new Date(r.created_at as string).toISOString(),
      })),
      oddsSnapshots: oddsResult.rows.map((r: Record<string, unknown>) => ({
        id: r.id,
        marketType: r.market_type,
        rawOdds: r.raw_odds,
        bookmakerMargin: r.bookmaker_margin ? parseFloat(r.bookmaker_margin as string) : null,
        txlineProofRef: r.txline_proof_ref,
        ingestedAt: new Date(r.ingested_at as string).toISOString(),
      })),
    }, { headers: corsHeaders });
  } catch (err) {
    getLogger().error({ err }, 'Match detail API error');
    return NextResponse.json(
      { error: 'NOT_FOUND', message: 'Fixture not found' },
      { status: 404, headers: corsHeaders },
    );
  }
}
