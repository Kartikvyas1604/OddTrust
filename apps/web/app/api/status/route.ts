import { NextResponse } from 'next/server';
import { ensureInit } from '../../../lib/init';
import { getLogger } from '../../../lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function GET() {
  try {
    ensureInit();
    return NextResponse.json(
      {
        status: 'ok',
        service: 'oddtrust-api',
        version: '0.1.0',
        timestamp: new Date().toISOString(),
      },
      { headers: { 'Access-Control-Allow-Origin': '*' } },
    );
  } catch (err) {
    getLogger().error({ err }, 'Status API error');
    return NextResponse.json(
      { error: 'NOT_READY', message: 'Service not initialized' },
      { status: 503, headers: { 'Access-Control-Allow-Origin': '*' } },
    );
  }
}
