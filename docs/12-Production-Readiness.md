# Production Readiness Runbook

## Release gate

Every pull request must pass `pnpm run typecheck`, `pnpm run test:all`, `pnpm run build`, and `pnpm run test:e2e`.
The GitHub Actions workflow enforces these checks with isolated Postgres services and Chromium.

## Secrets and owner account

Set `DATABASE_URL`, `SESSION_SECRET`, `SEED_OWNER_EMAIL`, and `SEED_OWNER_PASSWORD` only in the deployment
platform's secret manager. `SESSION_SECRET` must be a unique random value of at least 32 characters. Never
copy `.env` to a server or commit it. Rotate the owner password using `pnpm run db:reset-owner-password` with
the two `SEED_OWNER_*` variables supplied by the secret manager.

## Deployment sequence

1. Deploy the immutable application image to staging.
2. Run `pnpm run db:migrate` once against the target database and review its output.
3. Probe `/api/health`, run smoke tests, then promote the same image to production.
4. Roll back the application image if required; use a new forward migration to repair database changes rather
   than restoring production data for an application-only rollback.

## Database resilience

Use managed Postgres with point-in-time recovery, daily backups retained for at least 30 days, and encrypted
connections. Perform a documented restore drill to a separate database every quarter. Never run `db:seed` on
an established production database.

## Monitoring and response

Ship JSON request logs to the hosting platform, alert on `/api/health` failures, and add an error-tracking DSN
through a provider such as Sentry before public deployment. Monitor Postgres connections, storage, slow queries,
and backup failures. Keep application and database audit records for the retention period required by the business.

## Access policy

Owners manage users and settings; every other API route requires a valid session. Login is throttled in-process
for small single-instance deployments. Before deploying multiple application instances, move rate limiting to a
shared store and add a vetted MFA/password-reset provider rather than implementing either protocol ad hoc.
