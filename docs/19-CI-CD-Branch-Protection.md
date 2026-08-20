# CI/CD and Main Branch Protection

The deployment pipeline is fail-closed: production deployment is impossible unless unit tests, typecheck, integration tests, production build, Playwright E2E tests, and the production Docker build all pass.

## Required GitHub settings

Configure these settings in **Repository → Settings → Branches → Add branch ruleset** for `main`:

- Require a pull request before merging.
- Require at least one approving review.
- Dismiss stale approvals when new commits are pushed.
- Require conversation resolution.
- Require status checks: `Unit and typecheck`, `Integration tests`, `Production build and E2E`, and `Production container build`.
- Require branches to be up to date before merging.
- Block force pushes and branch deletion.
- Restrict bypass permissions to repository administrators only.

GitHub does not store branch-protection settings in repository files. Configure them in repository settings or through the GitHub API by an administrator.

## Production environment

Create a GitHub Environment named `production`, add required reviewers, and add `RENDER_DEPLOY_HOOK_URL` as an environment secret. Restrict deployment branches to `main` and never add database passwords to workflow logs.

The `deploy-production` job only runs after a successful push to `main`, all required jobs pass, and production approval succeeds. If the deploy hook is missing, the job fails rather than silently skipping deployment.

## Developer workflow

```text
feature branch → pull request → all CI gates → review → merge main
                                                     ↓
                                      production approval → Render deploy
                                                     ↓
                                      migration → health check → traffic
```

Local equivalents:

```powershell
pnpm run typecheck
pnpm run test
pnpm run test:integration
pnpm run build
pnpm run test:e2e
docker build --tag retailshop-erp:production .
```

Integration tests require PostgreSQL on the port configured in `.env`; CI creates an isolated PostgreSQL service automatically. Never bypass a failed gate by deploying manually to production.
