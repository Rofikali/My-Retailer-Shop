# CI/CD and Main Branch Protection

The CI pipeline is fail-closed: unit tests, typecheck, integration tests, production build, Playwright E2E tests, and the production Docker build must pass before a pull request can merge when GitHub branch protection is enabled. Netlify deploys `main` directly.

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

## Developer workflow

```text
feature branch → pull request → all CI gates → review → merge main
                                                     ↓
                                            Netlify production deploy
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
