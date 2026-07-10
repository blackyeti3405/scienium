# Repo Refactor Implementation Plan

This document converts the architecture audit into an implementation brief for a
coding agent. The goal is to clean up the repo without changing product
behavior: the same screens, APIs, and game rules should continue to work, but
the underlying architecture should become more robust, scalable, reusable, and
safe against cross-team data leaks.

## Operating Rules

- Work in small, reviewable phases. Do not combine schema changes, route
  rewrites, UI reshaping, and cleanup in one giant patch.
- Preserve existing behavior unless this document explicitly calls out a race,
  stale response, or data-integrity bug to fix.
- Every query and mutation must stay scoped to the authenticated user and active
  team. This is the main security requirement for the current pilot stage.
- Prefer additive migrations first. Backfill and verify data before removing
  fallbacks, nullable columns, or legacy reads.
- Use Prisma migrations for schema changes. Use raw SQL inside a migration only
  when Prisma cannot express the required PostgreSQL behavior, such as partial
  unique indexes.
- Keep LLM calls rate-limited and avoid adding extra Anthropic calls.
- Do not introduce localStorage or in-memory durability for state that should
  survive reloads.
- Run the repo gates from the root before handing off code:
  `pnpm --filter @scienium/shared-types build`,
  `pnpm --filter web typecheck`,
  `pnpm --filter web lint`,
  `pnpm --filter web build`,
  and targeted or full Playwright E2E when the changed workflow is user-facing.

## Production-Readiness Audit Lenses

Use these lenses before and after each refactor phase. The adversarial question
for every lens is: "what breaks when this is used by a real classroom, on a real
network, with real student data, under real failure?"

### 1. Latency And Perceived Responsiveness

- Audit every click path that should feel instant: building pickup/drop,
  upgrades, tab opening, quiz submit, chat send, file upload, teacher roster
  filters, and showcase edits.
- Verify the client renders optimistic or immediate local state before waiting
  for backend verification only when rollback is safe and obvious.
- Move expensive verification, external API calls, and LLM calls off the
  interaction-critical path where product semantics allow it.
- Cap payload size for list endpoints. Lists should not include PDF text, full
  chat history, large JSON blobs, or object-storage bytes.
- Instrument or log slow route timing before guessing. Track database time,
  external API time, LLM time, and serialization time separately.

Adversarial audit:

- Throttle the browser to slow 4G and confirm the lab scene still responds to
  pointer actions immediately.
- Double-click purchase, move, upgrade, grade, and submit actions. The UI should
  not duplicate work or wait on stale state.
- Seed large teams with many papers/logs/messages and verify common list views
  stay bounded.
- Simulate Anthropic/OpenAlex/NCBI/Firecrawl slowness and confirm the rest of
  the app remains usable.

### 2. Correctness Under Concurrency

- Every economy mutation must be transactional and idempotent.
- Any operation that says "only once" needs a unique constraint, an idempotency
  ledger, or a conditional update whose result drives the response.
- Reads used to validate a later write must either happen in the same
  transaction with an appropriate lock, or be backed by a database constraint.
- Server responses must describe the committed state, not the optimistic
  pre-write prediction.

Adversarial audit:

- Fire the same route from two tabs with the same payload.
- Submit a stale form after another tab changed the record.
- Race building moves into the same cell.
- Race Proof of Expertise grading and paper quiz grading.
- Race duplicate PDF uploads with the same content hash.

### 3. Data Ownership, Privacy, And Tenancy

- Every query must be scoped by the authenticated user, active team membership,
  teacher-owned class, or public showcase policy.
- Never trust `activeTeamId`, route ids, team ids, class ids, asset URLs, or
  client-supplied roles unless the server re-proves ownership.
- Treat student names, emails, project work, papers, attachments, chat, and
  grades as sensitive classroom data.
- Keep public showcase reads on a separate policy path from authenticated team
  reads.

Adversarial audit:

- Swap every route `[id]` for another team's id and confirm the result is 404 or
  403.
- Downgrade a teacher in the DB while their session still has old claims.
- Set a user's `activeTeamId` to a team they do not belong to.
- Try to attach another team's uploaded asset URL to a project log or showcase.

### 4. Security And Abuse Resistance

- Keep the current security scope focused: auth, team/class scoping,
  rate-limits, file validation, prompt-injection boundaries, and cost caps.
- LLM routes need both rate limits and product-level daily caps where a single
  user could spend money.
- Upload routes must validate bytes, type, size, ownership, and storage keys on
  the server.
- Cron routes must require `CRON_SECRET` and must do bounded work.

Adversarial audit:

- Brute-force invite codes and class join codes.
- Upload disguised files, huge files, malformed PDFs/images, and SVG payloads.
- Put prompt-injection text inside papers, logs, project plans, and chat.
- Spoof `x-forwarded-for` and confirm the trusted-IP strategy is understood for
  the deployed edge.

### 5. Scalability And Bounded Work

- Every list endpoint must paginate, limit, or explicitly cap its results.
- Every dashboard query should have a matching index.
- Cron and background jobs must process in batches and be resumable.
- Avoid fetching all teams, all messages, all logs, all papers, or all full-text
  content in one request.
- Supabase runtime queries should use the pooled `DATABASE_URL`; migrations use
  `DIRECT_URL`.

Adversarial audit:

- Seed 10x expected pilot data and inspect query plans for dashboards,
  notifications, paper lists, logs, and chat.
- Force a cron timeout halfway through and verify the next run resumes without
  duplicate side effects.
- Run with multiple server instances and confirm rate limits use Upstash Redis
  when configured.

### 6. External Dependency Failure

