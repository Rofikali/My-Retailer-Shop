# Security & Data Integrity

This is a financial system for your own business. The bar isn't "enterprise compliance theater" — it's
"if this laptop/server were compromised, or a bug shipped, how bad is it, and how would I know."

## Authentication
- Session-based auth (httpOnly, secure, sameSite cookies) via Better Auth or Lucia — don't roll your own
  password hashing/session logic
- Passwords hashed with argon2 (or bcrypt) — never store plaintext, ever, even for a single owner account
- Rate-limit the login endpoint (even a simple in-memory limiter is enough at this scale) to blunt
  brute-force attempts

## Authorization
- Role checks in middleware, applied per-route, deny-by-default (a new route with no explicit role
  requirement should fail closed, not open)
- The `owner` role is the only one that can manage users/roles — don't let `staff` escalate itself

## Data Integrity (the part that maps directly to your Excel lessons)
- **DB-level constraints, not just application checks**: `UNIQUE` on customer/supplier codes, `CHECK` on
  ledger entries (exactly one of debit/credit > 0), `NOT NULL` on foreign keys that must exist. Application
  validation is the first line of defense; DB constraints are the one that can't be bypassed by a bug.
- **Append-only ledger** (see ERD) — this alone eliminates the class of bug where a Trial Balance silently
  stops matching reality because someone (or some code) edited a posted row.
- **Snapshots vs. live references** — historical financial facts (sale line item cost/price) are stored as
  of the transaction date, never recomputed from current master data.

## Secrets
- `.env` files never committed (`.gitignore` from commit #1)
- Production secrets live in the hosting platform's secret manager, not in a config file in the repo
- Rotate `SESSION_SECRET` if you ever suspect exposure — sessions invalidate, users just log in again, low
  cost

## Input Handling
- Every write endpoint validates with zod server-side — client-side validation is UX only, never trusted
- Parameterized queries throughout (Drizzle does this by default) — no raw string-concatenated SQL, ever

## Audit Trail
- Every `ledger_entries` / `inventory_movements` row has `created_by` + `created_at` — non-negotiable, this
  is what "who approved this" actually means in practice, versus the placeholder `[Owner Name]` text field
  the Excel version had
- Consider a lightweight `audit_log` table for non-financial but sensitive actions (user role changes,
  login attempts) if you want a fuller picture later — not required for Phase 1

## What's genuinely out of scope right now, and why
- **PCI-DSS** — you're not processing/storing card numbers; if you ever integrate a payment gateway, use
  their hosted checkout/tokenization so card data never touches your servers, and PCI scope stays minimal
- **SOC2 / formal compliance audits** — relevant when you have external customers relying on your security
  posture contractually; not relevant for an internal tool
- **MFA** — nice to have, not urgent for a single owner account; add before you'd regret not having it if
  you ever store more sensitive data (e.g., full customer KYC details)
