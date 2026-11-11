---
name: database-migrations
description: Use when changing Drizzle schema, PostgreSQL tables, indexes, constraints, triggers, migrations, data backfills, or transaction/locking behavior.
---

# Database Migrations Skill

## Objective

Evolve the PostgreSQL schema without losing existing business data, breaking deployed application versions, or weakening accounting and audit invariants.

## Procedure

1. Read the current Drizzle schema, migration history, ERD, repository queries, and deployment runbook.
2. Identify affected tables, row counts/size assumptions, foreign keys, unique constraints, triggers, indexes, and dependent application versions.
3. Define the desired invariant first. Prefer database constraints for rules that must hold regardless of which application path writes the data.
4. Design an additive, backward-compatible migration where practical. Consider expand → backfill → validate → contract for changes that cannot safely happen in one step.
5. Define null/default behavior, duplicate handling, backfill batching, lock duration, index build strategy, and failure recovery.
6. Generate or author the migration using the repository's established Drizzle workflow. Review the SQL itself; do not trust generated output blindly.
7. Update repositories, services, schemas, and tests in the same change. Keep transaction boundaries explicit.
8. Test migration from an empty database and, where practical, from a representative prior schema/data fixture.
9. Verify constraints, indexes, triggers, and append-only protections after migration. Test rollback or documented forward-recovery behavior.
10. Update ERD and operational documentation when the schema contract or deployment procedure changes.

## Safety constraints

- Never run a destructive migration against production without explicit authorization.
- Never rewrite a migration already applied to a shared environment; add a new migration.
- Do not assume DDL is lock-free or that rollback is always safe.
- Do not silently discard, merge, or fabricate financial history during a backfill.
- Do not run production migrations automatically during app startup; follow the explicit release runbook.
- Keep test and production database URLs strictly separated.

## Completion evidence

Report schema changes, migration SQL, data-loss/locking risk, compatibility plan, tests against fresh and upgraded schemas, and the recovery procedure.