- OpenAlex, NCBI, arXiv, Firecrawl, Anthropic, Clerk, Supabase, R2, Upstash, and
  Resend can each be slow, down, misconfigured, or rate-limited.
- Each integration needs a local timeout, clear error shape, and a retry or
  fallback policy appropriate to its cost.
- User-visible state should distinguish pending, retryable failure, and terminal
  failure.

Adversarial audit:

- Remove each optional key and confirm unrelated routes still import and build.
- Return 429/500/timeouts from each external API and inspect user-facing errors.
- Confirm Upstash failure fails open for rate limiting but is logged.
- Confirm Supabase connection pool exhaustion produces actionable diagnostics,
  not random UI corruption.

### 7. Observability And Operability

- Production needs enough telemetry to answer: what route is slow, what failed,
  what cost money, what job retried, and what user/team was affected.
- Logs must not include secrets, full student work, raw PDFs, or unnecessary PII.
- Every background job should expose counts for claimed, completed, failed, and
  retried work.
- Add explicit runbooks for restore, migration rollback, incident response, and
  deleting a student's data.

Adversarial audit:

- Debug a failed paper processing job using only logs and database rows.
- Debug a user report of missing KP without reproducing locally.
- Restore a database backup into a non-production environment and verify the
  documented steps still work.

### 8. Data Lifecycle And Compliance

- Uploaded objects need a durable row, an owner, a purpose, an attachment state,
  and a cleanup policy.
- Student data needs a retention and deletion path before real classroom launch.
- Public showcase publication needs moderation state and a clear privacy model.
- AI and external API data sharing must be documented for school approval.

Adversarial audit:

- Abandon an upload form and verify the file can be cleaned later.
- Delete a team or student and list every table/object that must be removed or
  retained.
- Publish, unpublish, and reject a showcase while unauthenticated and
  cross-school users try to view it.

### 9. Developer Experience And Maintainability

- Feature code should be organized by domain, not by whatever file was nearby
  during implementation.
- Route handlers should parse input, resolve context, call domain logic, and
  return typed responses. Business rules belong in domain modules.
- Shared types and schemas should be reused when a route and component must
  agree on shape.
- Tests should live near pure logic and cover route-level invariants for
  ownership, idempotency, and failure states.

Adversarial audit:

- Ask where a new feature should go. If the answer is not obvious from
  `docs/ARCHITECTURE.md`, the architecture is under-documented or poorly
  factored.
- Change one business rule and count how many route/component files need edits.
- Remove a feature's UI and confirm its server rules are still testable.

## Phase File Operations Matrix

This matrix is the concrete coding-agent worklist. Treat "create" as additive
until data is backfilled and verified. Treat "delete" as a later cleanup step
unless the phase explicitly says the file/column is unused and safe to remove in
the same PR.

### Phase 1: Ownership And Classroom Invariants

Edit:

- `apps/web/lib/api/route-context.ts`
- `apps/web/lib/teacher/auth.ts`
- `apps/web/app/(dashboard)/lab/page.tsx`
- Teacher student/roster routes that choose a student's `activeTeam` before
  verifying membership and classroom ownership
- `apps/web/prisma/schema.prisma`
- Route handlers that still perform custom user/team lookup instead of
  `requireTeamContext` or `requireTeacher`
- Tests covering team context and teacher access

Create:

- Prisma migration adding missing ownership indexes.
- Backfill/repair script or migration SQL for invalid `activeTeamId` rows and
  missing `Team.classId` values.
- Route-level tests for invalid active team, teacher downgrade, and cross-class
  access.

Delete later:

- The "most recent membership" active-team fallback after bad data is repaired.
- The `teamLead.classId` fallback in teacher ownership checks after
  `Team.classId` is complete.

Required outcome:

- Active team, teacher role, class ownership, and team membership are
  DB-proven before any scoped data is returned.

### Phase 2: Plot Placement Latency And Occupancy

Edit:

- `apps/web/app/api/buildings/route.ts`
- `apps/web/app/api/buildings/place/route.ts`
- `apps/web/app/api/buildings/move/route.ts`
- `apps/web/app/api/buildings/sell/route.ts`
- `apps/web/app/api/buildings/upgrade/route.ts`
- `apps/web/lib/plot.ts`
- `apps/web/lib/plot-server.ts`
- `apps/web/lib/shop-server.ts`
- `apps/web/components/lab/LabPlot.tsx`
- `apps/web/components/lab/ShopPanel.tsx`
- `apps/web/e2e/placement.spec.ts`
- `apps/web/e2e/upgrades.spec.ts`

Create:

- Prisma migration for `TeamPlotPlacement` and `PlotPlacementKind`.
- Add `plotPlacements TeamPlotPlacement[]` to `Team` if using the relation shown
  in the model below.
- Backfill SQL from `TeamShopBuilding.posX/posY` and `TeamGatewayPlacement`.
- Focused concurrency tests for two moves into the same cell.
- Optional shared client helper for optimistic placement rollback if the current
  component code duplicates this logic.

Delete later:

- `TeamShopBuilding.posX`
- `TeamShopBuilding.posY`
- `TeamGatewayPlacement` model/table, if `TeamPlotPlacement` fully replaces it.
- Any plot occupancy helper that merges two placement sources after the new
  table is authoritative.

Required outcome:

- Pickup/drop is optimistic and immediate on the client, while server writes are
  locked/transactional and database uniqueness prevents duplicate cell
  occupancy.

### Phase 3: Expertise Grading Idempotency

Edit:

- `apps/web/app/api/expertise/route.ts`
- `apps/web/app/api/expertise/grade/route.ts`
- `apps/web/components/ops/ExpertisePanel.tsx`
- `apps/web/prisma/schema.prisma`

