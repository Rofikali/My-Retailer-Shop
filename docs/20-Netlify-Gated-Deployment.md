# Netlify Direct Deployment

Netlify deploys the live site automatically whenever a commit is pushed to `main`. GitHub Actions continues to validate the same commit, but it does not trigger or block Netlify deployment.

## One-time account setup

1. In Netlify, open the RetailShop project and confirm its production branch is `main`.
2. In **Project configuration → Environment variables**, add encrypted production values:
   - `DATABASE_URL` — your Neon PostgreSQL connection string.
   - `SESSION_SECRET` — a new random value of at least 32 characters.
   - `NODE_ENV=production`.
3. In GitHub, protect `main` using the required checks listed in `19-CI-CD-Branch-Protection.md`.

Do not add your Netlify email address, Netlify password, owner password, database URL, or session secret to GitHub source files.

## Seed the live database once

Before the first live login, use a secure terminal with the Neon production connection string:

```powershell
$env:DATABASE_URL = '<Neon production connection string>'
$env:SEED_OWNER_EMAIL = '<your owner email>'
$env:SEED_OWNER_PASSWORD = '<new strong owner password>'
pnpm run db:migrate
pnpm run db:seed
```

Then sign in at `/login` with the owner email and password you chose. Do not run `db:seed` again after the first production seed.

Before pushing any change that adds a database migration, run `pnpm run db:migrate:release` once against the production `DATABASE_URL`. Netlify direct deploys do not run migrations automatically.

## Release behavior

```text
push main → Netlify production deploy
         → GitHub quality gates report pass or failure
```

If the Netlify build fails, the previous production deploy remains live. A GitHub CI failure does not automatically roll back a successful Netlify deploy, so protect `main` and merge only after required checks pass.
