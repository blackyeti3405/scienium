# scienium — Refactor & Hardening Plan

_Produced 2026-07-13 on branch `Rig-features`. This is the consolidated output of nine
adversarial audit passes (latency, LLM-cost, scalability, UX-robustness,
correctness/security, plus four architecture passes: API routes, components, lib/domain,
data/types) folded together with the **code-level** recipes from [`docs/SECURITY.md`](SECURITY.md)._

This is the master to-do for the "strengthen everything" push. Every item states **the
issue, the files it touches, a severity, and the fix**. Work top-down by phase.

## Concurrent-work constraint (read first)

Two other devs are building in parallel branches:

- **Landing page** — `apps/web/app/page.tsx`, `apps/web/app/(public)/**`, landing components.
- **PvP raid engine** — `apps/web/app/api/pvp/**`, `apps/web/app/(dashboard)/pvp/**`, a new
  `apps/web/lib/pvp/**`, and the `pvp_raid_overhaul` migration.

**No item in this plan restructures those surfaces.** Instead, the foundational items
(Phase 0) create the shared seams — route wrapper, validation helpers, `Toast`/`EmptyState`
primitives, the `service.ts` convention, `server-only` guards, shared PvP types — that both
devs should build **on top of**. Land Phase 0 first so PvP/landing adopt the seams instead of
hand-rolling parallel copies we later have to reconcile. See **§ Integration protocol** for the
frozen-interface list to hand those devs.

## How to read this

- **Severity** — 🔴 Critical (data loss/corruption, cross-team leak, or breaks the core loop
  under classroom load) · 🟠 High (frequent failure, major slowdown, security gap, or
  merge-pain hotspot) · 🟡 Medium (clear debt / degrades under plausible growth) · ⚪ Low (tidy-up).
- **Integration flag** — 🔷 **Do-first** (foundational; PvP/landing build on it) · 🟢 Safe-now
  (no overlap with the concurrent branches) · 🟣 Coordinate-PvP · 🟨 Coordinate-landing.
- IDs (`BLK-`, `FND-`, `SEC-`, `SVC-`, `CMP-`, `DAT-`, `PERF-`, `CLN-`) are stable handles for
  turning rows into tickets/PRs.

---

## Execution sequence

| Phase | Goal | Items | Gate before next phase |
|---|---|---|---|
| **0 — Foundational seams** | Land the shared abstractions PvP/landing depend on | FND-1…7 | PvP + landing rebased onto them |
| **1 — Pilot blockers** | Nothing that breaks the pilot ships | BLK-1…8 | All 🔴/🟠 blockers closed |
| **2 — Security hardening (code)** | Every sensitive path scoped, bounded, sanitized | SEC-1…11 | IDOR + injection + upload sweeps green |
| **3 — Structural refactor** | Kill the god-files and duplicated logic | SVC-1…6, CMP-1…11, DAT-1…4 | typecheck/lint/tests green |
| **4 — Perf & cleanup** | Trim the long tail | PERF-1…10, CLN-1…5 | — |

**Order rationale:** Phase 0 unblocks the concurrent devs and is where the security patterns
(scoping, validation, CSRF) get a single home, so Phase 2 becomes "apply the pattern" instead
of "invent it 60 times." Several Phase-1 blockers are closed *for free* by DB constraints added
in Phase 2 (see the convergence notes) — do them together where flagged.

---

## Phase 0 — Foundational seams (do first)

> These edit shared files (`lib/api/route-context.ts`, `lib/validation.ts`, `components/ui/*`,
> new `server-only` guards). They are **additive** — no existing signature changes — so they
> won't disrupt the PvP/landing branches, but landing them first means those branches adopt them.

### FND-1 · Enforce the server/client boundary with `server-only` 🟠 🔷
- **Files:** add dep `server-only`; add `import 'server-only'` to `apps/web/lib/db.ts`,
  `lib/env.ts`, `lib/storage.ts`, `lib/anthropic.ts`, `lib/shop-server.ts`, `lib/plot-server.ts`,
  `lib/showcase-server.ts`, `lib/buildings/service.ts`, and every module that runtime-imports
  `@/lib/db` (~24).
- **Issue:** There is **no compiler-enforced boundary** — zero real `import 'server-only'` in the
  repo, the package isn't installed. It already bites: the `'use client'` component
  `apps/web/components/fair/FormsChecklist.tsx:5` value-imports `getFormGuide` from
  `lib/fairs/forms.ts`, which top-level imports the Prisma `db` — only fragile tree-shaking keeps
  `@prisma/client` (and the secrets `env.ts` reaches) out of the **student browser bundle**. A
  single `import type` → `import` slip ships secrets with no build failure.
- **Fix:** Install `server-only`; add it as line 1 of every server module above. Any client import
  of them then **fails the build** instead of silently bundling. Do before PvP writes `lib/pvp/*`
  so the new domain is born guarded.

