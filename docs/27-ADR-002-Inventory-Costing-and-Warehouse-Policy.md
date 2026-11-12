# ADR-002: Inventory Costing, Stock Availability, and Warehouse Scope

- **Status:** Accepted policy; implementation and historical-data cutover are pending
- **Date:** 2026-11-12
- **Decision owners:** Product owner and repository maintainers
- **Scope:** Current single-shop RetailShop ERP

## 1. Context

The Phase 1 audit identified that sale COGS currently trusts a browser-supplied cost, inventory movements record quantity but not a complete carrying-value history, the inventory screen multiplies stock by the mutable product master cost, and sales do not explicitly select a warehouse.

A costing-policy decision is necessary before changing financial calculations. The decision must work for normal retail purchases and sales, preserve posted history, and keep the inventory subledger reconcilable to the General Ledger inventory control account.

## 2. Accepted decisions

The persistence and locking design that implements these policies is proposed separately in [ADR-003](28-ADR-003-Inventory-Valuation-Persistence-and-Concurrency.md).

### 2.1 Costing method: perpetual moving weighted average

Use **perpetual moving weighted average cost (MWAC)** per product and warehouse.

After each receipt into a product/warehouse balance:

\[
\text{New average cost} =
\frac{\text{Previous carrying value} + \text{Net receipt value}}
{\text{Previous quantity} + \text{Received quantity}}
\]

A sale uses the current server-calculated average cost for the selected product/warehouse. The resolved cost and carrying-value reduction are persisted as immutable transaction snapshots.

Example (no tax or freight in this simplified example):

- Receive 10 kg at ₹10/kg: quantity 10 kg; value ₹100.
- Receive 10 kg at ₹14/kg: quantity 20 kg; value ₹240; weighted average ₹12/kg.
- Sell 5 kg: COGS ₹60; remaining quantity 15 kg; remaining carrying value ₹180.

A purchase discount reduces the inventory acquisition cost. It must be allocated deterministically to the affected purchase lines before calculating the net receipt value. Tax, freight, landed cost, purchase returns, and sales returns require explicit accounting policies before those features are implemented; do not silently include or exclude them.

### 2.2 Negative stock: prohibited

A stock-out movement must not make the selected product/warehouse quantity negative.

- Validate availability inside the same PostgreSQL transaction that writes the sale and inventory movement.
- Serialize competing stock-outs for the same product so two concurrent sales cannot both consume the same available quantity. A stable product-row lock is an acceptable first implementation; a narrower product/warehouse lock can be considered if contention is measured.
- Validate aggregate duplicate sale lines together, not independently.
- Apply the same invariant to damage and manual negative adjustments.
- No override is approved in this phase. A future owner-authorized exception would require a reason, actor, audit event, and a separate approval design.

### 2.3 Inventory dimension: product + warehouse

Quantity and carrying value are tracked for each product in each warehouse.

- Every purchase, sale, opening balance, damage, adjustment, and future transfer must identify its warehouse.
- A sale must select a warehouse; the initial UI default may be the configured default warehouse, but the server must validate and persist it.
- Inventory reporting must show per-warehouse quantity/value and a reconciled product/business total.
- The General Ledger may continue to use one aggregate INVENTORY control account in this phase. The sum of all warehouse valuations must reconcile to that account. Separate GL accounts per warehouse are not required now.
- A warehouse transfer must later be represented as paired, traceable movements with no change to total business inventory value.

## 3. Data and accounting invariants

1. Quantity movement and value movement are recorded together and cannot be independently omitted.
2. Purchase receipts increase quantity and carrying value by the net capitalized acquisition cost.
3. Sales decrease quantity and carrying value by server-derived COGS; the same amount posts Dr COGS / Cr INVENTORY.
4. Damage/write-off decreases quantity and carrying value and posts to an explicitly approved loss account.
5. Opening stock requires an approved quantity and value per product/warehouse, with a corresponding opening-balance journal.
6. A count correction cannot silently change inventory value without an accounting counterpart. The existing unposted correction behavior must be reviewed and replaced with an explicit, auditable treatment before valuation cutover.
7. Posted inventory valuation facts are append-only. Corrections use linked compensating events; never rewrite prior costs.
8. Money calculations use exact decimal arithmetic. Persisted journal values are rounded to the currency's minor unit under one documented rule; weighted-average precision must be sufficient to avoid cumulative rounding drift.
9. **Deterministic valuation precision and rounding (initial INR implementation):**
   - Use the existing inventory quantity precision of 2 decimal places for the first implementation; do not silently accept more precision than the database can store.
   - Represent carrying value and posted COGS as integer currency minor units (paise for INR) in the costing domain. Do not use JavaScript `number` for these calculations.
   - Keep the weighted-average unit cost as an exact ratio of carrying value to quantity during calculation; do not round the average unit cost before an issue.
   - Round a partial issue's total COGS to the nearest currency minor unit using round-half-up.
   - When an issue fully depletes the balance, consume the exact remaining carrying value. This assigns any accumulated rounding residual to the final issue and guarantees zero value at zero quantity.
   - Calculate and round each purchase line's net acquisition value to currency minor units before passing it to the costing engine. The caller must apply the approved discount allocation; the engine must not guess at tax, freight, or other landed costs.
