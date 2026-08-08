# Multi-stage build - see docs/09-DevOps-Deployment.md "Production" for the two hosting
# options this image supports (Railway/Render/Fly.io, or a self-managed VPS).

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.18.0 --activate
WORKDIR /app

# --- deps: install once, cached unless package.json/lockfile change ---
FROM base AS deps
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# --- build: compile the Nuxt app ---
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

# --- runtime: only what's needed to run the built server ---
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /app/.output ./.output
USER app
EXPOSE 3000
# Migrations are run as an explicit, reviewed CI/CD step (docs/09-DevOps-Deployment.md
# "CI/CD") - never auto-migrate on container start, which can run half-applied
# migrations against a database still serving live traffic during rolling deploys.
CMD ["node", ".output/server/index.mjs"]
