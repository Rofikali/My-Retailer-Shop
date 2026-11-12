# ADR-005: Owner-Approved Opening Valuation for Legacy Inventory

- **Status:** Proposed for review
- **Date:** 2026-11-12
- **Scope:** Single-shop RetailShop ERP inventory valuation
- **Depends on:** ADR-002, ADR-003, ADR-004, PRs #19, #20, #21, #23, #24, #25, #26, #29, and #31

## 1. Context

The persistence migration deliberately separates two populations:

- Product/warehouse scopes with historical inventory movements are created as `uninitialized`. Their quantity is preserved, but carrying value is zero only as a sentinel. It is not a claim that the stock is free.
- Products with no movement history are initialized as active zero-quantity scopes in the configured default warehouse. They can begin valued posting without inventing a historical value.

The live sale, purchase, and manual-adjustment paths still use legacy quantity-only movements. MWAC receipt/issue services already persist immutable events and balance projections, and reject uninitialized scopes or scopes containing movements without valuation events. The existing manual `opening` adjustment is not this transition: it calculates a GL amount from mutable `products.cost_price`, so it must remain a legacy operation and must never activate a legacy scope for MWAC.

PR #31 now enforces the shared product-row lock boundary: MWAC services acquire the product lock before the valuation balance; legacy writers acquire the same product lock and reject an active MWAC scope. This serializes the transition decision. It does not itself value historical stock.

## 2. Decision

A legacy product/warehouse scope may become MWAC-active only through an explicit, owner-authorized opening-valuation operation.

The opening value must be supplied or confirmed by the owner from an independently reviewed stock count and valuation basis. It must never be inferred from the mutable `products.cost_price` field, the latest purchase price, or a current selling price.

The opening operation must run as one PostgreSQL transaction and must:

1. Acquire the same product-row lock used by all other stock writers.
2. Lock the valuation balance after the product lock.
3. Confirm the balance is `uninitialized`.
4. Re-read the quantity from the complete movement history while holding the lock.
5. Reject a negative quantity, invalid quantity precision, a missing product/warehouse, or a mismatch between the balance quantity and movement-derived quantity.
6. Require explicit owner authorization and a recorded opening carrying value in integer paise.
7. Create an immutable, auditable opening baseline event and its source movement without changing the physical quantity.
8. Set the active balance to the verified physical quantity and owner-approved carrying value.
9. Post the matching general-ledger opening entry (Debit INVENTORY / Credit CAPITAL or another explicitly approved equity account) in the same transaction.
10. Commit all effects together or roll all of them back.

The current event schema requires every valuation event to reference an inventory movement. The preferred first implementation is therefore a zero-quantity `opening` source movement linked to a dedicated owner-approved opening record, with an `opening` valuation event whose quantity delta is zero and whose after-snapshot contains the verified quantity and approved carrying value. The movement is an audit/source anchor, not a physical receipt. Before implementation, verify that zero-quantity movements are accepted by every report and domain invariant. If that cannot be guaranteed, revise the event source contract to support a dedicated opening source instead of forcing a fake stock movement.

## 3. Legacy history boundary

Historical quantity movements remain immutable historical facts. They are not retroactively assigned guessed unit costs and are not rewritten to appear as MWAC events.

Do not use timestamps alone as the legacy/valued boundary. Transaction timestamps can be assigned before a transaction waits for the product lock. Instead, add an explicit movement classification (for example, `valuation_state` with `legacy` and `valued` values): backfill all existing movements as `legacy`; preserve `legacy` as the default for existing uninitialized workflows; and have MWAC writers explicitly create `valued` movements. The opening baseline is classified `valued` only when it is linked to the dedicated owner-approved opening record. Keep the opening record and event immutable.

After activation:

- Every new stock-changing application path must use the MWAC-aware workflow.
- Every new movement must have exactly one matching immutable valuation event.
- The balance projection must equal the latest event snapshot.
- Historical rows remain explicitly classified as `legacy`; they are not retroactively assigned valuation events.
- On an active scope, a database trigger must reject new `legacy` movements after acquiring the product-row lock, while allowing `valued` movements only through the valued workflow.
- A deferred database constraint/trigger must ensure every new `valued` movement has exactly one matching immutable valuation event by transaction commit. The existing unique movement link on valuation events supports the one-event maximum.
- The MWAC service's missing-event guard checks only movements classified `valued`; pre-opening legacy rows are intentionally excluded.
- All application writers continue to acquire the same product-row lock before the valuation-balance lock. A legacy transaction waiting behind opening must re-read the active state and reject; it must not append a quantity-only movement.