10. For every posted event, inventory valuation subledger movement and GL inventory control movement must agree exactly at the posted currency precision.

## 4. Historical-data migration and cutover — mandatory gate

**Do not fabricate historical unit costs or silently recalculate historical profit.**

The existing schema does not contain complete, trustworthy historical valuation data for every movement type. Purchase and sale documents may help explain some rows, but legacy opening balances, damage, count corrections, historical product cost edits, and pre-existing GL differences can make a full reconstruction ambiguous.

The implementation must therefore use a staged, evidence-backed cutover:

1. Additive schema expansion only; keep old application behavior compatible during the expand stage.
2. Build a read-only preflight/reconciliation report by product, warehouse, quantity, source document, and current inventory GL control balance.
3. Preserve existing posted sale COGS and ledger entries as historical facts. Do not rewrite them to match the new method.
4. Identify movements whose historical carrying value cannot be proven. Require an owner-approved opening valuation schedule or a documented correction journal; do not infer values from today's product.costPrice.
5. Compare the approved opening valuation schedule with the existing INVENTORY control account and explain every difference before cutover.
6. Backfill only values supported by source documents or an approved opening schedule. Record provenance and the operator/approval for any manual valuation.
7. Run the preflight and reconciliation against an isolated copy of production data before enabling new posting behavior.
8. Deploy the compatible schema first, then the application cutover. Keep a forward-recovery plan and a tested backup/restore point.
9. Do not run a production migration or change production data without explicit authorization.

If historical quantities or values cannot be reconciled, stop the cutover and report the unresolved products/warehouses. The system may continue in its legacy mode until the owner resolves the opening valuation; it must not pretend the new valuation is correct.

## 5. Implementation sequence

1. **Inventory model and preflight:** define valuation event representation, warehouse identity, constraints, indexes, and a read-only historical reconciliation report.
2. **Costing engine:** implement pure exact-decimal MWAC calculations with unit tests for receipts, partial issues, rounding, duplicate lines, and insufficient stock.
3. **Atomic stock service:** serialize stock-outs, calculate available quantity and average cost inside the transaction, and persist quantity/value snapshots.
4. **Purchases and sales:** use net purchase acquisition value and server-derived sale COGS; remove client cost as an authority; persist sale warehouse.
5. **Other movement types:** define and implement opening, damage, count correction, and transfer valuation/accounting effects.
6. **Reporting:** show warehouse-level quantities and carrying values; reconcile their aggregate to the GL inventory control account.
7. **Cutover:** execute the approved backfill and reconciliation plan on a production-like copy, obtain owner approval, then schedule production migration separately.

Each step is a focused PR with tests and evidence. Do not bundle unrelated receivables, cashbook, or money-arithmetic remediation into the costing-engine PR.

## 6. Verification requirements

- Pure unit tests for weighted-average arithmetic and currency rounding.
- PostgreSQL integration tests for purchase → sale → remaining stock/value and matching GL postings.
- Concurrency tests proving competing sales cannot oversell a product/warehouse.
- Negative tests for tampered client cost, insufficient stock, invalid warehouse, and invalid movement values.
- Rollback tests proving source document, stock movement, valuation, party ledger, and journal all roll back together.
- Reconciliation tests proving per-warehouse valuation sums to the INVENTORY control account.
- Fresh-schema and upgraded-schema migration tests, plus a representative historical-data preflight.
- No claim of production readiness until production-like data reconciliation and backup/restore evidence exist.

## 7. Consequences

**Benefits**
- Gross profit is based on authoritative acquisition costs rather than browser input.
- Stock availability is protected against ordinary and concurrent overselling.
- Inventory quantity and value can be explained per warehouse.
- Historical posted financial records remain auditable.

**Costs and limitations**
- The costing engine and migration are more involved than replacing one formula.
- Historical valuation may require owner review and approved opening values.
- Product-row locking serializes movements for the same product across warehouses initially; optimize only if measured contention warrants it.
- Transfers, returns, taxes, freight/landed cost, and authorized negative-stock exceptions remain separate policy decisions.