Create:

- Prisma migration for `ExpertiseExamStatus`, `ExpertiseExam.status`,
  `gradingClaimedAt`, and `gradingRequestId`.
- Optional `ExpertiseAttempt.questionId` backfill if attempts can be tied to
  stable question ids.
- Double-submit tests proving only one clearance raise and one KP award.

Delete later:

- Any client state that assumes `raised` or `kpEarned` before the committed
  server response.
- Any route logic that computes grading success before the conditional DB update.

Required outcome:

- Grading is claim-based, idempotent, and every response is derived from the
  committed transaction.

### Phase 4: Paper Metadata, Heavy Content, And Duplicate Uploads

Edit:

- `apps/web/app/api/papers/route.ts`
- `apps/web/app/api/papers/[id]/route.ts`
- `apps/web/app/api/papers/[id]/file/route.ts`
- `apps/web/app/api/papers/[id]/chat/route.ts`
- `apps/web/app/api/papers/[id]/quiz/route.ts`
- `apps/web/app/api/papers/[id]/quiz/grade/route.ts`
- `apps/web/app/api/papers/[id]/quiz/retry/route.ts`
- `apps/web/lib/literature/process-paper.ts`
- `apps/web/lib/literature/*`
- `apps/web/components/literature/*`
- `apps/web/prisma/schema.prisma`
- `docs/architecture/adr-002-paper-processing.md`

Create:

- Prisma migration for `PaperContent`.
- Add `content PaperContent?` to `Paper` if using the relation shown in the
  model below.
- Prisma migration fields for `Paper.doi`, `Paper.credibilityTier`,
  `Paper.sourceHost`, and optional `Paper.metadataJson`.
- Raw SQL migration for partial unique index on `(team_id, content_hash)` where
  `content_hash is not null`.
- Backfill from `Paper.fullText` into `PaperContent`.
- Tests for duplicate upload, paper list without full text, and legacy read
  fallback.

Delete later:

- `Paper.fullText` after every reader uses `PaperContent`.
- Any list-route DOI/tier parsing from full text.
- Legacy duplicate-upload application-only check once the DB constraint is
  authoritative, except for graceful conflict error handling.

Required outcome:

- Paper lists are metadata-only and fast; full text is loaded only for workflows
  that need it; duplicate uploads are database-prevented.

### Phase 5: Paper Processing Job Semantics

Edit:

- `apps/web/lib/literature/process-paper.ts`
- `apps/web/app/api/cron/papers/route.ts`
- `apps/web/app/api/papers/route.ts`
- Any UI that displays paper `status`
- `apps/web/prisma/schema.prisma`

Create:

- Prisma migration adding `PaperProcessingJob.nextRunAt` and `terminalAt`.
- Tests for retryable failure, terminal failure, stale claim recovery, and batch
  claiming.

Delete later:

- Any code that marks `Paper.status = error` before retry attempts are
  exhausted.
- Any cron scan that claims unbounded work or ignores `nextRunAt`.

Required outcome:

- Processing distinguishes pending/running/retryable/terminal states and never
  presents a temporary failure as a final paper error.

### Phase 6: Server-Owned Chat Turns

Edit:

- `apps/web/app/api/papers/[id]/chat/route.ts`
- `apps/web/app/api/ops/vega-study/route.ts`
- `apps/web/components/literature/PaperChat.tsx`
- `apps/web/components/literature/usePaperChat.ts`
- `apps/web/components/ops/VegaStudyTab.tsx`
- `apps/web/prisma/schema.prisma`

Create:

- Migration adding message `status`, `requestId`, `error`, and
  `tokenUsageJson`, or a shared `ChatThread` / `ChatMessage` model if choosing
  the larger refactor.
- Cursor-pagination tests for chat history.
- Tests proving the client submits one user turn and cannot persist fake
  assistant messages.

Delete later:

- Full client-supplied `messages` arrays in POST payloads.
- Unbounded GET history endpoints.
- Best-effort-only persistence after paid LLM calls.

Required outcome:

- The server owns chat history, pagination, assistant turns, and failed/pending
  state.

### Phase 7: Growth-Path Indexes And Query Bounds

Edit:

- `apps/web/prisma/schema.prisma`
- Route handlers for logs, quizzes, chat, showcase, notifications, experiments,
  discovery tree, invites, and teacher feedback if they need pagination/cursors
  to use the new indexes.
- Tests or fixtures that assume unbounded lists.

Create:

- Prisma migration with the missing indexes listed in Phase 7.
- Raw SQL only for expression/partial indexes Prisma cannot express.
- Query-plan notes or a short migration comment for any non-obvious index.

Delete later:

- Unbounded list reads once a paginated/capped API exists.
- Redundant older indexes only after confirming they are covered by the new
  access paths and not used elsewhere.

Required outcome:

- Common classroom-scale dashboard/list paths are index-backed and bounded.

### Phase 8: Uploaded Asset Lifecycle

Edit:

- Project log attachment upload route.
- Showcase asset upload/save routes.
- `apps/web/app/api/project-log/attachment/route.ts`
- `apps/web/app/api/project-log/attachment/view/route.ts`
- `apps/web/app/api/project-log/route.ts`
- `apps/web/app/api/project-log/[id]/route.ts`
- `apps/web/app/api/showcase/asset/route.ts`
- `apps/web/app/api/showcase/asset/link/route.ts`
- `apps/web/app/api/showcase/asset/[id]/route.ts`
- `apps/web/app/api/showcase/public/asset/route.ts`
- `apps/web/components/ops/OperationsHubFeature.tsx`
- `apps/web/components/showcase/ShowcaseEditor.tsx`
- `apps/web/lib/storage.ts`
- Project log and showcase components that currently submit raw URLs.
- `apps/web/prisma/schema.prisma`

