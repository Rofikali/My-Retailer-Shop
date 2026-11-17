# RetailShop ERP — Seven Engineering Levels + Accounting, Security and Management

**Purpose:** Seven *review perspectives*, not seven independent paid agents, mandatory ceremonial reports or a license to merge/operate unattended. Based on the IMGENGINE operating model but adapted to a Nuxt/PostgreSQL accounting ERP. Authority: [AGENTS](../AGENTS.md), [next task](../next.md), [HLD](02-HLD.md), [LLD](04-LLD.md), [accounting policy](27-ADR-002-Inventory-Costing-and-Warehouse-Policy.md), [skill index](../SKILLS.md).

## Seven perspectives applied proportionately

| Level | Ownership question | ERP-specific work/evidence |
| --- | --- | --- |
| **L1 Junior** | What currently happens, where, and how do I reproduce a defect? | Find route/service/repo/schema/tests, produce minimal reproducer (e.g., read-only role permitted to POST), list inputs and expected behavior |
| **L2 Mid-Level** | Can one bounded behavior work end-to-end? | Implement one vertical slice; update input schema, service/route, error paths and focused tests; no feature sprawl |
| **L3 Senior** | Is it safe on failure, rollback and concurrency? | Model transaction boundary, isolation/locks, security and negative tests; run typecheck/integration/E2E as appropriate |
| **L4 Staff** | Do modules and contracts agree? | Check sale/GL/stock/party/report parity, shared Money and permissions API, migration compatibility and cross-module ownership |
| **L5 Senior Staff** | Are multiple milestones sequenced without dangerous partial rollout? | Plan all inventory writers and opening valuation, align migration/reconciliation/CI, expose dependency/risk gates and unblock adjacent PRs |
| **L6 Principal** | Is the long-term trade-off correct and reversible? | Decide modular monolith vs distributed design; assess PostgreSQL lock strategy, exact-money controls, architecture ADR, recovery and operating cost |
| **L7 Distinguished** | Is there a durable product/technical advantage worth building? | Challenge premises: can the owner trust daily financial decisions? Evaluate future multi-shop/offline/extension strategy against actual user evidence |

**Proportionality:** A one-line copy change does not need seven signoffs. A financial posting, role boundary, migration, concurrency or production cutover does require explicit Senior/Staff/Principal scrutiny; Distinguished is for consequential strategic changes.

## Independent CA / CFO / MBA / management / security reviews

| Reviewer | Mandatory scope | Hard gate |
| --- | --- | --- |
| **CA / Accounting Controller** | Double entry, revenue recognition assumptions, acquisition cost/COGS, discounts, creditor/debtor settlement, inventory write-offs, capital/drawings, period close, audit trace | Show before/after journal **debits = credits**, source-to-GL and subledger-to-control reconciliation; unknown tax policy escalated, not invented |
| **CFO / Finance analyst** | Gross vs net profit, cash vs accrual, receivables/payables, working capital, valuation and closing cash | Explain P&L, Balance Sheet, Trial Balance and Cash Flow tie-out; no fake profitability claim |
| **MBA / Product owner** | Problem, target user, opportunity cost, release scope and value validation | Milestone has an operator scenario, clear acceptance criteria and a measurable outcome |
| **Shop operations manager** | Access matrix, stock counts, staff duties, shifts, offline recovery, service counter and exception handling | No normal operator can accidentally create duplicate receipts or silent manual adjustment |
| **Security/privacy engineer** | Authz by role/record, CSRF/IDOR/replay, secure sessions, SQL safety, PII/secret minimization, supply chain | Deny-by-default and negative tests; do not disclose exploit steps publicly |
| **SRE / Release engineer** | Migration order, backup/restore, staging, rollback/forward recovery, observable failed jobs | No production migration or deploy without explicit owner approval and recovery evidence |
| **QA / Test engineer** | Unit, real Postgres integration, concurrency, rollback, Playwright, accessibility | Exact changed SHA and actual PASS/FAIL/NOT RUN/PENDING with link, never inferred |
| **Business owner** | Authorize accounting policy, rights, risk/spend, approved opening carrying value, merge/release | Owner approval is explicit and scoped; it never means CI PASS/merge/release automatically |

These perspectives may be implemented by one accountable contributor/reviewer. No requirement to spawn agents or incur seven model runs.

## Architecture and source ownership

`app/pages/**` and composables: Vue/Nuxt presentation, no authoritative financial totals.  
`server/api/**`: session, permission, Zod parsing, thin API handlers, no heavy business rules.  
`server/domain/**`: pure Money/Quantity/Costing rules (BigInt minor units where applicable).  
`server/services/**`: transactional application layer; invariant, idempotency and source-to-GL coordination.  
`server/repositories/**`: Drizzle queries and deterministic locks.  
`server/db/**`: schema/migrations/constraints/triggers/seed (never direct production edits).  
`tests/**`: unit, PostgreSQL integration and Playwright real paths.  
`docs/**`: versioned ADR/PRD/HLD/LLD/ERD/API/business controls; document reality and decisions.

**DDD/Hexagonal:** use named business modules (Sales, Purchasing, Inventory, Receivables, Payables, GL, Admin) with domain calculations independent of HTTP/Postgres when helpful; route/database are adapters. Do **not** force needless interfaces, microservices, queues or event brokers into a small one-database system.

**SOLID/DRY:** one cost policy, one money-rounding rule, one role permission matrix, one shared transaction authority. Prefer small cohesive types/functions, explicit service injection and append-only audit records. Never mechanically add patterns without a demonstrated need.

## Risk-level review checklist

| Change | Minimum review | Required evidence |
| --- | --- | --- |
| Docs-only or UI copy | L1/L2 and relevant owner | Links, no invented implemented state, changed-file review; CI exact SHA if PR |
| Read-only UI/report | L2/L3 and CA if finance KPI | Data source/rounding, empty/error states, focused unit/build/CI |
| Financial write or settlement | L2–L6, CA + security | Exact journal, happy/negative/rollback/concurrent duplicate tests and source/GL tie-out |
| Permissions/session | L3/L4 + security | Anonymous, read-only, staff, owner, cross-record negative API tests |
| Inventory valued writer/migration | L3–L6, CA, security, SRE | Source movement+event+balance+GL atomicity, backfill policy, direct SQL bypass, migration upgrade/recovery |
| Release/data movement | L5/L6, SRE, owner, CA | Backup/restoration, staged rollout, reconciliation, rollback, explicit owner approval |
| New service, paid platform, Rust/WASM | L6/L7, MBA/finance/security | Profiled bottleneck or customer demand, ADR, cost and failure analysis, reversible trial |

## Definition of done (required for a meaningful milestone)

1. Current GitHub main/PR status reconciled; a unique next.md task ID selected, no duplicate branch.
2. Actual problem and one worked retail/accounting example; alternatives if important.
3. HLD boundary and LLD transaction/authorization/schema contracts documented for impacted components.
4. Risk checklist covers unauthorized actor, duplicate/retry, concurrent access, failure/rollback, historical data and exact monetary rounding as applicable.
5. Small PR with tests and CI evidence at exact head; inspect real failures rather than summarize success logs at length.
6. CA/management review states business benefit, missing tax policy, recovery/operator risk and cost if relevant.
7. Explicitly separate **proposed**, **implemented**, **CI passed**, **merged**, **production released**.
8. Hand off updated next.md status, PR/commit links, blocking decisions and one next eligible task, without implicit merge/deploy/paid services.

See [handoff template](35-Milestone-Handoff-Template.md) and [continuation runbook](33-Go-Ahead-Milestone-Runbook.md).
