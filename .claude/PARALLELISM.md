# Parallelism in the scienium pipeline

Parallelism is applied only where the work is genuinely independent and verifiable. The model is **subagents + git worktrees** — not the experimental agent-teams flag, which we reserve for later.

## What MAY run in parallel

- **E2E scenarios.** `playwright.config.ts` sets `fullyParallel: true` with `workers` = `E2E_WORKERS` (default 4 locally, 2 in CI). Playwright gives each test its own browser context, so scenarios don't share client state. Bounded well under the 11 cores on purpose: the bottleneck is the single dev server + shared dev DB, not CPU.
- **Research agents.** Before a brainstorm, dispatch several `researcher` subagents at once, each on a different angle (competing apps, a UX pattern, one subsystem), each writing `pipeline/research/<topic>.md`. They only read + write their own file, so they can't collide.
- **Candidate generation.** The `brainstormer` synthesizes the parallel research outputs into `pipeline/ideas.md` — stronger, better-grounded candidates than a cold start.
- **Separate-worktree features.** Several approved issues can ship at once, each in its own worktree on its own branch via `/ship`, run as **separate Claude Code sessions** (not one session juggling them). To also run their E2E suites concurrently, give each worktree its own local Postgres (see SETUP.md "Faster, less flaky E2E") — the shared dev DB is the real serialization point, not the code.

## What MUST NOT run in parallel

- **Two implementation agents (coders) on one working tree.** This is the hard rule. Concurrent edits to shared files produce merge conflicts and coordination overhead, not speed. Achieve feature concurrency only through separate git worktrees + separate sessions (see `/ship`), never two coders on the same checkout.

## Integration protocol (reconciling parallel worktrees)

Worktrees isolate work-in-progress; integration is **serial, through PRs**:

1. Each worktree branch opens its own PR. Merge them **one at a time** — first PR merges clean; every still-open branch then **rebases onto main immediately** (or merges main in), so conflicts are resolved small and fresh by the branch that caused them, not all at once at the end.
2. **Scope for disjoint file surfaces at planning time.** Two features that both rewrite the same component don't belong in parallel worktrees — run those serially in one session instead. The planner should name the files a feature touches; overlapping lists = serialize.
3. **Known hotspot files** (touched by almost every feature — expect and accept small conflicts here, resolve by keeping both sides): `app/globals.css` (append-only, one clearly-commented block per feature), `prisma/schema.prisma` (model blocks rarely collide if features own different models), `package.json` (scripts/deps). Never resolve a hotspot conflict by dropping the other feature's block.
4. **Migrations don't conflict as files** (each is its own timestamped folder) and `migrate deploy` applies them in timestamp order — but the **shared dev DB receives every branch's migration as soon as that branch deploys it**. Keep parallel-branch migrations additive-only (new tables/columns, no renames/drops), so branches remain compatible with a DB that's ahead of them.
5. After the last PR merges, run the full gate sequence once on main — that's the integration test.

## Caveat for E2E on the shared dev DB

E2E reuses the dev database and a fixed set of Clerk accounts (leader / student / teacher). Parallel **reads** are safe; parallel **writes** can bleed if two specs mutate the same account's data at once. Write-touching specs must scope to their own data (create-and-clean within the test) or be kept serial. Keep specs independent — a test must never depend on another test's side effects.