Create:

- `apps/web/lib/uploads/*` domain module for asset creation, attachment, and
  cleanup.
- Prisma migration for `UploadedAsset` and `UploadedAssetStatus`.
- Add relation arrays such as `uploadedAssets UploadedAsset[]` to `Team` and
  `User` if the model keeps explicit `team` and `user` relations.
- Cleanup cron or extension of an existing cron for stale temporary assets.
- Tests for abandoned upload cleanup and cross-team asset attachment rejection.

Delete later:

- Raw URL trust in project log/showcase mutation payloads.
- Direct attachment URL arrays if replaced by normalized asset references.
- Orphaned object cleanup TODOs once the lifecycle is live.

Required outcome:

- Every uploaded object has an owner, purpose, state, and cleanup path.

### Phase 9: Bounded Cron And Background Work

Edit:

- `apps/web/app/api/cron/notifications/route.ts`
- `apps/web/app/api/cron/papers/route.ts`
- `apps/web/lib/notifications/compute.ts`
- `apps/web/vercel.json` only if schedule changes are needed
- `apps/web/prisma/schema.prisma`

Create:

- Either cursor-based cron state or a `CronRun` / `NotificationJob` table.
- Tests for resumable notification batches and idempotent notification creation.
- Logging helpers for claimed/completed/failed counts if no observability SDK is
  added yet.

Delete later:

- `findMany` patterns that load all teams/jobs in a single cron invocation.
- Serial loops that cannot resume after timeout.

Required outcome:

- Scheduled work has bounded batch size, idempotent writes, and a resume story.

### Phase 10: Feature Boundary Cleanup

Edit:

- Route handlers with embedded business rules.
- Domain modules under `apps/web/lib/*`.
- Client hooks/components that duplicate fetch or mutation state.
- Shared response schemas/types where route/component contracts drift.
- `docs/ARCHITECTURE.md` after file organization settles.

Create:

- `apps/web/lib/teacher/*` helpers for report/ownership data if still mixed into
  routes.
- `apps/web/lib/uploads/*` if not already created in Phase 8.
- Additional feature-local `types.ts` or `schema.ts` files only where they
  remove real route/component duplication.
- Unit tests for extracted domain modules.

Delete later:

- Route-local duplicated ownership checks after centralized helpers are adopted.
- Dead compatibility wrappers after all imports move to the new domain modules.
- Empty or one-off utility files that no longer own a coherent concept.

Required outcome:

- Routes are orchestration only; business rules are testable without React or a
  live Next request.

### Phase 11: Documentation And Launch Readiness

Edit:

- `docs/ARCHITECTURE.md`
- `docs/SECURITY.md`
- `docs/CHANGELOG.md`
- `docs/TODO.md`
- `docs/architecture/*.md`
- `.claude/PARALLELISM.md`
- `AGENTS.md` and `CLAUDE.md` only when tool-facing commands or doc paths change

Create:

- ADRs for any final invariant not covered by existing ADRs.
- Runbooks for restore, incident response, production migration, and student
  deletion/export if not placed elsewhere.
- Optional `docs/production-readiness.md` if the security checklist becomes too
  large to carry operational runbooks.

Delete later:

- Stale doc claims about removed files, retired specs, old package versions, or
  unimplemented systems.
- Redundant TODO items once the work ships.

Required outcome:

- A new coding agent can infer the current architecture, production posture,
  file layout, and remaining risks without reading the whole commit history.

## Phase 1: Make Team And Classroom Ownership Authoritative

### Problem

Team access is still too easy to trust accidentally. The active team resolver
uses `User.activeTeamId`, and teacher APIs still contain transitional role and
class ownership fallbacks. These are survivable in a toy app, but brittle in a
classroom pilot.

### Target Files

- `apps/web/lib/api/route-context.ts`
- `apps/web/lib/teacher/auth.ts`
- `apps/web/prisma/schema.prisma`
- `apps/web/app/(dashboard)/lab/page.tsx`
- Teacher student/roster API routes that derive a student team from
  `activeTeam` or membership fallback before ownership checks
- Any route using custom user/team lookup instead of the shared route context

### Required Changes

1. Make `User.activeTeamId` valid only when the user also has a matching
   `TeamMember` row.
2. Update the active-team resolver and server-rendered lab page so they fetch
   the active team through membership, not through a direct `User.activeTeam`
   relation alone.
3. Keep the "last membership" fallback only during the backfill phase. After data
   is clean, remove it or make it an explicit repair path.
4. Make `User.role` the authoritative source for teacher/admin API access in
   `requireTeacher`, `resolveTeacherRole`, teacher layouts, and teacher API
   routes. Clerk claims can bootstrap onboarding, but they must not override a
   DB role downgrade.
5. Backfill `Team.classId` from existing lead/class relationships where needed.
   After backfill, teacher ownership checks should use `Team.classId` and
   `Class.teacherId`; remove the `teamLead.classId` fallback.

### Schema And Migration Work

Add or verify these indexes:

- `User.activeTeamId` already exists; keep it.
- `User.classId`
- `Class.teacherId`
- `Team.classId` already exists; keep it.
- `TeamMember.teamId`
- `TeamInvite(teamId, expiresAt)`

Suggested data checks before removing fallbacks:

```sql
-- Active teams that do not have a membership row for that user.
select u.id, u.active_team_id
from users u
where u.active_team_id is not null
  and not exists (
    select 1
    from team_members tm
    where tm.user_id = u.id
      and tm.team_id = u.active_team_id
  );

-- Teams missing class_id even though the lead has a class.
select t.id, t.team_lead_id, u.class_id
from teams t
join users u on u.id = t.team_lead_id
where t.class_id is null
  and u.class_id is not null;
```

