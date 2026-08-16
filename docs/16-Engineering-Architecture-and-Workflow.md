# RetailShop ERP Engineering Reference

This document is the practical architecture and operating guide for the current single-shop production system. It complements the detailed documents in `docs/02-HLD.md`, `docs/04-LLD.md`, and `docs/06-Design-Patterns.md`.

## 1. System boundary

RetailShop ERP is a modular monolith:

```text
Browser
  -> Nuxt pages and composables
  -> Nitro API routes
  -> application services
  -> repositories / Drizzle ORM
  -> PostgreSQL
```

There is one deployable application and one authoritative database. This is the correct trade-off for a single business: strong ACID transactions and simple operations without distributed-system failure modes.

## 2. HLD rules

| Layer | Responsibility | Must not do |
| --- | --- | --- |
| `app/pages` | Forms, tables, navigation, loading and error states | Query PostgreSQL or calculate authoritative balances |
| `app/composables` | Reusable client behavior such as auth, scrolling, and fetch helpers | Own financial business rules |
| `server/api` | Authentication, authorization, input parsing, response mapping | Contain multi-table business logic |
| `server/services` | Business invariants and transaction orchestration | Trust client-supplied totals or bypass validation |
| `server/repositories` | Drizzle queries and persistence mapping | Decide accounting policy |
| `server/db` | Schema, migrations, connection, seed | Be changed manually in production outside migrations |

Dependency direction is inward: pages depend on APIs, APIs depend on services, services depend on repositories and domain utilities. A service never imports a page; a page never imports the database client.

## 3. LLD module map

| Module | Static master | Transaction source | Derived views |
| --- | --- | --- | --- |
| Customer | `customers` | `sales`, `party_ledger_events` | Customer Ledger, debtor balance |
| Supplier | `suppliers` | `purchases`, `party_ledger_events` | Supplier Ledger, creditor balance |
| Product | `products` | `inventory_movements`, sale/purchase items | Inventory Registry, stock value |
| Accounting | `accounts` | `ledger_entries` | General Ledger, Trial Balance, P&L, Balance Sheet, Cash Flow |
| Cash | none | `cash_txns` plus linked ledger entries | Cash Book, cash balance |
| Administration | `business_profile`, `users` | settings and access changes | Settings, audit and data-quality review |

The database is the source of truth. Running balances, closing stock, report totals, dashboard KPIs, and chart values are calculated from source rows and are not independently stored.

## 4. SOLID application

- **Single Responsibility:** route handlers parse requests; services apply business rules; repositories persist data; pages render workflows.
- **Open/Closed:** new report types, payment modes, or correction workflows should be added behind focused service methods rather than by duplicating route logic.
- **Liskov Substitution:** repository and service test doubles must honor the same contracts as the PostgreSQL implementations.
- **Interface Segregation:** prefer small interfaces such as ledger posting, inventory movement, and profile persistence over one universal service interface.
- **Dependency Inversion:** services receive an injectable database/repository dependency, which enables deterministic integration and unit tests.

Do not apply SOLID mechanically. In this single-tenant application, explicit constructor injection is preferable to introducing a dependency-injection framework.

## 5. Design patterns and invariants

1. **Repository + Service Layer:** isolates persistence and centralizes business rules.
2. **Unit of Work:** one PostgreSQL transaction covers a sale/purchase/expense, its ledger rows, party event, and stock movement.
3. **Append-only event log:** posted ledger and stock facts are never updated or deleted.
4. **Reversal correction:** a correction inserts a reversing entry linked to the original, then a corrected transaction is appended.
5. **Guard pattern:** every protected API route calls authentication and role authorization server-side.
6. **Snapshot pattern:** historical sale cost, selling price, discount, and purchase cost are copied onto line items so later master edits do not rewrite history.
7. **Derived read model:** reports and dashboards aggregate authoritative ledger/inventory facts at read time.

## 6. Daily operator workflow

### Customer sale: customer buys Kurkure

1. Open **Customers → Customer Master** only when the customer is new. Create one master row; do not create a new row for every visit.
2. Open **Inventory → Product Master** only when Kurkure is new. Set product code, category, unit, cost price, selling price, and reorder level.
3. Open **Sales → Sales Registry**. Select the existing customer and product, enter date, quantity, price, discount, and payment mode.
4. Post as **Cash**, **UPI**, or **Credit**. Credit sales require a customer.
5. The system records the sale, stock-out movement, party ledger entry, and balanced general-ledger posting in one transaction.
6. Verify in **Customer Ledger**, **Inventory Registry**, and the **Dashboard** only when operational confirmation is needed.

**Advantages:** one transaction updates every dependent view and prevents duplicate customer identities. **Trade-off:** posted facts require reversal/correction workflows instead of casual edits.

### Supplier purchase: supplier delivers Kurkure

1. Create the supplier once in **Suppliers → Supplier Master** if it does not exist.
2. Verify or create the product in **Inventory → Product Master**.
3. Open **Purchases → Purchase Registry**. Select supplier/product, enter quantity, cost, discount, warehouse, and payment mode.
4. Post the purchase. The system records stock-in, supplier ledger, payable/cash posting, and inventory value atomically.
5. Verify in **Supplier Ledger** and **Inventory Registry**.

### Payment, expense, and control workflow

- A later customer receipt belongs in **Customer Ledger** and must reference the correct customer.
- A supplier payment belongs in **Supplier Ledger** and must reference the correct supplier.
- A business cost belongs in **Expenses Registry**. Do not duplicate the same payment in Cash Book.
- Use **Cash Book** for standalone receipts/payments not already generated by a sale, purchase, or expense.
- Use **Journal** only for intentional accounting adjustments with balanced debit and credit lines.
- Use **General Ledger**, **Trial Balance**, and the financial reports for control and management review.
- Run **Data Quality Review** before month-end close, release, or relying on a report externally.

## 7. Request-to-production workflow

1. Define the business rule and acceptance criteria.
2. Update the ERD/schema design before UI work.
3. Add or update Zod validation.
4. Implement repository queries.
5. Implement the service transaction and invariants.
6. Add the API route with authentication and role checks.
7. Add the UI with loading, empty, validation, error, and success states.
8. Add unit tests for validation and pure logic.
9. Add PostgreSQL integration tests for transactions, rollback, constraints, and reports.
10. Add Playwright coverage for the critical user journey.
11. Run typecheck, unit, integration, build, and E2E gates.
12. Update documentation and release notes.

## 8. Production release gates

Required before deployment:

- `pnpm install --frozen-lockfile`
- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run test:integration`
- `pnpm run build`
- `pnpm run test:e2e`
- successful staging migration rehearsal
- verified database backup and restore drill
- successful `/api/health` check
- zero blocking items in Data Quality Review

## 9. Remaining production hardening

- Add rate limiting and lockout policy to login.
- Add password reset and MFA policy before multiple staff users are introduced.
- Ensure every API route has an explicit role policy and negative authorization test.
- Add structured request/audit logs, error tracking, uptime checks, and database metrics.
- Add staging with a seed-free production database and a documented rollback procedure.
- Add load tests for register/report queries and security tests for session, CSRF, IDOR, and injection risks.
- Add backup retention and scheduled restore drills.

These are release-engineering tasks, not reasons to weaken ledger correctness or bypass existing gates.
