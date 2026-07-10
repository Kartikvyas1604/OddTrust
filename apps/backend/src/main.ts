import { loadEnv, getEnv } from './config/env.js';
import { createLogger, getLogger } from './lib/logger.js';
import { createPostgresPool, runMigrations, closePostgresPool } from './lib/postgres.js';
import { createRedis, closeRedis } from './lib/redis.js';
import { createSubmissionQueue, createQueueEvents, closeQueue } from './lib/queue.js';
import { startSubmissionWorker, stopSubmissionWorker } from './chain/queue.js';
import { metricsRegistry } from './metrics/registry.js';
import { startServer } from './api/server.js';

async function main() {
  loadEnv();
  createLogger();
  const log = getLogger();
  log.info('Starting OddsTrust ingestion worker');

  const pool = createPostgresPool();

  let redis;
  try {
    redis = createRedis();
    await redis.connect();
    log.info('Redis connected');
  } catch (err) {
    log.warn({ err }, 'Redis unavailable — API will start without queue/caching');
  }

  try {
    await runMigrations();
    log.info('Migrations applied');
  } catch (err) {
    log.warn({ err }, 'Migrations failed — database may not be available');
  }

  const app = await startServer();
  log.info('API server started');

  try {
    if (redis) {
      const submissionQueue = createSubmissionQueue();
      createQueueEvents();
      await submissionQueue.waitUntilReady();
      startSubmissionWorker();
      log.info('Submission queue active');
    }
  } catch (err) {
    log.warn({ err }, 'Queue setup failed — running without on-chain submission');
  }

  const gracefulShutdown = async (signal: string) => {
    log.info({ signal }, 'Shutting down worker');
    try { await stopSubmissionWorker(); } catch {}
    try { await closeQueue(); } catch {}
    try { await app.close(); } catch {}
    try { await closeRedis(); } catch {}
    try { await closePostgresPool(); } catch {}
    log.info('Worker shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Start TxLINE connection in background — non-blocking so API is available immediately
  initializeTxLINE().catch((err) => {
    log.warn({ err }, 'TxLINE initialization failed (API remains available)');
    metricsRegistry.txlineConnectionStatus.set(0);
  });

  log.info('OddsTrust ingestion worker ready');
}

async function initializeTxLINE() {
  const log = getLogger();
  try {
    const { TxLINEClient } = await import('./ingestion/client.js');
    const { FixtureIngester } = await import('./ingestion/fixtures.js');
    const { TxLINEStream } = await import('./ingestion/stream.js');
    const { DetectionPipeline } = await import('./detection/pipeline.js');

    const txline = new TxLINEClient();
    await txline.authenticate();
    await txline.subscribe();

    const ingester = new FixtureIngester(txline);
    await ingester.syncAllFixtures();
    metricsRegistry.txlineConnectionStatus.set(1);

    const stream = new TxLINEStream(txline.apiToken!);
    const pipeline = new DetectionPipeline(txline);

    stream.onMessage(async (msg) => {
      if (msg.type === 'odds_update' && typeof msg.data === 'object' && msg.data !== null) {
        const oddsData = msg.data as {
          fixture_id: string;
          markets: Array<{ type: string; odds: Record<string, number>; proof_ref?: string }>;
          snapshot_hash: string;
        };

        const odds = {
          fixture_id: oddsData.fixture_id,
          markets: oddsData.markets.map((m) => ({
            type: m.type,
            odds: m.odds,
            last_update: msg.timestamp,
            proof_ref: m.proof_ref,
          })),
          snapshot_hash: oddsData.snapshot_hash,
          timestamp: msg.timestamp,
        };

        try {
          const results = await pipeline.handleOddsUpdate(odds);
          for (const r of results) {
            metricsRegistry.checksTotal.inc({
              result: r.isConsistent ? 'consistent' : 'inconsistent',
            });
            if (!r.isConsistent) {
              metricsRegistry.inconsistenciesFound.inc();
            }
          }
          metricsRegistry.lastSuccessfulCheck.setToCurrentTime();
        } catch (err) {
          log.error({ err, fixtureId: msg.fixture_id }, 'Pipeline error processing odds update');
        }
      }
    });

    stream.connect().catch((err) => {
      log.warn({ err }, 'Failed to connect TxLINE stream');
      metricsRegistry.txlineConnectionStatus.set(0);
    });
  } catch (err) {
    log.warn({ err }, 'TxLINE initialization skipped (not configured or unavailable)');
    metricsRegistry.txlineConnectionStatus.set(0);
  }
}

main().catch((err) => {
  const log = getLogger();
  log.fatal({ err }, 'Fatal worker startup error');
  process.exit(1);
});
