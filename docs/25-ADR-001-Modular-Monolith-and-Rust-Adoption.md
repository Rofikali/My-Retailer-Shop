# ADR-001: Modular Monolith and Evidence-Gated Rust Adoption

- **Status:** Accepted as the target architecture baseline
- **Date:** 2026-11-12
- **Decision owners:** Product owner and repository maintainers
- **Scope:** My Retail Shop ERP

## 1. Context

My Retail Shop is intended to become a dependable ERP for retail operations. Its most important responsibilities are correct sales and purchasing records, inventory quantity and valuation, customer and supplier balances, double-entry accounting, financial reporting, security, and operational recovery.

The current implementation uses Nuxt 4, Vue 3, TypeScript, Nitro, PostgreSQL, and Drizzle ORM. The repository already follows a modular-monolith direction with service and repository boundaries.

The product vision is an ERP, not an instruction to build a multi-tenant SaaS platform immediately. ERP capability depth (accounting, inventory, controls, reporting, and workflows) is separate from the decision to serve multiple independent businesses. The current single-shop scope remains until validated product requirements say otherwise.

## 2. Decision

Keep a **modular monolith with one authoritative PostgreSQL database** as the default architecture.

- **Presentation:** Nuxt 4, Vue 3, TypeScript.
- **HTTP/application boundary:** Nitro routes, authentication, authorization, input validation, and response mapping.
- **Business orchestration:** cohesive services that enforce domain rules and own transaction boundaries.
- **Persistence:** repositories using Drizzle ORM and PostgreSQL.
- **Financial source of truth:** append-only posted ledger facts, with explicit reversals/corrections.
- **Inventory source of truth:** auditable stock movements and a documented costing policy.
- **Reporting:** derive financial statements from authoritative accounting records and reconcile them to control totals.

Keep module boundaries explicit. A module may call another module through a narrow service contract; it must not reach into another module's repository or duplicate its business rules.

## 3. Target module boundaries

The modular monolith should organize business capabilities around:

1. Sales and point of sale
2. Purchases and supplier invoices
3. Inventory and stock valuation
4. Customer and receivable management
5. Supplier and payable management
6. Accounting, journal posting, and general ledger
7. Receipts, payments, and allocations
8. Financial and operational reporting
9. Users, roles, and administration
10. Audit, data quality, and period controls

This is a logical ownership map, not a requirement to create a separate deployable service or database for every module.

## 4. Non-negotiable business invariants

- A posted journal transaction must balance: debits equal credits.
- A business operation and all dependent financial, inventory, and party-ledger effects must commit or roll back together.
- Posted financial facts are append-only; corrections use linked reversal/correction entries.
- Inventory quantity and value must be explainable from stock movements and the chosen costing policy.
- Cost of goods sold must be derived or verified by the server from the authoritative costing method; browser-supplied cost is not authoritative.
- Stock availability, credit limits, and payment allocations must remain correct under concurrent requests.
- Customer and supplier subledgers must reconcile to their general-ledger control accounts.
- Financial reports must reconcile to the trial balance and authoritative ledger.
- Money arithmetic must use exact decimal or integer minor units, not binary floating-point arithmetic.
- Critical writes must be idempotent or protected against duplicate submission where the operation can be retried.

## 5. Runtime and infrastructure policy

Do not introduce microservices, Redis, queues, a second database, a new backend framework, native extensions, Rust, or WebAssembly merely for fashion or hypothetical scale.

A new runtime or infrastructure component requires:
1. A concrete business or operational problem.
2. A reproducible baseline from representative workloads.
3. A written comparison with the existing TypeScript/PostgreSQL implementation.
4. A focused ADR or an update to this ADR.
5. Security, deployment, observability, failure, and recovery analysis.
6. Tests proving behavioral equivalence for relevant business rules.
7. A rollback/removal plan and an identified maintainer.

### 5.1 Rust native code

Prefer evaluating a Rust native executable or bounded worker for a proven server-side CPU-bound workload. Examples may include large import normalization, bulk data transformation, or computationally expensive deterministic calculations.

A native library (.so, .dylib, or .dll) is not the default integration. It introduces ABI, operating-system, architecture, runtime packaging, memory ownership, and deployment compatibility concerns. Do not assume a native library will run in every Vercel/serverless deployment target.

Rust code must not become an alternate authority for authentication, authorization, database writes, journal posting, or inventory ownership. The TypeScript application and PostgreSQL remain responsible for business authorization and durable transactions.

### 5.2 Rust WebAssembly

Consider Rust-to-WASM only when a measured browser-side CPU workload materially harms interaction latency or when a clearly specified offline capability requires local computation.

Before adoption, measure:
- TypeScript baseline on representative devices and datasets
- WASM download and initialization cost
- steady-state runtime and memory
- mobile/low-end device behavior
- browser compatibility and failure fallback
- parity against the trusted TypeScript/server implementation

WASM is not a security boundary. All untrusted inputs must still be validated by the server, and all authoritative financial decisions remain server-side.

### 5.3 Adoption thresholds

There is no arbitrary file-count, request-count, or nanosecond target that automatically justifies Rust. The team must define a workload-specific service objective before benchmarking. Adopt Rust only when the measured improvement is material to users or operating cost and exceeds the total cost of integration and maintenance.

## 6. Multi-shop and multi-location evolution

Do not add tenant columns, RLS policies, or tenant-routing complexity solely because the product is called an ERP.

If multi-branch support for one organization or multi-business SaaS becomes a validated requirement, first define ownership boundaries, data isolation, user membership, reporting scope, migrations, backup/restore, and security tests. Record that decision in a separate ADR before schema changes.

## 7. Consequences

### Benefits

- Preserves ACID transactions across sales, inventory, party ledgers, and accounting.
- Keeps deployment and operations understandable for a small engineering team.
- Makes accounting correctness and auditability more important than premature optimization.
- Leaves a controlled path to Rust/WASM when evidence justifies it.

### Costs and trade-offs

- Some future scaling may require deliberate module extraction.
- A modular monolith needs discipline to prevent cross-module repository coupling.
- Rust/WASM adoption, if justified later, adds build, test, deployment, and maintenance work.

## 8. Review triggers

Revisit this decision only when one or more of the following is evidenced:

- A measured CPU-bound workload cannot meet its defined performance objective in TypeScript.
- Browser-side computation measurably blocks interaction or a validated offline requirement emerges.
- Independent teams or deployment/scaling needs justify extracting a module.
- Multi-branch or multi-business requirements are approved.
- Compliance, availability, or recovery requirements materially change.

Until a review trigger is met, the current modular monolith remains the approved default.
