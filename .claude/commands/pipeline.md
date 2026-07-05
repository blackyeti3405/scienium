---
description: Run the scienium feature pipeline (brainstorm, pick, plan, code, gate, review).
---
Run the feature pipeline. You are the orchestrator. Hold the loop state yourself; the subagents only do their one job and return.

## Process weight — pick per feature, don't default to maximum

- **implement-only** (DEFAULT for UI, content, styling, copy, and other low-risk changes): planner → coder → gates. No tester, no reviewer — the user tests manually in the browser. Say so when reporting done.
- **full cycle** (plan → code → E2E test → review): use when the feature touches the schema/migrations, auth/scoping (IDOR surface), money-shaped logic (KP/LC), cross-team data, or LLM routes — or when the user asks for it.
- Batch trivially-related small changes into one coder pass instead of one cycle each.

## Standing rules (apply to every run)

- **Build once:** gate 4 (`next build`) runs ONCE per feature when it's otherwise done — not on every coder iteration. Iterations re-run only gates 1–3 (shared-types build, typecheck, lint).
- **Feature IDs are recycled across batches.** Before writing any `plan-/changes-/review-<ID>.md` or `e2e/<ID>.spec.ts`, check for an existing file from a prior shipped batch; if taken, suffix with a short slug (e.g. `plan-F4-print.md`, `F4-print.spec.ts`). Never overwrite shipped records.
- **Migrations:** a PreToolUse hook blocks `prisma migrate dev`/`db push`. The sanctioned path: `prisma migrate diff --script` against `DIRECT_URL` (the pgbouncer `DATABASE_URL` hangs) → write the timestamped migration folder → `prisma migrate deploy` → `prisma generate`. Put this in every coder brief that touches the schema.
- Subagent briefs should carry **environmental facts and constraints** (like the above), not step-by-step how-to — trust the agent's judgment on approach.

## Tester playbook (bake into every tester brief on full-cycle features)

1. Run `pnpm --filter web typecheck` BEFORE reporting any verdict — Playwright's transform doesn't typecheck specs.
2. Navigate (`page.goto`) before any `page.request` call, including beforeAll/afterAll contexts — the stored Clerk JWT expires minutes into a serial suite (see e2e/F4.spec.ts:518).
3. Unauthenticated API assertions: expect the middleware's 307-to-/sign-in (use `maxRedirects: 0`), not 401; assert no data in the body.
4. `waitForResponse` around any click that fires a mutation before asserting DOM — the remote dev DB makes mutations take seconds; bare visibility timeouts flake. React Strict Mode double-fires mount fetches, so don't key readiness on "first matching GET"; use auto-retrying DOM assertions.
5. One scoped gate run (`pnpm --filter web test:e2e <spec>`) when the spec is ready; green = done. No determinism re-runs, no manual dev servers (playwright's webServer boots/reuses one), no throwaway diagnostic files. Timebox ~20–30 min.
6. Self-clean per .claude/PARALLELISM.md; if teacher-flow preconditions fail, run `pnpm --filter web seed:e2e` first.
7. E2E is faster and less flaky against a local Postgres — see SETUP.md "E2E tests" for the local-DB option.

## The loop

1. Invoke the brainstormer. Show me .claude/pipeline/ideas.md. STOP and wait for me to name the feature IDs I want. I may pick any number of them.
   (If feature descriptions were passed in $ARGUMENTS, skip brainstorming and treat those as the selection.)

2. **Plan all selected features in PARALLEL first.** Dispatch every selected feature's planner at once (one message, N concurrent planner agents) — planners only read code and each writes its own `plan-<ID>.md`, so they cannot collide (this is the `research agents` pattern in PARALLELISM.md). Wait for all plans, show me a one-line summary of each (and the process weight you picked per feature, with one clause of why). This is the only phase that safely parallelizes within one session.

3. Then run the build cycle for each feature **SERIALLY** (the hard rule: never two coders on one working tree — see PARALLELISM.md). For genuinely independent features you want built concurrently, that's the worktree model — separate `/ship` sessions per feature, then reconcile via the PARALLELISM.md integration protocol — not one session juggling coders. For EACH selected feature ID, at its chosen process weight:
   a. Set iteration = 1.
   b. Invoke the coder on .claude/pipeline/plan-<ID>.md (gates 1–3; gate 4 once at the end).
   c. [full cycle only] Invoke the tester on .claude/pipeline/plan-<ID>.md with the playbook above. It writes the e2e spec (one assertion per acceptance criterion) and runs the scoped E2E gate. If E2E fails on a product bug and iteration < 3: re-invoke the coder with the failure output, increment iteration, go back to c. Spec-infrastructure failures go back to the tester and do not consume an iteration.
   d. [full cycle only] Invoke the reviewer on plan-<ID>.md and changes-<ID>.md. Write its returned review to pipeline/review-<ID>-<iteration>.md.
   e. [full cycle only] If CHANGES_REQUESTED and iteration < 3: route product findings to the coder, spec findings to the tester; increment iteration; go back to c.
   f. If APPROVE (or implement-only gates pass): mark the feature done. If still CHANGES_REQUESTED after iteration 3: stop this feature and flag it to me with the open review.

4. When all selected features are processed, summarize what shipped, what stalled, and show me the diffs.
