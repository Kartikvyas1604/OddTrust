import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config({ path: ['.env.local', '.env'] });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default('0.0.0.0'),

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

  REPLAY_FIXTURE_COUNT: z.coerce.number().int().positive().default(50),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

export function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    console.error(`Environment validation failed:\n${issues}`);
    console.error('Please check your .env file and ensure all required variables are properly set');
    process.exit(1);
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