### FND-2 · Split `lib/fairs/forms.ts` into pure + server 🟠 🟢
- **Files:** `apps/web/lib/fairs/forms.ts` (326) → keep pure; new `apps/web/lib/fairs/forms-server.ts`.
- **Issue:** One module holds ~307 lines of client-facing data (`ISEF_FORMS`, `ISEF_FORM_GUIDES`,
  `getFormGuide`) **and** a DB seeder (`ensureFormsSeeded`) behind a top-level `import { db }` — the
  concrete instance of FND-1's leak.
- **Fix:** Move `ensureFormsSeeded` + `import { db }` to `forms-server.ts` (`import 'server-only'`);
  leave the catalog/guides/`getFormGuide` in `forms.ts` (client-safe). Update the seed caller.

### FND-3 · `withTeamRoute()` handler wrapper 🟡 🔷
- **Files:** new `apps/web/lib/api/with-route.ts`; consumed by ~49 mutating routes (incrementally).
- **Issue:** Every mutating route repeats the same 4-line prelude (`requireTeamContext` → `if (error) return` →
  `parseJson` → `if (error) return`). Correct but copied ~49×, and each copy is a spot to forget the
  guard-return and leak past it.
- **Fix:** `withTeamRoute({ tier, feature, body }, handler)` composing `requireTeamContext` +
  `parseJson`, mapping a thrown `ApiError` to a `NextResponse`, handing the handler `{ ctx, data }`.
  Additive — do **not** change `requireTeamContext`'s signature. PvP adopts it for its new handlers.

### FND-4 · `requireUserContext({ tier })` for teamless routes 🟡 🔷
- **Files:** `apps/web/lib/api/route-context.ts` (+ consumers: `discovery/search`, `discovery/sources/search`,
  `discovery/youtube/resolve`, `discovery/article`, `showcase/public/asset`, `team/join`, `class/join`,
  `onboarding`, `onboarding/teacher`).
- **Issue:** 11 routes call `auth()` directly; 9 hand-roll the identical `auth()` + `enforceRateLimit`
  prelude because they legitimately run *before* a team exists (onboarding/join) or only need a
  rate-limited `userId` (discovery proxies).
- **Fix:** Add a sibling guard `requireUserContext(req, { tier })` returning `{ userId }`, mirroring
  `requireTeamContext`'s `{ ctx, error }` contract. Land in the same pass as FND-3 (both edit shared
  `route-context.ts` that PvP imports).

### FND-5 · Shared field schemas in `lib/validation.ts` 🟡 🔷 _(= SEC-4)_
- **Files:** `apps/web/lib/validation.ts` (50).
- **Issue:** Only `parseJson` + `zipString` exist — the file even has a "Shared field schemas" header
  with nothing under it — so every route hand-rolls string caps. PvP raid bodies + landing/onboarding
  forms will each reinvent them.
- **Fix:** Add exported `boundedText(max)`, `optionalBoundedText(max)`, `cuid()`, `httpUrl()` zod
  schemas (shapes in SECURITY.md §4). Single source for length/ID/URL validation.

### FND-6 · `Toast`/`NoticePill` + `EmptyState` primitives 🟠 🔷 🟣 🟨
- **Files:** new `apps/web/components/ui/Toast.tsx`, `apps/web/lib/hooks/useAutoDismiss.ts`, new
  `apps/web/components/ui/EmptyState.tsx`.
- **Issue:** No toast primitive exists. `DiscoveryFeature` hand-rolls **5** floating notices
  (`:450–575`), and ~20 files repeat the `setTimeout(() => setX(null))` idiom; a local `Empty`/dashed-border
  block is re-typed in ~12 files. Both PvP and landing will reinvent these.
- **Fix:** `Toast` (`tone: 'kp'|'success'|'error'|'warn'`, pixel styling) + `useAutoDismiss`; `EmptyState`
  (`icon?`, `message`, `bordered?`). Define the API now and point both devs at it (alongside existing
  `BusyButton`/`LabeledLoader`/`Card`/`ConfirmDialog`).

### FND-7 · Adopt the shared PvP/paper types in `@scienium/shared-types` 🟡 🟣
- **Files:** `packages/shared-types/src/pvp.ts` (`Spell`, `RaidCastEvent`, `RaidBuildingState`,
  `RaidResult`) + `src/enums.ts` (`SpellType`); delete `packages/shared-types/src/paper.ts` (see CLN-2).
- **Issue:** The raid contract already exists in the shared package but is orphaned (all PvP routes/pages
  are stubs). Risk: the PvP dev redeclares `Spell`/`RaidResult` locally in `lib/pvp`, duplicating the package.
- **Fix:** No restructure — **flag to the PvP dev** to import/extend `@scienium/shared-types` rather than
  redeclare, keeping `enums.ts` `SpellType` canonical. Add richer server shapes there if needed.

---

## Phase 1 — Pilot blockers

> The 🔴/🟠 findings that break the pilot: the core loop, currency integrity, or cost ceiling.

