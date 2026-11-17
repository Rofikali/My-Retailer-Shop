# RetailShop ERP — Product Destination and Delivery Blueprint

**Status:** Planning and reality map (2026-11-17), not a claim of finished features. Current product requirements: [PRD/BRD](01-PRD-BRD.md); [HLD](02-HLD.md); [LLD](04-LLD.md); [roadmap](14-Implementation-Roadmap.md). Actual task priority: [next.md](../next.md).

## Mission and scope

Deliver a dependable, self-owned ERP for **one retail shop first**, replacing unreliable spreadsheets. Grocery, snacks, computer-product sales and an optional future services counter are useful workflows; actual capabilities must be proven from source/CI and real operator acceptance, not assumed from dashboard names.

An owner should be able to answer from **one reconciled system**: what sold, stock on hand, true gross/net profit, cash/bank balance, customer dues, supplier obligations, expenses, and cash needed next week. Every business event is entered once and links to all affected accounts.

**Explicit initial non-goals:** multi-tenant SaaS, payment-gateway integration, GST e-invoicing, large-scale distributed systems, Rust/WASM optimization, "AI" features, new paid cloud infrastructure. Revisit only with owner-approved evidence.

## User personas and operational journeys

| Persona | Needed outcome | Current implementation versus gap |
| --- | --- | --- |
| Owner | Approve, correct and understand operations and books | Many modules exist; control/reconciliation and backups incomplete |
| Sales staff | Record valid cash/UPI/credit sale; prevent shortage and duplicates | Sale flow exists; browser-supplied COGS and role gaps |
| Purchasing/inventory staff | Receive stock, count, damage and warehouse movement | Legacy operations and MWAC engine exist; all-writer valued path not active |
| Read-only accountant | Read GL, Trial Balance, P&L, Balance Sheet, Cash Flow, dues | Role exists; server write denial incomplete |
| Manager (later) | Interpret working capital, profit by product, ageing, reorder | Advanced indicators planned until underlying reports reconcile |

### Sale: accounting and stock

Example: sell 5 units @ ₹90 each, authorized current cost ₹70/unit. Sale ₹450; COGS ₹350; gross profit ₹100.
- Credit: **Dr DEBTORS ₹450, Cr SALES-REV ₹450; Dr COGS ₹350, Cr INVENTORY ₹350**.
- Cash: debit CASH instead of DEBTORS; do not also post the same sale through manual Cash Book.
- Stock decreases by 5 in one warehouse. Authoritative cost must come from approved MWAC, **not client `costPrice`**. This is an acceptance invariant, not current sale implementation proof.

### Customer partial payments

Customer has ₹5,000 unpaid and pays ₹1,000: **Dr CASH ₹1,000, Cr DEBTORS ₹1,000**; invoice has ₹4,000 outstanding. Repeat across months without a new customer record, over-allocation, or recording receipt as new revenue. Support due date, settlement status and ageing.

### Supplier credit purchase and payment

Buy 10 kg × ₹80 = ₹800: **Dr INVENTORY ₹800, Cr CREDITORS ₹800**; purchase movement +10 kg. Later pay ₹300: **Dr CREDITORS ₹300, Cr CASH ₹300**; still owe ₹500. Line rounding/discounts must match stored purchase invoice and supplier payable report.

### Expense, capital and service income separation

₹400 electricity: **Dr EXP-UTILITIES, Cr CASH**. Owner draws ₹1,000: **Dr DRAWINGS, Cr CASH** — NOT shop expense. A future separate computer/service-income workflow needs an agreed revenue-account/source-document treatment; it must not invent inventory stock movements.

## A-to-Z product delivery map (build in phases, do not overbuild)

| Product group | Capability and acceptance | Reality |
| --- | --- | --- |
| **A. Foundation** | Auth and roles; product/customer/supplier masters; sales/purchases/expenses; cash and party ledgers; basic reports | Implemented, with financial-security defects |
| **B. Trustworthy accounting** | Immutable source-linked double entries, exact-money snapshots, invoice and payment allocation, revenue/COGS, journal corrections | Partial; open exact/role/concurrency work |
| **C. Trusted inventory** | Per-warehouse quantities and MWAC values, approved opening, receipts, issues, returns, damaged stock, cycle counts, GL tie-out | MWAC engine/schema/service exist; live integrated workflows incomplete |
| **D. Operational controls** | RBAC, invoice numbering, idempotency, period close, audit logs, secure sessions, backups and restore, bank/cash reconciliation | Partial or planned |
| **E. Management** | P&L, Balance Sheet, Cash Flow, Trial Balance, true stock value, margins, debtor ageing, creditor due list, working capital, budgets/variance | Four core reports implemented; reliable advanced KPI and exact reconciliations pending |
| **F. Retail usability** | Phone/desktop, fast search/entry, accessible forms, printable invoices and statements, low-bandwidth safe retry | Basic Nuxt flows exist; future operator validation |
| **G. Conditional growth** | Service counter, barcode/POS, purchase orders, GST **only if applicable**, more branches, SaaS and integrations | Future owner decisions, not approved releases |

