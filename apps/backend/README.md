# OddsTrust Backend

Autonomous on-chain consistency oracle for TxLINE World Cup odds data. Ingests live odds across all 104 World Cup fixtures, runs arbitrage detection (Σ(1/odds) ≥ 1 check), and submits results both on-chain and via REST/WebSocket API.

## Architecture

```
TxLINE API/WS ──► Ingestion ──► Detection ──┬──► Postgres (persistence)
                              │              ├──► Redis (cache + pub/sub)
                              │              ├──► BullMQ ──► Solana (on-chain)
                              │              └──► WebSocket (live feed)
                              │
Frontend ◄──── Fastify REST API ◄────────────┘
```

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Copy and fill environment
cp .env.example .env

# 3. Start infrastructure (Postgres + Redis)
docker compose up -d postgres redis

# 4. Run the backend
pnpm dev
```

## Docker (full stack)

```bash
docker compose up --build
```

## Replay Mode

Runs the detection pipeline against TxLINE historical odds instead of the live stream — for demo reliability.

```bash
# Replay 50 fixtures (default)
pnpm replay

# Replay a specific number
pnpm replay -- --matches=100
```

The replay command reuses the **exact same** `checkConsistency()` function as the live pipeline. No forked logic.

## TxLINE Endpoints Used

| Endpoint | Purpose |
|---|---|
| `POST /auth/guest` | Guest JWT authentication |
| `POST /subscribe` | Wallet-signed subscription → API token activation |
| `GET /fixtures` | List all World Cup fixtures (104) |
| `GET /fixtures/{id}/odds` | Current odds for a fixture |
| `GET /fixtures/{id}/odds/historical` | Historical odds (replay mode) |
| `GET /fixtures/{id}/proof` | Validation proof reference (on-chain anchor) |
| `WS /v1?token=...` | Live odds stream |

## API Reference

| Method | Path | Description |
|---|---|---|
| GET | `/api/overview` | Tournament trust score + aggregate stats |
| GET | `/api/matches` | Live match grid (filter: `?status=flagged`, sort: `?sort=margin`) |
| GET | `/api/matches/:id` | Full market breakdown + math for one fixture |
| GET | `/api/proof-feed?cursor=` | Paginated proof feed (cursor-based, oldest cursor value) |
| WS | `/ws/proof-feed` | Live streaming proof feed |
| GET | `/api/oracle/query/:fixtureId` | Agent-composable trust score query (stable contract) |
| GET | `/api/network-health` | Total checks, consistency rate, slot, connected agents |
| GET | `/health` | Component health (DB, Redis, TxLINE, queue) |
| GET | `/metrics` | Prometheus-formatted metrics |

## Environment Variables

See `.env.example` for all variables and their descriptions.

## Testing

```bash
pnpm test
```

The consistency-check math has dedicated unit tests proving Σ(1/odds) is computed correctly.

## Key Design Decisions

- **Idempotent ingestion**: Deduplication on `(fixture_id, market_set, odds_snapshot_hash)` via Redis atomic set — replaying the same update twice never duplicates checks or on-chain submissions.
- **Stale state**: If TxLINE is unreachable, API serves last-known-good state from Redis/Postgres with no fake defaults.
- **Auditable math**: Raw odds are stored before any rounding or transformation. Implied probabilities and margins are computed and stored separately.
- **Exponential backoff**: TxLINE reconnection uses 2^attempt exponential backoff with jitter.
- **Pino structured logging**: JSON log output, secrets redacted via pino's redact configuration.