### BLK-1 · Paper ingestion is fire-and-forget on serverless 🔴 🟢
- **Files:** `apps/web/app/api/papers/route.ts:157`, `apps/web/app/api/cron/papers/route.ts:45`.
- **Issue:** `processPaperJob(paper.id).catch(...)` runs **without `await`** after the response flushes.
  On Vercel the instance freezes once the response is sent, so ingestion is unreliably killed and the
  paper stays `pending`. The only guaranteed path is a cron doing **3 papers / 5 min** → 30 students
  uploading at lesson start ⇒ **~50 min** before papers are readable/quizzable. Core loop stalls for the room.
- **Fix:** `await` ingestion before responding (accept the latency), or use Next `after()`/`waitUntil()`
  to keep the instance alive, or a real queue (QStash). At minimum raise the cron `take` far above class size
  and add `nextRunAt` retry scheduling.

### BLK-2 · "Promote source" check-then-create race → duplicate Paper + duplicate KP 🔴 🟢
- **Files:** `apps/web/app/api/discovery/source/[id]/promote/route.ts:41`.
- **Issue:** The `if (node.paperId) return 409` guard is an unlocked read; a paid `checkPaperRelevance`
  LLM call sits between it and the create transaction, widening the window to **seconds**. A double-click
  mints **two real Papers from one node** — one orphaned but fully quiz-able for duplicate KP. Nothing
  dedupes at the DB level (promoted papers set no `contentHash`; `@@unique([teamId, contentHash])` permits
  multiple NULLs).
- **Fix:** Wrap the promote in `db.$transaction` + `lockAggregate(tx, 'discovery-promote:'+node.id)` and
  **re-read `node.paperId` inside the tx** (return the existing id if set) — the pattern
  `lib/buildings/service.ts` already uses. **Converges with SEC-«DB constraints»**: a proper
  content-hash/unique on promoted papers closes it at the DB layer too.

### BLK-3 · Rate limiter is per-instance; the LLM cost cap isn't enforced 🟠 🟢
- **Files:** `apps/web/lib/rate-limit.ts:142`, `apps/web/.env.example:60`.
- **Issue:** `MemoryStore` is the default and Upstash ships blank, so on Vercel the "12 AI calls/min/user"
  cap is really `12 × concurrent instances` and resets on cold start — the per-student cost ceiling is
  effectively unbounded.
- **Fix:** Provision Upstash + set `UPSTASH_REDIS_REST_URL`/`TOKEN` in Vercel (the `UpstashStore` path
  already exists, zero code change). Consider **fail-closed on the `ai` tier** when the shared store is absent.

### BLK-4 · Codex lesson-complete double-mints KP 🟠 🟢
- **Files:** `apps/web/app/api/ops/codex/complete/route.ts:250`.
- **Issue:** `alreadyClaimed` is a TOCTOU read outside the tx with no lock; two concurrent first-time
  completions both credit `kp` (bounded by the daily cap, but a student hits the cap with half the lessons).
- **Fix:** Gate the increment on a genuine false→true transition (unique-constraint-then-increment like
  `failure-log/route.ts:95`) or `lockAggregate` + re-check inside the tx. **Converges with SEC "idempotent
  ledgers for KP/LC awards."**

### BLK-5 · `fairs/[id]/sync-deadlines` lets any student overwrite shared data + spend budget 🟠 🟢
- **Files:** `apps/web/app/api/fairs/[id]/sync-deadlines/route.ts:52`.
- **Issue:** `Fair` is a global catalog row looked up with no team/teacher scope — `requireTeamContext`
  only proves the caller has *some* team. Any student can trigger a paid Firecrawl `extract` on arbitrary
  fair ids and overwrite the shared `FairEvent` every team sees with `estimated` scrape output.
- **Fix:** Gate behind `requireTeacher` (or restrict to fairs the team selected); refuse to overwrite a
  non-`estimated` event. **This is the concrete "authority not proven on a shared resource" case of SEC-1.**

### BLK-6 · Chat re-sends full history uncached every turn (O(N²) spend) 🟠 🟢
- **Files:** `apps/web/app/api/papers/[id]/chat/route.ts:100`, `apps/web/app/api/ops/vega-study/route.ts:84`.
- **Issue:** `cache_control` is only on the system block; the `messages` array (up to 60 × 8 000 chars)
  has no breakpoint, so turn *k* re-bills all prior turns at 1× — a near-cap turn is ~120k uncached tokens
  (~$0.36) on the most-repeated paid action.
- **Fix:** Add an ephemeral `cache_control` breakpoint on the last (and 2nd-to-last) history message
  (Anthropic allows 4). **Do together with SEC-9** (server rebuilds history from DB) — same code, and
  DB-owned history makes the cache key stable.

### BLK-7 · Fetch-failure masquerades as an empty/new-user state 🟠 🟢
- **Files:** `apps/web/components/literature/usePapers.ts:47` → `LiteratureFeature.tsx:170`;
  `apps/web/stores/discoveryStore.ts:216` → `DiscoveryFeature.tsx:606`.
- **Issue:** A failed `listPapers()`/`hydrate()` sets "loaded" with an empty array, so a returning team on
  flaky wifi sees **"0 / 25" + empty upload slots** (or the Discovery first-run home) — their work looks
  gone, no error, no retry, and they may re-upload (wasting relevance-check calls).
