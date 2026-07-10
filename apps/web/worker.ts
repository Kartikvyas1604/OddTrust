import { loadEnv, getEnv } from './lib/config';
import { createLogger, getLogger } from './lib/logger';
import { createPostgresPool } from './lib/postgres';
import { createRedis } from './lib/redis';

async function main(): Promise<void> {
  loadEnv();
  createLogger();
  const log = getLogger();
  const env = getEnv();

  log.info('Starting OddsTrust Worker');

  try {
    createPostgresPool({ connectionString: env.DATABASE_URL });
  } catch (err) {
    log.warn({ err }, 'Postgres unavailable — worker starting without database');
  }

  try {
    createRedis(env.REDIS_URL);
  } catch (err) {
    log.warn({ err }, 'Redis unavailable — worker starting without queue');
  }

  try {
    const { createSubmissionQueue, createSubmissionWorker, closeQueue } = await import('./lib/worker/queue');
    createSubmissionQueue();
    createSubmissionWorker();
    log.info('BullMQ submission queue active');
  } catch (err) {
    log.warn({ err }, 'Queue setup failed — running without on-chain submission');
  }

  try {
    const { TxLINEClient } = await import('./lib/worker/txline-client');
    const { TxLINEStream } = await import('./lib/worker/stream');
    const { DetectionPipeline } = await import('./lib/worker/pipeline');

    const client = new TxLINEClient();
    await client.authenticate();
    const subResponse = await client.subscribe();

    const stream = new TxLINEStream(subResponse.subscription_id);
    stream.setApiToken(subResponse.api_token);
    stream.connect().catch((err) => {
      log.warn({ err }, 'WebSocket connection failed (will retry)');
    });
    const pipeline = new DetectionPipeline();

    client.getFixtures().then((fixtures) => {
      log.info({ count: fixtures.length }, 'Fixtures synced on startup');
    }).catch((err) => {
      log.warn({ err }, 'Initial fixture sync failed');
    });

    const oddsHandler = stream.onOddsUpdate(async (data) => {
      const result = await pipeline.processOddsUpdate(data);
      if (result && !result.isConsistent) {
        const queue = (await import('./lib/worker/queue'));
        queue.enqueueSubmission({
          checkId: `${result.fixtureId}_${Date.now()}`,
          fixtureId: result.fixtureId,
          marketSet: result.marketSet,
          summedImpliedProbability: result.summedImpliedProbability,
          isConsistent: result.isConsistent,
          margin: result.margin,
        }).catch((err) => {
          log.error({ err, fixtureId: result.fixtureId }, 'Failed to enqueue submission');
        });
      }
    });

    process.on('SIGTERM', async () => {
      log.info('Shutting down worker');
      oddsHandler();
      stream.disconnect();
      try { const q = await import('./lib/worker/queue'); await q.closeQueue(); } catch {}
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      log.info('Shutting down worker');
      oddsHandler();
      stream.disconnect();
      try { const q = await import('./lib/worker/queue'); await q.closeQueue(); } catch {}
      process.exit(0);
    });
  } catch (err) {
    log.warn({ err }, 'TxLINE ingestion not available (API/DB only mode)');
  }

  log.info('Worker ready');
}

main().catch((err) => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});
