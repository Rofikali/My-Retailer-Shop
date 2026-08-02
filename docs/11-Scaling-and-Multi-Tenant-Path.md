# Scaling & Multi-Tenant Path (read only if your plans change)

This system is deliberately built single-tenant. This document exists so that if you ever *do* decide to
sell this to other shop owners, you know what changes — and so you can see that the current design doesn't
block that future, it just doesn't pay for it today.

## If you outgrow single-instance Postgres (unlikely for years at this business size)
1. Add read replicas before you shard — most retail-shop-scale workloads never need sharding
2. Add Redis for caching the Dashboard/report queries once they're measurably slow (add a `slow query log`
   check first — don't guess)
3. Move background/scheduled work (end-of-day report snapshots, backup jobs) to a queue (BullMQ +
   Redis, or a simple cron) only once synchronous handling becomes a real bottleneck

## If you turn this into a multi-tenant SaaS product

This is the bigger decision. Two viable approaches, in order of how much they cost you to build vs. how
much isolation they give you:

**A. Shared schema, `business_id` on every table (recommended starting point)**
- Add a `business_id uuid` column to every business-scoped table (`sales`, `ledger_entries`, `customers`,
  etc.) and to a new `businesses` table
- Every query filters by `business_id` — enforce this with Postgres **Row-Level Security (RLS)** policies,
  not just application-layer `WHERE` clauses, so a missed filter in one query can't leak another business's
  data
- Cheapest to build from the current schema — it's a migration + RLS policies + an app-level "current
  business" context, not a rewrite

**B. Schema-per-tenant or database-per-tenant**
- Stronger isolation, much more operational overhead (migrations run N times, connection pooling gets
  harder, backups multiply)
- Only justified once you have compliance requirements or enterprise customers demanding strict isolation
  — not a Day 1 concern for a small-shop SaaS

## Why "just build multi-tenant from day 1" was the wrong call for you specifically

You have one real customer (your own shop) and zero validated product-market fit for selling this to
others. Multi-tenant architecture optimizes for a problem (many customers with data isolation needs) you
don't have yet, at the cost of every feature taking longer to build (tenant context has to be threaded
through everything) while you're still figuring out if the product itself is right. The single-tenant,
well-modularized version you're building now gets you to a *working, validated tool* faster — and Option A
above is a bounded, well-understood migration if the day comes, not a rewrite.
