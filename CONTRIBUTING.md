# Contributing to OddsTrust

Thank you for your interest in contributing to OddsTrust. This document outlines the conventions and workflows for contributing to the project.

## Table of Contents

- [Development Setup](#development-setup)
- [Monorepo Architecture](#monorepo-architecture)
- [The Shared-First Rule](#the-shared-first-rule)
- [Adding a New Section](#adding-a-new-section)
- [Code Style](#code-style)
- [Pull Request Process](#pull-request-process)
- [Design Guidelines](#design-guidelines)

## Development Setup

1. **Prerequisites**
   - Node.js 22+
   - pnpm 10.x (`npm install -g pnpm@10`)
   - Git

2. **Install dependencies**

   ```bash
   git clone <repository-url>
   cd oddtrust
   pnpm install
   ```

3. **Start development**

   ```bash
   pnpm dev
   ```

   The web application is available at `http://localhost:3000`.

4. **Run checks before committing**

   ```bash
   pnpm lint
   pnpm typecheck
   pnpm build
   ```

## Monorepo Architecture

This project uses **pnpm workspaces** with **Turborepo** for orchestration.

| Package | Path | Description |
|---|---|---|
| `@oddtrust/web` | `apps/web/` | Next.js 16 application |
| `@oddtrust/design-tokens` | `packages/design-tokens/` | Colors, typography, spacing constants |
| `@oddtrust/ui` | `packages/ui/` | All React components |
| `@oddtrust/utils` | `packages/utils/` | Pure utility functions |

## The Shared-First Rule

Before writing any logic in `apps/web`, ask yourself: **could this live in a shared package?** If the answer is yes, put it there.

- **`packages/design-tokens`** — Colors, typography scales, spacing values. No runtime code.
- **`packages/ui`** — All React components. Every section of every page is a component in this package.
- **`packages/utils`** — Pure functions only. No React, no side effects, no `'use client'`.

This ensures that the web application is thin — it imports and assembles rather than defines.

## Adding a New Section

1. Create the component at `packages/ui/src/components/[Section]/[Section].tsx`
2. Add a barrel export at `packages/ui/src/components/[Section]/index.ts`
3. Re-export from `packages/ui/src/index.ts`
4. Add page-level CSS animations to `apps/web/app/globals.css` if needed
5. Import and compose the component in the appropriate page under `apps/web/app/`

## Code Style

- **No comments** in production code. If something requires explanation, refactor for clarity.
- **Tailwind utility classes** over custom CSS. Avoid separate stylesheets.
- **CSS custom properties** (`var(--color-*)`) from the design token set for all colors.
- **Typography**: Fraunces for display and body text; Martian Mono for all data and numbers.
- **Client components**: All interactive components in `packages/ui` must use `'use client'`.
- **Imports**: Use package name aliases (e.g., `@oddtrust/ui`, `@oddtrust/utils`) rather than relative paths.
- **TypeScript**: Strict mode. Avoid `any`. Prefer explicit types over inference for public APIs.

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes following the code style guidelines
3. Run `pnpm lint`, `pnpm typecheck`, and `pnpm build` locally
4. Open a pull request against `main`
5. CI runs automatically — all checks must pass before merging
6. Squash-merge commits with a descriptive message

## Design Guidelines

- **Colors**: Use the token set from `packages/design-tokens`. `--pitch-green` for consistent/approved signals, `--signal-amber` for warnings, `--signal-red` for blocked/failed, `--trophy-gold` for the tournament trust score only.
- **Motions**: Page load uses choreographed entrances (wordmark → status → score count-up → cards). New proof feed entries slide in from the top. Cards lift 120ms on hover — no bounce.
- **Do not use** Inter, Space Grotesk, Geist, or Geist Mono. These fonts are explicitly excluded.