- **Fix:** Track a distinct `loadError` and render a retry banner instead of the empty state. (Naturally
  folds into the `usePapers`/`useDiscovery` hook work in CMP-4/CMP-6.)

### BLK-8 · No React error boundaries anywhere 🟠 🟢
- **Files:** new `apps/web/app/(dashboard)/error.tsx` (+ per-group); guard raw-JSON `.map` sites
  (`TopicSearch.tsx`, `DiscoveryFeature.tsx`, quiz/review renderers).
- **Issue:** `find app -name error.tsx` → 0 files. Many components `.map()` over raw `await res.json()`;
  one unexpected payload throws to the root → Next's blank "Application error," and deterministic bad data
  makes reload re-crash = unrecoverable dead-end.
- **Fix:** Add route-group `error.tsx` boundaries with a reset UI; defensively guard the JSON-trusting maps.

---

## Phase 2 — Security hardening (code-level, from SECURITY.md)

> The pure-code recipes. Infra items (RLS enablement, secret rotation, DNS/email, Terraform, DAST,
> monitoring) are **out of scope for this doc** — see § Out of scope. Several of these close Phase-1
> blockers at the DB/validation layer; do those together.

### SEC-1 · Standard team-scoped route pattern (IDOR) 🟠 🟢
- **Files:** `apps/web/app/api/**/[id]/**/route.ts` (papers, data-terminal, discovery, project-log, failure-log).
- **Issue:** The audit found **no live IDOR**, but the doc's required shape isn't universal — some routes
  fetch by id then post-check. Standardize to prevent the next one.
- **Fix:** `findFirst({ where: { id, teamId: ctx.teamId } })` returning 404, never `findUnique` +
  post-fetch `teamId` check. Add the 4 IDOR tests per route (same-team 200, other-team 404, signed-out 401,
  over-limit 429). Best enforced inside the FND-3 wrapper + the per-domain `service.ts` `loadOwned<Entity>`.

### SEC-2 · Active-team resolution must prove membership 🟠 🟢
- **Files:** `apps/web/lib/api/route-context.ts`.
- **Issue:** `requireTeamContext` trusts `user.activeTeamId`; a stale/bad value could become authoritative
  without re-proving `TeamMember`.
- **Fix:** Resolve the team through a `teamMember` membership query (one-query form with `take: 5` memberships
  in SECURITY.md §2). Never return a team from `User.activeTeam` without a matching membership row.

### SEC-3 · Never accept identity/authority from request bodies 🟠 🟢
- **Files:** teacher components (`StudentDetail.tsx`, `TeacherRoster.tsx`, `TeacherRubricScoring.tsx`),
  `apps/web/app/api/teacher/**`, all mutation schemas.
- **Issue:** Body schemas must never honor `userId/teamId/classId/role/kp/lc/clearanceLevel/price/…`.
  Teacher routes that legitimately pass a `teamId` must prove ownership (`teacherOwnsTeam(classIds, teamId)`).
- **Fix:** `.strict()` schemas that omit authority fields; derive identity from `ctx`. Enforced by FND-5 +
  FND-3.

### SEC-4 · Strict, bounded, normalized Zod 🟡 🟢 _(= FND-5)_
- Done as FND-5; then sweep routes to use `boundedText`/`cuid`/`httpUrl` instead of open-ended strings.

### SEC-5 · XSS — sanitize every render sink 🟠 🟢
- **Files:** `apps/web/components/ops/ChartsGuidePanel.tsx`, `PlotGuidePanel.tsx`, discovery article/source
  renderers, showcase content, project-log attachment URLs.
- **Issue:** `dangerouslySetInnerHTML`/`href`/`src`/SVG sinks must be sanitized or rendered as text.
- **Fix:** Student text renders as text nodes; external HTML sanitized server-side via the **single**
  `ARTICLE_SANITIZE_OPTS` allowlist (`lib/discovery/sanitize.ts`); links pass `httpUrl`; never render
  student/external SVG; comment every `dangerouslySetInnerHTML` with its sanitizer. Add the script/onerror/
  javascript:/svg/iframe payload tests.

### SEC-6 · Project-log attachments need asset rows, not raw URLs 🟠 🟢
- **Files:** `apps/web/prisma/schema.prisma` (new `UploadedAsset` + `AssetPurpose`/`AssetStatus` enums),
  `apps/web/app/api/project-log/attachment/route.ts`, `project-log/route.ts`,
  `project-log/attachment/view/route.ts`; cleanup cron.
- **Issue:** The durable row stores client-submitted URLs; a crafted URL can point at odd query strings or
  stale objects.
- **Fix:** Attachment upload creates an `UploadedAsset{status:temporary}` and returns `{ assetId }`; log-create
  accepts `attachmentAssetIds`, validates ownership + `temporary` in the same tx and flips to `attached`; view
  route resolves by asset id. Add a `assertCron`-protected cleanup of >24h temporaries. (Shapes in §6.)

