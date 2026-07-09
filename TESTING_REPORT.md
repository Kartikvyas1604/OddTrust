# OddsTrust — Testing & Verification Report

**Generated:** 2026-07-09
**Commit:** (pending)
**Program ID:** `HooVY5etEhNnPWouvZhzGCgbTjBfk3mff66S8jFgaAit`

---

## Executive Summary

| Area | Status | Coverage |
|------|--------|----------|
| Anchor Program Unit Tests | ✅ **7/7 passing** | All 4 instructions tested: init, submit, query, agent check |
| Backend API Routes | ⏳ 9/9 endpoints testable (awaiting DB) | Health, overview, matches, proof-feed, oracle, metrics, 404 |
| Security Audit (Cargo) | ✅ 0 critical, 6 warnings | No CVEs; unmaintained deps only |
| Security Audit (Manual) | ✅ 8 findings documented | Signer checks, overflow, seeds, account sizes all verified |
| TxLINE Connectivity | ❌ **BLOCKED** | Domain `api.txline.txodds.com` NXDOMAIN — no live ingestion testable |
| WebSocket | ⏳ Pending | `/ws/proof-feed` implemented but untested without Redis live |
| DB Integration | ⏳ Pending | Postgres + Redis running in Docker, awaiting connection |
| Backend-Core Unit Tests | ✅ **26/26 passing** | Hand-calculated boundary tests for consistency detection |

---

## Phase 1: Static Code Audit

### Environment Variables
- **14 env vars** documented in `.env.example` with clear comments
- `TXLINE_CLIENT_ID` and `TXLINE_WALLET_KEY` are placeholders — no real credentials committed
- `SOLANA_PAYER_KEY` and `TXLINE_WALLET_KEY` loaded from env only, never hardcoded
- ✅ No secrets in source code

### Input Validation
- ❌ No Zod validation on any API route — all 8 routes accept raw query/path params
- ❌ Only `/api/oracle/query/:fixtureId` has a manual check (falsy/type/length guard)
- ❌ `/api/matches` `limit`/`offset` parsed with `parseInt` but no NaN/negative guard
- Recommendation: Add Fastify schema validation or Zod on all route inputs

### Rate Limiting
- Global: **100 requests/minute** via `@fastify/rate-limit`
- No per-route overrides (same limit for health check and all API routes)
- Response: `429` with retry-after message

### Console.log Usage
- **3 occurrences** in backend (all appropriate):
  - `config/env.ts:37-39` — prints env validation errors
  - `replay/runner.ts:78` — CLI tool

### Redis Connection Ordering — **FIXED**
- Original: queue created before `redis.connect()` on lazy-connected Redis
- Fix: `redis.connect()` moved **before** BullMQ queue creation (`main.ts:22`)
- Commit: `8472d96` — "Fix Redis connection ordering and startup resilience"

### Startup Resilience — **FIXED**
- Original: TxLINE initialization blocked server startup
- Fix: TxLINE runs in background non-blocking; API available immediately
- Commit: `8472d96`

---

## Phase 2: Backend API Tests

### Test Configuration
- Framework: **Vitest** (configured in `vitest.config.ts`)
- Test file: `apps/backend/src/__tests__/api.test.ts`
- Uses Fastify's built-in `inject()` — no HTTP server needed
- **9 test suites**, **18 individual test cases**

### Test Coverage

| Route | Method | Tests |
|-------|--------|-------|
| `/health` | GET | 1 — status 200, component structure |
| `/api/overview` | GET | 1 — trustScore, totalChecks, flagged fields |
| `/api/matches` | GET | 3 — default, with query params, with limit/offset |
| `/api/matches/:id` | GET | 1 — accepts valid fixture ID |
| `/api/oracle/query/:fixtureId` | GET | 3 — empty (404), >64 chars (400), unknown fixture (404) |
| `/api/proof-feed` | GET | 2 — default, with cursor/limit |
| `/api/network-health` | GET | 1 — returns status |
| `/metrics` | GET | 1 — Prometheus content-type |
| Rate limiting | — | 1 — checks rate limit headers |
| 404 handler | — | 1 — returns proper error shape |

### Running Tests
```bash
cd apps/backend && pnpm test
```
Requires: Postgres + Redis running (Docker), valid `DATABASE_URL` in `.env`

---

## Phase 3: Anchor Program Tests

### Test Results — ✅ **7/7 Passing**

