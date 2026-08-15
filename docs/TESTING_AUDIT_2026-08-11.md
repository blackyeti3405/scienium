# Testing audit — 2026-08-11

## Verdict

The repository had a strong test base, but it was not yet safe to describe the
unit coverage as comprehensive. The main gaps were not spread evenly across the
app: recently added progression and PvP helpers, three extracted application
services, and two paid-model output boundaries had route or browser coverage but
little or no direct executable coverage of their internal failure paths.

Those material gaps are now covered. The unit/integration suite passes 3,065
tests across 207 files. Authored `lib/**` coverage is:

| Metric | Before | After | Enforced CI floor |
| --- | ---: | ---: | ---: |
| Statements | 73.65% | 77.92% | 77% |
| Branches | 64.42% | 69.75% | 69% |
| Functions | 73.61% | 77.98% | 77% |
| Lines | 75.41% | 79.67% | 79% |

The floor includes authored library modules even when no test imports them. A
new untested service therefore lowers coverage instead of disappearing from the
report. It is a regression floor, not a target and not a claim that 79% line
coverage proves correctness.

## Audit method and scope

- Inventoried the current 916 TypeScript, TSX, and MJS source/test files under
  `apps/web` and `packages/shared-types`.
- Reused the repository's documented full-file and test-truth audit through
  commit `d761ef42` (v0.75.10), then reviewed the complete committed delta since
  that point: 333 TypeScript/JavaScript files, including 95 test files.
- Ran the existing suite before changing tests: 195 files and 2,958 tests passed.
- Measured every authored `lib/**` module with V8 coverage, rather than measuring
  only modules imported by tests.
- Rechecked the global route/auth policy harnesses over all 116 API handlers,
  the 38 Playwright specifications, generated-content integrity checks, schema
  drift checks, and the real-Postgres invariant lane's CI behavior.
- Classified generated Codex tracks, generated sprite registries, static legal
  data, thin route/page adapters, and browser-only React behavior separately.
  They are not misrepresented as directly unit-tested logic.
- Preserved all pre-existing working-tree edits, including the in-progress
  gateway/layout work. The final compile, unit suite, and production build still
  exercised the working tree as a whole.

## Direct coverage added

### Progression and classroom scope

- `lib/team/class-scope.ts`: distinct member-derived class sets, missing teams,
  enrolled/unenrolled pacing.
- `lib/team/progression.ts`: no paid work after discovery, provider failure,
  transaction ordering, atomic plot transfer, teacher-paced versus self-paced
  topic locks, and lost phase races.
- `lib/team/advance.ts`: team-scoped readiness counts, every-member proficiency,
  empty-team behavior, phase compare-and-set, phase clock, one-time 25-source
  bonus, member-scaled payout, and concurrent claim loser.

### PvP

- `lib/pvp/matchmaking.ts`: member-derived class filters, class intersection,
  empty-scope fail-closed behavior, phase/base/exclusion query shape, and random
  selection.
- `lib/pvp/spell-power.ts`: all tier boundaries, shared client/server table
  agreement, UTC-day lookup, atomic increment, and missing-row behavior.
- `lib/pvp/spell-catalog.ts`: one spell per shop building, unique keys, lookup,
  behavior/shape/icon agreement, positive balance values, per-lab type coverage,
  and signature tiers.

### Persistence, privacy, and paid boundaries

- `lib/data-requests/inventory.ts`: every export and erasure model/column executes
  in the declared order, returns its real result count, and fails loudly on an
  unknown delegate.
- `lib/logs/project-log-service.ts`: pagination, stable numbering, first-page
  roster behavior, forged attendees, cross-team/expired attachments, trimming,
  key deduplication, atomic attachment binding, rollback, activity, and Lab
  Credit award.
- `lib/literature/vocab-curate.ts`: zero-candidate no-spend path, deterministic
  E2E seam, candidate allowlist, authored-definition preservation, deduplication,
  maximum deck size, malformed/truncated output, redacted logging, prompt cap,
  and provider failure.
- `lib/ops/codex/study-plan.ts`: no-content and E2E no-spend paths, provider
  fallback, track/branch allowlists, malformed/truncated output, redacted logging,
  untrusted-context caps, and one-call behavior.
- `lib/clearance/context.ts`: team scoping, query caps, plan/log truncation,
  markdown cleanup, empty state, readiness, and prompt rendering.
- `lib/activity/log.ts`: best-effort write/failure behavior and every current
  activity-description branch.

## What remains intentionally outside the unit-coverage denominator

- React components and browser hooks are primarily owned by Playwright. The
  project deliberately has no jsdom/React Testing Library layer; adding one only
  to inflate line coverage would duplicate weaker versions of the real-browser
  tests. Extract non-trivial new component logic into a pure helper and unit-test
  that helper.
- Generated Codex data, generated track wrappers, generated sprite registries,
  and field chart catalogs are owned by integrity, checksum, schema, and build
  tests. Scientific prose still requires qualified human/content review; a unit
  suite cannot validate its factual correctness.
- SDK/bootstrap wrappers (`anthropic.ts`, `storage.ts`) and DOM download/canvas
  code are exercised through route or browser tests. Their third-party behavior
  needs integration/E2E evidence, not mocks that merely restate an SDK call.
- Filesystem rubric loaders are thin validated/cached adapters. The review and
  expertise services test the behavior that consumes their text.

## Verification

- Shared-types build: passed.
- Text and generated-Codex integrity: passed.
- Typecheck: passed.
- Lint: passed with no warnings/errors.
- Unit/integration coverage suite: 207 files, 3,065 tests passed; all new floors
  passed.
- Production Next.js build: passed. The existing `unpdf` import-meta warning and
  absent Sentry upload token warnings remain non-fatal and unchanged.
- Credential presence was confirmed for E2E, but the local E2E database at
  `localhost:5433` was not running, so the 38-spec Playwright gate could not be
  executed in this audit. CI should remain the authoritative E2E gate, and
  branch protection must require it before production merges.

## Rule for future changes

Run `pnpm --filter web test:coverage` for every PR. Any new domain/service logic
must add behavior, boundary, error, authorization/scope, and concurrency tests as
applicable. Raising the floor is encouraged; lowering it should require a written
review explaining which code moved to a different executable owner.
