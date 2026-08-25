# Git Branching and Release Policy

`main` is the production branch. It must always be deployable, protected, and updated only through an approved pull request.

## Branch model

| Branch | Purpose | Deployment rule |
| --- | --- | --- |
| `main` | Stable production release history | Vercel production deploys only from this branch. No direct pushes. |
| `develop` | Shared integration branch | Receives approved feature pull requests; use a Preview deployment for acceptance testing. |
| `feature/<work-item>` | One focused change | Starts from `develop`; deleted after merge. |
| `fix/<work-item>` | Non-urgent production defect | Starts from `develop`; follows the same review path. |
| `hotfix/<work-item>` | Urgent production defect | Starts from `main`; merge back to both `main` and `develop`. |

## Required promotion path

```text
feature/* -> develop -> main
hotfix/*  -> main + develop
```

Never merge unreviewed work directly to `main`. A migration must be reviewed, tested in Preview, and run as an explicit production release step before the application change depends on it.

## GitHub ruleset for `main`

In GitHub: **Repository Settings -> Rules -> Rulesets -> New branch ruleset**:

1. Target branch: `main`.
2. Enable **Require a pull request before merging** with at least one approval.
3. Enable **Require status checks to pass** and select:
   - `Unit and typecheck`
   - `Integration tests`
   - `Production build and E2E`
   - `Production container build`
4. Enable **Require branches to be up to date before merging**.
5. Enable **Block force pushes** and **Block deletions**.
6. Restrict direct pushes, including administrators except documented emergency break-glass cases.

Apply the same rule to `develop`, but allow designated maintainers to merge approved feature pull requests.

## Release checklist

1. Feature PR is reviewed and CI passes.
2. Merge feature into `develop`; verify Vercel Preview and business acceptance.
3. Open `develop -> main` release PR; review migration and rollback plan.
4. Confirm backup health and run the production migration explicitly.
5. Merge only when every required CI gate passes.
6. Verify `/api/health`, login, a critical transaction, and reports after deployment.
