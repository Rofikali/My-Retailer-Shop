# RetailShop ERP — LIVE NOW / NEXT / LATER

**Single canonical work selector for the owner's "go ahead".** Reconcile this compact board with current GitHub main, PRs, reviews, code and exact-head CI before choosing work. Status/history: [project status register](docs/34-Project-Status-and-Decision-Register.md). Product: [ERP blueprint](docs/31-ERP-Product-Portfolio-and-Delivery-Blueprint.md). Execution: [continuation runbook](docs/33-Go-Ahead-Milestone-Runbook.md). Phases: [roadmap](docs/14-Implementation-Roadmap.md).

**Recorded checkpoint, 2026-11-17:** main `a2ca86053f93e8db8bb746471e6ae418597746cf` with successful [main CI](https://github.com/Rofikali/My-Retailer-Shop/actions/runs/43183781578). [PR #32](https://github.com/Rofikali/My-Retailer-Shop/pull/32) opening-valuation ADR is an **open, unmerged, docs-only draft**; head `5f056349b58e3649ed193b37495458caa06fa580` passed [4/4 CI jobs](https://github.com/Rofikali/My-Retailer-Shop/actions/runs/43185286695). [PR #28](https://github.com/Rofikali/My-Retailer-Shop/pull/28) is an older draft whose locking approach has been superseded by merged #29/#31. Refresh all facts on each new session.

**Product goal:** dependable, low-cost, one-shop ERP for inventory, sales, purchases, customer/supplier dues, cash and double-entry reporting. Nuxt 4/Vue/TS/Nitro + PostgreSQL/Drizzle modular monolith. **Not** an audited production release, live MWAC cutover, GST e-invoicing platform, paid SaaS or authorization for infrastructure spend.

## NOW — first eligible bounded work

| Priority | Task ID / status | One job; exit test |
| --- | --- | --- |
| **P0** | **SEC-01 — READY / FIRST** | Deny `accountant_readonly` access to **all mutating** ERP endpoints, including sales, purchases, stock, expenses, cash, receipts/payments, journals, master-data and admin changes. Inventory server routes; add explicit role checks and negative anonymous/read-only regression tests with valid owner/staff controls. Preserve current owner/staff behavior rather than inventing new permissions. One small PR; exact-head CI; **no merge**. |
| **P0, independent design review** | **INV-ADR-05 — PR_OPEN, CI PASS, review incomplete** | Review [PR #32](https://github.com/Rofikali/My-Retailer-Shop/pull/32): legacy/valued movement classification, zero-quantity opening event source, DB lock order, immutable owner approval and GL tie-out. Docs-only green CI is not design approval or migration authorization. |

**Task selection:** Resume a live PR for the highest eligible task before starting a duplicate. If SEC-01 is blocked by an actual dependency or decision, record why and take the next independent READY task.

## NEXT — dependency-aware queue

| Priority | Task ID / status | Bounded outcome and evidence |
| --- | --- | --- |
| P0 | **FIN-01 — READY** | Fix supplier outstanding invoice line-rounding parity. Two `0.10 × ₹0.25` purchase lines must reconcile to **₹0.06** in purchase posting, GL, supplier payable and allocation. PostgreSQL regression; no historical rewrite. |
| P0 | **FIN-02 — READY after focused audit** | Validate customer credit limit inside serialized sale transaction; concurrent limit-breach tests and safe product lock ordering. |
| P0 | **FIN-03 — DEPENDENCY GATED** | Server-authoritative sale COGS replacing browser `costPrice`, integrated with all-writer MWAC and owner-approved opening policy. Never substitute a fake historical cost. |
| P0 | **FIN-04 — PLANNED** | Exact customer/supplier allocations, invoice row locks and concurrency/replay protections; no over-allocation. |
| P0 | **INV-03 — BLOCKED on ADR/design + safe migration** | Add explicit legacy/valued movement classification, DB writer enforcement and deferred valued-movement/event parity, real migration and direct-SQL bypass tests. No live cutover. |
| P1 | **FIN-05 — PLANNED** | Concurrency-safe document numbers and retry idempotency across sales/purchases/cash/expenses. |
| P1 | **FIN-06 — PLANNED** | Prevent manual Cash Book sales/purchase entries duplicating or bypassing authoritative sale/purchase/stock documents. |
| P1 | **FIN-07 — PLANNED** | Convert remaining sales/expenses/payments/report float arithmetic to exact paise or decimal strings. |
| P1 | **SEC-02 — PLANNED** | Session expiry, revocation, CSRF, rate limits, IDOR, broader role matrix and least privilege. |

## LATER — product and operational work

- **INV-04:** explicit owner-approved opening quantity/value and GL equity tie-out; immutable event, exact accounting, backup/recovery and upgrade tests. Production migration requires separate approval.
- **INV-05:** synchronized MWAC sale/purchase/damage/correction/return writers with authoritative COGS, valued event parity, reconciliation and owner-approved live cutover; never switch only purchases or only sales.
- **CTRL-01:** inventory-to-GL, debtors-to-customer, creditors-to-supplier and cash/bank reconciliations; trial balance and reporting gates.
- **OPS-01:** audit trails, period close, document correction policy, backup/restore rehearsal, incident recovery and production controls.
- **OPS-02:** return/refund/credit note, stock count, transfer and damage workflows with secure accounting treatment.
- **MGT-01:** verified margins, receivable/payable ageing, inventory turnover/slow movers/reorder alerts, budgets/actual variance and working-capital dashboards.
- **UX-01:** fast mobile retail entry, printable statements, accessible low-bandwidth flows and safe retries.
- **GROW-01:** optional computer-service income, barcode/POS, bank-specific ledger, GST **if applicable**, branch/tenant and external SaaS only after separate real requirements/owner approvals.
- **PERF-01:** measure workloads, query plans and costs before Rust, WASM, queues, Redis or microservices.

## FINISHED, INCOMPLETE and RELEASE STATE

**MERGED engineering foundations:** ADR-001 and initial audit (#17–#19); read-only valuation preflight (#20/#21); pure MWAC (#23); valuation ADR/schema/service (#24–#26); exact purchase totals (#27); product-row stock lock/no-oversell (#29); all-writer rollout ADR (#30); legacy-vs-valued service boundary (#31). Detailed evidence and caveats: [status register](docs/34-Project-Status-and-Decision-Register.md).

**INCOMPLETE:** Real sales still trust client-supplied COGS; purchases/sales use legacy stock writer; customer/supplier allocations not concurrency-safe; receipt/payable rounding mismatch; financial role authorization and session controls incomplete; production reconciliation and real restore exercise unverified. **No MWAC opening or live cutover completed.**

**PR_OPEN is NOT FINISHED:** #32 remains unmerged and needs review; #28 is older superseded draft. A green CI job means tests passed at one SHA, not merged or released.

## "go ahead" execution contract

1. Get latest `main` SHA, open/recent PRs, relevant CI and this board. Correct stale statuses against GitHub. Prefer active task PR to duplicated work.
2. Choose **one** highest-priority eligible task, use the [milestone skill](.agents/skills/milestone-continuation/SKILL.md) and read only its affected code/ADR/tests.
3. Produce task ID, business acceptance, HLD/LLD delta, accounting example (when relevant), security/negative cases, exclusions and tests; then a focused branch and PR if authorized.
4. Report exact commands and evidence: `PASS`, `FAIL`, `NOT RUN`, `BLOCKED` or `PENDING` and tested SHA. Required CI remains mandatory; successful logs need only compact summaries, failures need narrow excerpts.
5. Persist truthful status: `READY → IN_PROGRESS → PR_OPEN/CI_PENDING → READY_FOR_REVIEW → MERGED → RELEASE_CANDIDATE → RELEASED`; use `BLOCKED`, `DEFERRED` or `SUPERSEDED` separately. Record PR URL, exact CI SHA, merge SHA only after real merge, unresolved risks, and one next eligible job.
6. **Stop** before merger, deployment, production data/migration, secret rotation, payment/hosting, or irreversible actions without approval for the specific operation. No autonomous scheduling: documentation cannot wake a finished agent. A later owner "go ahead" starts the next bounded session.

**AI/CI efficiency:** short, change-scoped reads; run targeted local checks if possible; let existing mandatory GitHub CI execute its full suite once per PR head. Never claim unavailable tests passed, skip required security gates, or run monitoring without request.
