# DevOps & Deployment

## Local Development

`docker-compose.yml` — Postgres only (run Nuxt dev server natively for fast HMR, don't containerize the
dev-mode app itself, it's slower with no benefit):

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: retailshop
      POSTGRES_USER: app
      POSTGRES_PASSWORD: devpassword
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
volumes:
  pgdata:
```

## Production

Containerize the built app (`Dockerfile` using Nitro's `node-server` preset) for deploy portability, but
keep the topology simple:

```
Option A (simplest): Railway / Render / Fly.io
  - one service = the Nuxt app container
  - managed Postgres add-on (automatic backups included)
  - env vars via the platform's secret manager
  - zero server maintenance — right choice for a solo owner

Option B (more control, more ops work): single VPS (Hetzner/DigitalOcean)
  - docker-compose with app + postgres containers
  - Caddy or nginx in front for TLS (Let's Encrypt, automatic with Caddy)
  - cron job: nightly `pg_dump` → S3-compatible bucket (Backblaze B2 is cheap)
```

Start with Option A. Move to Option B only if cost or specific control needs justify the extra operational
burden — don't take on server maintenance you don't need yet.

## CI/CD (GitHub Actions is fine)

```
on: pull_request
  - install deps
  - typecheck (nuxi typecheck)
  - lint
  - unit + integration tests (spin up Postgres service container)

on: push to main
  - all of the above, plus:
  - build
  - run Drizzle migrations against production DB (explicit, reviewed step — never auto-migrate silently)
  - deploy
```

## Environment Variables (never commit these)
```
DATABASE_URL=
SESSION_SECRET=
NODE_ENV=
SENTRY_DSN=            (once you add error tracking)
```

## Backups — the part most solo projects skip and regret
- Automated nightly `pg_dump`, retained 30 days minimum
- **Actually test a restore** at least once before you need it for real — an untested backup is not a
  backup, it's a hope
- If using a managed Postgres provider, confirm what their automatic backup/restore actually covers before
  assuming it's handled

## Observability (right-sized)
- Structured JSON logs from Nitro (request id, user id, route, duration)
- Sentry (free tier) for exception tracking — this alone catches most production issues before a user
  reports them
- A simple uptime check (UptimeRobot free tier, or your host's built-in health check) hitting `/api/health`

## What to explicitly defer
- Kubernetes / container orchestration
- Multi-region deployment
- CDN beyond your host's default edge caching
- Redis — add when you have a specific need (e.g., caching the Dashboard summary query if it becomes slow,
  or a job queue for scheduled report generation), not preemptively
