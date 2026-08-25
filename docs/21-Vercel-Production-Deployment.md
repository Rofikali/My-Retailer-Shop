# Vercel Production Deployment

Vercel can host the Nuxt server-rendered application. It does not host PostgreSQL, so production requires a managed PostgreSQL provider such as Neon, Supabase, or Render PostgreSQL.

## One-time setup

1. Push the `main` branch to GitHub.
2. In Vercel, select **Add New -> Project**, import the GitHub repository, and use the detected Nuxt framework.
3. Keep the repository build settings. `vercel.json` uses `pnpm install --frozen-lockfile` and `pnpm run build`.
4. In **Project Settings -> Environment Variables**, add these values to **Production**, **Preview**, and **Development** as appropriate:
   - `DATABASE_URL`: managed PostgreSQL connection string with SSL enabled. Never use `localhost`, Docker hostnames, or a private LAN address.
   - `SESSION_SECRET`: a unique random value of at least 32 characters.
   - `NODE_ENV`: `production` for Production only.
5. Deploy the project and open `/api/health`. It must return `{ "status": "ok" }` before users are invited.

## Database release process

Run migrations from a secure machine with the production `DATABASE_URL` before deploying application code that depends on them:

```powershell
$env:DATABASE_URL = '<production connection string>'
pnpm run db:migrate:release
```

Do not run `db:seed` against an existing production database. Create the initial owner only on a newly created, empty database, using a strong unique password stored in your password manager.

## Admin account management

After signing in as an owner, open **Admin -> User Management**. Owners can create accounts, edit names/emails/roles, reset another user’s password, and disable accounts. A user changing their own email or password must enter the current password.

The system prevents self-disable and prevents disabling or demoting the last active owner. Keep at least two separate owner accounts for recovery, protected with different password-manager entries.

## Verification checklist

1. Confirm `/api/health` is healthy.
2. Sign in with the owner account.
3. Change a non-production test user's password and verify the new sign-in.
4. Create a staff account and confirm it cannot access owner-only pages.
5. Create one sale and confirm the inventory and ledger reports update.
6. Enable database backups, point-in-time recovery where available, and uptime monitoring for `/api/health`.