### Acceptance Criteria

- A student cannot access a team by editing `activeTeamId` unless they are a
  member of that team.
- Teacher APIs deny users whose DB role is no longer `teacher` or `admin`, even
  if old Clerk session claims say otherwise.
- Teacher dashboard queries do not rely on lead-user fallback ownership after
  backfill.

## Phase 2: Normalize Plot Placement And Remove Occupancy Races

### Problem

Building and gateway placement is split across `TeamShopBuilding.posX/posY` and
`TeamGatewayPlacement.posX/posY`. Protection against the placement race is
inconsistent across mutations, and the two-table placement model makes it
harder to enforce a single building per cell at the database level.

`apps/web/app/api/buildings/place/route.ts` wraps its write in a transaction
and takes a per-team advisory lock via `lib/db-lock.ts`. `sell/route.ts` and
`upgrade/route.ts` use a transaction but do not take the advisory lock.
`move/route.ts` reads occupancy, then writes with two bare `db.teamGatewayPlacement.upsert` /
`db.teamShopBuilding.update` calls — no transaction and no lock at all. `move`
is the most exposed of the four: two concurrent moves can both pass the
occupancy check and both write, leaving two items on the same cell.

### Target Files

- `apps/web/app/api/buildings/move/route.ts`
- `apps/web/app/api/buildings/place/route.ts`
- `apps/web/app/api/buildings/sell/route.ts`
- `apps/web/app/api/buildings/upgrade/route.ts`
- `apps/web/app/api/buildings/route.ts`
- `apps/web/lib/plot.ts`
- `apps/web/lib/plot-server.ts`
- `apps/web/lib/shop-server.ts`
- `apps/web/lib/db-lock.ts`
- `apps/web/components/lab/LabPlot.tsx`
- `apps/web/components/lab/ShopPanel.tsx`
- `apps/web/prisma/schema.prisma`
- `apps/web/e2e/placement.spec.ts`
- `apps/web/e2e/upgrades.spec.ts`

### Immediate Fix

Wrap every plot mutation that can affect placement or currency in one
transaction and take a per-team advisory lock with `lib/db-lock.ts`. `place`
already does this. `move` has neither a transaction nor a lock and should be
fixed first — it is the only route where two concurrent requests can both
succeed and collide on the same cell. `sell` and `upgrade` already use a
transaction but are still missing the advisory lock; add it there too.

The route should respond from the committed transaction result. Do not compute
success, KP, or placement state before the write has actually won.

### Durable Refactor

Add a single placement table that owns cell occupancy:

```prisma
enum PlotPlacementKind {
  shop_building
  gateway

  @@map("plot_placement_kind")
}

model TeamPlotPlacement {
  id        String            @id @default(cuid())
  teamId    String            @map("team_id")
  kind      PlotPlacementKind
  itemKey   String            @map("item_key")
  posX      Int               @map("pos_x")
  posY      Int               @map("pos_y")
  createdAt DateTime          @default(now()) @map("created_at")
  updatedAt DateTime          @updatedAt @map("updated_at")

  team Team @relation(fields: [teamId], references: [id], onDelete: Cascade)

  @@unique([teamId, kind, itemKey])
  @@unique([teamId, posX, posY])
  @@index([teamId])
  @@map("team_plot_placements")
}
```

Also add `plotPlacements TeamPlotPlacement[]` to `Team` if using this relation
shape; Prisma will reject a one-sided relation field.

Migration sequence:

1. Add `TeamPlotPlacement`.
2. Backfill rows from placed `TeamShopBuilding` records.
3. Backfill rows from `TeamGatewayPlacement`.
4. Update plot reads to prefer `TeamPlotPlacement`, with legacy fallback during
   rollout.
5. Update mutations to write the placement table inside locked transactions.
6. After verification, remove legacy placement columns or leave them as
   denormalized compatibility fields only if there is a clear reason.

### Acceptance Criteria

- Two simultaneous moves cannot place two items in the same cell.
- Moving a building feels instant from the UI, but server reconciliation never
  permits an impossible board state.
- The client can optimistically render pickup/drop, then rollback only on a real
  server rejection.
- Existing placed buildings and gateway positions survive migration.

## Phase 3: Make Expertise Grading Idempotent And Honest

### Problem

`apps/web/app/api/expertise/grade/route.ts` computes the clearance raise and KP
bonus before the transaction. It uses a guarded update but does not derive the
response from the actual update result. Under concurrency, the UI can show a
raise or KP that did not really happen.

### Target Files

- `apps/web/app/api/expertise/grade/route.ts`
- `apps/web/app/api/expertise/route.ts`
- `apps/web/components/ops/ExpertisePanel.tsx`
- `apps/web/prisma/schema.prisma`

### Required Changes

Add explicit grading state:

```prisma
enum ExpertiseExamStatus {
  active
  grading
  graded
  failed

  @@map("expertise_exam_status")
}
```

Extend `ExpertiseExam`:

- `status ExpertiseExamStatus @default(active)`
- `gradingClaimedAt DateTime? @map("grading_claimed_at")`
- `gradingRequestId String? @map("grading_request_id")`
- Index `@@index([teamId, userId, status, createdAt])`

Extend `ExpertiseAttempt` if needed:

- Add stable `questionId String? @map("question_id")`
- Add `@@unique([examId, questionId])` after backfill if every attempt can be
  mapped to a question id.

Route behavior:

