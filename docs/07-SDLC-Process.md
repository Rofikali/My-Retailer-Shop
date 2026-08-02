# SDLC Process (solo/small-team adaptation)

A full enterprise SDLC (multiple review gates, change advisory boards, formal sign-offs) is overhead you
don't need at team-size-one. What you do still need — because this handles money — is **traceability**:
you should always be able to answer "why does this account balance look like this," which means process
discipline around the ledger matters even though process discipline around, say, meeting cadence doesn't.

## Phases

### Phase 0 — Foundation (do this before any UI code)
- [ ] Finalize ERD (`03-Database-Schema-ERD.md`), write Drizzle schema, run first migration
- [ ] Seed chart of accounts (`accounts` table) matching your actual usage: Cash, Debtors, Creditors,
      Inventory, COGS, Sales Revenue, Capital, Drawings, and one row per expense category you actually use
- [ ] Auth working end-to-end (login, session, one "owner" user) before any feature page
- [ ] `LedgerService.post()` implemented and unit-tested before any feature that calls it

### Phase 1 — Core Registers (build in this order, each one shippable/usable alone)
1. Cash Book (simplest — no cross-table transaction needed yet, good for validating the whole stack works)
2. Expenses
3. Customers (master) + Customer Ledger
4. Suppliers (master) + Supplier Ledger
5. Inventory (products + movements)
6. Purchases (touches Inventory + Ledger — your first real Unit-of-Work transaction)
7. Sales (touches Inventory + Ledger + Customer Ledger — the most complex write path)

### Phase 2 — Reports
8. Trial Balance, P&L, Balance Sheet, Cash Flow — all read-only, all computed from Phase 1 data
9. Dashboard (KPIs + charts, aggregates the report queries)

### Phase 3 — Operational Hardening
10. Roles beyond Owner (Staff, Read-only Accountant) if/when you actually add a second person
11. Backups tested (not just configured — actually run a restore once)
12. Basic observability (error tracking, structured logs)

## Definition of Done, per feature
- [ ] Migration applied, reversible
- [ ] Zod validation on the write path (client + server, shared schema)
- [ ] Multi-table writes wrapped in a transaction
- [ ] At least one integration test hitting the real (test) database for the happy path
- [ ] Manual check: does this report/page reconcile against a hand-calculated example?

## Environments
- **Local**: Docker Compose Postgres, `.env.local`, seed script with fake data
- **Staging** *(optional, add once you have staff using it)*: separate DB, mirrors prod config
- **Production**: real data, automated nightly backup, error tracking on

## Version Control / Release
- Trunk-based, short-lived feature branches, PR review even solo (review your own diff before merging —
  catches more than you'd think)
- Migrations are part of the PR that needs them, reviewed together with the code that uses the new schema
- Tag releases; keep a `CHANGELOG.md` — cheap now, saves you when you're debugging "when did this behavior
  change" six months from now
