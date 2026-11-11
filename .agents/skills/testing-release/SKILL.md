---
name: testing-release
description: Use when preparing a feature PR, reviewing CI, cutting a release, deploying, or assessing production readiness.
---

# Testing and Release Verification Skill

## Objective

Produce a truthful, reproducible evidence trail that the change works at the layers it affects and can be released safely.

## Procedure

1. Inspect `package.json`, CI workflow files, test configuration, environment requirements, and the release runbook. Use only commands that actually exist.
2. Convert the change into observable acceptance criteria. Include business outcomes, authorization boundaries, failure behavior, and data integrity where applicable.
3. Select tests by layer: unit for pure rules, integration for PostgreSQL/repository/transaction behavior, E2E for critical browser journeys, and typecheck/build for static and production compilation.
4. Run the narrowest relevant check first. Then run broader CI-equivalent checks when the environment permits.
5. Confirm integration tests use an isolated test database, never production. Confirm E2E uses a known test environment and test credentials.
6. Inspect failures rather than retrying blindly. Preserve logs and distinguish code defects, environment/setup failures, flaky tests, and unavailable dependencies.
7. Inspect the actual PR head's CI status and review feedback. A green run on another branch or an older commit is not evidence for the current change.
8. Before release, review migrations, secrets/configuration, backup and restore readiness, health checks, rollback/forward-recovery, and deployment ordering.
9. After deployment or merge, verify the resulting commit, workflow, health signal, and any requested smoke test. Do not claim success until observed.
10. Record exact commands, environment limitations, outcomes, and follow-up actions.

## Repository command reference

Use these only when their prerequisites are met:
- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run test:integration`
- `pnpm run test:e2e`
- `pnpm run build`
- `pnpm run test:all` (unit + integration; E2E is separate)

## Stop conditions

Do not run production migrations, deploy, merge, or change production configuration without explicit authorization. Never report a test as passed if it was skipped, mocked, blocked, or only inferred from code.

## Completion evidence

Provide a check matrix with command, environment/prerequisite, result (passed/failed/blocked/not run), and relevant log or CI reference. State release blockers separately from non-blocking follow-ups.
