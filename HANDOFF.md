# Handoff — scienium REFACTOR2 remediation

Continue the REFACTOR2.MD remediation. Read REFACTOR2.MD §0 first — it's the authoritative audit
register. §0.11 is the running close-out log: what's been fixed, and what each fix **still owes**.

## STATE

Branch `Rig-features`, HEAD at **v0.53.0** (`25fbdd5`), working tree clean, pushed.
Gates 1–5 green. Vitest **123 files / 1,769 tests**. E2E **309 passed / 0 failed / 9 skipped**.
62 migrations, all applied to the local dev DB. devlab (`cmre80gn50004mb3log7ad2vg`) verified
intact: 25 papers, 11 discovery nodes, 25 quiz sessions, 25 proficiencies, 12 vocab cards.

---

## NEXT TASK — REFACTOR2 §0.7, the remaining 43 file dispositions

§0.7 lists **44 authored files over 300 lines with a manual verdict each**. Until v0.53.0 **not
one structural verdict had been acted on** — the correctness findings *inside* those files were
closed by the P1 batches, but every file was still at or above its audited size and nothing in
§0.11 had ever claimed otherwise. v0.53.0 did the first (`DiscoveryTree.tsx`). 43 remain.

### The method — this is the part that matters

§0.7's own rule: *"Line count is a diagnostic, not a refactoring goal. Split files when they
combine owners or state machines; keep cohesive algorithms and acceptance suites intact."* And:
*"A 500-line state machine with one owner is preferable to several short files that duplicate
authority, cost, or transaction behavior."*

So:

1. **Measure the named defect against the CURRENT code before writing a word about it.** The
   audit is from 2026-07-23 and some of its readings are wrong. `DiscoveryTree`'s "cycle-unsafe
   recursive layout" was wrong — a node has one `parentId`, so a cycle is never reachable from a
   root and the recursion never entered one. Running the original found the *actual* defects
   (silent node loss, a `RangeError` on a deep chain, quadratic width recomputation), which were
   worse and different. **Reproduce it, then describe what you reproduced.**
2. **Fix the defect first; split only where the split has an owner reason.** Extracting
   `computeLayout` earned itself because a DOM-free graph algorithm was living where only a
   browser test could reach it — that is *why* the defects survived. Length alone is not a reason.
3. **Say so when a verdict isn't worth acting on.** Several were vehicles for fixes that have
   since landed elsewhere; record that in §0.11 rather than doing cosmetic surgery.
4. **Negative-control every guard.** Disable it, watch the test fail, restore. Every batch this
   session did this and it caught a wrong claim twice.
5. **UI surface in the same batch** (house rule) and **record what the fix still owes**.

### Triage — work top-down

**A. Verdicts naming a LIVE defect.** Ordered by what the defect costs a user.

