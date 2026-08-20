# Production Hosting Runbook

This project is a stateful Nuxt application: it serves SSR pages, owns authentication, and connects directly to PostgreSQL. Deploy it as a Docker web service with managed PostgreSQL. Do not deploy it as a static site.

Netlify is also supported for a free staging/demo deployment through `netlify.toml`. It runs Nuxt SSR through Netlify Functions, so configure `DATABASE_URL` and `SESSION_SECRET` in Netlify’s encrypted environment settings. For a continuously available commercial ERP, prefer the Render Docker topology below because it matches the existing Node server image and explicit release migration workflow.

## Recommended topology

```text
GitHub main branch
      │  all CI gates pass
      ▼
Render Docker Web Service ─── TLS/custom domain
      │
      └── Neon or Render managed PostgreSQL
```

`render.yaml` is the infrastructure declaration. It uses the repository `Dockerfile`, probes `/api/health`, disables direct Render auto-deploy, and relies on the GitHub deploy hook after the complete CI pipeline succeeds.

## Render setup

1. Push this repository to GitHub.
2. In Render, create a Blueprint from the repository and select `render.yaml`.
3. Use a paid web-service plan for production. Render Free instances sleep and are documented for testing/hobby use, not production.
4. Create or connect a managed PostgreSQL database. Neon is also supported; use its pooled SSL connection string.
5. Set these encrypted environment variables on the Render service:
   - `DATABASE_URL`
   - `SESSION_SECRET` — generate a unique random value of at least 32 characters.
   - `NODE_ENV=production`
6. Create a Render deploy hook and save it in the GitHub repository secret `RENDER_DEPLOY_HOOK_URL`.
7. Add the production custom domain and verify HTTPS before inviting users.

## Release sequence

1. Open a pull request; require typecheck, unit, integration, build, and Playwright E2E checks.
2. Merge to `main` only after review.
3. GitHub triggers the Render deploy hook only after all required jobs pass.
4. Render builds the immutable Docker image.
5. Render runs `pnpm run db:migrate:release` before the new instance receives traffic.
6. Render probes `/api/health`; failed migrations or health checks keep the prior release serving.
7. Verify login, dashboard, one sale, one purchase, and one ledger report in staging before production promotion.

Never run `db:seed` against production. Never put migrations in the container start command. Migrations must be forward-compatible with the currently running version so rolling deploys remain safe.

## Secrets and data safety

- Keep `.env` local and untracked; use platform secret managers in every hosted environment.
- Rotate `SESSION_SECRET` only during a planned session invalidation window.
- Use a separate owner account for staging and production.
- Enable database encryption, automated backups, point-in-time recovery where available, and deletion protection.
- Perform a restore drill to a separate database at least quarterly and record the result.
- Monitor `/api/health`, database storage, connections, slow queries, migration failures, and authentication failures.

## Free staging option

Render Free plus Neon Free can be used for a temporary demo or staging environment. It is not an acceptable permanent production setup because free services can sleep or pause and free database plans may not provide the backup, retention, and availability guarantees required for business records.

Netlify Free plus Neon Free is another valid demo option. Netlify’s current Free plan has a hard monthly credit limit and pauses projects after the limit is reached; it does not provide an SLA. [Netlify pricing](https://www.netlify.com/pricing/)
