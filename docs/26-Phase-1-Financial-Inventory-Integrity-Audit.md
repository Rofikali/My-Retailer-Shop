# Phase 1 Audit: Financial and Inventory Integrity

- **Status:** Static code audit completed; runtime and production-data verification pending
- **Date:** 2026-11-12
- **Base commit:** 81815a2f5bbc0db9a83f3a5999933555b6b2653f
- **Scope:** Sales, purchases, inventory, customer/supplier settlement, cashbook, ledger, and reports
- **Method:** Read-only review of current `main` source, schema, migrations, validation, and existing integration/unit tests. No production data or database was accessed.

## Executive summary

The repository has a good foundation: a modular monolith, service-owned transaction boundaries, balanced ledger posting, append-only ledger/party-ledger triggers, and integration tests for several happy paths and rollback behavior.

However, important correctness gaps remain between the source documents, inventory quantities/valuation, party allocations, and financial reports. A balanced journal is necessary but not sufficient: a journal can balance while using the wrong cost, or while the inventory quantity and receivable allocation are wrong.

**Recommendation:** Do not introduce Rust/WASM or add new ERP features in this phase. First resolve the policy decisions below, then fix the high-priority integrity gaps in small code-and-test PRs.

## Findings

### F1 — Sale COGS is calculated from browser-supplied cost (High)

**Evidence**
- `server/utils/validation/sale.ts` accepts `costPrice` from the sale request.
- `server/services/sales.service.ts` calculates `totalCost` from `input.items[].costPrice`, persists it as the sale-item cost snapshot, and posts Debit COGS / Credit INVENTORY using that value.
- The service does not derive the authoritative cost from inventory receipt/movement history or a server-side costing engine.

**Impact**

A modified client request or stale browser state can change COGS and gross profit without changing the quantity sold or purchase history. The journal can still balance, so Trial Balance balance alone will not detect this error.

**Required correction**

Define the inventory costing method first. Derive COGS on the server inside the sale transaction, preserve the resolved cost snapshot, and ignore/reject any client-supplied cost field. Add tests for stale/tampered client cost and multiple purchase costs.

### F2 — Stock deduction does not enforce available stock or serialize concurrent sales (High)

**Evidence**
- `server/services/inventory.service.ts` `deduct()` inserts negative inventory movements without reading available stock, locking a product/warehouse row, or applying an atomic conditional guard.
- `SalesService.recordSale()` invokes this method inside the sale transaction.
- The inventory schema stores movement quantities but has no aggregate non-negative stock constraint.

**Impact**

A sale can push stock below zero. Two concurrent sales can both observe the same available quantity and consume more than exists if a later pre-check is added without locking/serialization.

**Required correction**

Choose an explicit negative-stock policy. If disallowed, serialize deductions for the same product/warehouse inside the transaction (for example, lock a stable product/warehouse row), calculate available quantity using the agreed warehouse scope, and reject insufficient stock. Make manual adjustments use the same serialization boundary. Add concurrent PostgreSQL integration tests.

### F3 — Inventory screen valuation can disagree with the General Ledger (High)

**Evidence**
- `server/services/inventory.service.ts` computes displayed `stockValue` as `currentStock * products.costPrice`.
- `server/services/purchases.service.ts` records purchase unit costs and inventory ledger value but does not update a weighted-average cost or maintain cost layers.
- `server/services/sales.service.ts` credits INVENTORY using the request's `costPrice` snapshot.
- `ReportService.balanceSheet()` reads the INVENTORY asset balance from the General Ledger.

**Impact**

The Inventory screen's stock value can disagree with the Inventory control account in the Balance Sheet. A user may see one stock value operationally and a different stock asset financially.

**Required correction**

Use one authoritative valuation model. The stock valuation report and General Ledger inventory control balance must reconcile at the same as-of date and scope. Define treatment for discounts, purchase returns, freight/landed costs, damaged stock, and stock-count adjustments before implementing the valuation engine.

### F4 — Receipt/payment allocation checks are vulnerable to concurrent over-allocation (High)

