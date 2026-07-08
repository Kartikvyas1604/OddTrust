import { NextRequest, NextResponse } from 'next/server';
import { ensureInit } from '../../../../lib/init';
import { getPostgresPool } from '../../../../lib/postgres';
import { getLogger } from '../../../../lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const configSchema = z.object({
  backendSigner: z.string().optional(),
  consistencyThresholdBps: z.number().int().positive().optional(),
  ingestionEnabled: z.boolean().optional(),
  chainSubmissionEnabled: z.boolean().optional(),
});

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function GET() {
  try {
    ensureInit();
    const pool = getPostgresPool();
    const config = await pool.query(
      `SELECT key, value, updated_at FROM oracle_config ORDER BY key`,
    );
    const configMap: Record<string, unknown> = {};
    for (const row of config.rows) {
      try {
        configMap[row.key] = JSON.parse(row.value);
      } catch {
        configMap[row.key] = row.value;
      }
    }
    return NextResponse.json(configMap, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    getLogger().error({ err }, 'Admin config GET error');
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to fetch config' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    ensureInit();
    const log = getLogger();

    const body = await request.json();
    const parsed = configSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } },
      );
    }

    const pool = getPostgresPool();
    const updates: string[] = [];

    if (parsed.data.backendSigner) {
      await pool.query(
        `INSERT INTO oracle_config (key, value, updated_at)
         VALUES ('backend_signer', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [JSON.stringify(parsed.data.backendSigner)],
      );
      updates.push('backend_signer');
    }
    if (parsed.data.consistencyThresholdBps !== undefined) {
      await pool.query(
        `INSERT INTO oracle_config (key, value, updated_at)
         VALUES ('consistency_threshold_bps', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [JSON.stringify(parsed.data.consistencyThresholdBps)],
      );
      updates.push('consistency_threshold_bps');
    }
    if (parsed.data.ingestionEnabled !== undefined) {
      await pool.query(
        `INSERT INTO oracle_config (key, value, updated_at)
         VALUES ('ingestion_enabled', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [JSON.stringify(parsed.data.ingestionEnabled)],
      );
      updates.push('ingestion_enabled');
    }
    if (parsed.data.chainSubmissionEnabled !== undefined) {
      await pool.query(
        `INSERT INTO oracle_config (key, value, updated_at)
         VALUES ('chain_submission_enabled', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [JSON.stringify(parsed.data.chainSubmissionEnabled)],
      );
      updates.push('chain_submission_enabled');
    }

    log.info({ updates }, 'Oracle config updated');

    return NextResponse.json(
      { success: true, updated: updates },
      { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } },
    );
  } catch (err) {
    getLogger().error({ err }, 'Admin config POST error');
    return NextResponse.json(
      { error: 'CONFIG_ERROR', message: 'Failed to update config' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } },
    );
  }
}
