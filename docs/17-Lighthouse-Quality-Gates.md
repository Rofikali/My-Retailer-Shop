# Lighthouse Quality Gates

Lighthouse must audit the route intended for the check. RetailShop ERP protects operational pages, so an anonymous request to `/customer-ledger`, `/sales`, or `/` correctly redirects to `/login`. Auditing a protected route without an authenticated browser session measures the login page instead and produces a misleading result.

## Audit targets

| Area | Target | Session | Required result |
|---|---|---|---|
| Public access | `/login` | Anonymous | Performance, accessibility, best practices, and metadata are valid |
| Authenticated shell | `/` | Authenticated owner | Dashboard renders without redirect or client errors |
| Operational workflow | `/sales` | Authenticated staff/owner | Sales screen loads and core controls are usable |
| Accounting workflow | `/customer-ledger` | Authenticated accountant/owner | Ledger loads with date filters and no unauthorized data |

## Quality gates

- Performance: target 90+ in production-like builds; investigate every regression.
- Accessibility: target 100 for keyboard navigation, labels, focus states, contrast, and semantic structure.
- Best Practices: target 100 with no console errors, insecure requests, or deprecated APIs.
- SEO: target 100 only for public/indexable pages. Authenticated business screens should use `noindex`.
- Functional: `pnpm run typecheck`, `pnpm run test:all`, `pnpm run build`, and `pnpm run test:e2e` must pass.

## Authenticated audit procedure

1. Run `pnpm run build` and `pnpm run preview`.
2. Sign in with a non-production test account.
3. Run Lighthouse against the intended route in the authenticated browser profile.
4. Repeat in a clean anonymous profile against `/login`.
5. Record the URL, browser, build commit, date, score, and failed audits.

Do not weaken route protection or expose financial pages to improve a Lighthouse score. A redirect to `/login` is the correct security behavior; the audit must use the correct session.
