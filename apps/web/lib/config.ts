import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config({ path: ['.env.local', '.env'] });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default('0.0.0.0'),
  WS_PORT: z.coerce.number().int().positive().default(3002),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  TXLINE_API_BASE: z.string().url().default('https://txline-dev.txodds.com/api'),
  TXLINE_SSE_URL: z.string().url().default('https://txline-dev.txodds.com/api/odds/stream'),
  TXLINE_CLIENT_ID: z.string().min(1),
  TXLINE_WALLET_KEY: z.string().min(1),

  SOLANA_RPC_URL: z.string().url().default('https://api.devnet.solana.com'),
  SOLANA_ORACLE_PROGRAM_ID: z.string().optional(),
  SOLANA_PAYER_KEY: z.string().optional(),

  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  LOG_PRETTY: z.coerce.boolean().default(false),

  REDIS_PROOF_FEED_CHANNEL: z.string().default('proof-feed:live'),
  API_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  API_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

export function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    console.warn(`Environment validation warnings:\n${issues}\n\nContinuing with defaults where possible.`);
    // Use defaults for missing values in development
    env = envSchema.parse({
      ...process.env,
      NODE_ENV: process.env.NODE_ENV ?? 'development',
      PORT: process.env.PORT ?? '3000',
      HOST: process.env.HOST ?? '0.0.0.0',
      WS_PORT: process.env.WS_PORT ?? '3002',
      DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://localhost:5432/oddtrust',
      REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
      TXLINE_CLIENT_ID: process.env.TXLINE_CLIENT_ID ?? 'dev_placeholder',
      TXLINE_WALLET_KEY: process.env.TXLINE_WALLET_KEY ?? 'dev_placeholder',
    });
    return env;
  }
  env = result.data;
  return env;
}

export function getEnv(): Env {
  if (!env) {
    throw new Error('Environment not loaded. Call loadEnv() first.');
  }
  return env;
}