1. Claim the exam with a conditional update:
   `where id = examId and teamId = ctx.teamId and userId = ctx.user.id and status = active`.
2. If no row was claimed, return the already-graded result or a conflict.
3. Grade once.
4. In the final transaction, insert attempts idempotently, update exam status,
   and update currency only if `TeamCurrency.clearanceLevel < targetLevel`.
5. Return `raised` and `kpEarned` from the committed update count, not from a
   precomputed guess.

### Acceptance Criteria

- Double-clicking grade cannot award KP twice.
- Two browser tabs grading the same exam cannot produce conflicting success
  messages.
- Failed LLM grading does not leave an exam permanently stuck without an
  explicit retry path or `failed` status.

## Phase 4: Split Paper Metadata From Heavy Content

### Problem

Paper list routes read `fullText` for every paper to derive display metadata.
PDF duplicate protection is application-level only, so concurrent uploads can
create duplicates. `Paper` also mixes list metadata, processing state, extracted
text, PDF storage details, and external citation metadata in one row.

### Target Files

- `apps/web/app/api/papers/route.ts`
- `apps/web/app/api/papers/[id]/route.ts`
- `apps/web/app/api/papers/[id]/file/route.ts`
- `apps/web/app/api/papers/[id]/chat/route.ts`
- `apps/web/app/api/papers/[id]/quiz/route.ts`
- `apps/web/app/api/papers/[id]/quiz/grade/route.ts`
- `apps/web/app/api/papers/[id]/quiz/retry/route.ts`
- `apps/web/lib/literature/process-paper.ts`
- `apps/web/lib/literature/*`
- `apps/web/components/literature/*`
- `apps/web/prisma/schema.prisma`
- `docs/architecture/adr-002-paper-processing.md`

### Required Changes

1. Add persisted list metadata to `Paper`:
   - `doi String? @map("doi")`
   - `credibilityTier CredibilityTier? @map("credibility_tier")`
   - `sourceHost String? @map("source_host")`
   - Optional `metadataJson Json? @map("metadata_json")`
2. Move heavy extracted text into a side table:

```prisma
model PaperContent {
  paperId   String   @id @map("paper_id")
  fullText  String?  @map("full_text")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  paper Paper @relation(fields: [paperId], references: [id], onDelete: Cascade)

  @@map("paper_contents")
}
```

Also add `content PaperContent?` to `Paper` if using this relation shape; Prisma
will reject a one-sided relation field.

3. Keep legacy `Paper.fullText` during migration. Backfill `PaperContent`, update
   reads, then remove the legacy column in a later migration.
4. Add a partial unique index for duplicate uploads:

```sql
create unique index if not exists papers_team_content_hash_unique
on papers(team_id, content_hash)
where content_hash is not null;
```

5. Add indexes:
   - `Paper(teamId, createdAt)`
   - `Paper(teamId, status)`
   - `PaperProcessingJob(status, nextRunAt, claimedAt)` after Phase 5
6. Stop selecting `fullText` in list endpoints. The list should use stored DOI,
   tier, source host, status, citation, and timestamps.

### Acceptance Criteria

- Listing papers does not read extracted full text.
- Concurrent upload of the same PDF for the same team results in one paper row.
- Existing paper chat, quiz, citation, and processing workflows still work.

## Phase 5: Make Paper Processing Jobs Truly Retryable

### Problem

`apps/web/lib/literature/process-paper.ts` can mark `Paper.status = error` on
the first failed processing attempt while the job itself remains retryable. That
creates misleading UI and awkward recovery.

### Target Files

- `apps/web/lib/literature/process-paper.ts`
- `apps/web/app/api/cron/papers/route.ts`
- `apps/web/app/api/papers/route.ts`
- `apps/web/prisma/schema.prisma`

### Required Changes

Extend `PaperProcessingJob`:

- `nextRunAt DateTime? @map("next_run_at")`
- `terminalAt DateTime? @map("terminal_at")`
- Keep `lastError`
- Change index from `@@index([status, claimedAt])` to
  `@@index([status, nextRunAt, claimedAt])`

Processing behavior:

- Keep `Paper.status = processing` while a retryable job is pending or running.
- Only mark `Paper.status = error` when retry attempts are exhausted.
- Use `nextRunAt` for retry backoff instead of repeatedly claiming immediately.
- Make job claiming conditional and batched.

### Acceptance Criteria

- A transient processing error does not show as a terminal paper failure.
- Retryable jobs are visible as processing, not error.
- The cron can process batches without double-claiming the same job.

## Phase 6: Refactor Chat Persistence Around Server-Owned Turns

### Problem

Paper chat and Vega study chat accept full client-supplied message arrays. That
makes histories unbounded, lets the client send assistant messages as context,
and persists after the paid LLM call as best effort.

### Target Files

- `apps/web/app/api/papers/[id]/chat/route.ts`
- `apps/web/app/api/ops/vega-study/route.ts`
- `apps/web/components/literature/PaperChat.tsx`
- `apps/web/components/literature/usePaperChat.ts`
- `apps/web/components/ops/VegaStudyTab.tsx`
- `apps/web/prisma/schema.prisma`

### Required Changes

Incremental option:

- Add `status`, `requestId`, `error`, and `tokenUsageJson` fields to
  `PaperChatMessage` and `VegaStudyMessage`.
- Add `@@index([paperId, userId, createdAt])` to `PaperChatMessage`.
- Keep `@@index([teamId, createdAt])` on `VegaStudyMessage`.

Better long-term option:

- Introduce a reusable `ChatThread` and `ChatMessage` model with a typed scope
  such as `paper` or `vega_study`.
- Keep current tables as compatibility views or migrate them into the shared
  model in one controlled pass.

