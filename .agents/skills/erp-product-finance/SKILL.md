---
name: erp-product-finance
description: Use for retail ERP features, product planning, financial prioritization, CA/CFO review, MBA/management decisions, and income, cash, debtors, creditors or inventory reporting.
---

# ERP Product, CA/CFO and MBA Management Skill

**References:** [product blueprint](../../../docs/31-ERP-Product-Portfolio-and-Delivery-Blueprint.md), [accounting integrity skill](../accounting-integrity/SKILL.md), [PRD](../../../docs/01-PRD-BRD.md), [costing policy](../../../docs/27-ADR-002-Inventory-Costing-and-Warehouse-Policy.md), [next queue](../../../next.md).

## Practical step-by-step review

1. Name the actual retail operator, the problem and how many manual entries or reconciliation errors the feature should eliminate.
2. Define state of product: IMPLEMENTED, PARTIAL, PLANNED, BLOCKED, not evidence-free "ready".
3. Show concrete cash/credit scenario. Separate sale revenue, inventory cost, gross profit, operating expenses, cash and outstanding dues.
4. Write exact journal effect and date; identify source document, party ledger and inventory effect. Check sums in paise, per-line rounding and tax assumptions.
5. Verify source-to-GL, customer receivable to DEBTORS, supplier payable to CREDITORS, valued stock to INVENTORY and cash to closing cash. Never conceal mismatch with report adjustments.
6. Identify fraud/error paths: unauthorized write, duplicate receipt, over-allocation, insufficient stock, stale credit check, open valuation, wrong period or reversal.
7. For operational decisions, define the KPI formula and inputs: margin %, stock turnover, ageing, reorder, available working capital and cash commitments. Label estimates and missing inputs.
8. Compare customer value, implementation and support effort, cost of infrastructure or dependencies, and reversible alternative. No invented sales volumes or pricing claims.
9. For GST/tax, accounting qualification, legal or statutory filing, distinguish user-approved product scope from current legal requirements; seek qualified professional verification before claiming compliance.
10. Provide outcome with owner sign-off boundaries, explicit non-goals and the relevant next.md task.

## Sample CA control examples

- Credit sale ₹500, trusted COGS ₹350: Dr DEBTORS ₹500 / Cr SALES ₹500; Dr COGS ₹350 / Cr INVENTORY ₹350; gross profit ₹150.
- Customer pays ₹200 against that invoice: Dr CASH ₹200 / Cr DEBTORS ₹200; remaining ₹300, not extra revenue.
- Supplier payable ₹800 paid ₹300: Dr CREDITORS ₹300 / Cr CASH ₹300; remaining ₹500.
- Owner drawings are equity movement, **not** an operating expense.

Use existing chart of account codes where actually implemented; examples illustrate required behavior rather than certify the current code.

## Completion report

Business problem, affected operator, scope, journal and stock/party effects, KPI/source formula, permissions, risk, cost assumption, tests actually run, next task ID.
