# OddsTrust — On-Chain Trust Oracle

**OddsTrust** is an on-chain trust oracle that verifies the consistency of sportsbook odds across multiple markets. It applies the Sigma(1/odds) formula — the sum of implied probabilities — to detect anomalies in betting markets before infrastructure agents execute trades, adjust liquidity, or place hedges.

This is not a consumer betting application. It is positioning as **infrastructure that agents read from**.

## Architecture

```
oddtrust/
├── apps/
│   └── web/                     Next.js 16 app (the oracle UI)
├── packages/
│   ├── design-tokens/           Colors, typography, spacing tokens
│   ├── ui/                      React components (all page sections)
│   └── utils/                   Pure utility functions (formatters)
├── turbo.json                   Turborepo pipeline configuration
└── pnpm-workspace.yaml          Workspace definition
```

## Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) + Turbopack |
| **Monorepo** | pnpm workspaces + Turborepo |
| **Language** | TypeScript (strict mode) |
| **Styling** | Tailwind CSS v4 with custom design tokens |
| **Fonts** | Fraunces (serif/display) · Martian Mono (data/monospace) |
| **Deployment** | Static export via `next build` |
| **CI** | GitHub Actions — lint, typecheck, build |

## Getting Started

```bash
pnpm install
pnpm dev              # Start all workspace apps in development
pnpm build            # Production build
pnpm lint             # Run ESLint across all packages
pnpm typecheck        # TypeScript type checking
```

Run only the web application:

```bash
pnpm --filter @oddtrust/web dev
```

## Design System

The palette draws from night-match broadcast and Bloomberg terminal aesthetics.

| Token | Value | Usage |
|---|---|---|
| `--bg-void` | `#0A0D0B` | Primary background |
| `--bg-panel` | `#121815` | Elevated surfaces |
| `--pitch-green` | `#39FF6A` | Dominant accent — consistency signal |
| `--signal-amber` | `#FFB13C` | Warning — flagged inconsistency |
| `--signal-red` | `#FF4D4D` | Blocked / failed check |
| `--trophy-gold` | `#D4AF6A` | Tournament trust score (used once) |

**Typography:** Fraunces for identity, headlines, UI labels, and body text. Martian Mono for all data — odds, scores, hashes, timestamps, and slots.

## Sections

1. **TopStrip** — Wordmark, live Oracle Status indicator, current slot
2. **Hero** — Tournament Trust Score with count-up animation and audit statistics
3. **MatchGrid** — Fixture cards with consistency badges and live margin display
4. **GatePanel** — Composable verifiability demo with scroll-triggered agent simulation
5. **ProofFeed** — Live terminal-style on-chain detection log
6. **Docs** — Explanation of the consistency formula, worked examples, and API reference

## Pages

| Route | Description |
|---|---|
| `/` | Homepage: Hero + Network Stats + MatchGrid preview + ProofFeed |
| `/matches` | Full match grid with filter and sort controls |
| `/matches/[id]` | Match detail with market-by-market odds breakdown |
| `/oracle` | Oracle composability demo wrapping the GatePanel |
| `/proof-feed` | Full-page terminal-style proof feed |
| `/docs` | Consistency formula explanation and API reference |

## Development

### Adding a Component

1. Create `packages/ui/src/components/[Name]/[Name].tsx` as a client component
2. Create `packages/ui/src/components/[Name]/index.ts` as a barrel export
3. Re-export from `packages/ui/src/index.ts`
4. Import in `apps/web/app/page.tsx`

### Code Style

- No comments in production code
- Tailwind utility classes over custom CSS
- CSS custom properties (`var(--color-*)`) from the design token set
- Interactive components use `'use client'`
- Fraunces for display and body text; Martian Mono for all data and numbers

## License

MIT — see [LICENSE](LICENSE).
