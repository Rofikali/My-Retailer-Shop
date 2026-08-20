# Netlify Gated Deployment

The live Netlify site deploys only after the GitHub Actions workflow succeeds. A normal push to `main` reaches Netlify but `netlify.toml` ignores that build. The final GitHub deployment job then calls a Netlify build hook, which builds and publishes the exact current `main` commit.

## One-time account setup

1. In Netlify, open the RetailShop project and confirm its production branch is `main`.
2. In **Project configuration → Environment variables**, add encrypted production values:
   - `DATABASE_URL` — your Neon PostgreSQL connection string.
   - `SESSION_SECRET` — a new random value of at least 32 characters.
   - `NODE_ENV=production`.
3. In **Project configuration → Build & deploy → Continuous deployment → Build hooks**, create a hook named `GitHub CI production` for branch `main`.
4. Copy the hook URL. In GitHub, open **Settings → Environments → production → Add environment secret** and save it as `NETLIFY_BUILD_HOOK_URL`.
5. In GitHub, protect `main` using the required checks listed in `19-CI-CD-Branch-Protection.md`.

Do not add your Netlify email address, Netlify password, owner password, database URL, or session secret to GitHub source files. The build-hook URL is the only Netlify value stored in GitHub, and it must be an environment secret.

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

## Release behavior

```text
push main → GitHub quality gates → production approval → Netlify build hook
                                                       → database migration
                                                       → Netlify production deploy
```

If any test, build, container check, approval, migration, or Netlify build fails, the previous production deploy remains live.
