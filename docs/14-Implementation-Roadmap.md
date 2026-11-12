# ERP Engineering Roadmap

This roadmap is the ordered plan for improving My Retail Shop as a dependable retail ERP. It prioritizes financial correctness, inventory integrity, security, and operational controls before performance optimization or additional infrastructure.

**Product scope:** A full-featured ERP for retail operations. The current deployment remains single-shop/single-tenant unless a validated product requirement changes that scope. ERP depth does not automatically imply SaaS multi-tenancy.

**Architecture baseline:** See [ADR-001](25-ADR-001-Modular-Monolith-and-Rust-Adoption.md).

## Guiding order

1. Make every business transaction correct.
2. Make every important operation secure and auditable.
3. Make financial and inventory reports reconcilable.
4. Make daily operations recoverable and observable.
5. Improve management decisions with trustworthy information.
6. Optimize only measured bottlenecks.

## Phase 0 — Architecture and engineering baseline

**Purpose:** Establish consistent rules before changing runtime architecture.

- [x] Modular-monolith direction documented in the existing HLD.
- [x] Repository-wide agent instructions and focused skills merged.
- [x] ADR-001 defines the default architecture and Rust/WASM adoption gate.
- [ ] Reconcile older documentation with current code and deployment behavior.
- [ ] Confirm the current CI, database migration, backup, and restore evidence.

**Exit criteria:** Architecture documents agree with the actual repository; no unverified production-readiness claims remain.

## Phase 1 — Financial and inventory integrity (highest priority)

**Purpose:** Ensure a sale or purchase cannot leave the books, stock, or party balances inconsistent.

Audit and then remediate in small, independently testable changes. The initial static review is recorded in [Phase 1 Financial and Inventory Integrity Audit](26-Phase-1-Financial-Inventory-Integrity-Audit.md); runtime verification and remediation remain open:

1. **Inventory costing policy**
   - Select and document the applicable method (for example, weighted average or FIFO) based on real business requirements.
   - Derive COGS on the server from authoritative inventory cost layers/balances.
   - Preserve historical unit cost and valuation snapshots on posted transactions.
2. **Atomic transaction boundaries**
   - Verify sale, purchase, expense, receipt, supplier payment, return, and reversal flows.
   - Ensure all dependent rows commit or roll back together.
3. **Concurrent stock protection**
   - Prevent two simultaneous sales from consuming the same available stock.
   - Define and test negative-stock policy explicitly.
4. **Credit and allocation integrity**
   - Enforce customer credit limits inside the transaction.
   - Prevent receipt/payment allocations from exceeding outstanding balances under concurrency.
   - Add idempotency or duplicate-submission protection for retried financial writes.
5. **Canonical cash and payment paths**
   - Prevent cashbook entries from silently duplicating or bypassing sales, purchase, or expense source documents.
   - Make source-document linkage explicit.
6. **Exact money arithmetic**
   - Audit numeric conversions and calculations.
   - Use integer minor units or exact decimal arithmetic consistently at calculation and persistence boundaries.
7. **Reconciliation**
   - Reconcile stock movement quantity/value to inventory control accounts.
   - Reconcile customer and supplier subledgers to their control accounts.
   - Reconcile cash/bank records and financial statements to the trial balance.

**Required evidence:** Hand-calculated examples; PostgreSQL integration tests; rollback tests; concurrency tests; duplicate-request tests; reconciliation assertions; migration/backfill and recovery plan where schema changes are required.

**Exit criteria:** Each critical flow has a documented invariant, a regression test, and evidence that its database effects reconcile. No open high-severity financial-integrity defect remains.

## Phase 2 — Security and access control

- Verify session expiry, rotation, revocation, and logout behavior.
- Verify server-side authentication and authorization on every protected route.
- Add negative tests for IDOR, privilege escalation, CSRF, replay, and unauthorized writes.
- Review rate limiting, password reset, secret handling, and audit logging.
- Verify database least privilege, production environment configuration, and backup access.

**Exit criteria:** Security review is evidence-backed; critical authorization and session failure cases are covered by automated tests.

## Phase 3 — Accounting and operational maturity

- Add controlled period closing and reopening policy.
- Add traceable financial reversals and correction workflows.
- Add bank/cash reconciliation and discrepancy resolution.
- Define document numbering, duplicate prevention, and audit history.
- Define returns, discounts, damaged stock, stock adjustments, and write-off policies.
- Verify backup restoration and operational recovery procedures.

**Exit criteria:** A month-end close can be completed and independently checked without editing posted history.

## Phase 4 — Management intelligence

Build decision-support features only on reconciled source data:

- Gross margin by product/category and period.
- Inventory turnover, ageing, reorder and slow-moving stock.
- Customer receivable ageing and collection trends.
- Supplier payable ageing and cash commitments.
- Cash-flow trends and operating expense ratios.
- Period-over-period profit variance with explainable drivers.

**Exit criteria:** Each KPI has a written formula, source accounts/tables, date basis, and reconciliation test.

## Phase 5 — Performance and scale

- Establish representative data volumes and baseline latency/memory measurements.
- Inspect query plans and indexes before adding caches.
- Add pagination and bounded exports for large result sets.
- Introduce background jobs/queues only for work that cannot safely or efficiently remain synchronous.
- Consider read replicas only when read workload and consistency requirements justify them.
- Consider service extraction only when independent deployment/scaling or team ownership justifies distributed-system costs.

### Rust/WASM gate

Rust is not a Phase 1 dependency. Consider Rust native code only for a demonstrated server-side CPU bottleneck. Consider WASM only for a demonstrated browser-side computation or offline requirement. Follow ADR-001 and the architecture-performance skill. Benchmark against TypeScript, include packaging and maintenance costs, and retain a trusted correctness reference.

**Exit criteria:** A performance change demonstrates material improvement on representative workloads without weakening correctness, security, or operability.

## Phase 6 — Organization, branch, or multi-business expansion (only if approved)

Before implementing multi-branch or multi-tenant support, define organization ownership, branch scope, staff membership, permissions, reporting consolidation, data isolation, migration strategy, and restore strategy. Add tenant/organization keys and PostgreSQL RLS only under a separate reviewed ADR.

**Exit criteria:** Isolation and cross-tenant negative tests prove that one business cannot access another business's data.

## Milestone execution contract

For every implementation milestone:

1. Inspect the current main branch, working tree, code, schema, migrations, and relevant skills.
2. Write business acceptance criteria before coding.
3. Implement the smallest safe change on a focused branch.
4. Add regression tests for the actual failure mode, including concurrency or authorization tests where relevant.
5. Run exact package scripts and report actual outcomes.
6. Review the diff, migration safety, security impact, and rollback/recovery path.
7. Open a focused PR; do not merge until the required CI checks pass and review is complete.
8. After merge, verify the resulting main commit and its CI.

Do not start Phase 2 or performance work merely because Phase 1 documentation exists. Phase completion requires evidence, not a checklist being written.
