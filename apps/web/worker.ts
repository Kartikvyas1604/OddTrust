import { loadEnv, getEnv } from './lib/config';
import { createLogger, getLogger } from './lib/logger';
import { createPostgresPool } from './lib/postgres';
import { createRedis } from './lib/redis';
import { createSubmissionQueue, createSubmissionWorker, closeQueue } from './lib/worker/queue';
import { TxLINEClient } from './lib/worker/txline-client';
import { TxLINEStream } from './lib/worker/stream';
import { DetectionPipeline } from './lib/worker/pipeline';

async function main(): Promise<void> {
  loadEnv();
  createLogger();
  const log = getLogger();
  const env = getEnv();

  log.info('Starting OddsTrust Worker');

  createPostgresPool({ connectionString: env.DATABASE_URL });
  createRedis(env.REDIS_URL);

  createSubmissionQueue();
  createSubmissionWorker();

  log.info('BullMQ submission queue active');

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
    await closeQueue();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    log.info('Shutting down worker');
    oddsHandler();
    stream.disconnect();
    await closeQueue();
    process.exit(0);
  });

  log.info('Worker ready');
}

main().catch((err) => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});
