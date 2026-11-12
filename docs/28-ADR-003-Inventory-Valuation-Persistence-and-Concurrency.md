# ADR-003: Inventory Valuation Persistence and Transaction Concurrency

- **Status:** Proposed implementation design; requires review before schema implementation
- **Date:** 2026-11-12
- **Scope:** Single-shop RetailShop ERP, product + warehouse inventory valuation
- **Depends on:** ADR-001, ADR-002, and the pure MWAC engine merged in PR #23

## 1. Context

PR #23 introduced pure moving-weighted-average transitions using exact integer arithmetic. It deliberately does not persist inventory carrying value or connect to purchase/sale transactions.

The current application still derives quantity from append-only inventory_movements, while sale COGS and opening/damage values can still be influenced by browser input or mutable products.cost_price. We need a persistence model that makes quantity, carrying value, source documents, and GL effects one atomic business event.

Historical movement rows do not contain enough reliable value data to initialize a trustworthy MWAC balance automatically. The new model must distinguish an unvalued legacy balance from a genuinely new zero-stock balance.

## 2. Decision: immutable valuation events + a locked balance projection

Use two additive tables. Do not repurpose or rewrite historical inventory_movements.

### 2.1 inventory_valuation_events — immutable valuation facts

One valuation event corresponds to exactly one inventory movement.

Proposed fields:

| Field | Purpose |
|---|---|
| id | UUID primary key |
| inventory_movement_id | NOT NULL, unique FK to inventory_movements.id |
| product_id | Product dimension, FK to products |
| warehouse | Warehouse dimension, same normalized value as movement |
| event_type | opening, purchase, sale, damage, adjustment, or future transfer |
| quantity_delta | Signed quantity change, same scale as inventory movement |
| value_delta | Signed carrying-value change in currency precision; positive adds value, negative removes value |
| quantity_after | Quantity snapshot after this event |
| carrying_value_after | Carrying-value snapshot after this event |
| costing_method_version | Explicit version such as mwac-v1 |
| reference_type, reference_id | Source-document provenance |
| created_by, created_at | Actor and immutable creation time |

Rules:

- Unique inventory_movement_id prevents duplicate valuation for the same stock movement.
- The event's product, warehouse, quantity delta, and source reference must match the linked inventory movement.
- value_delta is signed. For a sale, its absolute value is the line's COGS; the inventory value reduction is negative.
- quantity_after and carrying_value_after are audit snapshots, not editable balances.
- Updates and deletes are prohibited by database-level protection, matching the append-only ledger pattern. Corrections use a new compensating event.
- Events are inserted in the same transaction as their source movement, source document, and corresponding GL posting.

### 2.2 inventory_valuation_balances — concurrency-safe current projection

One row per product + warehouse, protected by a unique constraint.

Proposed fields:

- product_id, warehouse: composite unique key.
- quantity: current quantity projection at the existing 2-decimal scale.
- carrying_value: current carrying value in currency minor units / paise for INR.
- valuation_status: uninitialized or active.
- last_event_id: latest valuation event, nullable before initialization.
- version: monotonically increasing integer for optimistic diagnostics and audit support.
- updated_at: last projection update time.

Rules:

- This table is a mutable projection used for efficient reads and row locking; the immutable valuation events remain the audit source of truth.
- Enforce non-negative quantity and carrying value. An active zero-quantity balance must have zero carrying value.
- An uninitialized row means quantity exists or may exist but carrying value has not been approved. Do not treat its zero value as a real valuation.
- A new product/warehouse with no historical movements may be initialized as active at zero quantity/value.
- A product/warehouse with any legacy quantity movement must remain uninitialized until an owner-approved opening valuation event is posted and reconciled. Never initialize it from current products.cost_price.
- The sum of active balances and their valuation events must reconcile to the INVENTORY GL control account before cutover is approved.

## 3. Locking and transaction protocol

All valuation writes run inside the source document's existing PostgreSQL transaction. No nested transaction or independent commit is allowed.

For each operation:

1. Normalize and aggregate duplicate lines by product + warehouse before locking.
2. Sort lock keys deterministically by product ID, then warehouse, to reduce deadlock risk.
3. Ensure a balance row exists using an insert-on-conflict-safe pattern.
4. Lock each balance row with SELECT ... FOR UPDATE before reading quantity/value.
5. Reject an uninitialized balance unless the operation is the explicit approved opening-valuation workflow.
6. Run the pure MWAC transition using the locked balance.
7. Insert the append-only inventory movement and linked valuation event.
8. Update the balance projection and increment its version.
9. Post the exact same value delta to the INVENTORY GL control account (and COGS or approved loss/capital counterpart).
10. Commit only after source document, line snapshots, stock movement, valuation event, balance projection, party ledger, and GL posting all succeed.

