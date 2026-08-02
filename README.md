# RetailShop ERP

Single-tenant internal ERP for one retail shop. Nuxt 4 (TypeScript) + Postgres (Drizzle ORM). See `/docs`
(delivered separately) for the full PRD/HLD/LLD/ERD/Design Patterns/SDLC/Testing/DevOps/Security docs this
codebase implements.

## Status

This is a **working foundation**, not a finished app:

- ✅ Fully implemented: auth (login/session), DB schema (full ERD), the ledger posting engine
  (`LedgerService` — the core of the whole architecture), Cash Book (complete vertical slice: repo → service
  → API → page), all 4 financial reports (Trial Balance, P&L, Balance Sheet, Cash Flow) + Dashboard, computed
  live from the ledger.
- 🚧 Stubbed (schema + architecture ready, page/service/API not yet built): Sales, Purchases, Inventory,
  Expenses, Customers, Suppliers, Admin. Each stub page has a comment explaining exactly what to build,
  following the Cash Book pattern.

Build order recommendation: Sales next (it's the most complex write path — touches Ledger + Inventory +
Customer balance in one transaction — get it right and everything else is easier), matching
`docs/07-SDLC-Process.md`.

## Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Start Postgres locally
docker compose up -d

# 3. Configure environment
cp .env.example .env
# edit .env if you changed any docker-compose defaults

# 4. Generate and run the first migration
pnpm run db:generate
pnpm run db:migrate

# 5. Seed the chart of accounts + an owner user
#    (uses SEED_OWNER_EMAIL / SEED_OWNER_PASSWORD env vars if set, otherwise
#     owner@example.com / ChangeMe123! — change this password after first login)
pnpm run db:seed

# 6. Run the dev server
pnpm run dev
```

Then log in at `http://localhost:3000/login`.

## Troubleshooting

**`ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION` on `pnpm install`**
pnpm v11 defaults to refusing packages published in the last 24h (`minimumReleaseAge: 1440`), as
protection against a compromised package being published and immediately pulled in. This repo ships
`pnpm-workspace.yaml` with `minimumReleaseAge: 0` to disable that for local dev — if you still hit this,
confirm that file exists at the project root and re-run `pnpm install`. Consider raising the value back up
(e.g. `1440`) once you're closer to a production deploy, for the actual supply-chain protection.

## Testing

```bash
pnpm run test
```

Starts with the single most important test in the codebase: `tests/ledger.service.test.ts`, which verifies
that an unbalanced set of ledger lines is rejected. Everything else in the system depends on this rule
holding.

## Project layout

See `docs/04-LLD.md §1` for the full explanation. Short version:

```
app/          Nuxt pages, components, composables, middleware (frontend)
server/api/   Nitro route handlers — thin, no business logic
server/services/     Business logic, owns DB transactions
server/repositories/ The only place raw Drizzle queries live
server/db/    Schema, migrations, seed script
```

## Before you add a second real user

Read `docs/10-Security-and-Data-Integrity.md`. The auth in this scaffold is intentionally minimal
(hand-rolled session cookies) to keep the scaffold dependency-light — swap it for Better Auth or Lucia
before this holds anything beyond your own login.
# My-Retailer-Shop
