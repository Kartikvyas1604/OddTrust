import { NextRequest, NextResponse } from 'next/server';
import { ensureInit } from '../../../lib/init';
import { getPostgresPool } from '../../../lib/postgres';
import { getLogger } from '../../../lib/logger';

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

export async function GET(request: NextRequest) {
  try {
    ensureInit();

    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status');
    const sort = searchParams.get('sort');
    const limit = searchParams.get('limit') ?? '50';
    const offset = searchParams.get('offset') ?? '0';

    const limitNum = parseInt(limit, 10);
    const offsetNum = parseInt(offset, 10);

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'limit must be between 1 and 100' }, { status: 400, headers: corsHeaders });
    }
    if (isNaN(offsetNum) || offsetNum < 0) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'offset must be non-negative' }, { status: 400, headers: corsHeaders });
    }
    if (status && !['flagged', 'consistent'].includes(status)) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'status must be "flagged" or "consistent"' }, { status: 400, headers: corsHeaders });
    }
    if (sort && !['margin', 'recent'].includes(sort)) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'sort must be "margin" or "recent"' }, { status: 400, headers: corsHeaders });
    }

    let pool;
    try { pool = getPostgresPool(); } catch {
      return NextResponse.json({ matches: [], pagination: { total: 0, limit: limitNum, offset: offsetNum } }, { headers: corsHeaders });
    }

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (status === 'flagged') {
      conditions.push(`EXISTS (
        SELECT 1 FROM consistency_checks cc
        WHERE cc.fixture_id = f.id AND cc.is_consistent = false
      )`);
    } else if (status === 'consistent') {
      conditions.push(`NOT EXISTS (
        SELECT 1 FROM consistency_checks cc
        WHERE cc.fixture_id = f.id AND cc.is_consistent = false
      )`);
    }

    let orderBy = 'f.start_time DESC';
    if (sort === 'margin') orderBy = 'latest_margin DESC NULLS LAST';
    else if (sort === 'recent') orderBy = 'latest_check ASC NULLS LAST';

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT f.id, f.home_team, f.away_team, f.start_time, f.status,
             f.home_score, f.away_score,
             latest_check.margin AS latest_margin,
             latest_check.is_consistent AS latest_consistent,
             latest_check.summed_implied_probability AS latest_sip,
             latest_check.created_at AS latest_check_time
      FROM fixtures f
      LEFT JOIN LATERAL (
        SELECT margin, is_consistent, summed_implied_probability, created_at
        FROM consistency_checks
        WHERE fixture_id = f.id
        ORDER BY created_at DESC
        LIMIT 1
      ) latest_check ON true
      ${where}
      ORDER BY ${orderBy}
      LIMIT $1 OFFSET $2
    `;

    params.push(limitNum, offsetNum);

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(`SELECT COUNT(*) as count FROM fixtures f ${where}`),
    ]);

    return NextResponse.json({
      matches: result.rows.map((row) => ({
        id: row.id,
        homeTeam: row.home_team,
        awayTeam: row.away_team,
        startTime: new Date(row.start_time).toISOString(),
        status: row.status,
        homeScore: row.home_score,
        awayScore: row.away_score,
        latestMargin: row.latest_margin ? parseFloat(row.latest_margin) : null,
        isConsistent: row.latest_consistent,
        summedImpliedProbability: row.latest_sip ? parseFloat(row.latest_sip) : null,
        lastCheckTime: row.latest_check_time ? new Date(row.latest_check_time).toISOString() : null,
      })),
      pagination: {
        total: parseInt(countResult.rows[0].count, 10),
        limit: limitNum,
        offset: offsetNum,
      },
    }, { headers: corsHeaders });
  } catch (err) {
    getLogger().error({ err }, 'Matches API error');
    return NextResponse.json(
      { matches: [], pagination: { total: 0, limit: 50, offset: 0 } },
      { headers: corsHeaders },
    );
  }
}
