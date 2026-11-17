# RetailShop ERP — "go ahead" Milestone Continuation Runbook

**Standing manual workflow; not a scheduled or background service.** When the owner says "go ahead" in this repo context, interpret it as **continue the next eligible job from [live next.md](../next.md)** using the instructions below. A document cannot restart a finished AI session or start periodic monitoring. Merging, deployment, production migration and spending still require specific authorization.

## Authority and sources in order

1. Latest live GitHub main, PR list, commits, exact-head CI, actual source and schema; GitHub overrides stale notes.
2. Root [AGENTS.md](../AGENTS.md) and any scoped instructions, then [next.md](../next.md) **for selecting work**.
3. Affected [skills](../SKILLS.md), documented ADR/business policy, HLD/LLD, impacted code and tests.
4. [Status register](34-Project-Status-and-Decision-Register.md), [product blueprint](31-ERP-Product-Portfolio-and-Delivery-Blueprint.md) and [roadmap](14-Implementation-Roadmap.md) for history and long-term context.
5. Old PR/handoff documents for specific evidence only. Historical "next" paragraphs are not a live backlog.

## One bounded iteration

1. **Inspect:** read latest main SHA, branch, open PRs and active CI; when shell exists check git status to preserve dirty user work. When only GitHub connector exists, say local worktree is unknown; never claim local tests ran.
2. **Reconcile:** compare next.md task statuses with merged PRs, open drafts, failed runs, changed code and known blockers. If already merged, mark as MERGED only with actual merge SHA; avoid reimplementing it.
3. **Select:** resume the highest eligible task's open PR first. Otherwise choose highest-priority READY task after dependency check. In the initial 2026-11-17 queue that means **SEC-01 read-only role write denial**; if completed externally, choose next, currently FIN-01.
4. **Scope:** fill [handoff template](35-Milestone-Handoff-Template.md): one business outcome, one small PR, files/constraints, current behavior/reproducer, acceptance/negative tests, risks, HLD/LLD delta, non-goals and testing lane. Use seven-level and CA/security lenses proportionately.
5. **Implement:** smallest secure change in an isolated branch; do not edit live production data. Check direct API access, not only frontend hiding. For DB/accounting changes preserve one PostgreSQL transaction, source snapshots and immutable history.
6. **Verify:** run relevant focused commands only if available (e.g. `pnpm run typecheck`, `pnpm run test`, `pnpm run test:integration`, `pnpm run build`, `pnpm run test:e2e`), then required GitHub CI at real PR head. A GitHub connector cannot run local Docker/Playwright by itself. Do not infer PASS from source review. Keep successful CI job names/conclusions/links/SHAs; inspect only failed-step excerpts.
7. **PR and checkpoint:** create/update review PR only within given permission. Every implementation PR should propose updated next.md task row with current status, PR link (after creation), exact tested SHA and CI state. If CI finishes after commit, a follow-up PR-branch docs update is optional when needed; it triggers fresh CI at new SHA. **Never claim old green SHA proves new commit.**
8. **Report/stop:** what changed, cash/GL/stock/business impact, security, tests and CI exact SHA, remaining risks and next eligible task. **No merge without explicit user permission for that PR; no automatic deploy, opening-value approval, paid cloud, GitHub settings or monitoring.**
9. **Later "go ahead":** repeat from fresh main/PR/CI, reconcile any external merge, and proceed. Do not require the owner to restate engineering standards.

### State machine and precise claims

`PLANNED/READY → IN_PROGRESS → PR_OPEN/CI_PENDING → READY_FOR_REVIEW → MERGED → RELEASE_CANDIDATE → RELEASED`. Extra states: `BLOCKED`, `FAILED`, `DEFERRED`, `SUPERSEDED`. Owner approves **direction**, not unbounded action. Test pass and merge are different, and a merge is not production release.

**PR_OPEN:** source branch proposed for review, regardless of CI.  
**CI_PENDING:** exact head lacks all relevant final checks.  
**READY_FOR_REVIEW:** required checks pass on exact head and reviewer issues are documented.  
**MERGED:** GitHub shows actual merge into main.  
**RELEASED:** separate authorized deploy verified with operational evidence.

Do not store personal/customer data or any secrets in task board, chat or test artifacts. Do not copy all GitHub CI logs into an AI context to declare progress.

## Decision and stop table

| Observation | What to do |
| --- | --- |
| Active PR for selected task exists | Fetch its latest diff/reviews/checks; complete/repair it rather than duplicate |
| Exact-head CI passed | Review, report READY_FOR_REVIEW; do not merge unless current explicit approval |
| CI failed | Inspect failed job step, fix only proven cause, rerun scoped evidence as appropriate; report if blocked |
| Missing tool or no isolated PostgreSQL | Mark corresponding checks NOT RUN/BLOCKED; use actual GitHub checks only for pushed SHA |
| Critical security/accounting fault | Prioritize safe bounded remediation over feature expansion; avoid publishing sensitive attack instructions |
| Valuation migration/owner opening cost unclear | Stop affected migration; present options/policy and pick independent READY job |
| PR merged by owner externally | Refresh main; record real merge SHA and update status in next authorized PR; do not redo |
| No READY task | Report specific decision/dependency needed, not imaginary progress |
| Session ends | Leave a succinct next.md + handoff checkpoint; no fabricated background continuation |

## Scope-based verification, context and cost

- **Docs-only:** review hyperlinks/consistency; no new runtime claims. CI does not need manually duplicated Docker builds when it already runs automatically.
- **Authorization:** test anonymous, read-only, staff, owner on actual API writes and source-row non-mutation; audit all relevant POST/PATCH/DELETE routes.
- **Exact monetary logic:** pure unit tests + PostgreSQL source/GL/party/rounding reconciliation; no JS tolerance substitute for paise.
- **Stock/concurrency:** real PostgreSQL competing transactions, duplicates, rollbacks, constraints and lock-order regression.
- **Migration:** existing-state upgrade, trigger bypass/adversarial SQL, old legacy rows preserved, forward recovery, backup/restore where needed.
- **Deployment:** existing full required CI plus explicit production-like rehearsal and owner permission.

Cost rule: narrow source scans; no whole-repository reread, no repeat full tests solely for an AI summary, no full success log dumps. Never weaken required CI or security gates to reduce tokens. GitHub Actions minutes, model tokens and GitHub subscription charges are distinct; none can be determined from this document.

**Recommended user bootstrap:** "Go ahead on My-Retailer-Shop; follow AGENTS.md and the LIVE next.md task, keep one small PR, verify evidence and stop before merge." The shorter "go ahead" in an ongoing repository conversation is sufficient.
