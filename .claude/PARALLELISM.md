# Parallelism in the scienium pipeline

Parallelism is applied only where the work is genuinely independent and verifiable. The model is **subagents + git worktrees** — not the experimental agent-teams flag, which we reserve for later.

## What MAY run in parallel

- **E2E scenarios — opt-in, serial by default.** `playwright.config.ts` sets `fullyParallel: false` and `workers` = `E2E_WORKERS` (default **1**), so the suite runs serially out of the box. Every spec authenticates as the same leader on the ONE shared dev team, so parallel workers race each other's mutations (e.g. a concurrent log grants LC mid-assertion) and flake. Override with `E2E_WORKERS=N` locally for speed once you accept that contention. The real fix — and the precondition for turning parallelism on for good — is giving each worker its own dedicated test account + team (and ideally its own local Postgres, see docs/SETUP.md "Faster, less flaky E2E"); until then the shared account + DB are the bottleneck, not CPU. **Half of that landed in v0.51.0:** `createLab()` in `e2e/lab.ts` gives each spec FILE its own disposable team, which is what removes the flakes. The remaining half — one Clerk account per worker, needed because `User.activeTeamId` is singular — is an owner decision because it provisions accounts. See `docs/runbooks/e2e.md`.
- **Research agents.** Before a brainstorm, dispatch several `researcher` subagents at once, each on a different angle (competing apps, a UX pattern, one subsystem), each writing `pipeline/research/<topic>.md`. They only read + write their own file, so they can't collide.
- **Candidate generation.** The `brainstormer` synthesizes the parallel research outputs into `pipeline/ideas.md` — stronger, better-grounded candidates than a cold start.
- **Separate-worktree features.** Several approved issues can ship at once, each in its own worktree on its own branch via `/ship`, run as **separate Claude Code sessions** (not one session juggling them). To also run their E2E suites concurrently, give each worktree its own local Postgres (see docs/SETUP.md "Faster, less flaky E2E") — the shared dev DB is the real serialization point, not the code.

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

**As of v0.51.0 that last sentence has a mechanism behind it.** New specs should call `createLab()` (`e2e/lab.ts`) instead of reaching into the shared fixture team: it builds a lab that exists only for that file and disposes it through the same ordered inventory `reset:e2e` uses. `synthesis-matrix.spec.ts` is the worked example. Before a full run, clear the shared lab — the seeder is additive and never deletes: `pnpm --filter web reset:e2e && pnpm --filter web seed:e2e`.
