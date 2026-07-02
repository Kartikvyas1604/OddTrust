# Contributing

## The Shared-First Rule

Before writing any logic in `apps/web`, ask: *could this live in `packages/`?* If yes, put it there.

- **`packages/design-tokens`** — colors, typography, spacing
- **`packages/ui`** — React components (all page sections live here)
- **`packages/utils`** — pure functions only (no React)

## Adding a New Section

1. Create a component in `packages/ui/src/components/[Section]/`
2. Export it from the barrel index file
3. Import it in `apps/web/app/page.tsx`
4. Add any required CSS animations to `apps/web/app/globals.css`

## Code Style

- No comments in production code
- Use Tailwind utility classes over custom CSS
- Use CSS custom properties (`var(--color-*)`) from the design token set
- All interactive components must use `'use client'`
- Fraunces for display/text, Martian Mono for all data/numbers
