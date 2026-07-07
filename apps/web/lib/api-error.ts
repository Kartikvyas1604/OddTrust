import { NextResponse } from 'next/server';

export type ApiErrorCode = 'BAD_REQUEST' | 'NOT_FOUND' | 'RATE_LIMITED' | 'INTERNAL_ERROR';

export interface ApiErrorBody {
  error: ApiErrorCode;
  message: string;
}

export function apiError(code: ApiErrorCode, message: string, status: number = 400): NextResponse {
  return NextResponse.json({ error: code, message } satisfies ApiErrorBody, { status });
}

export function badRequest(message: string): NextResponse {
  return apiError('BAD_REQUEST', message, 400);
}

export function notFound(message: string): NextResponse {
  return apiError('NOT_FOUND', message, 404);
}

export function rateLimited(message: string = 'Rate limit exceeded. Try again later.'): NextResponse {
  return apiError('RATE_LIMITED', message, 429);
}

export function internalError(message: string = 'Internal Server Error'): NextResponse {
  return apiError('INTERNAL_ERROR', message, 500);
}
