# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sugih is a personal finance management app built with Next.js 16 (App Router), PostgreSQL 16, and Drizzle ORM. It uses double-entry bookkeeping — every transaction creates balanced postings (ledger entries). Currency is Indonesian Rupiah (IDR), stored as `bigint` in `amount_idr` columns.

## Commands

| Task | Command |
|---|---|
| Dev server | `pnpm dev` |
| Build | `pnpm build` |
| Lint | `pnpm lint` (Biome) |
| Format | `pnpm format` |
| Run all tests | `pnpm test` |
| Run single test file | `pnpm test src/modules/Wallet/schema.test.ts` |
| Run tests matching name | `pnpm test -t "test name pattern"` |
| Test coverage | `pnpm test:coverage` |
| Generate DB migration | `pnpm db:generate` |
| Apply migrations | `pnpm db:migrate` |
| Push schema (dev only) | `pnpm db:push` |
| DB visual editor | `pnpm db:studio` |

## Architecture

### Module Pattern

Business logic lives in `src/modules/{Feature}/` with a consistent structure:

- `schema.ts` — Drizzle table definitions + Zod validation schemas + inferred TypeScript types
- `actions.ts` — Server-side business logic (CRUD, queries)
- `components/` — React UI components for the feature
- `actions.integration.test.ts` — Integration tests against real database
- `schema.test.ts` — Schema validation tests

Some modules split Drizzle schemas into a separate `drizzle-schema.ts` and types into `types.ts`.

Modules: Wallet, Category, SavingsBucket, Transaction, Budget, Dashboard, Report, Export.

### API Layer

RESTful routes in `src/app/api/{resource}/route.ts`. Use `src/lib/http.ts` helpers for consistent HTTP responses. Transaction creation is split by type: `expense`, `income`, `transfer`, `savings-contribute`, `savings-withdraw`.

### Database

- Drizzle ORM client via `getDb()` for type-safe queries, `getPool()` for raw SQL — both from `@/db/drizzle-client`
- Central schema re-export in `src/db/schema.ts`
- Migrations in `drizzle/` directory
- Soft deletes: wallets/categories/savings-buckets use `archived` boolean; transactions use `deleted_at` timestamp
- Idempotency keys on transactions prevent duplicates

### Client State

- **Server state**: TanStack React Query (`@tanstack/react-query`)
- **Client-only state**: Zustand
- **URL state**: Nuqs (query parameter state management)
- **Provider setup**: `src/app/providers.tsx`

### UI

- Radix UI primitives with Shadcn/ui patterns in `src/components/ui/`
- Tailwind CSS 4 for styling
- `cn()` utility from `src/lib/utils.ts` for class merging
- Charts via Recharts
- Toast notifications via Sonner

### Self-Contained Component Pattern

When building or refactoring page-level features, follow the **self-contained component architecture** established in the Budget module. This is the preferred pattern for all pages in the project.

**Page file** (`src/app/{feature}/page.tsx`): Purely compositional — only renders child components inside a `<Suspense>` boundary. No state, no props, no callbacks.

```tsx
export default function FeaturePage() {
  return (
    <Suspense fallback={<FeaturePageSkeleton />}>
      <div className="space-y-6">
        <FeaturePageHeader />
        <FeatureDetailsCard />
        <FeatureDialogForm />
      </div>
    </Suspense>
  );
}
```

**Child components** (`src/modules/{Feature}/components/`): Each component is self-contained — it directly accesses the stores and hooks it needs. No prop drilling from the page.

**State management split per component:**

| State Type | Tool | Naming Convention | Purpose |
|---|---|---|---|
| UI state | Zustand | `use{Feature}PageStore` | Dialog open/close, selected items, transient UI |
| Server state | React Query | `use{Feature}Data`, `use{Feature}Mutations` | Fetching, creating, updating, deleting |
| URL state | NUQS | `use{Feature}Month`, `use{Feature}View`, etc. | Filters, pagination, view modes |

**Refactoring checklist when applying this pattern:**

1. Create a Zustand store (`use{Feature}PageStore`) for all UI state (dialogs, selections, transient results)
2. Create React Query hooks for data fetching and mutations if they don't exist
3. Move URL-driven state (filters, month, view mode) to NUQS hooks
4. Refactor each child component to import stores/hooks directly instead of receiving props
5. Simplify the page file to pure composition (no state, no handlers, no props)
6. Update tests to mock stores/hooks instead of passing props

**Reference implementation:** Budget module — see `src/app/budgets/page.tsx`, `src/modules/Budget/components/`, and `docs/design/budgets-page-refactoring.md` for the full breakdown.

### Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json).

## Testing

- Framework: Vitest with jsdom environment
- Coverage threshold: 80% (lines, functions, branches, statements)
- Test setup in `src/test/setup.ts` includes polyfills for ResizeObserver, pointer capture, and scrollIntoView (needed for Radix UI in jsdom)
- Integration tests require a running PostgreSQL instance
- E2E tests use Playwright (`tests/e2e/`)

## Code Style

- Biome handles both linting and formatting (no ESLint/Prettier)
- 2-space indentation
- Biome auto-organizes imports
- React and Next.js rule sets enabled
