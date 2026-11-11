# RetailShop ERP — Documentation Suite

**Current scope:** Single-tenant ERP for one retail shop.
**Long-term product direction:** A dependable retail ERP with stronger inventory, accounting, controls, and management reporting.
**Stack:** Nuxt 4 (TypeScript) · Nitro server routes · PostgreSQL · Drizzle ORM · Docker Compose

The product's ERP ambitions do not automatically require multi-tenant SaaS architecture. Keep the current single-shop scope until multi-branch or multi-business requirements are validated. See 11-Scaling-and-Multi-Tenant-Path.md for the separate evolution path.

## Reading order

1. 01-PRD-BRD.md — what this system does and for whom
2. 02-HLD.md — architecture, tech stack decisions, deployment topology
3. 03-Database-Schema-ERD.md — the data model
4. 04-LLD.md — module/page/service breakdown, key sequence flows
5. 05-API-Design.md — endpoint contract
6. 06-Design-Patterns.md — patterns used, where, and why
7. 07-SDLC-Process.md — how work moves from idea to production
8. 08-Testing-Strategy.md
9. 09-DevOps-Deployment.md
10. 10-Security-and-Data-Integrity.md
11. 11-Scaling-and-Multi-Tenant-Path.md
12. 14-Implementation-Roadmap.md — current engineering priorities and exit criteria
13. 15-Testing-and-Release-Runbook.md
14. 16-Engineering-Architecture-and-Workflow.md — architecture and operating workflow
15. 22-Party-Ledger-Amendments.md — append-only correction rules
16. 24-Customer-Ledger-Operating-Guide.md — receipt entry and customer-ledger controls
17. 25-ADR-001-Modular-Monolith-and-Rust-Adoption.md — architecture baseline and evidence gate for Rust/WASM

## Non-negotiable business invariants

- **Posted ledger entries are append-only.** Correct mistakes with traceable reversals/corrections.
- **One business transaction must be atomic.** A sale or purchase and its ledger, stock, and party effects commit or roll back together.
- **Customer and supplier identities are stable.** Enforce uniqueness and avoid duplicate masters.
- **Inventory is movement-based and valued by a documented costing policy.**
- **Financial reports derive from authoritative ledger records** and reconcile to the trial balance.
- **Money uses exact arithmetic**, not binary floating-point calculations.
- **Security is enforced server-side.** Browser input and client-side calculations are untrusted.
- **No feature is considered complete without relevant verification evidence.**

## Architecture and runtime policy

The default is a modular monolith with one authoritative PostgreSQL database. Rust, WebAssembly, native libraries, queues, caches, and service extraction are optional tools—not goals. Adopt them only for a measured requirement with a reviewed ADR, correctness tests, deployment evidence, and a rollback plan.
