# CONVENTIONS.md — Scienium Code Conventions

**Mapped:** 2026-07-19
**Last commit mapped:** (current HEAD)

---

## TypeScript Conventions

- **Strict mode:** `strict: true` in `packages/config/tsconfig.base.json` — the base config inherited by both `shared-types` (NodeNext) and `apps/web` (Bundler/Next).
- **No `any` without reason:** ESLint `@typescript-eslint/no-explicit-any: 'warn'`. When unavoidable, the actual type is usually ghosted above the cast.
- **Unused vars:** `@typescript-eslint/no-unused-vars: 'error'` with `argsIgnorePattern: '^_'`. Prefix intentional throwaway args with `_`.
- **Module/target:** Base = `ES2022`/`NodeNext`. Next app = `ES2017` lib + `dom`, `Bundler` resolution, `isolatedModules`, `noEmit`. shared-types = `ES2022`/`NodeNext` + `declaration`/`sourceMap`.
- **Path alias:** `@/*` → project root (`apps/web/*`). Used pervasively for app-internal imports. Workspace packages imported by name (`@scienium/config`, `@scienium/shared-types`).

## Formatting (Prettier)

From `.prettierrc`:
```
semi: false          # no semicolons
singleQuote: true
tabWidth: 2
trailingComma: 'all'
printWidth: 100
```
Root `format` script: `prettier --write "**/*.{ts,tsx,js,json,md}"`.

## File & Directory Naming

- **Files/dirs:** kebab-case — `route-context.ts`, `data-terminal/`, `combat-engine.ts`.
- **React components:** PascalCase filenames and exports — `DiscoveryTree.tsx`.
- **Route groups:** `(parenthesized)` — URL-neutral audience segmentation: `(auth)`, `(dashboard)`, `(teacher)`, `(public)`, `(onboarding)`.
- **Tests:** `*.test.ts` (Vitest, logic units), `*.spec.ts` (Playwright E2E).

## Comment Density — HIGH

This codebase is **heavily commented at the declaration level**, especially the Prisma schema (`schema.prisma`), where most models and fields carry multi-line rationale comments. Comments explain *why*, not *what* — e.g. idempotency keys, FK/onDelete semantics, security boundaries, and migration history.

Pattern in `lib/*.ts` modules: a leading JSDoc block states the module's purpose, key invariants, and caveats (see `lib/rate-limit.ts`, `lib/env.ts`, `lib/api/route-context.ts`). New code should match this density — explain the decision, not the line.

Section dividers inside larger files use box comments:
```ts
// ─── Section Name ────────────────────────────────────────────────────────────
```

## Error Handling — Server-Side API Routes

Every authenticated route follows the **`{ ctx, error }` guard pattern** via `requireTeamContext` (`lib/api/route-context.ts`):

```ts
export async function POST(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate', feature: 'buildings' })
  if (error) return error
  // ctx.dbUserId, ctx.teamId, ctx.phase, ctx.labType ready
  ...
}
```

This guarantees a uniform sequence: **401 unauth → 429 rate-limited → 404 no team → 403 phase-gate failed**.

### Validation
- **Input:** `parseJson(req, ZodSchema)` (`lib/validation.ts`) — strict zod parse; rejects malformed JSON with 400, rejects unexpected/extra fields (`.strict()`), surfaces the first issue with its field path.
- **Responses (client):** `requestJson(url, ZodSchema, init)` (`lib/api/client.ts`) — runtime-validates responses against a zod schema; throws `ApiError` with status on non-2xx.

### Error response shape
All errors return `NextResponse.json({ error: string }, { status: number })`. Status codes are conventional:
- 400 — validation failure (zod)
- 401 — unauthenticated (no Clerk session)
- 403 — phase-gate failure (`PhaseGateError`)
- 404 — no team / team-scoped resource not found (also the IDOR guard)
- 429 — rate-limited (sets `Retry-After`)
- 500 — unhandled (rare; most paths catch and return a shaped error)

### Logging
- `console.error('[scope] message:', err)` with a bracketed scope tag — e.g. `[unpdf]`, `[r2]`, `[rate-limit]`. Prisma query logging is intentionally OFF (would flood the terminal; flip on temporarily to debug).
- Background promise chains fire-and-forget with `.catch(console.error)` (paper processing, activity logging) so they never crash the request but surface failures.

## Security Conventions (Defense-in-Depth)

