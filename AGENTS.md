# Coding Agent Instructions

These instructions apply to the entire repository. Read this file before changing code or documentation. Follow the more specific instructions in a nested `AGENTS.md` if one is added later, provided it does not weaken the invariants here.

## 1. Mission and engineering standard

RetailShop ERP is a business-critical, single-tenant ERP for one retail shop. It stores sales, purchases, inventory, customer and supplier balances, expenses, and financial reports. A technically valid change is not acceptable if it makes the books, stock, or audit trail incorrect.

Work to a pragmatic Staff/Principal Engineer standard:
- Understand the business problem and existing design before editing.
- Prefer the smallest safe, maintainable change that solves the real problem.
- Optimize for correctness, security, clarity, testability, and operability before cleverness or raw speed.
- Explain trade-offs and measurable evidence; do not claim production readiness without evidence.
- Keep modules cohesive and dependencies explicit. Apply SOLID and DRY where they improve the design; do not create abstractions for hypothetical future needs.

## 2. Required reading

Before a change, read the relevant material from this set:
1. `docs/00-README.md` — documentation map and business invariants.
2. `docs/01-PRD-BRD.md` — scope and business requirements.
3. `docs/02-HLD.md` — architecture and technology decisions.
4. `docs/03-Database-Schema-ERD.md` — data model.
5. `docs/04-LLD.md` and `docs/05-API-Design.md` — module and API design.
6. `docs/06-Design-Patterns.md` and `docs/16-Engineering-Architecture-and-Workflow.md` — implementation conventions.
7. `docs/08-Testing-Strategy.md`, `docs/10-Security-and-Data-Integrity.md`, and `docs/15-Testing-and-Release-Runbook.md` — verification and safety.

Read only the sections relevant to the task when the change is narrow. Do not assume a document is current if code or migrations contradict it; identify and reconcile the discrepancy.

## 3. Architecture boundaries

The approved baseline is a **modular monolith**:
- Nuxt 4, Vue 3, TypeScript, and Nitro.
- PostgreSQL with Drizzle ORM.
- `app/` owns presentation and client interaction.
- `server/api/` owns thin HTTP routing, authentication/authorization enforcement, and request/response boundaries.
- `server/services/` owns business rules and transaction orchestration.
- `server/repositories/` owns database queries.
- `server/db/` owns schema, migrations, and database setup.

Rules:
- UI components must not access the database.
- API handlers must not become a second service layer.
- Keep raw Drizzle queries in repositories, following existing conventions.
- Services own multi-table transaction boundaries.
- Do not introduce microservices, Redis, queues, a second database, Rust, native extensions, or another framework without a demonstrated requirement, an ADR, and a migration/operational plan.
- Do not duplicate authoritative business state in caches or report-specific tables without a documented consistency strategy.

## 4. Non-negotiable accounting and inventory invariants

Treat financial records as an auditable history, not editable UI rows.

- Every posted journal transaction must balance: total debits equal total credits.
- A sale, its sale lines, ledger postings, inventory movements, and relevant party-balance effects must succeed or fail atomically.
- Apply the same atomicity rule to purchases, expenses, receipts, supplier payments, and reversals.
- Posted ledger facts are append-only. Correct mistakes with explicit, traceable reversal/correction entries; never silently rewrite history.
- Reports must derive from authoritative ledger data and reconcile to the Trial Balance. Do not maintain independent totals that can drift.
- Customer and supplier subledgers must reconcile to their corresponding control accounts.
- Inventory quantity and valuation must have a documented costing policy. Do not trust a client-provided cost as the authoritative cost of goods sold.
- Validate stock availability and credit/payment allocation limits inside the transaction, with database-level protection against concurrent overselling or over-allocation where applicable.
- Store historical price/cost snapshots when a transaction is posted. Do not recompute historical facts from mutable product/customer master data.
- Use exact decimal or integer minor-unit arithmetic for money. Avoid binary floating-point calculations for financial amounts.
- Never delete or mutate posted financial events to make a report look correct.

For any accounting change, provide a hand-calculated example and show the expected journal, inventory, party-ledger, and report effects as applicable.

## 5. Security and privacy

- Treat all browser input as untrusted; validate every write on the server.
- Enforce authorization on the server for every protected route and operation. Deny by default.
- Use established authentication/session primitives. Do not invent password, token, or session cryptography.
- Protect cookies, secrets, and production configuration. Never log passwords, session tokens, credentials, or unnecessary customer data.
- Use parameterized database access; never concatenate untrusted values into SQL.
- Apply least privilege to database roles and deployment credentials.
- Consider replay, CSRF, IDOR, privilege escalation, race conditions, mass assignment, and sensitive-data exposure for relevant changes.
- Security-sensitive changes require negative tests, not only happy-path tests.
- Follow `SECURITY.md` for vulnerability reporting. Do not disclose exploitable details in public issues.

## 6. Clean code and maintainability

- Prefer clear names, small cohesive functions, explicit types, and predictable error handling.
- Keep business rules in domain/service code, not scattered across pages and route handlers.
- Avoid duplicated validation and duplicated accounting logic; share canonical rules at the correct layer.
- Avoid giant services, god components, hidden side effects, magic numbers, and catch-all error suppression.
- Preserve backward compatibility unless a breaking change is intentional and documented.
- Add comments to explain why a non-obvious invariant exists, not to narrate obvious code.
- Do not add dependencies without explaining why existing platform capabilities are insufficient.

## 7. Database and migration discipline

- Review schema, generated migration, repository, service, and tests together.
- Migrations must be safe for existing data and have a documented recovery/rollback approach.
- Never run destructive or production migrations without explicit user authorization.
- Do not edit an already-applied migration to change history; add a new migration.
- Add constraints and indexes at the database layer when they protect critical invariants.
- Consider lock duration, table size, backfills, nullability, uniqueness, and concurrent writes.
- Keep seed and test database behavior separate from production data.

## 8. Verification and evidence

Use the package scripts that exist in `package.json`; do not invent commands.

Typical checks:
- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run test:integration` (requires the configured isolated test PostgreSQL database)
- `pnpm run test:e2e` (requires the app, database, and Playwright browser setup)
- `pnpm run build`
- `pnpm run test:all` (unit and integration tests; it does not include E2E)

Run the narrowest relevant checks first, then broader checks when practical. Report exact commands and actual outcomes. Distinguish not run, blocked, failed, and passed. Never convert a typecheck or mocked unit test into a claim that a real database flow or production deployment was verified.

For financial or security-sensitive changes, add regression tests for the failure mode and concurrency/authorization boundary where relevant. Review CI on the actual PR head before recommending merge.

## 9. Git and pull request workflow

- Inspect `git status`, current branch, and recent history before editing.
- Start from the latest `main` and use a focused branch unless the user explicitly directs work on an existing PR branch.
- Do not overwrite unrelated user changes, force-push, or rewrite shared history.
- Keep changes small and logically grouped.
- Open or update a PR with problem, design, risks, migration impact, tests actually run, and known limitations.
- Do not merge, deploy, rotate secrets, or change production data/settings without explicit authorization.
- After a merge, verify the resulting main commit and its CI; do not assume a merge completed because a button was clicked.

## 10. Required completion report

At completion, summarize:
1. What changed and why.
2. Business/accounting impact.
3. Security and data-integrity impact.
4. Files and migrations changed.
5. Exact tests/checks run and their outcomes.
6. Remaining risks, blocked checks, and the next recommended action.

If evidence is unavailable, say so plainly. Accuracy is more important than appearing finished.