For an initial balance-row race, use a unique (product_id, warehouse) constraint plus INSERT ... ON CONFLICT DO NOTHING, then lock and read the row. Do not rely on an unlocked read followed by an update.

The service must validate aggregate requested quantity against the locked balance. Two concurrent issues for the same product/warehouse must serialize; the second transaction must see the first transaction's committed result and reject if stock is insufficient.

## 4. Source-line accounting snapshots

### Purchases

- Compute each purchase line's gross acquisition value from quantity × unit cost using exact integer arithmetic.
- Round the line's gross value to the nearest paise using round-half-up, then subtract the persisted line discount in paise.
- Reject a discount greater than the rounded gross line value.
- Pass the resulting net acquisition value to receiveMwac.
- The initial implementation must not silently add GST, freight, or other landed costs. Those require a separate approved policy.

### Sales

- Ignore browser-supplied costPrice as an authority.
- For each aggregated product/warehouse issue, calculate COGS using the locked MWAC balance.
- Persist an authoritative per-sale-line total cost_value (integer paise at the domain boundary, numeric currency value in PostgreSQL). Existing sale_items.cost_price may remain as a legacy/display snapshot during transition, but must not determine COGS or GL postings.
- Sum the authoritative line cost values for Dr COGS / Cr INVENTORY.
- Persist the selected warehouse on the sale document or line so the source movement and valuation event have an unambiguous warehouse.
- Keep selling price and discount snapshots separate from inventory cost snapshots.

## 5. Legacy data and safe rollout

- Migration is additive: create the new tables and constraints without assigning historical values.
- Seed or classify existing product/warehouse balances as uninitialized based on existing quantity movements. Do not infer carrying value from products.cost_price.
- Do not enable MWAC purchases/sales for uninitialized positive-stock balances.
- Keep the legacy posting path explicitly identifiable during transition; do not mix valued and unvalued stock silently.
- The owner-approved opening valuation workflow must create an opening movement, valuation event, balance projection, and matching opening journal in one transaction.
- Before enabling live posting, reconcile all active valuation balances and valuation events to the INVENTORY GL control account.
- No production migration, backfill, cutover, or destructive schema operation without explicit owner authorization and a tested backup/restore plan.

## 6. Implementation sequence

1. Review and accept this storage/concurrency design.
2. Add schema and additive migration with database constraints and append-only event protection.
3. Add PostgreSQL integration tests for schema constraints, source linkage, initialization states, rollback, and row-lock concurrency.
4. Implement a transaction-scoped valuation repository/service that calls the pure MWAC engine.
5. Integrate purchase receipt posting, with exact acquisition-value calculation and discount validation.
6. Integrate sale issue posting, server-derived COGS, sale-line cost snapshots, and required warehouse persistence.
7. Handle opening valuation, damage, and count corrections under explicit accounting rules.
8. Extend reconciliation reports and reporting UI.
9. Run production-like preflight and obtain owner approval before any cutover.

Each implementation step must be a focused PR. No broad refactor or unrelated money-arithmetic cleanup is bundled into the schema PR.

## 7. Rejected alternatives

- Store only a mutable current average cost on products: loses warehouse scope and historical auditability.
- Calculate each sale by summing all prior movements on every request: expensive, difficult to lock correctly, and vulnerable to ambiguous legacy provenance.
- Treat the balance projection as the only source of truth: makes audit reconstruction and tamper detection weaker.
- Infer opening value from products.cost_price: mutable master data cannot prove historical acquisition value.
- Use browser-supplied cost: untrusted input must never determine COGS or inventory GL value.
- Introduce Rust/WASM for the costing arithmetic now: the pure TypeScript BigInt engine is not a measured bottleneck; database correctness and transaction isolation dominate this milestone.

## 8. Acceptance criteria for the schema milestone

- Fresh database migration creates both tables and all documented constraints.
- Existing database migration preserves every legacy movement and ledger row unchanged.
- Existing positive/negative legacy stock is marked uninitialized, not assigned a fabricated value.
- New zero-stock product/warehouse can be initialized safely.
- Duplicate valuation events for one movement are rejected.
- Event updates/deletes are rejected at the database layer.
- Invalid negative balances and inconsistent zero-value states are rejected.
- PostgreSQL integration tests prove source movement/event/balance changes roll back together.
- No sale/purchase API behavior changes in the schema-only milestone.