Route behavior:

1. Client submits one new user message, not the entire history.
2. Server loads bounded history by cursor or latest N messages.
3. Server persists the user message before the Anthropic call with
   `status = pending`.
4. Server persists the assistant reply after the Anthropic call.
5. Failures update the pending message or append an error state, so paid calls
   and visible history do not silently diverge.

### Acceptance Criteria

- Client cannot inject fake assistant turns into persisted context.
- Chat history endpoints paginate or cap results.
- Failed LLM calls leave a durable status that the UI can display or retry.

## Phase 7: Add Missing Indexes For Growth Paths

### Problem

Several tables are currently fine for a small pilot but will degrade as teams
create logs, quiz attempts, chat messages, measurements, notifications, and
showcase views.

### Schema Index Checklist

Add these unless a current migration already added an equivalent index:

- `ProjectLog(teamId, entryType, createdAt)`
- `ProjectLog(createdByUserId, createdAt)` if user activity views query this
- `PaperQuizSession(paperId, userId, createdAt)`
- `PaperQuizAttempt(sessionId)`
- `PaperQuizAttempt(paperId, userId, createdAt)`
- `PaperChatMessage(paperId, userId, createdAt)`
- `ShowcaseAsset(showcaseId, assetType)`
- `ShowcaseView(showcaseId, viewedAt)`
- Optional dedupe for views if product wants it:
  `(showcaseId, visitorFingerprint, viewedAt::date)` via raw SQL or a stored
  `viewedDay` date column.
- `TeacherFeedback(teamId, resolved, createdAt)`
- `Notification(teamId, readAt, createdAt)`
- `Notification(userId, readAt, createdAt)`
- `Experiment(teamId, createdAt)`
- `Measurement(experimentId, recordedAt)`
- `DiscoveryNode(teamId, visitedAt)`
- `DiscoveryNode(teamId, parentId)`
- `TeamMember(teamId)`
- `TeamInvite(teamId, expiresAt)`

### Acceptance Criteria

- Teacher dashboard and team dashboards do not require broad table scans on
  common list views.
- Indexes match actual route access patterns; do not add unused indexes blindly
  if the route does not query that shape.

## Phase 8: Introduce Durable Uploaded Asset Lifecycle

### Problem

Project log attachment uploads (`apps/web/app/api/project-log/attachment/route.ts`)
upload straight to R2 and return a bare URL with no DB row at all; the object is
only referenced once the client later submits the log entry with
`attachmentUrls`. If the form is abandoned, nothing tracks or cleans up the
orphaned object.

Showcase asset uploads (`apps/web/app/api/showcase/asset/route.ts`) are not
orphan-prone the same way: the route creates a `ShowcaseAsset` row in the same
request as the R2 upload and replaces any prior asset of that kind, so the
asset is durable from the moment of upload. (The old object's deletion is
still fire-and-forget best effort, so a failed delete can leak a stale object,
but this is a narrower cleanup gap than the project-log case.) Folding both
flows into one `UploadedAsset` model is still worthwhile for consistency, but
the urgent gap is project-log attachments specifically.

### Target Files

- Project log attachment upload route
- Showcase asset upload route
- `apps/web/app/api/project-log/attachment/route.ts`
- `apps/web/app/api/project-log/attachment/view/route.ts`
- `apps/web/app/api/project-log/route.ts`
- `apps/web/app/api/project-log/[id]/route.ts`
- `apps/web/app/api/showcase/asset/route.ts`
- `apps/web/app/api/showcase/asset/link/route.ts`
- `apps/web/app/api/showcase/asset/[id]/route.ts`
- `apps/web/app/api/showcase/public/asset/route.ts`
- `apps/web/components/ops/OperationsHubFeature.tsx`
- `apps/web/components/showcase/ShowcaseEditor.tsx`
- `apps/web/lib/storage.ts`
- `apps/web/prisma/schema.prisma`
- Cleanup cron routes

### Required Changes

Add a shared asset table:

```prisma
enum UploadedAssetStatus {
  temporary
  attached
  deleted

  @@map("uploaded_asset_status")
}

model UploadedAsset {
  id             String              @id @default(cuid())
  teamId         String              @map("team_id")
  userId         String              @map("user_id")
  objectKey      String              @unique @map("object_key")
  url            String
  contentType    String              @map("content_type")
  sizeBytes      Int                 @map("size_bytes")
  purpose        String
  attachedToType String?             @map("attached_to_type")
  attachedToId   String?             @map("attached_to_id")
  status         UploadedAssetStatus @default(temporary)
  createdAt      DateTime            @default(now()) @map("created_at")
  attachedAt     DateTime?           @map("attached_at")
  deletedAt      DateTime?           @map("deleted_at")

  team Team @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id])

  @@index([teamId, status, createdAt])
  @@index([attachedToType, attachedToId])
  @@map("uploaded_assets")
}
```

Also add matching relation arrays to `Team` and `User`, or deliberately model
this with scalar ids only. Do not leave Prisma relation fields one-sided.

Route behavior:

- Upload returns an asset id, not just a raw URL.
- Project log form submission attaches existing temporary assets inside the
  same transaction as the project log save; this is the flow that actually
  fixes an orphaning bug.
- Showcase asset upload can adopt the same model for consistency, but should
  keep creating/replacing its row synchronously on upload rather than
  introducing a temporary/unattached window it does not currently have.
- Cleanup cron deletes stale temporary assets from storage and marks rows
  `deleted`.

### Acceptance Criteria

- Abandoned uploads are discoverable and cleanable.
- Domain rows do not trust arbitrary client-submitted file URLs.

## Phase 9: Batch Cron Work Instead Of Loading Everything