Notable choices documented inline:
- **Strict input validation (OWASP API8:2023 — Mass Assignment):** every JSON body is parsed through a *strict* zod schema rejecting extra fields.
- **Team-scoped IDOR guard:** `teamId` is resolved through membership via `pickActiveTeam`, not by trusting a stored `activeTeamId`. Foreign IDs return 404 (not 403) to avoid leaking existence.
- **XSS sanitizer — one shared allowlist:** `ARTICLE_SANITIZE_OPTS` / `TITLE_SANITIZE_OPTS` in `lib/discovery/sanitize.ts`. All server-produced HTML rendered via `dangerouslySetInnerHTML` runs through `sanitize-html` (parses + re-serializes known-safe tags only). "Do NOT fork a looser allowlist — one allowlist, one XSS surface."
- **Lazy server secrets:** `lib/env.ts` validates ONLY the variable it returns, memoized on first use — so `next build` (imports every route) and routes that don't need a given secret never fail on an unrelated unset var.
- **Fail-closed cron:** `lib/cron/auth.ts` returns 503 if `CRON_SECRET` unset rather than world-open.
- **Production view-fingerprint salt required:** `viewFingerprintSalt()` throws in production if `VIEW_FINGERPRINT_SALT` < 16 chars (dev falls back to a labelled constant).
- **Auto-forgery prevention:** client-sent `host`/`credibilityTier` on external sources are advisory only — recomputed server-side at resolve/persist.

## Idempotency — Pervasive Ledger Pattern

Almost every credit/award operation uses a unique-constraint row as the idempotency key so re-clicks/retries never double-pay. Examples in the schema and code:
- `DiscoverySourceVisit` `@@unique([teamId, nodeId])` — first-visit KP ledger
- `LabCreditClaim` `@@unique([userId, day])` — daily lab credit
- `PaperProficiency` / `CodexLessonProgress` — high-water-mark scoring (score & KP never lowered by a weaker retake)
- `Notification` `dedupeKey` unique — cron idempotent
- `TeamDailyTaskDay` / `CodexKpDay` — per-day rollups for daily caps (single fast read + atomic increment)

## Economy & Game Logic Conventions

- **KP / LC:** KP = knowledge points (positive earnings); LC = lab credits (daily per-member). Tracked in `TeamCurrency`.
- **Cost scaling:** building purchase cost scales with the live team member count (`lib/shop.ts`) — bigger teams earn more KP but pay more.
- **High-water marks everywhere:** per-student per-source KP caps (`max 100/source`), and per-student daily caps — enforced atomically at the route, not just by the DB.
- **Deterministic, no-LLM paths:** citation formatting (`lib/literature/citation.ts`) and ISEF rubric scoring (`lib/fairs/isef-rubric.ts` literal) are computed locally + deterministically by design; the DB row is just a cache.

## AI / LLM Conventions

- **Single shared client:** `lib/anthropic.ts` memoized singleton — every Claude call routes through it. Constructed lazily (never at import) so missing keys can't break the build.
- **Server-owned turn lifecycle:** paid-call rows are written `pending` before the LLM call and flipped to `complete`/`error` after — the visible state never silently diverges from whether the paid call succeeded (`PaperChatMessage`, `VegaStudyMessage`, `ExpertiseExam`).
- **Grading claim:** `ExpertiseExam` uses a `grading` claim + stale-detection so a concurrent re-grade can't call Claude twice for one exam.

## State Management Conventions

- **Server-first:** Next App Router data fetching + RSC by default. Most state is server-driven.
- **Client state (Zustand):** used sparingly. Only one store exists (`stores/discoveryStore.ts`) for cross-component discovery-tree state. Most route state doesn't need a client store.
- **Client islands:** `'use client'` only on components that actually need browser APIs / interactivity.

## Import Conventions

- App-internal imports use `@/...` alias, NOT relative paths beyond a single level.
- Within `lib/`, modules import peers via `@/lib/...` (e.g. `combat-engine.ts` imports `@/lib/db`).
- Some deep imports bypass the package barrel: `@/packages/shared-types/src/pvp` and `@/lib/pvp/*`. (This is intentional in spots but inconsistent — see CONCERNS.)
- Server-only modules (env, anthropic, cron/auth) carry a `SERVER-ONLY` docblock warning never to import from client components.

## Naming: Database

- **Models** PascalCase, tables snake_case via `@@map` — `model Team` → `@@map("teams")`.
- **Fields** camelCase, columns snake_case via `@map` — `teamId` → `@map("team_id")`.
- **Enums** snake_case values, `@@map` snake_case type — `UserRole { student, teacher, admin } @map("user_role")`.

## Common Module Skeleton (a representative `lib/` module)

```ts
import { db } from '@/lib/db'
import { serverEnv } from '@/lib/env'

/**
 * <Module purpose — 1 paragraph>
 *
 * <Key invariants / caveats — why these choices>
 */

// ─── Constants ────────────────────────────────────────────────────────────────
export const X = ...
const Y = ...   // not exported if internal

// ─── Exported functions ───────────────────────────────────────────────────────
export async function doThing(...) {
  const _ = serverEnv.SOME_SECRET()  // lazy, memoized
  return db.model.findMany(...)
}
```

*Mapped: 2026-07-19*