| Test | Status | Evidence |
|------|--------|----------|
| Initializes oracle config | ✅ | Config PDA created, authority/signer set, counters at 0 |
| Rejects unauthorized submitter | ✅ | `UnauthorizedSubmitter (0x1789)` error thrown |
| Submits consistent check | ✅ | FixtureTrust created with correct values, config counter incremented |
| Updates existing fixture | ✅ | Re-check flips is_consistent, increments check_count |
| Queries trust state | ✅ | Reads back correct fixture_trust data |
| Agent check: EXECUTED | ✅ | Logs contain `decision: Executed` |
| Agent check: BLOCKED | ✅ | Logs contain `decision: Blocked` |

### Bugs Found & Fixed

#### 🔴 Bug: Config account not marked `mut` in SubmitCheck
- **File:** `programs/oddtrust-oracle/src/instructions/submit_check.rs:25`
- **Issue:** `config` field in `SubmitCheck` struct was missing `#[account(mut)]`. All writes to `config.total_checks` and `config.total_inconsistencies` were silently discarded by the Solana runtime.
- **Fix:** Added `mut` attribute to the account constraint.
- **Impact:** Config counters never incremented; `query_trust` and `trading_agent_check` would see stale state.

#### 🔴 Bug: Bump not stored in FixtureTrust
- **File:** `programs/oddtrust-oracle/src/instructions/submit_check.rs:63`
- **Issue:** `init_if_needed` creates the PDA but the `bump` field was never written to the account. When `query_trust` or `trading_agent_check` validated `seeds = [FIXTURE_TRUST_SEED, fixture_id], bump = fixture_trust.bump`, they read `bump = 0` (default) instead of the canonical bump → `ConstraintSeeds (0x7d6)`.
- **Fix:** Added `ft.bump = ctx.bumps.fixture_trust;` in the handler.
- **Impact:** All reads of fixture trust data were impossible after first write.

#### 🟡 Bug: BN comparison in tests
- **Files:** `tests/oracle.test.ts` lines 86-87, 149-150, 182-183
- **Issue:** Anchor returns `u64` as `BN` objects. `config.totalChecks === 0` is always `false` because `BN(0) !== 0`.
- **Fix:** Changed `===` to `.eqn()`.
- **Impact:** Tests would fail even with correct on-chain state.

#### 🟡 Bug: Airdrop not confirmed
- **File:** `tests/oracle.test.ts:57-64`
- **Issue:** `requestAirdrop()` returns a signature but it was never confirmed. Transactions used unfunded accounts.
- **Fix:** Added `confirmTransaction()` for each airdrop sig.

#### 🟡 Bug: Log message case mismatch
- **File:** `tests/oracle.test.ts:236, 275`
- **Issue:** Rust enum `Debug` outputs `Executed`/`Blocked` (capitalized), tests checked for `EXECUTED`/`BLOCKED`.
- **Fix:** Matched test assertions to actual log output.

### Running Tests
```bash
# Terminal 1: Start validator with program
cd oddtrust-oracle
solana-test-validator --ledger /tmp/solana-test-ledger \
  --bpf-program HooVY5etEhNnPWouvZhzGCgbTjBfk3mff66S8jFgaAit \
  target/deploy/oddtrust_oracle.so --reset

# Terminal 2: Run tests
cd oddtrust-oracle && npx tsx --test tests/oracle.test.ts
```

---

## Phase 4: Security Review

### Cargo Audit — ✅ 0 Critical Vulnerabilities

```
Crate: ansi_term v0.12.1     — Warning: unmaintained
Crate: bincode v1.3.3        — Warning: unmaintained
Crate: derivative v2.2.0     — Warning: unmaintained
Crate: libsecp256k1 v0.6.0   — Warning: unmaintained
Crate: paste v1.0.15         — Warning: unmaintained
Crate: rand v0.7.3           — Warning: unsound (custom logger edge case)
```

All 6 warnings are **transitive dependencies** (no direct dependency on any). No RustSec advisories trigger on any direct Anchor/Solana dependency. The `rand` unsoundness only applies when `rand::rng()` is called inside a custom logger implementation — not applicable here.

### Manual Code Review

#### ✅ Signer Checks (all instructions)

| Instruction | Signer | Validation |
|-------------|--------|-----------|
| `initialize_config` | `payer: Signer` | ✅ Signs + pays for account creation |
| `submit_check` | `backend_signer: Signer` | ✅ Explicit `config.backend_signer` comparison at code level |
| `query_trust` | None (read-only) | ✅ No modification; reads existing FixtureTrust |
| `trading_agent_check` | `agent: Signer` | ✅ Agent signs, reads fixture_trust, emits event |

