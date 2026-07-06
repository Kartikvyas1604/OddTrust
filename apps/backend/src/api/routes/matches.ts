import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getPostgresPool } from '../../lib/postgres.js';
import { getRedis } from '../../lib/redis.js';

interface MatchesQuery {
  status?: string;
  sort?: string;
  limit?: string;
  offset?: string;
}

export default async function matchRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/matches', async (req: FastifyRequest<{ Querystring: MatchesQuery }>, reply: FastifyReply) => {
    const { status, sort, limit = '50', offset = '0' } = req.query;
    const pool = getPostgresPool();

    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIdx = 1;

    if (status === 'flagged') {
      conditions.push(`EXISTS (
        SELECT 1 FROM consistency_checks cc
        WHERE cc.fixture_id = f.id AND cc.is_consistent = false
      )`);
    } else if (status === 'consistent') {
      conditions.push(`NOT EXISTS (
        SELECT 1 FROM consistency_checks cc
        WHERE cc.fixture_id = f.id AND cc.is_consistent = false
      )`);
    }

    let orderBy = 'f.start_time DESC';
    if (sort === 'margin') {
      orderBy = 'latest_margin DESC NULLS LAST';
    } else if (sort === 'recent') {
      orderBy = 'latest_check ASC NULLS LAST';
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT
        f.id, f.home_team, f.away_team, f.start_time, f.status,
        f.home_score, f.away_score,
        latest_check.margin AS latest_margin,
        latest_check.is_consistent AS latest_consistent,
        latest_check.summed_implied_probability AS latest_sip,
        latest_check.created_at AS latest_check_time
      FROM fixtures f
      LEFT JOIN LATERAL (
        SELECT margin, is_consistent, summed_implied_probability, created_at
        FROM consistency_checks
        WHERE fixture_id = f.id
        ORDER BY created_at DESC
        LIMIT 1
      ) latest_check ON true
      ${where}
      ORDER BY ${orderBy}
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;

    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const result = await pool.query(query, params);

    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM fixtures f ${where}`,
      conditions.length > 0 ? params.slice(0, -2) : [],
    );

    const matches = result.rows.map((row) => ({
      id: row.id,
      homeTeam: row.home_team,
      awayTeam: row.away_team,
      startTime: new Date(row.start_time).toISOString(),
      status: row.status,
      homeScore: row.home_score,
      awayScore: row.away_score,
      latestMargin: row.latest_margin ? parseFloat(row.latest_margin) : null,
      isConsistent: row.latest_consistent,
      summedImpliedProbability: row.latest_sip ? parseFloat(row.latest_sip) : null,
      lastCheckTime: row.latest_check_time ? new Date(row.latest_check_time).toISOString() : null,
    }));

    return reply.send({
      matches,
      pagination: {
        total: parseInt(countResult.rows[0].count, 10),
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      },
    });
  });

  app.get('/api/matches/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const pool = getPostgresPool();

    const fixtureResult = await pool.query(
      'SELECT * FROM fixtures WHERE id = $1',
      [id],
    );

    if (fixtureResult.rows.length === 0) {
      return reply.code(404).send({ error: 'Fixture not found' });
    }

    const fixture = fixtureResult.rows[0];

    const checksResult = await pool.query(
      `SELECT * FROM consistency_checks
       WHERE fixture_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [id],
    );

    const oddsResult = await pool.query(
      `SELECT * FROM odds_snapshots
       WHERE fixture_id = $1
       ORDER BY ingested_at DESC
       LIMIT 5`,
      [id],
    );

    return reply.send({
      fixture: {
        id: fixture.id,
        homeTeam: fixture.home_team,
        awayTeam: fixture.away_team,
        startTime: new Date(fixture.start_time).toISOString(),
        status: fixture.status,
        homeScore: fixture.home_score,
        awayScore: fixture.away_score,
      },
      recentChecks: checksResult.rows.map((r) => ({
        id: r.id,
        marketSet: r.market_set,
        summedImpliedProbability: parseFloat(r.summed_implied_probability),
        isConsistent: r.is_consistent,
        margin: parseFloat(r.margin),
        optimalStakes: r.optimal_stakes,
        onChainStatus: r.on_chain_status,
        onChainTx: r.on_chain_tx,
        createdAt: new Date(r.created_at).toISOString(),
      })),
      oddsSnapshots: oddsResult.rows.map((r) => ({
        id: r.id,
        marketType: r.market_type,
        rawOdds: r.raw_odds,
        bookmakerMargin: r.bookmaker_margin ? parseFloat(r.bookmaker_margin) : null,
        txlineProofRef: r.txline_proof_ref,
        ingestedAt: new Date(r.ingested_at).toISOString(),
      })),
    });
  });
}
