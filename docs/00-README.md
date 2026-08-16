# RetailShop ERP — Documentation Suite

**Scope:** Single-tenant internal ERP/accounting tool for one retail shop (owner-operated, single location).
**Stack:** Nuxt 4 (TypeScript) · Nitro server routes · PostgreSQL · Drizzle ORM · Docker Compose
**Future-optional:** FastAPI (only if a Python-specific need arises) · Redis (only when a real perf/queue need arises)

This is Phase 1 scope: **your shop only**, not a multi-tenant SaaS product. If you ever decide to sell this
to other shop owners, read `11-Scaling-and-Multi-Tenant-Path.md` first — it explains what would need to
change and why it's cheaper to do that migration from this foundation than to have built multi-tenant
from day one with no real usage data to validate the design against.

## Reading order

1. `01-PRD-BRD.md` — what this system does and for whom
2. `02-HLD.md` — architecture, tech stack decisions, deployment topology
3. `03-Database-Schema-ERD.md` — the data model (read this before writing any code)
4. `04-LLD.md` — module/page/service breakdown, key sequence flows
5. `05-API-Design.md` — endpoint contract
6. `06-Design-Patterns.md` — patterns used, where, and why
7. `07-SDLC-Process.md` — how work moves from idea to production, for a team of one
8. `08-Testing-Strategy.md`
9. `09-DevOps-Deployment.md`
10. `10-Security-and-Data-Integrity.md`
11. `11-Scaling-and-Multi-Tenant-Path.md`
12. `14-Implementation-Roadmap.md`
13. `15-Testing-and-Release-Runbook.md`
14. `16-Engineering-Architecture-and-Workflow.md` â€” authoritative HLD/LLD, SOLID, patterns, and operating workflow

## Non-negotiables carried over from the Excel rebuild

These aren't style preferences — they're direct fixes for problems that actually happened in your
spreadsheet, and the schema/architecture in these docs are designed specifically to make them structurally
impossible instead of relying on discipline:

- **Ledger entries are append-only.** The Excel Balance Sheet had a ₹3,474 unexplained gap because rows
  could be silently edited. In Postgres, financial facts are inserted, never updated — corrections are
  reversing entries. See `03-Database-Schema-ERD.md`.
- **One customer/supplier = one ID, enforced by a unique constraint**, not by discipline. The Excel file
  reused one customer ID for 5 different people.
- **Every multi-table write (sale → ledger → inventory) happens in one DB transaction.** This is exactly
  the class of bug that caused the Sales Register and Cash Book to disagree.
- **No feature is built until the ERD supports it.** UI-first development is what produced a spreadsheet
  with three stacked, half-broken templates per sheet.