### SEC-7 · PDF sanitization 🟠 🟢
- **Files:** new `apps/web/lib/pdf/sanitize.ts` (shape it like `lib/discovery/sanitize.ts` — pure, shared,
  `server-only`); `apps/web/app/api/papers/route.ts`, `papers/[id]/file/route.ts`; schema `originalPdfKey`,
  `sanitizedPdfKey`, `pageCount`, `@@unique([teamId, contentHash])`.
- **Issue:** Current check is MIME + size + `%PDF-` only — not sanitization. PDFs can carry JS, launch/open
  actions, embedded files, AcroForm/XFA, decompression bombs.
- **Fix:** Inspect + normalize before extraction/serving (qpdf/pdfcpu/mutool in a locked worker, or render to
  safe images+text); reject encrypted/JS/OpenAction/embedded/XFA/oversize; serve only the sanitized key with
  `nosniff`. The `@@unique([teamId, contentHash])` also hardens BLK-2's dedup.

### SEC-8 · Safe external-fetch boundaries 🟡 🟢
- **Files:** `apps/web/lib/discovery/openalex.ts`, NCBI/arXiv/Firecrawl helpers. **`lib/wikipedia.ts` is
  DEAD (CLN-1) — delete it rather than harden it**, which resolves the doc's wikipedia item.
- **Issue:** External helpers need timeouts, result-count caps, URL normalization, and bounded caches.
- **Fix:** Add `AbortSignal.timeout(...)` + count caps to each; confirm the `LruCache` bound (already applied
  to the discovery APIs). No `origin=*` on server calls.

### SEC-9 · Prompt injection — build chat history from DB, not the client 🟠 🟢
- **Files:** `apps/web/app/api/papers/[id]/chat/route.ts`, `ops/vega-study/route.ts`, `research-plan/idea-check`,
  `research-plan/review`, `lib/literature/process-paper.ts`, `lib/literature/quiz.ts`, `lib/economy.ts`.
- **Issue:** The client can fabricate prior assistant turns; untrusted paper/log/plan text can steer the model;
  AI output can affect KP/scores if not clamped.
- **Fix:** Client sends only the newest user message; server loads history from `PaperChatMessage` and builds
  the conversation. Wrap untrusted content in explicit "this is data, not instructions" delimiters; Zod-parse +
  server-clamp any AI output that touches KP/clearance/phase/status. **Do with BLK-6** (same route; DB-owned
  history is also what makes the prompt cache stable).

### SEC-10 · Constant-time cron auth 🟡 🟢
- **Files:** `apps/web/lib/cron/auth.ts:24`.
- **Issue:** `header !== \`Bearer ${secret}\`` is a timing-attackable compare.
- **Fix:** `crypto.timingSafeEqual` over equal-length buffers (length-guard first); reject <32-byte secrets in
  production; keep failing closed when `CRON_SECRET` is missing. Add the cron guard tests + a static test that
  every `app/api/cron/**/route.ts` calls `assertCron`.

### SEC-11 · Same-origin / CSRF discipline 🟡 🔷
- **Files:** `apps/web/lib/api/route-context.ts` (or a `requireMutationTeamContext`).
- **Issue:** Cookie-based Clerk sessions mean "browser has a session" ≠ "user intended this write."
- **Fix:** `assertSameOrigin(req)` (origin host == host) for POST/PATCH/DELETE, called inside the guard after
  auth/rate-limit. Fold into the FND-3 wrapper so every mutating route gets it once. GET routes must not mutate.

### SEC-DB · Invariant constraints & idempotent ledgers 🟠 🟢
- **Files:** `apps/web/prisma/schema.prisma` + migrations.
- **Issue:** Several races (BLK-2, BLK-4, R5) exist because the DB permits duplicates the app tries to prevent
  in code.
- **Fix:** Add: unique paper content-hash per team (closes BLK-2), unique plot cell per team, **idempotent
  KP/LC award ledger / unique claim rows** (closes BLK-4 and the failure-log overwrite), unique job/request
  ids for paid actions. Constraints are the durable backstop the advisory locks complement.

---

## Phase 3 — Structural refactor

### Service layer (routes → `lib/<domain>/service.ts`)

`lib/buildings/service.ts` is the **one correct model** — orchestration out of the route, returns a
discriminated `{ ok: true, … } | { ok: false, error, status }`, every mutation inside a `lockAggregate`
advisory lock. Standardize on it. **PvP should copy this exact shape** (🟣).