| File | Lines | The defect the verdict names |
| --- | ---: | --- |
| `components/ops/ExpertisePanel.tsx` | 574 | Progress saving is fire-and-forget and **"save and exit" does not await it** — a student can lose exam progress on a graded surface. Timer/fetch cancellation incomplete. **Start here.** |
| `lib/discovery/openalex.ts` | 577 | Provider JSON is asserted rather than parsed; **`cited_by_api_url` is fetched with no host enforcement**; bodies uncapped. The SSRF-shaped one. |
| `stores/discoveryStore.ts` | 605 | Fire-and-forget writes and `newTreePending` can lose state; `addSourceNode`/`addArticleNode` duplicate a large insert path; deletion is O(n²). |
| `components/teacher/TeacherRubricScoring.tsx` | 423 | Track switching discards unsaved state; blur/click autosaves race; blank numeric input becomes zero. |
| `components/ops/CodexTab.tsx` | 487 | Refresh ignores non-OK responses; a track load error leaves an endless loader; rapid navigation can commit a stale track. |
| `components/literature/LiteratureFeature.tsx` | 409 | Boolean views can overlap; the team-phase fetch ignores status and **can hide advancement forever**. |
| `components/discovery/SourceReader.tsx` | 344 | Blur/button saves can duplicate or land after the selection changed. |
| `lib/teacher/student-overview.ts` | 347 | ~18 queries per detail request; the selected team can be paired with a *different* membership's role/join time. |
| `lib/hooks/usePlotBuildings.ts` | 346 | No abort/resync; refresh errors swallowed; duplicated optimistic economy prediction. |
| `components/lab/LabScene.tsx` | 379 | Six booleans permit overlapping off-path panels. |
| `lib/fairs/zip.ts` | 501 | Runtime geocoding has no deployment-wide 1 req/s queue or cache, and no runtime response schema/cap. |
| `lib/discovery/articles.ts` | 390 | Feed URLs and provider bodies need canonical host/content-type/byte validation. |
| `components/ops/data-terminal/ExperimentDetail.tsx` | 420 | Load errors offer no retry; duplicate `(x, series)` points overwrite visually while the table keeps them — the chart can misrepresent data. |
| `components/teacher/TeacherRoster.tsx` | 518 | Approval updates counts but can leave the roster stale; clipboard failure unhandled; responses unbounded. |
| `lib/ops/codex/scripts/merge-codex-segments.mjs` | 651 | Hand-maintained schema mirrors can drift; sequential writes can leave a half-merged tree. *(Partly answered by P1-R15's atomic install — verify before working.)* |
| `components/lab/LabPlot.tsx` | 337 | Pointer-centric placement is not accessible; forced browser clicks in the specs mask it. |
| `components/research-plan/IdeaCheckView.tsx` | 317 | Model/provider URLs go straight to `href`; enforce `http/https` server-side and at render. |
| `components/discovery/DiscoveryFeature.tsx` | 501 | Too many hooks/modes; unawaited destructive calls. |
| `components/settings/LabProfileSettings.tsx` | 571 | Four fetches, silent research-plan load failure; profile/lab/plan have separate authority. |
| `components/fair/ScienceFairFeature.tsx` | 548 | Presentation split; delete stale "800 sequential query" patch-history comments. |
| `app/(onboarding)/onboarding/page.tsx` | 329 | Duplicate school/name fields. Open teacher self-registration is an ACCEPTED choice — do not convert it into a blocker. |
| `components/literature/QuizPanel.tsx` | 311 | Initial/retry forms duplicate markup; score/pass rules duplicate domain constants. |

**B. Already answered another way** — the split was a vehicle for a fix that has landed, so what
remains is cosmetic. **Verify, then record as such in §0.11 rather than doing the surgery.**
`lib/discovery/tree-service.ts` (P1-R10), `lib/uploads/assets.ts` (P1-R12), `lib/fairs/match.ts`
(P1-R16), `lib/fairs/forms.ts` + `components/fair/FormsChecklist.tsx` (P0-R4),
`lib/literature/synthesis.ts` + `components/literature/SynthesisMatrixEditor.tsx` (P1-R13),
`lib/ops/codex/complete-service.ts`, `app/(public)/showcase/[slug]/page.tsx` (P0-R3/P1-R7),
`lib/literature/quiz-retry.ts` (claims done; SVC-1 persistence clone still open).

**C. Explicit "Keep" in the audit — do not touch for length.** `lib/literature/vocab.ts`,
`lib/buildings/service.ts`, `lib/fairs/rubric-anchors.ts`, `lib/ops/codex/engine.ts`,
`components/showcase/ShowcaseEditor.tsx`, `components/literature/SynthesisPanel.tsx`,
`lib/sprites/manifest.ts`, `components/discovery/DiscoveryHome.tsx`,
`components/literature/VocabPanel.tsx` (mostly keep — extract repeated views only).

**D. Deliberately deprioritised.** `app/globals.css` (3,051) and `prisma/schema.prisma` (2,282).
Real cleanups, real risk, **no behaviour attached**. Least valuable on the list until something
breaks. `schema.prisma` in particular: the audit's advice is "add missing tenant/relational
invariants and migrate away vestigial fields; do not split merely for length."

**E. Development-only art generators (73 files, ~46,500 lines).** §0.7 classifies these as
explicitly optional and outside production priorities. Leave them.

Also in §0.7 and not yet done: **five dead imports/parameters** (`fill-papers` request,
advance-phase `Phase`, `PhaseAdvance` `LAB_TYPE_LABELS`, `ShopPanel`/`SettingsPanel` `useEffect`)
plus unused E2E fixtures — clean them and enable `noUnusedLocals` for production files. And
`ApiError` names two different concepts in `lib/api/client.ts` and `lib/api/with-route.ts`.

---

## ALREADY CLOSED — do not redo

**v0.34.0–v0.42.0:** all three P0s (R2, R3, R4). P1-R2, R4 (limiter half), R7, R10, R11, R12, S1,
S2, S3, S4, S6, S7, S8, S10, S11, S12. P2-S5. P1-R3's replay half. P1-R16's forms half.

- **v0.43.0** — P1-S5 (fenced paper-processing lease); P1-S9 (versioned paid writebacks).
- **v0.43.1** — P1-S14. The "audit other uniqueness-only migrations" clause found the defect
  **four** times. Recurrence guard + `verify:migration-preflights` against real Postgres.
- **v0.44.0** — P1-R16 fairs half: edition digest, `Fair.retiredAt`, provenance-respecting dates.
- **v0.45.0** — P1-R3 budget half **part 1 only**: model registry, `lib/ai/spend.ts` as the one
  door, kill switch, `AiUsage` accounting. **No enforcement** — a test pins that shut.
- **v0.46.0** — P1-R5: claim-before-work, email outbox, bounded cron, activity split.
- **v0.47.0** — P1-R15 + P1-S15.
- **v0.48.0 / v0.48.1** — P1-R8 **team half** + its `TeamPanel` UI. P1-R1 **ACCEPTED as-is**.
- **v0.49.0** — P1-R9 **mechanism half**: `DataRequest`/`DataRequestStep`, one inventory for
  export and erasure, `users` tombstoned (team-shared work holds required FKs), `retention_policies`
  ships EMPTY. Numbers + drill open.
- **v0.50.0** — P1-R13: serialized saves, flush barrier, echoed `inputHash` (409 before spend),
  commit-time re-hash, `runAiOperation`.
- **v0.51.0** — the **E2E audit + rebuild**. `preflight`, `reset:e2e`, `e2e/lab.ts`, static
  assertions moved to vitest. Read `docs/runbooks/e2e.md`.
- **v0.52.0** — P1-R8 **class half** + UI; `F4`/`F4-print` migrated to `createLab`, which
  surfaced four more dead assertions.
- **v0.53.0** — opened the §0.7 tranche: `DiscoveryTree.tsx`.

## DECISIONS ALREADY MADE BY THE OWNER — do not re-ask

1. **Membership: one team at a time.** Implemented.
2. **Last member leaves → archive the team** (read-only, teacher still sees it). Implemented.
3. **ANY MEMBER may destroy shared team work — keep today's behaviour.** Recorded in §0.3 as an
   accepted risk. Do not add a lead gate to `DELETE /api/discovery/tree` or `POST /api/discovery/topic`.
4. **Retention (P1-R9): build the mechanism, leave the numbers blank.** Done in v0.49.0.

## E2E — read `docs/runbooks/e2e.md` BEFORE touching the suite

- **Nothing else may serve port 3000.** Playwright reuses it; a server without the stub flags
  makes REAL paid Anthropic calls. `preflight` fails fast now, but don't create the situation.
- **Start clean:** `pnpm --filter web reset:e2e && pnpm --filter web seed:e2e`. The seeder never
  deletes; the lab had accumulated 2,119 rows.
- New specs use `createLab()` from `e2e/lab.ts`. Worked examples: `synthesis-matrix`, `F4`,
  `F4-print`, and the `a11y` discovery-tree case.
- **The anonymous-viewer trap** (cost three wrong turns): `browser.newContext()` is NOT signed out
  against a Clerk dev instance — the handshake restores the leader's session. `clerk.signOut()` on
  it revokes the SHARED session and breaks the rest of the file. `playwrightRequest.newContext()`
  needs an explicit `storageState: undefined`.
- **A skipping test proves nothing.** Seed what a test needs instead of `test.skip` on a missing
  precondition — that false-skip pattern is what the audit found.

## REMAINING (non-§0.7)

| Item | Why it's not done |
| --- | --- |
| **Activity durability** | 11 durable-class events still write outside a transaction. `test/activity-durability.test.ts` asserts that list EXACTLY so it can only shrink on purpose. **The largest unblocked non-§0.7 item.** |
| **Migrate remaining specs to `createLab`** | 4 of 32 done. Each migration deletes a `beforeAll` of `deleteMany` calls and removes one reason for `mode: 'serial'`. |
| **P1-R3 enforcement / model downgrades** | Blocked on a week of real `ai_usage` rows. `docs/TODO.md` → "AI cost review". |
| **P1-R9 policy half** | Nine retention windows need qualified FERPA/COPPA input; the endorsed `showcase_view` 90 is unconfirmed. Plus the production-like drill and an approval surface recording WHO approved. |
| **E2E test bucket** | P1-S15's physical reclaim blocked: R2 `nova-lab-assets` is shared with production. |
| **P1-R6, P1-S13, P1-R14** | Need repo/CI access. You can WRITE the workflow files; the owner applies branch protection and secrets. **P1-S13 is partly closed** (the seeder materializes users from Clerk; preflight asserts a DB fingerprint) — what remains is exporting `DATABASE_URL` for `prisma migrate deploy`, de-duplicating the env file, and making missing secrets FAIL instead of pass. |
| **P1-R8 leftovers** | Teacher-initiated lead reassignment; a removal notification; a reader for `ClassMembershipEvent`. |
| **Synthesis 409 copy** | Tells the student their grid changed but not *what* changed. |

## CONVENTIONS — follow them, don't invent new ones

- **Claim BEFORE the paid call**, conditional-stamp column with a TTL, released on failure.
- **Terminal writes are compare-and-set**, never an unconditional `update`. Monotonic: never lower
  a pass or a best score.
- **Fenced claims**: a token rewritten on every claim; roll the transaction back when it matches
  nothing.
- **Domain delete + ledger transition commit in ONE transaction.**
- **Provider output gets `safeParse`, never a cast.** Exact cardinality where the contract implies.
- **Digests/keys are JSON-framed**, never delimiter-concatenated.
- **Any migration adding a unique index MUST dedupe or quarantine first** — quarantine whenever the
  row is or parents student work. Enforced by test.
- **Tests pin the ATTACK, not the shape**: real foreign IDs, interleave the stale snapshot, assert
  nothing was written. Fix tests that pin a bypass rather than prevent it.
- **A guard that can match zero must fail.** `test/ai-route-cost-shape.test.ts` carries both a
  completeness and a vacuity check for exactly this reason — three E2E assertions had been
  matching nothing for five versions.
- **Batch per page, not per row**, in cron loops.
- **If a change has a user-facing surface, build the UI in the same batch.**
- **Source-reading assertions belong in vitest, never in a browser spec.** They gate nothing in a
  nightly suite and rot silently.

## OPERATIONS

- Use **ponytail** for all fixes.
- Gates from repo root, in order: `shared-types build`, `check:integrity`, `typecheck`, `lint`,
  `build`. Run Vitest every iteration.
- Migrations: `set -a && source .env.local && set +a && npx prisma migrate deploy` from
  `apps/web`. Never `migrate dev`, never `migrate diff` with `shadow=DIRECT_URL`. Applying to the
  local dev DB is pre-authorised.
- **Never run `next build` while a dev server is live**, and never run `migrate deploy`
  concurrently with vitest — both produced spurious failures.
- After ANY migration with a data statement, verify devlab survived (counts above).
- A full DB backup + per-table row manifest is in `backups/` (gitignored). Re-take before
  destructive DB work.
- **R2 bucket `nova-lab-assets` is SHARED with production.** Never delete objects without proving
  the ledger rows are scoped to a local-only team.
- Commit + push to `Rig-features` after each finding. **Never open a PR or merge to main without
  asking.** No AI co-author trailer.
- Update `docs/CHANGELOG.md`, `REFACTOR2.MD` §0.11 (**and the §0.7 row itself** — mark the
  disposition DONE inline, as `DiscoveryTree` now is), `docs/SECURITY.md`, `docs/ARCHITECTURE.md`,
  `docs/SPEC.md`, and `docs/TODO.md` as part of each batch, not afterwards.
- **Record what each fix STILL OWES** rather than marking things closed that aren't. That honesty
  is the point of the §0.11 table — and correct the register when you prove it wrong.
