# Parallelism in the NOVA Lab pipeline

Parallelism is applied only where the work is genuinely independent and verifiable. The model is **subagents + git worktrees** — not the experimental agent-teams flag, which we reserve for later.

## What MAY run in parallel

- **E2E scenarios.** `playwright.config.ts` sets `fullyParallel: true` with `workers` = `E2E_WORKERS` (default 4 locally, 2 in CI). Playwright gives each test its own browser context, so scenarios don't share client state. Bounded well under the 11 cores on purpose: the bottleneck is the single dev server + shared dev DB, not CPU.
- **Research agents.** Before a brainstorm, dispatch several `researcher` subagents at once, each on a different angle (competing apps, a UX pattern, one subsystem), each writing `pipeline/research/<topic>.md`. They only read + write their own file, so they can't collide.
- **Candidate generation.** The `brainstormer` synthesizes the parallel research outputs into `pipeline/ideas.md` — stronger, better-grounded candidates than a cold start.
- **Separate-worktree features.** Several approved issues can ship at once, each in its own worktree on its own branch via `/ship`, run as **separate Claude Code sessions** (not one session juggling them).

## What MUST NOT run in parallel

- **Two implementation agents (coders) on one working tree.** This is the hard rule. Concurrent edits to shared files produce merge conflicts and coordination overhead, not speed. Achieve feature concurrency only through separate git worktrees + separate sessions (see `/ship`), never two coders on the same checkout.

## Caveat for E2E on the shared dev DB

E2E reuses the dev database and a fixed set of Clerk accounts (leader / student / teacher). Parallel **reads** are safe; parallel **writes** can bleed if two specs mutate the same account's data at once. Write-touching specs must scope to their own data (create-and-clean within the test) or be kept serial. Keep specs independent — a test must never depend on another test's side effects.