| ID | Sev | Int | Issue | Files | Fix |
|---|---|---|---|---|---|
| **SVC-1** | 🟠 | 🟢 | Currency reward-minting duplicated near-verbatim between quiz grade & retry (`paper-quiz:` lock tail, award calc, `teamCurrency.upsert`) — money logic in two places, will diverge | `app/api/papers/[id]/quiz/grade/route.ts:148`, `.../quiz/retry/route.ts:348`, `expertise/grade/route.ts:152` | CREATE `lib/literature/quiz-service.ts` + `lib/clearance/exam-service.ts`; move tx+award+`logActivity` in; routes become thin. Defer to **after** the PvP concurrent window (hot routes). |
| **SVC-2** | 🟡 | 🟢 | Grade request schema + Anthropic call + `extractJson` + 502 branch copied 3× | same three routes | CREATE `lib/literature/grading.ts` (`gradeAnswers({instructions, contextBlock, payload})`) + shared `AnswersBody`. The injection framing (SEC-9) then lives in one audited place. |
| **SVC-3** | 🟡 | 🟢 | ~120 lines of pure analytics inlined in fat read routes, no test seam | `app/api/teacher/reports/route.ts:55`, `teacher/student/[id]/overview/route.ts` (386) | MOVE bucketing/roll-up/pacing → `lib/teacher/analytics.ts` pure fns. |
| **SVC-4** | ⚪ | 🟢 | Two unrelated write algorithms + inline tree mapping in one handler | `app/api/discovery/tree/route.ts` (272) | Extract `createTreeNodes()`/`hydrateTree()` → `lib/discovery/tree-service.ts`. |
| **SVC-5** | 🟡 | 🟣 | Define the greenfield PvP domain convention | new `lib/pvp/**` | Recommend `lib/pvp/combat.ts` (pure, DB-free, unit-tested like `economy.ts`), `lib/pvp/service.ts` (discriminated result, advisory lock, modeled on buildings), `lib/pvp/state-server.ts` (`server-only`). |
| **SVC-6** | ⚪ | 🟢 | `dev/backfill-me`, `dev/fill-papers` hand-roll `auth()` with no gate | `app/api/dev/**` | Put behind an env/role gate before pilot. |

### Component decomposition (kill the god-files)

None overlap the PvP/landing files (🟢 unless noted). Each split = extract subcomponents into a feature
folder + move data-fetch/business logic into a `use<Feature>` hook (`lib/hooks`) or `lib/` module, routing
network calls through the existing `lib/api/client.ts` `requestJson` (the `literature/` folder is the model).

| ID | Sev | Issue (lines) | File → target shape |
|---|---|---|---|
| **CMP-1** | 🟠 | 1581-line god-file: 172-line type block + 16 section renderers + fetch container | `components/teacher/StudentDetail.tsx` → `StudentDetail/{types.ts, StudentHeader.tsx, sections/*.tsx}` + `lib/hooks/useStudentOverview.ts` (folder pattern already started) |
| **CMP-2** | 🟠 | Container is a 30-line tab switch; 1150 lines are two inlined tab features (siblings already separate) | `components/ops/OperationsHubFeature.tsx` → `ops/ProjectLogTab.tsx` (+ `ops/project-log/*`), `ops/FailureLogTab.tsx` (+ `ops/failure-log/*`) + `useProjectLog`/`useFailureLog` |
| **CMP-3** | 🟠 | 15 `useState` + 8 `useEffect`; duplicated branch-selection panel (`:931` vs `:1006`) | `components/discovery/DiscoveryFeature.tsx` → hooks (`useFinalTopic`, `useTeamInterests`, `useSourceLanes`, `useResizablePanel`) + `discovery/BranchSelectionPanel.tsx` (dedup) + consume Toast (FND-6). Closes BLK-7 discovery half. |
| **CMP-4** | 🟡 | Optimistic-with-rollback handlers entangled with particle-render JSX | `components/lab/LabScene.tsx` (742) → `lib/hooks/usePlotBuildings.ts` + `lab/{BuildingMenu,UpgradeBurst,DevFillButton}.tsx` |
| **CMP-5** | 🟡 | Store mixes state with 6 inline fetch wrappers + repeated optimistic-rollback | `stores/discoveryStore.ts` (599) → move `persist*` → `lib/discovery/treeApi.ts`; `commitOptimistic()` helper. Closes BLK-7 discovery half. |
| **CMP-6** | 🟡 | load/save/publish/asset lifecycle + 340-line JSX + local blocks with embedded uploads | `components/showcase/ShowcaseEditor.tsx` (837) → `showcase/useShowcaseEditor.ts` + `showcase/editor/*` |
| **CMP-7** | 🟡 | `ExperimentDetail` ~400 lines (chart+paste+PNG/CSV export+table); page-agnostic utils in a component | `components/ops/DataTerminalTab.tsx` (809) → `ops/data-terminal/{ExperimentsView,NewExperimentForm,ExperimentDetail}.tsx` + `lib/data-terminal/export.ts` + `useExperiments` |
| **CMP-8** | 🟡 | Two NDJSON runners + display panels that **drift-duplicate** StudentDetail's review/idea displays | `components/research-plan/ResearchPlanFeature.tsx` (797) → `research-plan/useResearchPlan.ts` + shared `PlanReviewView.tsx`/`IdeaCheckView.tsx` consumed by **both** it and StudentDetail; `readNdjson` → `lib/ndjson.ts` |
| **CMP-9** | 🟡 | 35 components hand-roll `fetch → r.json() → if(!res.ok)` despite `requestJson` existing | cross-cutting | Route each split feature's calls through `lib/api/client.ts` + a co-located hook (propagate, no new primitive) |
| **CMP-10** | ⚪ | Prop-drilling: `overview` into 13 sections; `DiscoveryTree` props passed twice | StudentDetail, DiscoveryFeature | Optional `OverviewContext` / rely on `discoveryStore`; low priority vs the size splits |
| **CMP-11** | ⚪ | (rolled into FND-6) `EmptyState` re-typed ~12×; Toast idiom ~20× | — | Adopt FND-6 primitives as features are split |

