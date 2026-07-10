import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ensureInit } from '../../../lib/init';
import { getPostgresPool } from '../../../lib/postgres';
import { getLogger } from '../../../lib/logger';
import { checkConsistency } from '../../../lib/worker/consistency';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const checkSchema = z.object({
  fixtureId: z.string().min(1).max(64),
  markets: z.array(
    z.object({
      type: z.string(),
      outcomes: z.record(z.number().positive()),
    }),
  ).min(1),
  marketTypes: z.array(z.string()).min(1),
});

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    ensureInit();
    const log = getLogger();

    const body = await request.json();
    const parsed = checkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } },
      );
    }

    const { fixtureId, markets, marketTypes } = parsed.data;
    const oddsSnapshotHash = crypto.createHash('sha256')
      .update(JSON.stringify({ fixtureId, markets, marketTypes, t: Date.now() }))
      .digest('hex')
      .slice(0, 16);

    const result = checkConsistency(fixtureId, markets, marketTypes, oddsSnapshotHash);

    let pool;
    try { pool = getPostgresPool(); } catch {
      return NextResponse.json(
        { ...result, checkId: null, createdAt: new Date().toISOString(), degraded: true },
        { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } },
      );
    }

    const check = await pool.query(
      `INSERT INTO consistency_checks (fixture_id, is_consistent, margin_bps, market_set, odds_snapshot_hash, txline_proof_ref)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, created_at`,
      [
        fixtureId,
        result.isConsistent,
        Math.round(result.margin * 10000),
        JSON.stringify(result.marketSet),
        oddsSnapshotHash,
        result.txlineProofRef ?? null,
      ],
    );

    log.info({ fixtureId, consistent: result.isConsistent, margin: result.margin }, 'Consistency check completed');

    return NextResponse.json(
      {
        ...result,
        checkId: check.rows[0]?.id ?? null,
        createdAt: check.rows[0]?.created_at?.toISOString() ?? new Date().toISOString(),
      },
      { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } },
    );
  } catch (err) {
    getLogger().error({ err }, 'Consistency check API error');
    return NextResponse.json(
      { error: 'CHECK_ERROR', message: 'Failed to run consistency check' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } },
    );
  }
}
