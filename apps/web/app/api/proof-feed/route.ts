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
        SELECT pl.id, pl.fixture_id,
               pl.consensus, pl.margin, pl.summary,
               pl.on_chain_tx, pl.on_chain_slot,
               pl.action, pl.slot, pl.signature, pl.metadata,
               pl.logged_at, pl.created_at
        FROM proof_log pl
        WHERE pl.logged_at < $1::timestamptz
        ORDER BY pl.logged_at DESC
        LIMIT $2
      `;
      params = [cursor, limitNum + 1];
    } else {
      query = `
        SELECT pl.id, pl.fixture_id,
               pl.consensus, pl.margin, pl.summary,
               pl.on_chain_tx, pl.on_chain_slot,
               pl.action, pl.slot, pl.signature, pl.metadata,
               pl.logged_at, pl.created_at
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
        action: r.action ?? (r.consensus === true ? 'CHECK_PASSED' : r.consensus === false ? 'CHECK_FLAGGED' : 'CHECK'),
        consensus: r.consensus,
        margin: r.margin !== null ? parseFloat(r.margin) : null,
        summary: r.summary,
        signature: r.signature ?? r.on_chain_tx,
        slot: r.slot ?? (r.on_chain_slot ? parseInt(r.on_chain_slot, 10) : null),
        metadata: r.metadata,
        loggedAt: new Date(r.logged_at ?? r.created_at).toISOString(),
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