**Evidence**
- `CustomerReceivablesService.allocateReceipt()` and `SupplierPayablesService.allocatePayment()` read each invoice's total and current allocation sum, validate the outstanding amount, then insert allocation rows.
- `CustomerReceivablesRepo.getCreditInvoices()` and `SupplierPayablesRepo.getCreditPurchases()` do not lock the invoice rows.
- Existing unique constraints prevent duplicate allocation of the same invoice within one receipt/payment, but do not prevent cumulative allocations from different concurrent receipts/payments from exceeding the invoice amount.

**Impact**

Two simultaneous receipts can each pass against the same outstanding balance and collectively over-allocate it. The same applies to supplier payments.

**Required correction**

Lock affected invoice/purchase rows in a stable order within the outer payment transaction, re-read aggregate allocations after acquiring locks, and insert only after the locked validation succeeds. Consider database-side enforcement where it can be made safe. Add two-connection PostgreSQL concurrency tests.

### F5 — Customer credit-limit check occurs before the sale transaction (High)

**Evidence**
- `SalesService.recordSale()` reads the customer and outstanding balance and checks the credit limit before calling `database.transaction()`.
- No customer row lock or transactional re-check is performed before the credit sale and ledger posting.

**Impact**

Two concurrent credit sales can both pass against the same remaining credit headroom and exceed the customer's configured limit.

**Required correction**

Perform the credit-limit check inside the sale transaction, serialize sales for the same customer (or use an equivalent atomic reservation/limit strategy), and test concurrent requests at the credit boundary.

### F6 — Cash Book exposes Sales and Purchase categories that bypass source documents (High)

**Evidence**
- `server/utils/validation/cashTxn.ts` permits `sales` and `purchase` categories.
- `server/services/cashbook.service.ts` maps those categories directly to SALES-REV and INVENTORY and writes only a cash transaction plus ledger posting.
- This path does not create a Sales/Purchase document, sale/purchase line items, stock movements, or the associated party-ledger event.

**Impact**

Users can record a cash sale or purchase through Cash Book without the corresponding sales register, purchase register, inventory, or party history. Recording the same real-world event in both modules can double count cash and revenue/stock.

**Required correction**

Choose one canonical source-document path. Prefer restricting Cash Book to capital, expense, drawings, and explicitly defined other transactions; cash sales and purchases should be recorded through Sales/Purchases. If a quick-entry workflow is required, it must call the same domain service and create the full source document and all dependent effects atomically.

### F7 — Money arithmetic uses JavaScript floating-point values and tolerance-based posting (High)

**Evidence**
- Sale and purchase totals use JavaScript `number` multiplication and addition.
- `LedgerService.post()` sums JavaScript numbers and accepts debit/credit differences up to 0.005.
- PostgreSQL stores ledger amounts as `numeric(12,2)`, which rounds to two decimal places at persistence.
- Validation schemas accept arbitrary JavaScript decimal precision for prices, discounts, and amounts; the unit test explicitly permits a sub-cent posting difference to pass the balance check.

**Impact**

Sub-cent values can be accepted by the application and rounded by PostgreSQL at insert time. The persisted journal can therefore differ from the pre-insert balance calculation. Floating-point arithmetic can also introduce unexpected rounding in totals and allocations.

**Required correction**

Define the currency precision and rounding rule. For INR, use paise as integer minor units or a well-defined exact-decimal strategy at every calculation boundary. Reject unsupported fractional precision at input, calculate and compare exact normalized amounts, and verify the persisted debit/credit totals in integration tests. Do not use a tolerance to accept a posting that will be rounded differently by the database.

### F8 — Invoice, purchase, and cash voucher numbering can collide under concurrent requests (Medium)

**Evidence**
- `SalesRepo.nextInvoiceNo()`, `PurchasesRepo.nextPurchaseNo()`, and `CashBookRepo.nextVoucherNo()` read the latest row and return the next number before the insert transaction.
- The database uniqueness constraints prevent duplicate numbers from being committed, but concurrent requests can read the same latest value and one will fail.

**Impact**

A valid sale or purchase may fail under concurrent submissions. Retrying without idempotency can create confusion or duplicate business intent.

**Required correction**