### Data / content → JSON + generated wrapper

| ID | Sev | Int | Issue | Files | Fix |
|---|---|---|---|---|---|
| **DAT-1** | 🟠 | 🟢 | ~8,500 lines / **1.3 MB** of pure guide data compiled as TS literals **and eagerly bundled into client chunks** (`plot-guide.ts` is 748 KB with 45 inline SVGs) | `content/data-terminal/{stats,data-quality,plot,methods}-guide.ts`, `lib/literature/research-guide.ts` | MOVE each array → co-located `*.json`; keep interfaces + `filterX` in a thin `.ts` (`import data from './x.json' as unknown as T[]`) exactly like `lib/ops/codex/tracks/*.ts`; for `plot-guide`, a `loadX()` `import()` map like `charts-guide.ts`'s `loadChartField` so 748 KB defers to panel-open. Add a zod gate (like codex's) to replace lost author-time tsc checks. Saves ~8,500 lines from tsc + ~1.3 MB from eager bundles. |
| **DAT-2** | 🟡 | 🟢 | 3753-line `SeedFair[]` literal, **already machine-generated** by `scripts/scrape-isef-fairs.mjs`, re-parsed by tsc every run | `content/fairs/dataset.ts` | Have the scraper emit `dataset.json`; reduce `dataset.ts` to types + `import FAIRS from './dataset.json'` (~25 lines). |
| **DAT-3** | 🟡 | 🟢 | Dead shared type file, 6 interfaces, **zero consumers** (live pipeline uses a local zod schema) | `packages/shared-types/src/paper.ts` + `src/index.ts:2` | DELETE + drop the re-export. (= CLN-2) |
| **DAT-4** | 🟡 | 🟣 | Orphaned but intended PvP contract | `packages/shared-types/src/pvp.ts`, `src/enums.ts` | = FND-7: flag PvP dev to import/extend, not redeclare. |

---

## Phase 4 — Performance & cleanup (the long tail)

### Performance / scalability

