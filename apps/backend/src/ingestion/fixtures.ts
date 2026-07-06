import { getPostgresPool } from '../lib/postgres.js';
import { getLogger } from '../lib/logger.js';
import type { TxLINEFixture } from './types.js';
import { TxLINEClient } from './client.js';
import crypto from 'node:crypto';

export class FixtureIngester {
  private client: TxLINEClient;

  constructor(client: TxLINEClient) {
    this.client = client;
  }

  async syncAllFixtures(): Promise<TxLINEFixture[]> {
    const log = getLogger();
    log.info('Syncing all fixtures from TxLINE');

    const fixtures = await this.client.getFixtures();
    const pool = getPostgresPool();

    for (const fixture of fixtures) {
      await pool.query(
        `INSERT INTO fixtures (id, sport_id, competition_id, season_id, home_team, away_team, start_time, status, home_score, away_score)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           home_score = COALESCE(EXCLUDED.home_score, fixtures.home_score),
           away_score = COALESCE(EXCLUDED.away_score, fixtures.away_score),
           updated_at = NOW()`,
        [
          fixture.id, fixture.sport_id, fixture.competition_id,
          fixture.season_id, fixture.home_team, fixture.away_team,
          new Date(fixture.start_time).toISOString(), fixture.status,
          fixture.home_score ?? null, fixture.away_score ?? null,
        ],
      );
    }

    log.info({ count: fixtures.length }, 'Fixtures synced');
    return fixtures;
  }

  computeOddsHash(markets: Array<{ type: string; odds: Record<string, number> }>): string {
    const hash = crypto.createHash('sha256');
    for (const market of [...markets].sort((a, b) => a.type.localeCompare(b.type))) {
      hash.update(market.type);
      for (const [outcome, odd] of Object.entries(market.odds).sort(([a], [b]) => a.localeCompare(b))) {
        hash.update(outcome);
        hash.update(odd.toString());
      }
    }
    return hash.digest('hex');
  }
}
