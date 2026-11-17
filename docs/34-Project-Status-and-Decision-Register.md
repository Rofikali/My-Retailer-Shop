# RetailShop ERP — Project Status, Risk and Decision Register

**Checkpoint:** 2026-11-17 static source + GitHub evidence. Main `a2ca86053f93e8db8bb746471e6ae418597746cf` passed [4/4 CI](https://github.com/Rofikali/My-Retailer-Shop/actions/runs/43183781578). This is **not** a live production-database, restoration, security-penetration or deployed-system audit. Recheck GitHub before using these facts.

**One task selector:** [next.md](../next.md). This register keeps evidence and unresolved questions, not a competing NOW/NEXT queue. [ERP blueprint](31-ERP-Product-Portfolio-and-Delivery-Blueprint.md) defines the desired product; [roadmap](14-Implementation-Roadmap.md) defines phases.

## Status definitions

- **MERGED:** source implementation or document on main, with verified PR/merge evidence; not automatically a released feature.
- **IMPLEMENTED / RECORDED CI:** code exists and recorded checks passed at an identified commit; not production proof.
- **INCOMPLETE/PARTIAL:** important layer exists but full end-to-end invariant is unsatisfied.
- **READY:** enough specification to do one bounded PR without inventing major business policy.
- **IN_PROGRESS / PR_OPEN / CI_PENDING / READY_FOR_REVIEW:** separate stages; green PR is still **unmerged**.
- **BLOCKED:** prerequisite, permission, policy, migration design or evidence missing.
- **PLANNED / LATER / DEFERRED / SUPERSEDED:** future, intentionally delayed or replaced work.
- **RELEASED:** actual verified authorized live release, not inferred from CI.

## Finished engineering foundations (MERGED, not production release)

| Module / milestone | Recorded evidence | Remaining limitation |
| --- | --- | --- |
| ERP pages/APIs/accounting baseline | `app/pages`, `server/api`, services/repositories, PostgreSQL, Playwright and integration suites; latest main CI pass | Financial, role and reconciliation gaps remain |
| Architecture baseline, audit, MWAC policy | [#17](https://github.com/Rofikali/My-Retailer-Shop/pull/17), [#18](https://github.com/Rofikali/My-Retailer-Shop/pull/18), [#19](https://github.com/Rofikali/My-Retailer-Shop/pull/19) | Architecture/policy accepted, not end-to-end valuation |
| Read-only historical stock preflight | [#20](https://github.com/Rofikali/My-Retailer-Shop/pull/20), [#21](https://github.com/Rofikali/My-Retailer-Shop/pull/21) | Deliberately does not authorize cutover |
| Pure BigInt MWAC costing | [#23](https://github.com/Rofikali/My-Retailer-Shop/pull/23) | Not the cost source in existing sales |
| Valuation persistence design/schema/service | [#24](https://github.com/Rofikali/My-Retailer-Shop/pull/24), [#25](https://github.com/Rofikali/My-Retailer-Shop/pull/25), [#26](https://github.com/Rofikali/My-Retailer-Shop/pull/26) | Domain valuation receive/issue exists; live sale/purchase/GL not integrated |
| Exact purchase line calculation | [#27](https://github.com/Rofikali/My-Retailer-Shop/pull/27) | Supplier payable view still computes a different rounding total |
| Serialized legacy stock writes | [#29](https://github.com/Rofikali/My-Retailer-Shop/pull/29) | No-oversell test exists; direct DB bypass boundary not complete |
| All-writer ADR and legacy boundary | [#30](https://github.com/Rofikali/My-Retailer-Shop/pull/30), [#31](https://github.com/Rofikali/My-Retailer-Shop/pull/31) | No owner-approved opening/production change |

## Incomplete and high-impact source-backed findings

| Risk / ID | Source evidence at main | Required remediation |
| --- | --- | --- |
| SEC-01 read-only write permissions | Schema has `accountant_readonly`; financial writes including `server/api/sales/index.post.ts`, `purchases/index.post.ts`, `expenses/index.post.ts`, `inventory/adjust.post.ts`, `cash-txns/index.post.ts` and `party-ledger/payments.post.ts` use `requireUser` without explicit role gate | Inventory all mutation paths; deny read-only; negative tests. No blanket claim of a proven exploit without running security tests |
| FIN-01 supplier amount parity | `server/domain/money/purchase.ts` per-line half-up calculation differs from `server/repositories/supplier-payables.repo.ts` SQL unrounded sum | Tie out canonical purchase total/GL/party ledger/outstanding and allocations for fractional cases |
| FIN-02 credit limit | `server/services/sales.service.ts` tests limit before transaction | Check under lock within same transaction; two simultaneous sales test |
| FIN-03 untrusted COGS | `server/utils/validation/sale.ts` accepts browser `costPrice`, and sale service posts COGS from it | Server derives authoritative cost via safe valued inventory path, never via current mutable master cost |
| FIN-04 receipts/payments | `customer-receivables.service.ts` and `supplier-payables.service.ts` read outstanding and insert allocations with no evident locking, use Number arithmetic | Exactly rounded paise, invoice row locks, concurrent over-allocation and retry tests |
| FIN-05 numbering | `SalesRepo.nextInvoiceNo()` and `PurchasesRepo.nextPurchaseNo()` last row + 1 outside transaction | DB-safe counters/unique constraints/idempotency |
| FIN-06 cash bypass | `CashBookService` maps manual `sales` and `purchase` categories directly to GL with no stock/source document | Separate strictly permitted adjustment from sale/purchase canonical flow |
| FIN-07 legacy valuation/float | `InventoryService.listWithStock()` estimates stock value from `products.costPrice`; manual damage/opening uses mutable cost, reports use Number | Owner-reviewed valuation policy and exact accounting/report arithmetic |
| SEC-02 session | `server/utils/session.ts` HMAC-signed user ID with no independent time-based expiry; `login-rate-limit.ts` keeps process-local map | Session expiry/rotation/revocation, CSRF, abuse-limit and role tests |
| OPS-01 release | GitHub reports main unprotected at audit; README incorrectly describes code as never executed; no direct backup restore proof | Branch rules, docs correction, recovery/release drill |

**No finance/security defect is deemed remediated merely because a related design PR exists.** For rounding, confirmed logic mismatch is source-backed, not a claim that production books currently contain a bad row.

## Open, blocked, superseded, and not built

| Item | Status | Accurate interpretation |
| --- | --- | --- |
| [PR #32](https://github.com/Rofikali/My-Retailer-Shop/pull/32) | **OPEN DRAFT, 4/4 CI PASS**, head `5f056349b58e3649ed193b37495458caa06fa580` | ADR-005 opening valuation, explicit movement classification and trigger/lock design, **docs-only**, not merged or production migration |
| [PR #28](https://github.com/Rofikali/My-Retailer-Shop/pull/28) | OPEN DRAFT, older locking direction | Superseded by merged #29/#31 product-row serialization; review before close, never blindly merge |
| INV-03 | BLOCKED until accepted design and safe migration generation | Classify legacy/valued movements, reject unvalued direct DB writes to active scope, enforce event parity, test migration. Journal includes 0013; last committed generated snapshot observed was 0010; reconcile tooling before next migration |
| INV-04/05 | PLANNED/BLOCKED | No approved historical opening value, no full valued sale/purchase/damage/correction writer, no reconciled production cutover |
| Full production safety | NOT VERIFIED | No real production DB reconciliation, all-role security/abuse suite, backup-restore evidence, release approval |
| Multi-shop SaaS, GST integration, Rust/WASM, queue/event broker | DEFERRED/OPTIONAL | Not an implemented or currently approved product requirement |

## Binding design and finance decisions

1. **Current scope:** one shop, one deployable Nuxt/Nitro app, one PostgreSQL ledger source; modular monolith. See [ADR-001](25-ADR-001-Modular-Monolith-and-Rust-Adoption.md).
2. **Stock valuation:** moving weighted-average per product/warehouse, exact paise. Historic quantity is known; historic carrying value is **not** derived from current product master cost. See [ADR-002](27-ADR-002-Inventory-Costing-and-Warehouse-Policy.md), [ADR-003](28-ADR-003-Inventory-Valuation-Persistence-and-Concurrency.md).
3. **Atomicity:** sales, purchases, GL, stock movements, valuation, party allocations and snapshots must share one transaction; keep common product-row then valuation-balance lock order. See [ADR-004](29-ADR-004-MWAC-Live-Posting-Rollout-Gate.md).
4. **Security:** server-side deny-by-default for writes and negative role tests; browser state is never authority for cost/permissions.
5. **Accounting:** exact money, immutable posted history, source-linked reversals, reconciled subledgers and explicit operator policy for owner capital/drawings, returns, tax and period close.
6. **Expansion:** branch/tenant, SaaS billing, external APIs, GST compliance or new runtime requires a separately scoped decision and security/finance assessment.

## Updating evidence without losing history

Every bounded session cross-checks GitHub main SHA, PR states, changed files, exact-head CI and code. Record `task_id`, `decision_state`, `implementation_sha`, `tested_sha`, `ci_url`, `pr_url`, `merge_sha`, `release_evidence`, `open_risks` and `next_action` distinctly. Update [next.md](../next.md) in a branch for current selector truth; after an external merge, the **next authorized PR** reconciles real merge SHA and advances next task. No silent rewrite of historical claims or fabricated CI. Keep successful logs outside agent context and inspect failures narrowly.
