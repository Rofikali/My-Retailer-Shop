# Testing Strategy

## Priority order (where to spend limited testing effort)

For a solo-owned financial system, test the money-correctness paths thoroughly and the UI polish lightly —
inverted from a typical consumer-app priority, because a wrong number here has direct real-world
consequences (you making a bad decision based on a wrong P&L), while a slightly-off button hover doesn't.

### 1. Ledger correctness (highest priority — unit + integration)
- `LedgerService.post()`: rejects unbalanced entry sets (sum of debits ≠ sum of credits within one
  posting) at the application layer, in addition to the DB CHECK constraint
- Every service that posts to the ledger (`SalesService`, `PurchaseService`, `ExpenseService`): integration
  test against a real test Postgres (via Docker) verifying the resulting `ledger_entries` rows are exactly
  right for a known input
- Rollback behavior: force a failure mid-transaction (e.g., invalid product id on the 2nd line item) and
  assert **nothing** was written — no orphaned sale, no orphaned ledger row

### 2. Report accuracy (integration tests with known fixtures)
- Seed a known set of transactions, assert the Trial Balance/P&L/Balance Sheet/Cash Flow numbers exactly
  match a hand-calculated expected result
- Regression-test the specific bug classes you already found in the Excel version: duplicate customer IDs,
  reused reference numbers, missing cost prices — write a test for each that you've now made structurally
  impossible or explicitly handled

### 3. API contract tests
- One test per endpoint: happy path + the main validation failure (missing field, wrong role) — using the
  zod schemas directly means you're mostly testing wiring, which is fine, wiring bugs are common

### 4. E2E (lightest layer — a handful of critical flows only)
- Login → record a sale → see it reflected on the Dashboard and in the customer's ledger
- Record a purchase → see stock increase → see supplier ledger update
- Playwright is a reasonable choice, integrates cleanly with Nuxt

### 5. Component/unit tests for UI
- Only for components with real logic (a total calculator, a form validator) — not for pure presentational
  components. Don't chase 100% coverage on the frontend; it's not where your risk is.

## Tooling
- **Vitest** for unit + integration tests (fast, works well with Nuxt/Nitro)
- **Testcontainers** or a Docker Compose test-Postgres for integration tests — never mock the database for
  ledger-correctness tests; the whole point is verifying real transactional behavior
- **Playwright** for E2E
- CI runs unit + integration on every PR; E2E on merge to main (slower, less frequent is fine)

## What NOT to over-invest in yet
- Load/performance testing — no real load to simulate yet; revisit if/when you have real usage data
- Visual regression testing — low value at this stage, high maintenance cost
- Mutation testing / exotic coverage metrics — diminishing returns for a team of one
