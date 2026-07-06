import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import pino from 'pino';
import { getEnv } from '../config/env.js';
import { getLogger } from '../lib/logger.js';
import { metricsRegistry } from '../metrics/registry.js';

import healthRoutes from './routes/health.js';
import overviewRoutes from './routes/overview.js';
import matchRoutes from './routes/matches.js';
import proofFeedRoutes from './routes/proof-feed.js';
import oracleRoutes from './routes/oracle.js';
import networkHealthRoutes from './routes/network-health.js';
import { registerWebSocketHandlers } from './ws.js';

export async function createServer() {
  const env = getEnv();
  const log = getLogger();

  const app = Fastify({
    logger: false,
    bodyLimit: 1048576,
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: (_req, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${context.after}`,
    }),
  });

  await app.register(websocket);

  app.setErrorHandler((error, _request, reply) => {
    log.error({ err: error }, 'Unhandled request error');
    const statusCode = error.statusCode ?? 500;
    reply.code(statusCode).send({
      error: statusCode >= 500 ? 'Internal Server Error' : error.message,
      statusCode,
    });
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.code(404).send({ error: 'Not Found', statusCode: 404 });
  });

  await app.register(healthRoutes);
  await app.register(overviewRoutes);
  await app.register(matchRoutes);
  await app.register(proofFeedRoutes);
  await app.register(oracleRoutes);
  await app.register(networkHealthRoutes);

  registerWebSocketHandlers(app);

  app.get('/metrics', async (_request, reply) => {
    const metrics = await metricsRegistry.metrics;
    reply.header('Content-Type', 'text/plain');
    return reply.send(metrics);
  });

  return app;
}

export async function startServer() {
  const env = getEnv();
  const log = getLogger();
  const app = await createServer();

  const address = await app.listen({ port: env.PORT, host: env.HOST });
  log.info({ address }, 'API server started');

  return app;
}
