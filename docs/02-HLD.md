# High-Level Design (HLD)

## 1. Architecture Style

**Modular monolith**, not microservices. One deployable app (Nuxt), one database (Postgres). Internally
organized into clear modules (Sales, Purchases, Inventory, Ledger, Reports, Auth) with strict boundaries
between them, so a future split into services is possible but not required.

Why not microservices: a team of one gains nothing from network boundaries between "Sales" and "Inventory"
— it only adds deployment complexity, distributed transaction problems, and operational overhead. Revisit
only if you have organizational reasons (multiple independent teams) or a genuine scaling bottleneck that
requires an independent deploy/scale unit.

## 2. Tech Stack and Why

| Layer | Choice | Why |
|---|---|---|
| Frontend | Nuxt 4 (Vue 3), TypeScript | SSR for fast first paint on shop wifi, file-based routing matches the page-per-register mapping, you already know Vue/TS |
| UI Components | Nuxt UI v4 (or Shadcn-vue) | Accessible, themeable, ships with the framework's own conventions — avoid hand-rolling form/table components |
| API layer | Nitro server routes (`server/api/*`) | Same TypeScript types end-to-end (share types between client and server with zero duplication); no second backend to deploy/monitor for Phase 1 |
| ORM | Drizzle ORM | TypeScript-first, SQL-like (no magic), excellent migration story, lightweight — a good fit for a solo dev who wants to see the actual SQL |
| Database | PostgreSQL 16+ | ACID transactions (non-negotiable for a ledger), mature, free, works fine at this scale for years |
| Auth | Better Auth or Lucia (self-hosted) | Session-based auth, roles support, you own the user data (financial app — don't outsource identity to a third party you don't need) |
| Containerization | Docker Compose (Postgres + app locally) | Dev/prod parity from day one, cheap |
| Hosting (Phase 1) | Single VPS or Railway/Render/Fly.io, one container + managed/self-hosted Postgres | No orchestration platform needed at this scale |
| Optional, later | FastAPI | Only if you need a Python-specific capability (heavy analytics, OCR on receipts, ML). Talks to the *same* Postgres, not a separate service owning its own data. |
| Optional, later | Redis | Only when you have a measured slow query to cache, or need background jobs/queues (e.g., end-of-day report generation) |

## 3. System Context Diagram (textual)

```
                          ┌─────────────────────────┐
   Owner / Staff  ──────► │        Nuxt 4 App        │
   (browser, phone)       │  (SSR pages + Nitro API) │
                          └───────────┬──────────────┘
                                      │ SQL (Drizzle)
                                      ▼
                          ┌─────────────────────────┐
                          │       PostgreSQL          │
                          │  (single source of truth) │
                          └─────────────────────────┘
```

No external services required for Phase 1. Backups run against Postgres directly (pg_dump on a cron, or
managed provider's automatic backups).

## 4. Layered Architecture (inside the monolith)

```
app/pages/*            → Vue pages (one per module: /sales, /purchases, /inventory, ...)
app/components/*        → shared UI components
server/api/*            → Nitro route handlers — thin, no business logic
server/services/*       → business logic (SalesService, LedgerService, ReportService, ...)
server/repositories/*   → Drizzle queries — the ONLY place raw DB access happens
server/db/schema.ts      → Drizzle schema (source of truth for the ERD)
server/db/migrations/*   → generated migrations
```

Rule: a page never talks to the DB directly. A route handler never contains business logic. A service
never writes raw SQL — it calls a repository. This is the Repository + Service Layer pattern (see
`06-Design-Patterns.md`) and it's what makes the app testable without a real database.

## 5. Data Flow — worked example (credit sale)

1. Staff submits a sale form → `POST /api/sales`
2. Route handler validates input (zod schema), calls `SalesService.recordSale()`
3. `SalesService` opens **one DB transaction** that:
   - inserts the `sales` + `sale_items` rows
   - inserts the corresponding `ledger_entries` (Debit: Debtors or Cash; Credit: Sales Revenue; Credit:
     Inventory at cost / Debit: COGS)
   - inserts `inventory_movements` rows to deduct stock
   - commits, or rolls back all of it on any failure
4. Reports (P&L, Balance Sheet, Trial Balance) later read from `ledger_entries` — they are never
   separately maintained, so they cannot drift out of sync with the transactions that produced them.

This single design decision (one transaction, ledger as the only source of truth for reports) is the
direct structural fix for the Sales-Register-vs-Cash-Book mismatch you had in Excel.

## 6. Deployment Topology (Phase 1)

```
Docker Compose (or single VPS):
  - app container (Nuxt, built + served via Nitro's Node preset)
  - postgres container (or managed Postgres — Railway/Neon/Supabase all fine)
  - nightly pg_dump → object storage (S3-compatible), simplest reliable backup
```

No load balancer, no CDN beyond what your host gives you by default, no multi-region. Add these only when
you have a concrete reason (traffic, latency complaints from real users, uptime SLA you've actually sold).

## 7. Non-Functional Requirements (right-sized for Phase 1)

| NFR | Phase 1 target | Not required yet |
|---|---|---|
| Availability | Best-effort (single instance restart on crash) | Multi-AZ, 99.99% SLA |
| Backup | Nightly automated backup, tested restore | Point-in-time replication across regions |
| Auth | Session-based, roles, password hashing (argon2) | SSO, MFA (add if handling more sensitive data later) |
| Observability | Structured logs + an error tracker (Sentry free tier) | Distributed tracing, service mesh metrics |
| Performance | Pages load <1s on shop wifi for realistic data volume (thousands of rows) | Sub-100ms p99 at 10k concurrent users |
