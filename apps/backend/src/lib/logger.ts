import pino from 'pino';
import { getEnv } from '../config/env.js';

let logger: pino.Logger;

export function createLogger(): pino.Logger {
  const env = getEnv();
  logger = pino({
    level: env.LOG_LEVEL,
    transport: env.LOG_PRETTY
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss.l' } }
      : undefined,
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
    },
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', 'body.apiToken', 'body.walletKey'],
      censor: '[REDACTED]',
    },
  });
  return logger;
}

export function getLogger(): pino.Logger {
  if (!logger) {
    throw new Error('Logger not created. Call createLogger() first.');
  }
  return logger;
}
