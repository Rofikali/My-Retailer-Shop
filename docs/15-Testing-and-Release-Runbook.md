# Testing and Release Runbook

RetailShop ERP is a financial application. The release decision is based on money correctness and recovery confidence, not only page rendering.

## Test pyramid

1. **Unit tests** — validation rules and pure ledger calculations. Fast feedback; no database required.
2. **Integration tests** — real PostgreSQL, migrations, transactions, rollback behavior, inventory, party ledgers, and report reconciliation.
3. **E2E tests** — authenticated browser flows, protected routes, navigation, and critical UI wiring.
4. **Build/type gates** — TypeScript, Nuxt production build, and dependency installation from the lockfile.
5. **Pre-production checks** — backup restore, migration rehearsal, smoke test, and Data Quality Review.

## Local commands

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run test
pnpm run test:integration
pnpm run build
pnpm exec playwright install chromium
pnpm run dev
pnpm run test:e2e
```

E2E requires a seeded owner account through `SEED_OWNER_EMAIL` and `SEED_OWNER_PASSWORD`. Never use production credentials in CI or local test fixtures.

## CI gates

Every pull request must pass typecheck, unit tests, PostgreSQL integration tests, production build, and Chromium E2E. A failed gate blocks merge.

## Release sequence

1. Build an immutable application artifact from the approved commit.
2. Take and verify a database backup.
3. Rehearse migrations against a staging database snapshot.
4. Run `pnpm run db:migrate` as an explicit release step.
5. Start the new application version and verify `/api/health`.
6. Run login, dashboard, one read-only report, and Data Quality Review smoke checks.
7. Monitor errors, latency, database connections, and failed jobs.

## Failure policy

- Do not bypass a failing ledger, report, migration, or E2E gate.
- Never repair posted financial rows with direct SQL updates; use reversal and repost workflows.
- If a migration fails, stop the release, preserve logs, restore only under the documented recovery plan, and investigate before retrying.
