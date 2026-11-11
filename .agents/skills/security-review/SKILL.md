---
name: security-review
description: Use when changing or reviewing authentication, sessions, authorization, API routes, input validation, cookies, secrets, database access, audit logs, or customer and financial data exposure.
---

# Security Review Skill

## Objective

Identify realistic abuse paths and verify that server-side controls prevent unauthorized access, data disclosure, and integrity compromise.

## Procedure

1. Map the asset, actor, trust boundary, entry point, and worst credible impact.
2. Trace the request from browser/API route through middleware, authorization, validation, service, repository, and database.
3. Verify authentication and session lifecycle: secure cookie flags, server-verified expiry, rotation, revocation, logout, replay resistance, and secret handling.
4. Verify authorization on every server-side operation. Test anonymous, wrong-role, cross-record, and owner-only access paths. Do not rely on hidden UI controls.
5. Validate all untrusted inputs on the server with strict schemas, bounds, and allowlists where appropriate. Check mass assignment and object-level authorization.
6. Review CSRF protections, same-site behavior, CORS, rate limits, proxy/IP handling, and error responses for the endpoint's actual deployment topology.
7. Review database access for parameterization, least privilege, unsafe dynamic SQL, and leakage through logs or error messages.
8. Check race conditions and replay/duplicate requests on money, inventory, and allocation operations.
9. Review secrets and sensitive data: never commit credentials or log passwords, session cookies, tokens, or unnecessary personal data.
10. Add negative tests proving the control blocks the attack, plus positive tests proving legitimate access still works.

## Required review lenses

Consider OWASP-style risks where applicable: broken access control/IDOR, authentication failures, injection, insecure design, security misconfiguration, vulnerable dependencies, integrity failures, and logging/monitoring gaps.

## Stop conditions

Do not claim a system is secure from a static inspection alone. Do not expose a vulnerability in a public issue or PR comment; follow `SECURITY.md`. Escalate high-impact uncertainty instead of silently weakening a control.

## Completion evidence

Report affected assets and trust boundaries, concrete threat scenarios, controls verified, negative tests run, unresolved risks, and severity with a clear rationale.
