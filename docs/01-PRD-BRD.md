# Product / Business Requirements Document

## 1. Background

The business is a single-location retail shop (kirana/general store style — grocery, snacks, tobacco,
personal care, some service income) that has been keeping books in Excel. The owner is a software engineer
and wants to replace the spreadsheet with a proper web application, self-owned and self-hosted.

## 2. Problem Statement

The spreadsheet-based process broke down in specific, recurring ways:

- Sales were recorded in two places (Sales Register and Cash Book) that didn't reconcile.
- The Purchase Register only ever captured the initial stock-in; ongoing purchases weren't tracked
  item-by-item.
- Customer/Supplier identity was inconsistent (duplicate IDs, mismatched naming).
- No enforced double-entry — the Trial Balance did not balance and there was no way to trace why.
- No audit trail: no record of who entered or approved a transaction.

## 3. Goals (Phase 1 — this system)

- Replace the Cash Book, Sales/Purchase Registers, Inventory Register, Expense Register, Customer/Supplier
  Master+Ledger, and the Trial Balance / P&L / Balance Sheet / Cash Flow reports with a single web app.
- Enforce data integrity that Excel couldn't: unique customer/supplier IDs, append-only ledger, atomic
  multi-table transactions.
- Single owner login initially; support additional staff logins with roles before it's needed, not after.
- Usable from a phone or laptop, works acceptably on a flaky connection (shop wifi).

## 4. Explicit Non-Goals (Phase 1)

- **Not multi-tenant.** One business, one deployment. See `11-Scaling-and-Multi-Tenant-Path.md` if this
  changes.
- **Not GST-compliant / not building tax e-invoicing.** The business is currently unregistered for GST;
  don't build GSTIN/e-invoice fields that add complexity with no current use. Flag as a future phase if
  the business registers for GST.
- **Not "millions of users."** Realistic Phase 1 load: 1–5 concurrent users, a few hundred transactions a
  month. Design so scaling later doesn't require a rewrite (see HLD), but do not build for load that
  doesn't exist yet.
- **Not a POS/billing terminal, not a payment gateway.** Recording transactions after the fact (or via
  simple entry forms) is in scope; card/UPI payment processing integration is not, initially.

## 5. Users / Personas

| Persona | Needs |
|---|---|
| Owner (you) | Full access: all modules, reports, settings, user management |
| Staff (future) | Record sales/expenses; no access to reports or settings |
| Read-only accountant (future) | View reports and registers; cannot edit |

Design the `users`/`roles` tables for this now (see ERD) even though only "Owner" exists on day one.

## 6. Functional Scope — Modules

Mapped directly from the corrected spreadsheet, which is the source of truth for what "done" looks like
for Phase 1:

1. **Dashboard** — KPIs (revenue, gross/net profit, cash balance, debtors, creditors, stock value, reorder
   alerts) + charts.
2. **Cash Book** — receipts & payments ledger, running balance.
3. **Sales** — sales register with per-line cost/selling price, credit vs cash/UPI, linked customer.
4. **Purchases** — purchase register, linked supplier, updates inventory on save.
5. **Inventory** — stock register, reorder levels, stock valuation.
6. **Expenses** — categorized expense register.
7. **Customers** — directory (master) + per-customer ledger (accounts receivable) with running balance.
8. **Suppliers** — directory (master) + per-supplier ledger (accounts payable) with running balance.
9. **Reports** — Trial Balance, P&L, Balance Sheet, Cash Flow Statement — generated from the ledger, not
   manually maintained.
10. **Admin / Data Quality** — audit log, user management, business profile settings.

## 7. Success Criteria

- Every financial report (P&L, Balance Sheet, Cash Flow, Trial Balance) is **generated**, never manually
  entered — computed from the ledger tables on read.
- The Balance Sheet balances by construction for any transaction entered through the app (the ₹3,474 class
  of bug becomes structurally impossible, not just "unlikely").
- Full audit trail: every write has a user, a timestamp, and — for corrections — a link to what it reverses.
