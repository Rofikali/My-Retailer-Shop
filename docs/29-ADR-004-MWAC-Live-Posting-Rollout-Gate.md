# ADR-004: MWAC Live-Posting Rollout Gate and Writer Coordination

- **Status:** Proposed for review
- **Date:** 2026-11-12
- **Scope:** Single-shop RetailShop ERP inventory posting
- **Depends on:** ADR-002, ADR-003, PRs #19, #20, #21, #23, #24, #25, #26, #27, #29, and #31

## 1. Context

The repository now contains:
- A pure exact-decimal moving weighted-average cost (MWAC) engine.
- Immutable valuation events and a locked product + warehouse balance projection.
- A transaction-scoped valuation service for receipts and issues.
- Exact purchase acquisition-value calculation in paise.
- A shared product-row lock protocol for legacy sales, purchases, and manual stock adjustments, preventing concurrent overselling.

However, live purchase, sale, and manual-adjustment workflows still write quantity-only inventory movements. They do not yet write valuation events or update valuation balances. Sale COGS still comes from browser-supplied `costPrice`.

The current valuation service intentionally rejects an uninitialized legacy balance and rejects any product/warehouse scope containing an inventory movement without a matching valuation event.

## 2. Critical sequencing decision

**Do not integrate only one live stock-writer workflow into MWAC while the other writers continue using the legacy quantity-only path for the same product/warehouse.**

For example:
1. A purchase is posted through MWAC and creates an immutable valuation event plus an active balance.
2. A later sale for the same product/warehouse is posted through the legacy path and creates a quantity-only movement.
3. The active balance no longer represents all movement history.
4. A later MWAC receipt or issue detects the unvalued movement and rejects posting.

This rejection is safer than silently corrupting the valuation, but it would create an avoidable operational failure. The same issue applies to manual opening, damage, and count-correction movements.

PR #29 added aggregate stock checks under the product-row lock. PR #31 then made the writer boundary explicit: both MWAC and legacy services acquire the same product-row lock before the valuation-balance lock/check, and legacy writers reject MWAC-active scopes. This serializes the state decision but does not make a legacy movement part of the MWAC valuation ledger.

## 3. Required writer invariant

For each product + warehouse, every stock-changing operation must follow exactly one explicitly selected state policy:

- **Legacy-uninitialized state:** the balance is uninitialized because historical movements exist without approved carrying value. No MWAC event may be inferred from current product master cost. A legacy operation must remain visibly classified as legacy and must not mark the balance active.
- **MWAC-active state:** every new stock-changing operation must atomically write its source movement, immutable valuation event, balance projection, and matching financial posting. No legacy quantity-only writer may modify this scope.
- **Opening transition:** changing an uninitialized scope to MWAC-active requires an explicit, owner-approved opening valuation with a documented quantity and value, a matching opening event, balance projection, and GL posting in one transaction. It must not be inferred from mutable `products.cost_price`.

All paths must acquire the shared product-row lock enforced by PR #31 before the valuation-balance lock. For multi-product transactions, product locks are acquired in deterministic sorted order before any balance locks.

## 4. Implementation gate

Before enabling MWAC posting for existing stock, the implementation must establish a safe policy for all stock writers:

1. Sales: server-derived COGS from the locked MWAC balance; browser-supplied `costPrice` must not determine COGS or the inventory GL posting.
2. Purchases: exact net acquisition value in paise must feed the receipt event and balance.
3. Manual opening, damage, and count corrections: each must create the appropriate valuation event and matching accounting treatment, or be explicitly rejected for an MWAC-active scope until its supported workflow exists.
4. Warehouse: every source document/movement must identify the same validated warehouse used by the balance lock.
5. Duplicate lines: aggregate by product + warehouse for the MWAC transition, then allocate sale COGS back to original lines with deterministic integer arithmetic.
6. Reconciliation: prove movement quantity, valuation-event snapshots, balance projections, and the INVENTORY GL control account agree.

The preferred implementation is a coordinated stock-writer milestone, not independent purchase-only and sale-only deployments. If work is split into multiple PRs for review, it must remain behind an explicit feature gate that prevents partial live activation. No legacy writer may be allowed to mutate an MWAC-active product/warehouse.

## 5. Legacy operational safety

- Do not automatically assign carrying value to legacy stock from `products.cost_price`.
- Do not silently fall back from MWAC to browser-supplied sale cost when an active balance is missing, uninitialized, inconsistent, or contains an unvalued movement.
- Do not silently create an active zero balance for a scope that has legacy movements.
- Preserve current legacy records; use compensating events for corrections after valuation activation.
- A read-only preflight must identify uninitialized scopes, negative quantity, missing source links, unvalued movements, and GL reconciliation differences.
- Before production activation, obtain explicit owner approval for opening quantities and values, test backup/restore, and verify a production-like rehearsal.
- No production migration, backfill, opening valuation, cutover, or destructive operation is authorized by this ADR.

## 6. Acceptance criteria before live activation

- Concurrent purchase, sale, and adjustment tests prove a single lock order and transaction rollback.
- A legacy movement cannot be appended to an MWAC-active scope.
- An MWAC event cannot be posted against an uninitialized legacy scope except through the approved opening workflow.
- Sale COGS is computed only by the server-side MWAC engine for active scopes.
- Purchase acquisition value, inventory movement value delta, balance carrying value, and GL inventory debit agree exactly in paise.
- Sale COGS, inventory value reduction, balance carrying value reduction, and GL posting agree exactly in paise.
- Damage and correction paths preserve the approved accounting policy.
- Duplicate sale lines and largest-remainder allocation reconcile exactly to group COGS.
- All unit, PostgreSQL integration, concurrency, typecheck, production build/E2E, and container checks pass.
- The rollout remains disabled until owner-approved opening valuation and reconciliation are complete.

## 7. Decision summary

PR #29 adds aggregate legacy stock availability checks, and PR #31 enforces the shared product-row lock and legacy/MWAC writer boundary. Neither enables live MWAC sales or purchases. ADR-005 defines the proposed owner-approved opening transition for historical stock. The next implementation must preserve a strict boundary between uninitialized legacy inventory and fully valued inventory. A partial writer migration without a per-scope gate is not safe.
