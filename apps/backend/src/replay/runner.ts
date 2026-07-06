import '../config/env.js';
import { loadEnv, getEnv } from '../config/env.js';
import { createLogger, getLogger } from '../lib/logger.js';
import { createPostgresPool, runMigrations, closePostgresPool } from '../lib/postgres.js';
import { createRedis, closeRedis } from '../lib/redis.js';
import { createSubmissionQueue, closeQueue } from '../lib/queue.js';
import { createQueueEvents } from '../lib/queue.js';
import { TxLINEClient } from '../ingestion/client.js';
import { FixtureIngester } from '../ingestion/fixtures.js';
import { DetectionPipeline } from '../detection/pipeline.js';

async function main() {
  loadEnv();
  createLogger();
  const log = getLogger();

  const fixtureCount = parseInt(process.argv.find((a) => a.startsWith('--matches='))?.split('=')[1] ?? '50', 10);

  log.info({ fixtureCount }, 'Starting replay mode');

  createPostgresPool();
  createRedis();
  createSubmissionQueue();
  createQueueEvents();

  await runMigrations();

  const txline = new TxLINEClient();
  await txline.authenticate();
  await txline.subscribe();

  const ingester = new FixtureIngester(txline);
  const fixtures = await ingester.syncAllFixtures();

  const limitedFixtures = fixtures.slice(0, fixtureCount);
  log.info({ total: fixtures.length, replaying: limitedFixtures.length }, 'Starting historical replay');

  const pipeline = new DetectionPipeline(txline);
  let processed = 0;
  let flagged = 0;

  for (const fixture of limitedFixtures) {
    try {
      const odds = await txline.getFixtureOdds(fixture.id);
      const proof = await txline.getValidationProof(fixture.id);

      const oddsWithProof = {
        ...odds,
        markets: odds.markets.map((m) => ({
          ...m,
          proof_ref: proof.proof_ref,
        })),
      };

      const results = await pipeline.handleOddsUpdate(oddsWithProof);
      processed++;

      const flaggedCount = results.filter((r) => !r.isConsistent).length;
      flagged += flaggedCount;

      if (processed % 10 === 0) {
        log.info({ processed, flagged, total: limitedFixtures.length }, 'Replay progress');
      }
    } catch (err) {
      log.warn({ err, fixtureId: fixture.id }, 'Failed to process fixture in replay');
    }
  }

  log.info({ processed, flagged }, 'Replay complete');

  await closeQueue();
  await closeRedis();
  await closePostgresPool();

  process.exit(0);
}

main().catch((err) => {
  console.error('Replay failed:', err);
  process.exit(1);
});
