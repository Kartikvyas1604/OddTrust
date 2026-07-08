import { NextRequest, NextResponse } from 'next/server';
import { ensureInit } from '../../../../lib/init';
import { getPostgresPool } from '../../../../lib/postgres';
import { getRedis } from '../../../../lib/redis';
import { getLogger } from '../../../../lib/logger';
import { checkConsistency } from '../../../../lib/worker/consistency';
import { OracleClient } from '../../../../lib/worker/oracle-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Webhook-Secret',
      'Access-Control-Max-Age': '86400',
    },
  });
}

interface TxLINEWebhookPayload {
  event: 'odds.update' | 'fixture.update' | 'fixture.create';
  fixture_id: string;
  markets?: Array<{
    type: string;
    odds: Record<string, number>;
  }>;
  snapshot_hash?: string;
  proof_ref?: string;
  timestamp?: string;
}

export async function POST(request: NextRequest) {
  try {
    ensureInit();
    const log = getLogger();

    const body = (await request.json()) as TxLINEWebhookPayload;

    if (!body.event || !body.fixture_id) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Missing event or fixture_id' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } },
      );
    }

    log.info({ event: body.event, fixtureId: body.fixture_id }, 'TxLINE webhook received');

    const pool = getPostgresPool();

    if (body.event === 'fixture.create') {
      await pool.query(
        `INSERT INTO fixtures (id, status, created_at)
         VALUES ($1, 'upcoming', NOW())
         ON CONFLICT (id) DO NOTHING`,
        [body.fixture_id],
      );
      return NextResponse.json({ received: true }, {
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    if (body.event === 'odds.update' && body.markets && body.markets.length > 0) {
      const snapshotHash = body.snapshot_hash ?? `webhook_${Date.now()}`;

      await pool.query(
        `INSERT INTO odds_snapshots (fixture_id, snapshot_hash, markets, proof_ref, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [body.fixture_id, snapshotHash, JSON.stringify(body.markets), body.proof_ref ?? null],
      );

      const marketTypes = body.markets.map((m) => m.type);

      if (marketTypes.length >= 2) {
        const result = checkConsistency(
          body.fixture_id,
          body.markets.map((m) => ({ type: m.type, outcomes: m.odds })),
          marketTypes,
          snapshotHash,
          body.proof_ref ?? null,
        );

        const check = await pool.query(
          `INSERT INTO consistency_checks (fixture_id, is_consistent, margin_bps, market_set, odds_snapshot_hash, txline_proof_ref)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [
            body.fixture_id,
            result.isConsistent,
            Math.round(result.margin * 10000),
            JSON.stringify(result.marketSet),
            snapshotHash,
            result.txlineProofRef ?? null,
          ],
        );

        if (!result.isConsistent) {
          const redis = getRedis();
          await redis.publish(
            'proof-feed:live',
            JSON.stringify({
              type: 'FLAGGED',
              fixtureId: body.fixture_id,
              margin: result.margin,
              checkId: check.rows[0]?.id ?? null,
              timestamp: new Date().toISOString(),
            }),
          );
        }
      }
    }

    return NextResponse.json({ received: true }, {
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    getLogger().error({ err }, 'TxLINE webhook error');
    return NextResponse.json(
      { error: 'WEBHOOK_ERROR', message: 'Failed to process webhook' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } },
    );
  }
}
