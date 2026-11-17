# RetailShop ERP — One-Task Engineering Handoff Template

**Template only; not an actual completed task.** Use with [next.md](../next.md), [AGENTS](../AGENTS.md), [seven-level operating model](32-Seven-Level-Engineering-and-Business-Review.md) and [go-ahead runbook](33-Go-Ahead-Milestone-Runbook.md).

## A. Fill before writing code

| Field | Actual evidence, never guess |
| --- | --- |
| Task ID and short objective | Same stable ID as live next.md, e.g. SEC-01 |
| Current GitHub base/HEAD SHA | Actual inspected main/branch SHA, not a copied example |
| Business user and before/after | Who is affected; daily shop workflow; one precise value |
| Mode | Read-only audit / docs-only / code+tests / release review |
| Prerequisites / owner decisions | DONE, BLOCKED, or UNKNOWN with link |
| Bounded files/modules | API, domain/service/repo/schema/UI/tests only when needed |
| Explicit exclusions | E.g., no production migration, auth rewrite, new financial policy, unrelated UI |
| HLD and LLD delta | Trust boundary, transaction sequence, locks, schema and API contract |
| CA accounting case | Example journal Dr/Cr, item quantity/cost, party effects, tax policy if relevant |
| Security abuse/failure case | Anonymous/wrong role, replay, CSRF/IDOR, concurrent write, rollback, bad decimal |
| Verification plan | Focused tests and exact package scripts + real PostgreSQL/CI expectations |
| Rollout/rollback | No runtime impact / additive schema / separately approved production plan |
| Cost/business decision | Benefit, time/opportunity cost, relevant host/dependency expense assumptions |
| Evidence and blockers | Links/SHAs; PASS, FAIL, NOT RUN, PENDING or BLOCKED; never assume |
| Next task | One next eligible READY job, based on fresh main/PR reconciliation |

## B. Implementation review — proportionate seven levels

- **L1:** reproducible current behavior and expected output.
- **L2:** minimal end-to-end solution and errors.
- **L3:** transaction, rollback, concurrency and threat paths.
- **L4:** cross-module source/GL/party/stock/API parity.
- **L5:** sequencing, shared migration/backward compatibility and dependency risks.
- **L6:** correct architecture, operational trade-offs and evidence.
- **L7:** strategic justification only for major enduring technical/product choices.
- **CA/CFO:** correct debits/credits, exact paise and financial tie-outs.
- **MBA/management:** useful shop outcome, user acceptance and cost.
- **Security/SRE/QA:** permissions/negative tests, recovery and exact-SHA CI.

No need for seven distinct agents or reports. Answer each applicable question rather than perform role theater.

## C. Completion report skeleton

**Task:** ID, outcome and status at exact SHA.  
**Changed:** focused files, design and why, no unrelated changes.  
**Accounting:** expected vs actual Dr/Cr and stock/customer/supplier/report tie-out (or not applicable).  
**Security:** actor matrix, negative tests, residual risks.  
**Verification:** command, environment, PASS/FAIL/NOT RUN/PENDING, tested SHA, CI URL.  
**Git:** PR URL, head SHA, actual merge SHA only if merged, release proof only if deployed.  
**Next:** one eligible task ID and any approval/decision required.  
**Limitations:** state clearly what was not run, deployed or reviewed.

After a new PR opens, amend its own branch's next.md with real PR identity/evidence as needed. After an owner merges externally, reconcile next.md in the next authorized session. Never falsely convert passed CI into merged/released.