| ID | Sev | Issue | Files | Fix |
|---|---|---|---|---|
| **PERF-1** | 🟡 | `connection_limit=1` makes `Promise.all` fan-outs run **serially** (latency = sum) | `lib/db.ts`, `team/momentum/route.ts:50` | Reduce fan-out (fold momentum's 8 counts into fewer round-trips / one aggregate); don't rely on `Promise.all` for latency under PgBouncer. |
| **PERF-2** | 🟡 | Data-Terminal GET pulls **every measurement of every experiment** when the list needs counts | `app/api/data-terminal/route.ts:19` | Return `_count.measurements`; lazy-load one experiment's points on selection. |
| **PERF-3** | 🟡 | `/api/team` = 3-query serial waterfall + redundant duplicate user fetch | `app/api/team/route.ts:41` | `Promise.all`; fold the class lookup into `requireTeamContext`'s user select. |
| **PERF-4** | 🟡 | Project-log GET loads full term history + 4-way relation fan-out, unpaginated | `app/api/project-log/route.ts:45` | Cursor/`take` paginate; lazy-load reference chips; derive entry numbers from a count. |
| **PERF-5** | 🟡 | Notifications cron sequential per-team + nested per-recipient email `await` under 60s cap (perpetually skips teams past the cutoff if it dies) | `app/api/cron/notifications/route.ts:51` | Bounded-concurrency (`p-limit`), batch inserts, parallel email, **persist the cursor** across runs. |
| **PERF-6** | 🟡 | PDF metadata extraction on Sonnet where **Haiku suffices** (~$13 per 30×25 class) | `lib/literature/process-paper.ts:80` | Switch to `claude-haiku-4-5-…` (matches relevance/classify). |
| **PERF-7** | 🟡 | `research-plan/review` re-runs a full paid review of **unchanged** plan text | `app/api/research-plan/review/route.ts:23` | Hash `lastSyncedText`; return the persisted review when unchanged. |
| **PERF-8** | ⚪ | Paper-text cache breakpoint after per-route instructions → 30k-token block never reused across chat→quiz→grade→retry | quiz/grade/retry/chat routes | Make paper text the **first**, route-independent cached block with one delimiter everywhere. |
| **PERF-9** | ⚪ | Notifications feed `ORDER BY createdAt` not covered by the `readAt`-leading indexes; momentum measurement `count` routes through a relation with no `teamId` index | `schema.prisma:1020`, `team/momentum/route.ts:50` | Add `@@index([teamId, createdAt])`/`[userId, createdAt]`; denormalize `teamId` onto `Measurement` w/ index. |
| **PERF-10** | ⚪ | Misc: citations write-on-read backfill every load; discovery-tree GET unpaginated; teacher/roster aggregates unbounded activity; TeacherReports eagerly bundles ~100 KB recharts | `citations/route.ts:17`, `discovery/tree/route.ts:59`, `teacher/roster/route.ts:56`, `components/teacher/TeacherReports.tsx:4` | Create-on-ready not on-read; paginate; add `createdAt >= now-Nd` window; `next/dynamic` the charts. |

### UX long-tail

| ID | Sev | Issue | Files | Fix |
|---|---|---|---|---|
| **UX-1** | 🟡 | "Add paper from search" + TopicSearch fail **silently** on wifi errors | `discovery/DiscoveryFeature.tsx:118`, `discovery/TopicSearch.tsx:24` | Surface via the FND-6 Toast; add a `catch` with an inline "couldn't search" hint. |
| **UX-2** | 🟡 | Paper stuck "processing" spins forever; `setInterval` leaks past unmount | `components/literature/usePapers.ts:51` | Cap polls (~20) → actionable state; return a cleanup. |
| **UX-3** | ⚪ | Paper-chat send discards typed draft on error; unlabeled Send button; false "set topic" warning on fetch fail; Q&A split not responsive <700px | `usePaperChat.ts:45`, `PaperChat.tsx:78`, `LiteratureFeature.tsx:58`, `QAPanel.tsx:32` | Restore draft on error; `aria-label`; distinct load-error sentinel; stack panels at a breakpoint. |

### Cleanup / dead code

| ID | Sev | Issue | Files | Fix |
|---|---|---|---|---|
| **CLN-1** | ⚪ | Dead file, zero refs (discovery's wiki path is elsewhere) | `lib/wikipedia.ts` (43) | DELETE — also resolves SECURITY.md's "harden wikipedia.ts." |
| **CLN-2** | 🟡 | Dead shared types, zero consumers | `packages/shared-types/src/paper.ts` | DELETE (= DAT-3). |
| **CLN-3** | ⚪ | `'use client'` context sitting in `lib/` root | `lib/labCurrency.tsx` | MOVE → `components/lab/` or `components/providers/`. |
| **CLN-4** | ⚪ | Authored data has no consistent home; stale import-path comment | `content/**` vs `lib/**`, `team/momentum/route.ts:114` | Standardize bulk authored data under `content/<domain>/`; fix the comment when DAT-1/2 move files. |
| **CLN-5** | ✅ | Barrels & import cycles checked **clean** — 1 intentional lazy barrel (`lib/ops/codex/index.ts`), 0 component barrels, no cycles | — | No action; recorded so the area is known-covered. |

---

## Integration protocol (hand this to the PvP & landing devs)

**Frozen interfaces during the concurrent window** — additive edits only, no signature changes:
- `lib/api/route-context.ts` (`requireTeamContext` backs 62 routes; PvP gates with `feature: 'pvp'`) —
  FND-3/FND-4 add *new* exports here; land them, then freeze.
- `lib/phase.ts` (`pvp` unlocks at `working`; `FEATURE_MIN_PHASE.pvp`), `lib/economy.ts` (currency math),
  `lib/gateways.ts` (building→feature map PvP reads), `lib/sprites/manifest.ts` (landing may read for marketing).
- `@scienium/shared-types` `pvp.ts` + `enums.ts` `SpellType` — the raid contract (FND-7).

**Shared primitives to adopt (not reinvent):** `components/ui/` `Toast`/`EmptyState` (FND-6),
`BusyButton`, `LabeledLoader`, `Card`, `ConfirmDialog`; `lib/api/client.ts` `requestJson`; the
`lib/<domain>/service.ts` `{ ok, error, status }` pattern; `lib/validation.ts` `boundedText`/`cuid`/`httpUrl`.

**PvP dev specifically:** create `lib/pvp/{combat.ts (pure), service.ts (orchestration+lock), state-server.ts}`;
import raid types from `@scienium/shared-types`; keep routes thin via FND-3.

**Sequencing:** merge **Phase 0** to the shared integration branch first; have PvP/landing rebase onto it;
then land Phase 1–2 (blockers + security) before the pilot; Phase 3–4 can proceed per-feature in any order
(SVC-1 currency extraction is the one to schedule **after** the PvP window since it churns hot routes).

---

## Out of scope for this doc (infrastructure — track in SECURITY.md)

Not code changes — deliberately excluded from this refactor: dedicated prod Supabase/Clerk; `CRON_SECRET`
provisioning; private R2 verification; Supabase **RLS** enablement + roles; secret rotation & gitleaks/CI
secret scanning; SPF/DKIM/DMARC & domain/DNS; Terraform/IaC; DAST/ZAP; error-monitoring/alerting;
FERPA/COPPA/DPA posture. These remain tracked in [`docs/SECURITY.md`](SECURITY.md) (P0 Launch Blockers +
the infra sections). The **code** prerequisites they depend on (constant-time cron auth, Upstash wiring
call-sites, `server-only`, validation) are in Phases 0–2 above.
