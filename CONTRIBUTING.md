# Contributing

RetailShop ERP is treated as a business-critical application codebase. Changes should preserve accounting correctness, transaction integrity, security, and maintainability.

## Development workflow

1. Start from `main` and create a focused branch.
2. Understand the relevant PRD/HLD/LLD and data model before changing architecture.
3. Keep API handlers thin; business rules belong in services; raw Drizzle access belongs in repositories.
4. Preserve the service-owned database transaction boundary.
5. Add or update tests for changed behavior.
6. Run the narrowest relevant checks first, then the full CI-equivalent suite when practical.
7. Open a pull request with a clear summary, testing evidence, and any migration or security impact.

## Business correctness

For sales, purchases, expenses, payments, inventory, customer balances, supplier balances, and reports, verify both the user-visible result and the underlying ledger/database effect.

A change that appears correct in the UI but breaks transaction atomicity or financial reporting is not considered correct.

## Database changes

Schema and migration changes must be reviewed together. Avoid destructive migrations unless the data-loss impact and recovery path are explicitly documented.

## Testing expectations

Prefer the smallest useful test at each layer:

- unit tests for pure business rules and validation
- integration tests against an isolated real Postgres database for transaction and repository behavior
- E2E tests for critical user journeys

Do not claim a test was executed unless it actually ran in a local or CI environment.

## Pull requests

A useful PR description should include:

- problem and intended behavior
- architectural impact
- database/migration impact
- security/data-integrity impact
- tests actually executed
- known limitations or follow-up work