Use a database sequence or a transactionally locked counter scoped to the required financial year/document series. Retain unique constraints as defense in depth. Define retry/idempotency behavior.

### F9 — Current data-quality review does not prove the critical reconciliations (Medium)

**Evidence**
- `ReportService.dataQualityReview()` checks posting groups and whether party events link to a party.
- It does not compare customer/supplier allocation totals to invoice balances, party subledgers to Debtors/Creditors control accounts, or inventory movement valuation to the Inventory control account.

**Impact**

The dashboard can report no action items while the most important cross-module reconciliation gaps remain undetected.

**Required correction**

Add explicit reconciliation reports and automated assertions for:
- customer subledger versus DEBTORS control account
- supplier subledger versus CREDITORS control account
- inventory quantity by product/warehouse
- inventory valuation versus INVENTORY control account
- cashbook versus CASH ledger account
- source-document count/reference linkage versus associated ledger and movement rows

Reconciliation differences must be visible and explainable, not silently corrected.

## Strengths confirmed in the reviewed source

- Sales and purchase flows use a database transaction around source rows, ledger posting, party-ledger posting, and inventory movements.
- `LedgerService.post()` rejects materially unbalanced journal lines.
- Migrations add database triggers preventing UPDATE/DELETE of posted general-ledger and party-ledger rows.
- Reversal references are retained rather than silently editing posted ledger history.
- Existing integration tests cover basic sale/purchase postings and rollback when a sale references a nonexistent product.
- Customer/supplier allocation tables have foreign keys, positive-amount checks, and per-payment/per-invoice uniqueness.

These strengths are useful foundations, but they do not resolve the findings above.

## Decisions required before implementation

The code and current documentation do not establish the business policies needed to safely implement the inventory engine.

### Decision A — Inventory costing

**Recommended starting point: moving weighted-average cost**, provided the shop does not need batch/expiry/serial-level traceability.

Why:
- It is comparatively simple to explain and operate for ordinary retail/grocery stock.
- It naturally incorporates different purchase costs into a blended unit cost.
- It avoids FIFO cost-layer complexity for the current single-shop scope.

Choose FIFO instead if batch/expiry traceability, oldest-stock-first cost flow, or specific lot-level margin reporting is a real requirement. Do not implement a configurable multi-method engine until there is a validated need.

### Decision B — Negative stock

**Recommended default: disallow negative stock for normal sales.**

If the business genuinely needs back-dated sales or temporary stock exceptions, define an owner-only, reason-coded override and an explicit reconciliation workflow. Do not silently permit negative quantities.

### Decision C — Stock scope

The schema supports warehouses, while some current calculations are product-wide and some are warehouse-grouped. Decide whether stock availability and costing are tracked:
- per product across the whole shop, or
- per product per warehouse.

**Recommended:** use product + warehouse as the inventory identity from the beginning if multiple warehouses are actively used; otherwise keep one Main warehouse operationally and avoid pretending the current implementation is fully multi-warehouse safe.

## Recommended implementation sequence after policy approval

1. Define costing and negative-stock policies, including opening stock and adjustment treatment.
2. Implement authoritative inventory valuation and server-derived COGS.
3. Add serialized stock deduction and concurrent-sale tests.
4. Move credit-limit checks inside the transaction and add concurrent-sale tests.
5. Lock invoices/purchases during receipt/payment allocation and add concurrent allocation tests.
6. Remove or unify Cash Book sales/purchase shortcuts.
7. Normalize money precision and add persisted-journal reconciliation tests.
8. Replace read-last-number numbering with a safe database-backed series.
9. Add the cross-module reconciliation report and test fixtures.

## Verification status

| Evidence | Status |
|---|---|
| Source/schema/migration review on current main | Completed |
| Existing test review | Completed |
| Local unit tests | Not run in this read-only audit |
| PostgreSQL integration tests | Not run in this read-only audit |
| Concurrency tests | Not present in reviewed paths |
| Production data reconciliation | Not run; no production database accessed |
| Runtime behavior in deployed environment | Not verified |

This report is a static code audit, not a certification of production financial correctness or security. Findings should be confirmed with isolated PostgreSQL integration tests before and during remediation.
