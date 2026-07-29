# scienium

A browser game where student teams run a science-fair research lab — read papers, take quizzes, discover sources, run experiments, and present at a fair (plus teacher tools; a PvP minigame is planned but not yet built). Headed for a real classroom pilot, so cost, polish, and durability matter.

## Stack
- pnpm monorepo: `apps/web` (the app), `packages/shared-types` (build first — others import it), `packages/config`.
- Next.js 15 (App Router) + TypeScript. Prisma + PostgreSQL. Clerk auth. Anthropic SDK for LLM features. AWS S3 for uploads. Vitest for tests.
- `apps/web/app` route groups: `(auth) (dashboard) (onboarding) (public) (teacher)` + `api/`. Data is team-scoped: School → Class → Team → TeamMember.

## House rules — apply to all code you generate
- **Cohesive, not patchwork.** Reuse existing components, utilities, types, and route patterns; match surrounding style. Fix root causes, don't bolt quick fixes on.
- **Pixel aesthetic for UI** — match the Literature Review look (dark bg, `font-pixel` chrome, gold accents). Regular fonts only for body/article text.
- **Persist to the DB.** Real data goes through Prisma — no localStorage/in-memory state for anything that should survive a reload.
- **Scope + cap (the only security to handle now).** Scope every query and mutation to the caller's authenticated user/team — guard against cross-team/IDOR. Rate-limit LLM-backed routes (Anthropic calls are expensive). Broader security and load hardening are deliberately deferred to one pass before the pilot deploys — don't gold-plate them now.
- **Mind LLM cost.** Prefer local compute and prompt caching over extra Anthropic calls.
- **Don't commit** unless explicitly asked; leave changes in the working tree.

## Pipeline gates
Run these in order from the repo root. All must pass before a feature is reviewed
or considered done. (CI runs gates 1-5 in `.github/workflows/ci.yml`; gate 6 runs in
`.github/workflows/e2e.yml` — smoke + cross-engine compat lanes on PRs, full suite
nightly/on-demand; missing `E2E_ENV_FILE` credentials FAIL trusted lanes and skip only
untrusted forks.) During iterative work,
re-run 1–4 per iteration; run 5 (`next build`, slow) once when the feature is
otherwise done.

1. pnpm --filter @scienium/shared-types build   # prereq: typecheck errors without it
2. pnpm --filter web check:integrity              # rejects control bytes (NUL etc.) in authored source
3. pnpm --filter web typecheck                   # tsc --noEmit
4. pnpm --filter web lint                         # next lint
5. pnpm --filter web build                        # next build; loads apps/web/.env.local automatically
6. pnpm --filter web test:e2e                     # Playwright E2E in a real logged-in browser; needs the dev DB up + E2E_* creds in .env.local
   # If teacher-flow specs fail their roster precondition, restore the DB fixture graph first: pnpm --filter web seed:e2e (idempotent; see docs/SETUP.md "E2E tests")

## Parallelism
What may run concurrently — and what must not — is in .claude/PARALLELISM.md. The hard rule: never run two implementation agents (coders) on the same working tree. Isolate concurrent features in separate git worktrees via `/ship`, run as separate sessions.