### Problem

Notification cron currently loads all teams and loops within a single request.
Paper cron is already batch-limited, but it still lacks `nextRunAt` retry
scheduling from Phase 5. Both jobs need a bounded, observable resume story.

### Target Files

- `apps/web/app/api/cron/notifications/route.ts`
- `apps/web/app/api/cron/papers/route.ts`
- `apps/web/lib/notifications/compute.ts`
- `apps/web/prisma/schema.prisma`

### Required Changes

Either:

- Add cursor-based batching by `Team.id`, with a configured limit per request.

Or:

- Add a lightweight `CronRun` / `NotificationJob` table so cron work can be
  claimed, retried, and inspected.

Minimum acceptable version:

- Process teams in stable batches.
- Record enough logging to know how many teams were processed and where the
  cursor stopped.
- Keep notification creation idempotent through existing `dedupeKey`.

### Acceptance Criteria

- The cron route has bounded work per invocation.
- A failed batch can resume without duplicating notifications.

## Phase 10: Clean Up Feature Boundaries And Shared Patterns

### Problem

The app has improved, but there are still too many places where route handlers,
domain logic, persistence, and UI assumptions are tangled. The repo needs fewer
one-off patterns.

### Target Areas

- Route context and auth checks
- Teacher ownership checks
- Paper processing and metadata extraction
- Plot placement and economy mutations
- Chat persistence
- Upload handling
- Repeated client fetch hooks

### Required Changes

1. Keep route handlers thin:
   - Parse input.
   - Resolve context.
   - Call a domain service.
   - Return a typed response.
2. Move business rules into domain modules:
   - `lib/plot-server.ts` for placement/purchase/sell orchestration.
   - `lib/literature/*` for paper metadata, text, quiz, chat, and processing.
   - `lib/teacher/*` for classroom ownership and report data.
   - `lib/uploads/*` for asset lifecycle.
3. Make response shapes explicit with shared TypeScript types or zod schemas
   where routes and components both rely on the structure.
4. Replace duplicate fetch-state code with focused hooks per feature. Do not
   create one giant generic data layer.
5. Keep optimistic UI only where the server has a clear rollback path. Building
   pickup/drop can be optimistic; KP awards and clearance raises should render
   from committed server responses.

### Acceptance Criteria

- New API routes have consistent shape and error handling.
- Cross-team scoping is centralized enough that reviewers can audit it quickly.
- Domain modules can be tested without rendering React components.

## Phase 11: Documentation Updates

### Target Files

- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/architecture/README.md`
- `docs/architecture/adr-001-team-class-ownership.md`
- `docs/architecture/adr-002-paper-processing.md`
- `docs/architecture/adr-003-feature-boundaries.md`
- `.claude/PARALLELISM.md`
- `docs/TODO.md`
- `docs/SECURITY.md`

### Required Changes

After implementation, update docs to reflect the real architecture:

- `docs/ARCHITECTURE.md` must describe the current route groups, feature modules,
  database ownership model, placement model, paper processing model, chat model,
  upload lifecycle, cron jobs, and test workflow.
- `docs/CHANGELOG.md` must summarize the refactor phases that actually landed.
- ADRs should capture the final invariants, not the transitional plan.
- Fix stale doc drift found in the audit:
  - `.claude/PARALLELISM.md` claims parallel settings that do not match the
    Playwright config.
  - `docs/TODO.md` references moved files such as `lib/fairs/dataset.ts` instead of
    `content/fairs/dataset.ts`.
  - `docs/TODO.md` still describes showcase moderation as missing even though route
    and component support exist.
  - `docs/SECURITY.md` dependency-review notes must match the current package pins.

### Acceptance Criteria

- A new coding agent can read `docs/ARCHITECTURE.md` and accurately predict where a
  feature should live.
- The changelog only claims work that actually shipped.

## Suggested Implementation Order

1. Add ownership indexes and resolver changes.
2. Add advisory locks to current placement mutations for immediate lag/race
   mitigation.
3. Add `TeamPlotPlacement` and migrate plot reads/writes.
4. Make expertise grading idempotent.
5. Split paper content and metadata.
6. Fix paper processing retry semantics.
7. Refactor chat persistence.
8. Add missing growth-path indexes.
9. Add uploaded asset lifecycle.
10. Batch notification cron.
11. Update docs and changelog.

## Testing Strategy

For each phase, add or update tests at the layer closest to the behavior:

- Ownership: route-level tests for invalid `activeTeamId`, teacher downgrade,
  and cross-class access.
- Placement: concurrent move/purchase tests plus Playwright coverage for
  pickup/drop responsiveness.
- Expertise: double-submit tests proving one clearance raise and one KP award.
- Papers: duplicate upload test, list query test that does not select heavy
  text, and processing retry tests.
- Chat: tests proving the server accepts one user turn and ignores
  client-supplied assistant history.
- Uploads: abandoned temporary asset cleanup test.
- Cron: batch/cursor test and idempotent notification creation test.

Before final handoff, run the full pipeline listed in `AGENTS.md`. If full E2E
is too slow during iteration, run targeted specs first, but do not skip final
verification for user-facing refactors.

## Do Not Do

- Do not drop legacy columns in the same migration that introduces replacement
  tables.
- Do not change the classroom game rules while refactoring persistence.
- Do not move files only for aesthetics if it makes imports noisier or obscures
  ownership.
- Do not make broad security or load-hardening passes beyond team scoping,
  rate-limiting, integrity constraints, and bounded work. The broader security
  pass is intentionally deferred until the pilot deployment hardening window.
- Do not persist assistant-generated or client-supplied state unless the server
  has validated ownership and intent.