#### ✅ Overflow Protection
- `config.total_checks.checked_add(1)` — safe
- `config.total_inconsistencies.checked_add(1)` — safe
- `ft.check_count.checked_add(1)` bound by `MAX_CHECK_COUNT (1_000_000)` — safe
- `margin_bps.abs() <= MAX_MARGIN_BPS (10_000)` — prevents overflow on i32

#### ✅ Seed Derivation
- Oracle config: `seeds = [b"config"]` — single domain, deterministic
- Fixture trust: `seeds = [b"fixture", fixture_id]` — scoped by fixture ID, no collisions
- Both use Anchor's canonical PDA derivation (no custom hash)

#### ✅ Account Sizes
- `OracleConfig`: 8 (discriminator) + 32 + 32 + 8 + 8 + 1 = 89 bytes ✅
- `FixtureTrust`: 8 + 32 + 1 + 4 + 8 + 8 + 32 + 4 + 1 = 98 bytes ✅
- Both use `INIT_SPACE` derive macro — correct if struct fields don't change

#### ✅ `init_if_needed` Safety
- FixtureTrust uses `init_if_needed` with PDA seeds — safe because:
  - PDA deterministically derived from `fixture_id`
  - Only this program can create accounts at its PDAs
  - No front-running or squatting risk

#### ℹ️ Missing Input Validation
- `margin_bps` validated only at bounds level — `abs() <= 10_000`
  - Consider adding finer-grained validation if specific sport margins differ
- `txline_proof_ref` accepted as `[u8; 32]` but never validated against TxLINE signature
  - Consider adding signature verification if proof integrity is required
- No `close` instruction exists — no close authority risk

#### ℹ️ Permissions
- `backend_signer` is the **sole** authorized writer for `submit_check`
- Authority (set in `initialize_config`) can be used for future admin instructions
- No `admin` instruction exists yet — authority key currently unused after init

---

## Phase 5: Integration Testing — ⏳ BLOCKED

### What's Needed
- Running Postgres + Redis (Docker or native)
- `DATABASE_URL` env configured in `.env`
- Valid TxLINE credentials (or mock)

### Integration Test Plan
1. Start backend `pnpm dev` → should serve API on port 3001
2. Run API tests `pnpm test` → verifies all routes respond correctly
3. Star the BullMQ worker → verify on-chain submission pipeline
4. WebSocket test → connect to `/ws/proof-feed`, verify real-time events

---

## Phase 6: TxLINE Connectivity — ❌ BLOCKED

- **Domain:** `api.txline.txodds.com` — **NXDOMAIN** (DNS does not resolve)
- **Stream:** `wss://stream.txline.txodds.com/v1` — unreachable
- **Placeholder credentials** in `.env.example` — no real `TXLINE_CLIENT_ID` or `TXLINE_WALLET_KEY`
- **Impact:** Live ingestion, replay mode, and full end-to-end integration testing impossible without valid credentials

### Recommended Actions
1. Obtain valid TxLINE credentials from provider
2. Verify DNS resolution for `api.txline.txodds.com`
3. Update `.env` with real credentials
4. Build a mock TxLINE server for local development/testing

---

## Appendix: Key Transaction Signatures

### Anchor Program Tests (localnet)
```
Initialize config     — 4E1c... (local validator)
Submit check          — 3qWm... (local validator)
Update fixture        — 8GfJ... (local validator)
Query trust           — 2LpH... (local validator)
Agent check EXECUTED  — 9kMh... (local validator)
Agent check BLOCKED   — 6BnR... (local validator)
```

### Deployment
- **Program ID:** `HooVY5etEhNnPWouvZhzGCgbTjBfk3mff66S8jFgaAit`
- **Cluster:** localnet (devnet deployment pending)
- **Payer:** (not committed to source)
- **Solana CLI:** v4.0.2 | **Anchor CLI:** v1.1.2

---

## Appendix: Files Changed/Added

| File | Change |
|------|--------|
| `oddtrust-oracle/programs/.../submit_check.rs` | Added `mut` on config, store `bump` |
| `oddtrust-oracle/tests/oracle.test.ts` | BN fixes, airdrop confirm, ESM, log case, cleanup |
| `oddtrust-oracle/Anchor.toml` | Updated test script to `tsx --test` |
| `apps/backend/src/__tests__/api.test.ts` | New: 18 API integration tests |
| `apps/backend/src/main.ts` | Redis ordering fix, startup resilience |
| `packages/backend-core/src/detection/__tests__/consistency.test.ts` | 26 boundary tests |
| `pnpm-workspace.yaml` | (Restored from corruption) |
