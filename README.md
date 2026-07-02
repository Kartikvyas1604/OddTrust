# OddsTrust — On-Chain Trust Oracle

Live on-chain trust verification for World Cup odds. Infrastructure agents read from this oracle to verify margin consistency before executing trades.

## Stack

- **Framework:** Next.js 16 (App Router) + Turbopack
- **Monorepo:** pnpm workspaces + Turborepo
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS v4 with custom design tokens
- **Fonts:** Fraunces (serif/display) + Martian Mono (data/monospace)
- **Deploy:** Static export via `next build`

## Project Structure

```
oddtrust/
├── apps/
│   └── web/                    ← Next.js app (the oracle UI)
├── packages/
│   ├── design-tokens/          ← Colors, typography, spacing tokens
│   ├── ui/                     ← React components (Background, TopStrip, Hero, etc.)
│   └── utils/                  ← Pure utility functions (formatters, etc.)
├── turbo.json                  ← Turborepo pipeline config
└── pnpm-workspace.yaml         ← Workspace definition
```

## Getting Started

```bash
pnpm install
pnpm dev          # starts the web app at localhost:3000
pnpm build        # production build
pnpm lint         # run ESLint across all packages
```

To run only the web app:

```bash
pnpm --filter @oddtrust/web dev
```

## Design System

The palette is night-match broadcast + Bloomberg terminal:

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-void` | `#0A0D0B` | Primary background |
| `--bg-panel` | `#121815` | Elevated surfaces |
| `--pitch-green` | `#39FF6A` | Dominant accent — consistency signal |
| `--signal-amber` | `#FFB13C` | Warning — flagged inconsistency |
| `--signal-red` | `#FF4D4D` | Blocked / failed check |
| `--trophy-gold` | `#D4AF6A` | Tournament trust score (used once) |

**Typography:** Fraunces for identity/headlines/UI labels, Martian Mono for all data (odds, scores, hashes, timestamps).

## Key Sections

1. **Top Strip** — Wordmark, live Oracle Status indicator, current slot
2. **Hero** — Tournament Trust Score (count-up animation), audit stats
3. **Match Grid** — Fixture cards with consistency badges and live margins
4. **Gate Panel** — Composable verifiability demo with scroll-triggered agent simulation
5. **Proof Feed** — Live terminal-style on-chain detection log

## Adding a Component

1. Create `packages/ui/src/components/[Name]/[Name].tsx` (client component with `'use client'`)
2. Create `packages/ui/src/components/[Name]/index.ts` (barrel export)
3. Export from `packages/ui/src/index.ts`
4. Import in `apps/web/app/page.tsx`
