---
name: accounting-integrity
description: Use when changing or reviewing sales, purchases, expenses, receipts, supplier payments, inventory costing, customer or supplier ledgers, journal postings, Trial Balance, P&L, Balance Sheet, or Cash Flow.
---

# Accounting Integrity Skill

## Objective

Prove that a business event produces the correct, balanced, atomic, auditable effects across source documents, inventory, party balances, ledger, and reports.

## Procedure

1. Identify the business event and its accounting treatment. Read the relevant PRD, ERD, LLD, ledger design, and existing service/tests.
2. Write a hand-calculated example using realistic values. State whether the event is cash or credit, the date, quantity, selling price, discount, tax treatment (if implemented), and authoritative cost.
3. Define expected debit/credit lines. Verify total debits equal total credits for every posted transaction.
4. Trace the complete write path: request validation → service → transaction → repositories → source rows → ledger rows → inventory movements → party-ledger/allocation rows.
5. Confirm every dependent write is in the same database transaction. Inject or simulate a failure between writes and verify complete rollback.
6. Check duplicate submission and concurrent requests. Use database constraints, idempotency, row locks, or atomic conditional updates where needed; application pre-checks alone do not prevent races.
7. Verify customer and supplier allocations never exceed the applicable outstanding balance and that subledgers reconcile to control accounts.
8. Verify stock quantity and valuation using the documented costing method. Do not accept client-supplied cost as authoritative COGS without a trusted server-side derivation and policy.
9. Trace the event into Trial Balance and financial statements. Compare the result with the hand calculation and confirm the Balance Sheet equation.
10. Verify posted history is append-only and corrections use traceable reversal/correction entries.

## Required tests

Add or update tests for:
- balanced posting and rejection of unbalanced posting
- correct cash/credit account selection and amount
- inventory quantity and valuation effects
- party-ledger and receipt/payment allocation behavior
- transaction rollback on a mid-operation failure
- duplicate and concurrent submissions where relevant
- report reconciliation against a known, hand-calculated fixture

## Stop conditions

Do not invent accounting policy, tax treatment, inventory costing method, rounding rules, or period-close behavior. If the policy is not defined, document the gap and ask for a decision before implementing a financial calculation.

## Completion evidence

Report the worked example, journal lines, stock and party effects, report impact, tests executed, and any reconciliation gap.
