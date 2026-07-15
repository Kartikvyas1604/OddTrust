import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getPostgresPool } from '../../lib/postgres.js';

interface ProofFeedQuery {
  cursor?: string;
  limit?: string;
}

export default async function proofFeedRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/proof-feed', async (req: FastifyRequest<{ Querystring: ProofFeedQuery }>, reply: FastifyReply) => {
    const { cursor, limit = '25' } = req.query;
    const pool = getPostgresPool();
    const pageSize = Math.min(parseInt(limit, 10) || 25, 100);

    let query: string;
    let params: (string | number)[];

    if (cursor) {
      const cursorDate = new Date(cursor);
      if (isNaN(cursorDate.getTime())) {
        return reply.code(400).send({ error: 'BAD_REQUEST', message: 'Invalid cursor format' });
      }
      query = `
        SELECT pl.id, pl.fixture_id, pl.consensus, pl.margin,
               pl.on_chain_tx, pl.on_chain_slot, pl.summary, pl.logged_at
        FROM proof_log pl
        WHERE pl.logged_at < $1
        ORDER BY pl.logged_at DESC
        LIMIT $2
      `;
      params = [cursorDate.toISOString(), pageSize + 1];
    } else {
      query = `
        SELECT pl.id, pl.fixture_id, pl.consensus, pl.margin,
               pl.on_chain_tx, pl.on_chain_slot, pl.summary, pl.logged_at
        FROM proof_log pl
        ORDER BY pl.logged_at DESC
        LIMIT $1
      `;
      params = [pageSize + 1];
    }

    const result = await pool.query(query, params);
    const rows = result.rows;
    const hasMore = rows.length > pageSize;
    const entries = rows.slice(0, pageSize);

    const nextCursor = hasMore
      ? new Date(entries[entries.length - 1].logged_at).toISOString()
      : null;

    return reply.send({
      entries: entries.map((r) => ({
        id: r.id,
        fixtureId: r.fixture_id,
        consensus: r.consensus,
        margin: parseFloat(r.margin),
        onChainTx: r.on_chain_tx,
        onChainSlot: r.on_chain_slot ? parseInt(r.on_chain_slot, 10) : null,
        summary: r.summary,
        loggedAt: new Date(r.logged_at).toISOString(),
      })),
      pagination: {
        nextCursor,
        hasMore,
      },
    });
  });
}
