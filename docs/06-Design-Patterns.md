# Design Patterns Used, and Why

Every pattern here is chosen because it solves a specific problem you already hit in the Excel version —
not included for résumé value. If a pattern doesn't map to an actual problem, it's not in this list.

## Repository Pattern
**What:** All Drizzle queries live in `server/repositories/*.repo.ts`. Services never write raw SQL/query
builder calls directly.
**Why:** Isolates persistence from business logic. You can unit-test `SalesService` by mocking the
repository interface, with no real database. It also means if you ever swap Drizzle for something else,
the blast radius is one folder.

## Service Layer Pattern
**What:** `server/services/*` hold all business rules (e.g., "a credit sale posts to Debtors, a cash sale
posts to Cash"). Route handlers are thin — parse, validate, call a service, return.
**Why:** Business rules living in route handlers is how the Excel formulas ended up scattered and
inconsistent across sheets. Centralizing them means "how is COGS calculated" has exactly one answer in the
codebase.

## Unit of Work (via DB transactions)
**What:** Every operation that touches more than one table (`sales` + `sale_items` + `ledger_entries` +
`inventory_movements`) runs inside a single `db.transaction()`.
**Why:** This is the direct structural fix for the Sales-Register-vs-Cash-Book mismatch — partial writes
become impossible.

## Strategy Pattern
**What:** Payment mode handling (`cash`, `upi`, `credit`) implemented as interchangeable strategies that
decide which account to debit (`CASH` vs `DEBTORS`).
**Why:** Adding a new payment mode (e.g., a payment gateway later) means adding one strategy, not touching
every place payment mode is checked with `if/else`.

## Factory Pattern
**What:** `ReportService` has one method per report, but each report type implements a common
`FinancialReport` shape (`{ rows, totals, asOf }`) produced by a factory function per report type.
**Why:** `ReportTable.vue` on the frontend renders any of the 4 reports without knowing which one it is —
new report types slot in without new UI code.

## Append-Only Event Log (Ledger)
**What:** `ledger_entries` and `inventory_movements` are insert-only; corrections are new rows that
reference what they reverse.
**Why:** This is the single most important pattern in the whole system. It's what turns "why doesn't this
balance" from an unanswerable question (Excel) into a query (Postgres): every number is reconstructable
from the full history of what actually happened.

## Guard/Middleware Pattern (Auth & Roles)
**What:** `middleware/auth.global.ts` and per-route role checks, not scattered `if (user.role !== 'owner')`
checks inside components/handlers.
**Why:** One place to reason about "who can do what" — critical once you add staff logins.

## What's deliberately NOT used, and why

- **CQRS / Event Sourcing (full)** — the ledger pattern above gives you most of the benefit (auditability,
  reconstructable state) without the operational overhead of a real event-sourced system (separate
  read/write stores, event bus, replay tooling). Revisit only at genuinely larger scale.
- **Microservices** — see HLD §1.
- **Generic "plugin"/DI framework** — TypeScript interfaces + explicit constructor injection is enough for
  a codebase this size; a DI container adds indirection with no real benefit for one developer.
