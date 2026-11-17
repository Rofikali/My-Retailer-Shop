---
name: milestone-continuation
description: Use whenever the owner says "go ahead", asks for next work, milestone progress, PR review, or an engineering handoff in My-Retailer-Shop.
---

# Next-Job / Go-Ahead Continuation Skill

**Authority:** [AGENTS.md](../../../AGENTS.md), [live next.md](../../../next.md), [continuation runbook](../../../docs/33-Go-Ahead-Milestone-Runbook.md), [handoff template](../../../docs/35-Milestone-Handoff-Template.md). These are repository policy, not an autonomous scheduler or merge authorization.

## Procedure

1. Inspect latest GitHub main SHA, branch/status if available, recent merged work, open PRs and exact-head CI. If using a GitHub connector only, report inability to see local dirty worktree and inability to run local shell tests.
2. Read compact next.md first. Reconcile its statuses against actual GitHub evidence. Do not load historical documents, whole codebase or all AGENTS by default.
3. Resume highest-priority active PR for selected task; otherwise choose first dependency-satisfied READY task. Do not repeat merged implementation or choose a random feature.
4. Scope **one bounded PR** with task ID, input/output and acceptance criteria, HLD/LLD impact, realistic shop/CA journal example when relevant, permissions, rollback and negative/concurrency tests.
5. Read relevant accounting/security/DB/architecture skills and actual source; make minimal secure edits preserving user work.
6. Run focused relevant tests when possible; use existing GitHub CI for pushed head. Full successful logs stay outside model context; report exact SHA, job names/status and failures only as concise excerpts.
7. Update next.md on the working branch with accurate state, actual PR URL and CI facts. Distinguish PR_OPEN, CI_PENDING, READY_FOR_REVIEW, MERGED, RELEASED.
8. Stop without specific authorization before merging, deploying, production migration/backfill/opening valuation, secret changes, hosting costs or background automation.
9. Report files, financial effects, security, tests, risks, actual GitHub state and the next eligible task. A subsequent owner "go ahead" starts a fresh bounded iteration.

## Evidence and stop cases

- Do not claim passed tests not executed or infer production safety from CI.
- Do not invent an owner policy for historical stock values, taxes, write-offs, staff permissions or financial period close.
- No PR-ready claim for failed/pending required CI at current head.
- If task blocked, document exact decision or prerequisite and choose next independent READY task.
- No self-triggering infinite loops, automatic scheduling, repeated full-build cycles or seven separate agent invocations.
