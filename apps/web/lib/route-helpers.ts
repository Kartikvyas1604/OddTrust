import { NextResponse } from 'next/server';
import { ensureInit } from './init';
import { getLogger } from './logger';
import { checkRateLimit, getRateLimitKey } from './rate-limit';
import { getEnv } from './config';
import { internalError } from './api-error';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Token',
  'Access-Control-Max-Age': '86400',
};

export function apiHandler(handler: () => Promise<NextResponse>): () => Promise<NextResponse> {
  return async () => {
    try {
      ensureInit();
      return await handler();
    } catch (err) {
      getLogger().error({ err }, 'Unhandled API error');
      return internalError();
    }
  };
}

export function apiHandlerWithRequest(
  handler: (request: Request) => Promise<NextResponse>,
): (request: Request) => Promise<NextResponse> {
  return async (request: Request) => {
    try {
      ensureInit();

      const env = getEnv();
      const key = getRateLimitKey(request);
      const { allowed, resetAt } = checkRateLimit(key, env.API_RATE_LIMIT_MAX, env.API_RATE_LIMIT_WINDOW_MS);

      if (!allowed) {
        return new NextResponse(
          JSON.stringify({ error: 'RATE_LIMITED', message: 'Rate limit exceeded. Try again later.' }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
              ...corsHeaders,
            },
          },
        );
      }

      const response = await handler(request);
      for (const [key, value] of Object.entries(corsHeaders)) {
        response.headers.set(key, value);
      }
      return response;
    } catch (err) {
      getLogger().error({ err }, 'Unhandled API error');
      return internalError();
    }
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}
