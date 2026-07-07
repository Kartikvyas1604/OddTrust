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
    const cursor = searchParams.get('cursor');
    const limit = searchParams.get('limit') ?? '25';

    const limitNum = Math.min(parseInt(limit, 10), 100);
    if (isNaN(limitNum) || limitNum < 1) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'limit must be a positive number' }, { status: 400, headers: corsHeaders });
    }

    const pool = getPostgresPool();

    let query: string;
    let params: (string | number)[];

    if (cursor) {
      query = `
        SELECT pl.id, pl.fixture_id, pl.consensus, pl.margin,
               pl.on_chain_tx, pl.on_chain_slot, pl.summary, pl.logged_at
        FROM proof_log pl
        WHERE pl.logged_at < $1::timestamptz
        ORDER BY pl.logged_at DESC
        LIMIT $2
      `;
      params = [cursor, limitNum + 1];
    } else {
      query = `
        SELECT pl.id, pl.fixture_id, pl.consensus, pl.margin,
               pl.on_chain_tx, pl.on_chain_slot, pl.summary, pl.logged_at
        FROM proof_log pl
        ORDER BY pl.logged_at DESC
        LIMIT $1
      `;
      params = [limitNum + 1];
    }

    const result = await pool.query(query, params);
    const rows = result.rows;
    const hasMore = rows.length > limitNum;
    const entries = rows.slice(0, limitNum);
    const nextCursor = hasMore ? new Date(entries[entries.length - 1].logged_at).toISOString() : null;

    return NextResponse.json({
      entries: entries.map((r) => ({
        id: r.id,
        fixtureId: r.fixture_id,
        consensus: r.consensus,
        margin: parseFloat(r.margin),
        onChainTx: r.on_chain_tx,
        onChainSlot: r.on_chain_slot ? parseInt(r.on_chain_slot, 10) : null,
        summary: r.summary,
        loggedAt: new Date(r.logged_at).toISOString(),
      })),
      pagination: { nextCursor, hasMore },
    }, { headers: corsHeaders });
  } catch (err) {
    getLogger().error({ err }, 'Proof-feed API error');
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Internal Server Error' },
      { status: 500, headers: corsHeaders },
    );
  }
}
