---
name: architecture-design
description: Use when reviewing HLD/LLD, DDD/hexagonal boundaries, SOLID/DRY, design patterns, transaction architecture, new modules or nontrivial ERP cross-boundary changes.
---

# HLD/LLD Architecture and Design Review Skill

**References:** [HLD](../../../docs/02-HLD.md), [LLD](../../../docs/04-LLD.md), [engineering model](../../../docs/32-Seven-Level-Engineering-and-Business-Review.md), [ADR-001](../../../docs/25-ADR-001-Modular-Monolith-and-Rust-Adoption.md), [architecture-performance skill](../architecture-performance/SKILL.md).

## Use the architecture actually in the repository

Browser/Nuxt page -> Nitro API role/validation -> transaction-scoped application service -> repository/Drizzle -> PostgreSQL. Pure domain logic (Money/MWAC) should not depend on HTTP. Ledger, party, stock and valuation must remain synchronously consistent for a financial document.

## Review procedure

1. State business invariant and affected domain, including actual code paths and source rows.
2. Draw compact HLD boundary: clients, APIs, domain/service, repositories, database, trust boundaries, secrets and failure domains.
3. Write LLD sequence for success, rollback, concurrent request, duplicate request, forbidden role and correction/reversal. Include lock order, consistency/isolation and idempotency.
4. Identify table schema, unique/check/foreign-key constraints, movement/event relationship, index needs and safe migration path. Compare Drizzle schema, snapshots, journal and applied SQL; no fabricated migration.
5. Apply pragmatic DDD: Sales, Purchasing, Inventory Valuation, Receivables, Payables, Accounting and Admin are modules in one process. Domain rules should not duplicate across services.
6. Apply hexagonal boundaries only where they improve testing/contract clarity; browser/server/database are interfaces/adapters, **not** extra deployables.
7. Use existing Repository, Service, Unit of Work, immutable event, historical Snapshot, projection/read model and compensating Reversal patterns. Add a Strategy/Factory only when actually needed; distinguish aspiration from code.
8. Apply SOLID/DRY to keep service methods cohesive and one authoritative rounding, permission and cost rule. Avoid speculative abstractions and distributed event orchestration.
9. Verify security, maintenance, actual performance evidence and a reversible change. New Rust/WASM, cache, queue, external system or microservice requires separately justified ADR.
10. Cite tests at exact SHA and separately record risk, migration/release decisions and next task.

## Hard stop

Do not route financial commits through eventually consistent services, migrate production without approval, recalculate historical posted cost from mutable master price, or claim an untested design pattern is implemented.
