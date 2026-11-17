# Engineering Skills Index

This file is the navigation index for focused, repeatable engineering workflows used in RetailShop ERP. Read AGENTS.md first; these skills supplement it and never override repository-wide security or accounting invariants.

## Available skills

**Use [live next.md](next.md) as the single next-task selector and [go-ahead runbook](docs/33-Go-Ahead-Milestone-Runbook.md) for task continuation.** Review depth scales with risk; seven engineering levels and CA/MBA/security are review lenses, not separate agents or automatic execution.

| Skill | Use when | Skill instructions |
|---|---|---|
| Accounting integrity | Changing sales, purchases, expenses, receipts, payments, inventory valuation, ledgers, or reports | [accounting-integrity](.agents/skills/accounting-integrity/SKILL.md) |
| Security review | Changing authentication, sessions, authorization, APIs, secrets, input validation, or sensitive data | [security-review](.agents/skills/security-review/SKILL.md) |
| Database migrations | Changing Drizzle schema, constraints, indexes, migrations, backfills, or transaction behavior | [database-migrations](.agents/skills/database-migrations/SKILL.md) |
| Testing and release verification | Preparing a feature PR, release, deployment, or production-readiness assessment | [testing-release](.agents/skills/testing-release/SKILL.md) |
| Architecture and performance | Evaluating Rust/WASM, native libraries, queues, caches, service extraction, or performance optimization | [architecture-performance](.agents/skills/architecture-performance/SKILL.md) |
| Milestone continuation / "go ahead" | Any next-job, progress, PR review, status reconciliation or handoff | [milestone-continuation](.agents/skills/milestone-continuation/SKILL.md) |
| ERP product, CA/CFO and MBA management | Product direction, accounting business cases, reports, finance and management prioritization | [erp-product-finance](.agents/skills/erp-product-finance/SKILL.md) |
| HLD/LLD, DDD, hexagonal and design patterns | Cross-module or nontrivial architecture, transaction and design decisions | [architecture-design](.agents/skills/architecture-design/SKILL.md) |


## Skill execution contract

For a task that matches a skill:
1. Read the complete relevant SKILL.md before implementation or review.
2. Use the skill's checklist as a minimum, not as a substitute for engineering judgment.
3. Read the actual code, schema, migrations, and tests. Never rely on filenames or documentation alone.
4. State assumptions and unresolved questions rather than inventing business rules.
5. Make the smallest safe change and preserve existing user work.
6. Run the checks that are feasible in the current environment and report evidence honestly.
7. Update the skill when a verified recurring lesson changes the workflow.

## Important distinction

SKILLS.md is a repository-level index for humans and coding agents. It is not, by itself, a universal auto-discovery format. The individual SKILL.md files use the Agent Skills folder convention under .agents/skills/ for tools that support that convention. AGENTS.md tells agents when and why to read them.

## Adding a skill

Add a skill only when a workflow is repeated, has meaningful domain-specific checks, and benefits from a dedicated procedure. Each skill should have:
- a short, unique name and clear description/frontmatter
- explicit activation conditions
- ordered steps based on repository facts
- safety constraints and required verification
- a concise completion/evidence format

Do not create a skill for every file, framework, or small task. Avoid duplicating the full contents of AGENTS.md.