This classification avoids relying on `created_at` or transaction timestamps for ordering. The database trigger and deferred event check are required because application-only checks can be bypassed by another supported writer or future code. Their lock order must be reviewed carefully: product row first, then valuation balance.

## 4. Accounting and valuation policy

- The opening quantity is the physical quantity verified at the transition, not a new purchase receipt.
- The opening carrying value is the owner's approved total value for that verified quantity, expressed in paise.
- The opening event establishes the baseline quantity and carrying value. It must not pretend that the opening quantity was newly received from a supplier.
- The dedicated opening record is the idempotency/approval source and should capture product, warehouse, verified quantity, approved carrying value in paise, effective date, reason/evidence reference, approving owner, and execution actor.
- The opening GL reference must point to this opening record, not an unrelated movement ID. Use exact decimal-string paise values for the debit and credit.
- The corresponding GL debit must equal the opening carrying value exactly. The credit account and approval authority must be explicit and auditable.
- A zero-quantity scope may only open at zero carrying value unless a separately documented non-stock asset treatment is approved.
- Negative or uncertain physical quantities block opening; they require a separate reconciliation workflow.
- Do not automatically repair historical negative stock, source links, or movement dates during opening.
- Do not backdate the activation boundary or silently rewrite prior reports.

## 5. Operational and security controls

- Only the owner role may approve and execute the opening operation. Staff and read-only accountant roles must be denied server-side.
- Require a deliberate confirmation containing product, warehouse, verified quantity, approved value, effective date, and reason.
- Record actor, approval time, source reference, verified quantity, approved value, and valuation-method version in immutable audit data.
- Make the operation idempotent or protect it with a unique opening reference so retries cannot create duplicate capital or inventory postings.
- Return a clear conflict if the scope is already active; never silently overwrite an active balance.
- Preserve append-only movement, valuation-event, and GL rules. Corrections after activation must use compensating events and matching accounting entries.
- The opening workflow must be unavailable behind a feature gate until reconciliation and rollback/recovery tests pass.

## 6. Required tests

- Exact quantity and paise validation, including zero, maximum precision, and overflow boundaries.
- Owner authorization and negative authorization tests for staff and read-only roles.
- Rejection of negative legacy stock and movement/balance quantity mismatch.
- Rejection when the scope is already active.
- Opening approval-record, zero-quantity source movement, event linkage, and immutable-event trigger coverage.
- Database trigger rejects a legacy movement inserted into an active scope, including a direct SQL attempt.
- Deferred constraint rejects a valued movement without its event at commit.
- Exact opening value, balance snapshot, and GL debit/credit equality.
- Full transaction rollback when any source, event, balance, or ledger write fails.
- Concurrent opening attempts: exactly one succeeds.
- Concurrent legacy sale, purchase, and adjustment attempts waiting on the opening lock: they must re-read state and reject after activation.
- Concurrent MWAC receipt/issue waiting on opening: it must observe the committed baseline and proceed only under the active-state invariant.
- Reconciliation that distinguishes pre-opening legacy movements from post-opening valued movements.
- Duplicate request/retry behavior.
- Migration upgrade, production-like rehearsal, backup, and restore evidence.

## 7. Explicit non-goals

This ADR does not authorize:

- Production opening valuations or cutover.
- Historical cost inference or retroactive valuation backfill.
- Automatic correction of negative or inconsistent stock.
- Switching only purchases or only sales to MWAC.
- Changing the existing live sales/purchase behavior.
- Destructive migration or production data mutation.

## 8. Exit gate

Implementation may begin only after the opening-source representation, movement classification and trigger lock order, GL equity account, idempotency key, and report treatment are confirmed in code review. Live activation requires owner-approved values, complete writer coverage, exact reconciliation, all CI checks passing, and a separate explicit production authorization.
