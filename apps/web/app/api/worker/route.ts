import { NextRequest, NextResponse } from 'next/server';
import { ensureInit } from '../../../lib/init';
import { getPostgresPool } from '../../../lib/postgres';
import { getLogger } from '../../../lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const startSchema = z.object({
  action: z.enum(['status', 'sync', 'start']),
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

    const syncResult = await pool.query(
      `SELECT status, COUNT(*) as count FROM sync_journal GROUP BY status`,
    );
    const lastSync = await pool.query(
      `SELECT MAX(completed_at) as last_sync FROM sync_journal WHERE status = 'completed'`,
    );

    return NextResponse.json(
      {
        status: 'idle',
        syncedFixtures: syncResult.rows.reduce((acc: Record<string, number>, r: { status: string; count: string }) => {
          acc[r.status] = parseInt(r.count, 10);
          return acc;
        }, {} as Record<string, number>),
        lastSyncAt: lastSync.rows[0]?.last_sync
          ? new Date(lastSync.rows[0].last_sync).toISOString()
          : null,
      },
      { headers: { 'Access-Control-Allow-Origin': '*' } },
    );
  } catch (err) {
    getLogger().error({ err }, 'Worker status error');
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to get worker status' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    ensureInit();
    const log = getLogger();

    const body = await request.json();
    const parsed = startSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } },
      );
    }

    if (parsed.data.action === 'status') {
      const pool = getPostgresPool();
      const active = await pool.query(
        `SELECT COUNT(*) as count FROM sync_journal WHERE status = 'running'`,
      );
      return NextResponse.json(
        { status: parseInt(active.rows[0].count, 10) > 0 ? 'running' : 'idle' },
        { headers: { 'Access-Control-Allow-Origin': '*' } },
      );
    }

    if (parsed.data.action === 'sync') {
      const pool = getPostgresPool();
      await pool.query(
        `INSERT INTO sync_journal (status, started_at) VALUES ('running', NOW())`,
      );
      log.info('Worker sync triggered');
      return NextResponse.json(
        { success: true, message: 'Fixture sync initiated' },
        { status: 202, headers: { 'Access-Control-Allow-Origin': '*' } },
      );
    }

    return NextResponse.json(
      { error: 'INVALID_ACTION', message: 'Action must be: status, sync' },
      { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } },
    );
  } catch (err) {
    getLogger().error({ err }, 'Worker POST error');
    return NextResponse.json(
      { error: 'WORKER_ERROR', message: 'Failed to process worker action' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } },
    );
  }
}
