import { NextRequest, NextResponse } from 'next/server';
import { ensureInit } from '../../../../lib/init';
import { getPostgresPool } from '../../../../lib/postgres';
import { getLogger } from '../../../../lib/logger';
import { OracleClient } from '../../../../lib/worker/oracle-client';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const submitSchema = z.object({
  fixtureId: z.string().min(1).max(64),
  marketSet: z.array(z.string()).min(1),
  summedImpliedProbability: z.number().nonnegative(),
  isConsistent: z.boolean(),
  margin: z.number(),
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
    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } },
      );
    }

    const { fixtureId, marketSet, summedImpliedProbability, isConsistent, margin } = parsed.data;
    const checkId = `${fixtureId}_${Date.now()}`;

    const oracle = new OracleClient();
    const result = await oracle.submitConsistencyCheck({
      checkId,
      fixtureId,
      marketSet,
      summedImpliedProbability,
      isConsistent,
      margin,
    });

    const pool = getPostgresPool();
    const proof = await pool.query(
      `INSERT INTO proof_log (fixture_id, action, signature, slot, block_time, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, created_at`,
      [
        fixtureId,
        isConsistent ? 'CHECK_PASSED' : 'CHECK_FLAGGED',
        result.signature,
        result.slot,
        result.blockTime ? new Date(result.blockTime * 1000).toISOString() : null,
        JSON.stringify({ marketSet, summedImpliedProbability, margin }),
      ],
    );

    log.info({ fixtureId, signature: result.signature, slot: result.slot }, 'Consistency check submitted to oracle');

    return NextResponse.json(
      {
        success: true,
        signature: result.signature,
        slot: result.slot,
        blockTime: result.blockTime,
        proofEntry: proof.rows[0]?.id ?? null,
      },
      { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } },
    );
  } catch (err) {
    getLogger().error({ err }, 'Oracle submit error');
    return NextResponse.json(
      { error: 'SUBMIT_ERROR', message: 'Failed to submit consistency check to oracle' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } },
    );
  }
}