### Mandatory financial reconciliations

- Signed inventory movements = on-hand quantity; **valued** product/warehouse carrying value rolls up to GL INVENTORY; legacy unknown values remain separated.
- Customer credit invoices minus allocated receipts = customer outstanding, reconciled to DEBTORS; supplier purchases minus allocated payments = CREDITORS.
- Opening cash + net actual cash movements = closing CASH; bank transfers are not revenue.
- Trial Balance debits = credits exactly; P&L profit flows into Balance Sheet equity; do not conceal unexplained differences.
- One set of source documents powers reports and dashboards; no parallel manually maintained financial totals.

## HLD, LLD, DDD, architecture and design patterns

**HLD:** one Nuxt 4/Vue/TS/Nitro application, PostgreSQL/Drizzle, browser-to-server authentication boundary, repository/service/domain layers. See [HLD](02-HLD.md) and [ADR-001](25-ADR-001-Modular-Monolith-and-Rust-Adoption.md). No microservices, Redis or event broker merely because DDD is mentioned.

**LLD order:** business rule -> validation -> pure Money/Quantity/MWAC calculations -> transaction orchestration -> repository/constraints/locking -> API authentication/role check -> UI -> unit/integration/Playwright plus reconciliation/negative tests. Sale unit of work must cover sale/source snapshots, stock and cost, debtors, GL, allocations and idempotency. Purchase unit of work must cover net acquisition, warehouse, supplier ledger, stock/valuation and GL.

**Pragmatic DDD:** Sales, Purchasing, Inventory Valuation, Receivables/Payables, Accounting and Admin are module boundaries, not separate network services. Domain models own policies; a transactional application service coordinates multiple models; use domain terminology consistently. **Hexagonal adaptation:** HTTP and PostgreSQL are adapters around business policy when the boundary helps testing; do not retrofit gratuitous interface layers. **Events:** immutable valuation/GL/party history is an audit mechanism, not proof a distributed event-driven architecture is needed.

**SOLID/DRY/design patterns:** existing repository/service, Unit of Work, guard, value object, snapshot, append-only history and compensating-entry patterns have concrete use. Consolidate one rounding/cost/permission rule; do not claim that every Strategy/Factory described in older aspirational docs is already implemented. See [patterns](06-Design-Patterns.md) and [engineering operating model](32-Seven-Level-Engineering-and-Business-Review.md).

## CA, MBA, management and owner decision gates

| Lens | Required question | Proof |
| --- | --- | --- |
| CA/accounting | Is the entry right, period-correct, auditable and reversible? | Hand-calculated debit/credit, journal linkage, exact paise, trial balance and subledger reconciliation |
| CFO/finance | Is cash different from revenue/profit/receivables? Is working capital visible? | P&L + Balance Sheet + Cash Flow tie-out, ageing and assumptions |
| MBA/product | Which shop problem does this fix, and what is the smallest useful slice? | User journey, acceptance criteria, opportunity cost and measure |
| Operator/manager | Can ordinary staff do it safely on mobile and recover from errors? | Role matrix, error states, training flow, backup/restore |
| Security | Can someone alter a book, bypass permissions or replay a payment? | Server controls, role/IDOR/CSRF/race tests, residual risk |
| Founder/unit economics | Is it worth implementation and hosting cost? | Realistic measured use, maintenance, recovery and support costs; no invented revenue/tax claims |

**Definition of done:** owner business rule, correct transaction effects, negative/concurrency/rollback tests, reconciled reports, exact-head CI, review/merge/release **separately** recorded, operator recovery and no unresolved high-impact defect. See [milestone runbook](33-Go-Ahead-Milestone-Runbook.md).

**Never:** represent planning as shipping, use client-set cost to post COGS, infer historic value from master price, or activate only one MWAC writer.
