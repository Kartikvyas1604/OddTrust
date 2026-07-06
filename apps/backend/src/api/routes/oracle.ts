import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getPostgresPool } from '../../lib/postgres.js';

interface OracleQueryParams {
  fixtureId: string;
}

export default async function oracleRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/oracle/query/:fixtureId', async (
    req: FastifyRequest<{ Params: OracleQueryParams }>,
    reply: FastifyReply,
  ) => {
    const { fixtureId } = req.params;

    if (!fixtureId || typeof fixtureId !== 'string' || fixtureId.length > 64) {
      return reply.code(400).send({
        error: 'BAD_REQUEST',
        message: 'Invalid fixtureId parameter',
      });
    }

    const pool = getPostgresPool();

    const fixtureResult = await pool.query(
      'SELECT id, home_team, away_team, status, start_time FROM fixtures WHERE id = $1',
      [fixtureId],
    );

    if (fixtureResult.rows.length === 0) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Fixture not found',
      });
    }

    const fixture = fixtureResult.rows[0];

    const latestResult = await pool.query(
      `SELECT is_consistent, summed_implied_probability, margin, optimal_stakes,
              on_chain_tx, created_at
       FROM consistency_checks
       WHERE fixture_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [fixtureId],
    );

    const allFlagsResult = await pool.query(
      `SELECT COUNT(*) as flagged_count
       FROM consistency_checks
       WHERE fixture_id = $1 AND is_consistent = false`,
      [fixtureId],
    );

    const trustScore = latestResult.rows.length > 0
      ? (latestResult.rows[0].is_consistent ? 100 : 0)
      : null;

    const response = {
      fixture: {
        id: fixture.id,
        homeTeam: fixture.home_team,
        awayTeam: fixture.away_team,
        status: fixture.status,
        startTime: new Date(fixture.start_time).toISOString(),
      },
      trustScore,
      latestCheck: latestResult.rows.length > 0
        ? {
            isConsistent: latestResult.rows[0].is_consistent,
            summedImpliedProbability: parseFloat(latestResult.rows[0].summed_implied_probability),
            margin: parseFloat(latestResult.rows[0].margin),
            arbitrageAvailable: !latestResult.rows[0].is_consistent,
            optimalStakes: latestResult.rows[0].optimal_stakes,
            onChainTx: latestResult.rows[0].on_chain_tx,
            checkedAt: new Date(latestResult.rows[0].created_at).toISOString(),
          }
        : null,
      totalFlaggedMarkets: parseInt(allFlagsResult.rows[0].flagged_count, 10),
      queriedAt: new Date().toISOString(),
      version: '0.1.0',
    };

    return reply.send(response);
  });
}
