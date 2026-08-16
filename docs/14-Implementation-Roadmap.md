# Production Implementation Roadmap

This is the recommended build order for RetailShop ERP. The sequence follows the dependency chain from data correctness to operations.

## Order

| Order | Capability | Why this order | Main trade-off |
| ---: | --- | --- | --- |
| 1 | Database schema and invariants | Every later feature depends on reliable keys, foreign keys, constraints, and append-only rules. | Migrations require discipline before visible features can move quickly. |
| 2 | Authentication and RBAC | Financial and personal data must be protected before wider usage. | Permission design adds complexity and testing effort. |
| 3 | Customer, Supplier, and Product Masters | Transactions need stable, unique references and clean static identity data. | Requires duplicate detection, deactivation, and data-cleanup workflows. |
| 4 | Inventory movements | Stock must come from an auditable movement history rather than editable totals. | Reversals and corrections are more involved than direct edits. |
| 5 | Sales, Purchases, and Expenses | These workflows create the operational source transactions. | They depend on masters, inventory, permissions, and posting rules. |
| 6 | Customer and Supplier Ledgers | Party balances and statements need to reconcile to commercial transactions. | Cross-module reconciliation must be tested carefully. |
| 7 | General Ledger and Journal Posting | Double-entry posting becomes the accounting source of truth. | Strict validation is required; invalid postings must be rejected. |
| 8 | Trial Balance, P&L, Balance Sheet, and Cash Flow | Reports are trustworthy only after ledger integrity is established. | Report defects can expose earlier posting or classification problems. |
| 9 | Data Quality Review | A read-only review identifies production blockers before release. | It identifies problems but does not replace correction workflows. |
| 10 | Tests and CI gates | Automated checks prevent regressions across every accounting path. | CI increases release time but reduces production risk. |
| 11 | Deployment, backups, observability, and runbooks | The system needs safe operation, recovery, and accountable releases. | Infrastructure and operational ownership are required. |

## Release gates

Before production, require database migrations, typecheck, unit tests, integration tests, E2E tests, a successful Data Quality Review, backup restore verification, and a documented rollback plan.

## Architectural rule

Masters describe **who or what exists**. Transactions and ledgers describe **what happened**. Reports must read from the append-only accounting source of truth; never maintain parallel totals that can drift.
