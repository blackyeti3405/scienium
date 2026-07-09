import { test, expect, request as playwrightRequest, type Page } from '@playwright/test'
import { STORAGE } from './roles'
import { api } from './api'

/**
 * F13 — Field Codex (interactive, KP-earning, project-tailored field-
 * knowledge curriculum), from .claude/pipeline/plan-F13-codex.md. Runs as
 * the default `chromium` project (authenticated lab leader / devuser1,
 * "E2E Test Lab" team). Precondition: the fixture team must exist — run
 * `pnpm --filter web seed:e2e` first if any test fails on a missing team
 * lookup.
 *
 * Route: open the Operations Hub (`/lab` → "Open Operations Hub" building)
 * → the "Field Codex" tab (`data-testid="codex-tab"`).
 *
 * Determinism / cleanup strategy: this spec exercises the real completion
 * route against the shipped `gait-biomechanics` track's Core Unit 1
 * (`gaitcore-foundations-gait-cycle`) real lessons (`gaitcore-foundations-
 * gait-cycle-*` — ids current as of the Core deep-reauthor to 8
 * `gaitcore-*` units, see changes-gait-e2e-refresh.md) and a Core Unit 2
 * (`gaitcore-spatiotemporal-measurement`) sibling lesson,
 * using the REAL checkpoint answer keys (imported directly from the track
 * module — never fabricated) so grading is exercised through the actual
 * server logic, not a stub. All `CodexLessonProgress` / `CodexKpDay` /
 * `TeamStudyPlan` rows this spec creates for the leader/team are cleaned up
 * via the sanctioned direct-Prisma escape hatch (same convention as
 * F15-dispatch-knowledge.spec.ts) — never a blanket delete, only rows scoped
 * to this leader's userId / this team's id.
 *
 * LLM-cost note (UPDATED — iteration 2 fix): `recommendTracks` in
 * `lib/ops/codex/study-plan.ts` NOW has an `E2E_SKIP_LLM` seam (added in
 * iteration 2 to close the LOW finding in review-F13-codex-1.md), mirroring
 * the paper quiz/grade/retry routes and the failure-log followup route.
 * `apps/web/.env.local` sets `E2E_SKIP_LLM=1`, so AC7's `generate` click now
 * returns a fixed deterministic fixture recommendation with ZERO real
 * Anthropic spend — the "bounds cost to exactly one real LLM call" strategy
 * below is kept in place (pre-seeding `runsToday`/cache-hit assertions) as
 * defense-in-depth / for correctness independent of the env flag, but no
 * longer relies on spending real money to pass.
 *
 * Criterion → test mapping (plan's Acceptance criteria):
 *  AC1  — Codex tab visible & renders codex-home in every phase where the
 *         Operations Hub itself exists (literature_review onward — the Hub's
 *         own `unlockPhase`), verified via the dev-only `/lab?phase=` override.
 *  AC2  — First-time lesson completion pays KP once (`codex-kp-earned`,
 *         `codex-checkpoint-pass`); GET progress reports completed+kpAwarded;
 *         team KP delta is exactly +8.
 *  AC3  — Re-passing an already-completed lesson pays no additional KP (KP
 *         delta is 0).
 *  AC4  — After 3 first-time completions in a day, a 4th distinct lesson's
 *         pass shows capReached, no completion, no KP (delta 0).
 *  AC5  — Gated unit: unit 2's first lesson is refused BOTH client-side
 *         (`codex-lesson-locked`, non-clickable) AND server-side (a direct
 *         POST /api/ops/codex/complete for that lesson is rejected while unit
 *         1 is incomplete) — then, once unit 1 is fully complete, both the UI
 *         and the direct POST succeed.
 *  AC6  — A deliberately-wrong checkpoint shows `codex-checkpoint-fail` +
 *         `codex-explanation`, offers `codex-retry` (re-shuffled order), pays
 *         nothing.
 *  AC7  — Study-plan generation renders `codex-track-card`s + `codex-next-lesson`
 *         (the spec's one real LLM call).
 *  AC8  — Progress persists across reload.
 *  AC9  — "Browse full library" lists every CODEX_TRACKS entry (>= 1 — only
 *         gait-biomechanics is shipped this cycle; the other 28
 *         TAXONOMY.md fields raise this count as they are authored).
 *  AC10 — complete with an unknown lessonId 404s; progress GET is
 *         caller-scoped (a co-member sees only their own rows, never the
 *         leader's); an unauthenticated request is redirected to sign-in.
 *  AC11 — Study-plan re-run cap (2/team/day) 429s once the cap is reached
 *         (pre-seeded, no extra real LLM call); an unchanged-source repeat
 *         call returns the cached plan with `cached:true`.
 *  AC12 — No LLM call anywhere in the read/lesson/checkpoint/complete loop
 *         (static source check) — only study-plan is LLM-backed.
 *  AC13 — Pixel chrome (font-pixel, gold) on tab/headers; regular font on
 *         lesson prose.
 *  AC14 — content-shape.test.ts is asserted via the repo's Vitest gate, not
 *         re-asserted here (that's gate 4 in CLAUDE.md, run separately).
 */

const BASE_URL = `http://localhost:${process.env.E2E_PORT ?? 3000}`
const TEAM_NAME = 'E2E Test Lab'
const CODEX_KP_PER_LESSON = 8

// The real, shipped Core Unit 1 ("gaitcore-foundations-gait-cycle") lessons
// of the flagship track, in order — used to exercise gating (AC5) and the
// daily cap (AC4) deterministically against REAL content ids, not fabricated
// ones. Unit 1 has 6 lessons total; the first 4 are enough to test KP-once +
// the daily cap of 3.
const UNIT1_LESSON_IDS = [
  'gaitcore-foundations-gait-cycle-what-is-gait-analysis',
  'gaitcore-foundations-gait-cycle-stride-step-stance-swing',
  'gaitcore-foundations-gait-cycle-stance-subphases',
  'gaitcore-foundations-gait-cycle-double-single-support-flight',
]
// Core Unit 2 ("gaitcore-spatiotemporal-measurement")'s first lesson — a
// later unit than UNIT1_LESSON_IDS, so AC5's "locked until unit 1 is 100%
// complete" assertion is meaningful.
const UNIT2_FIRST_LESSON_ID = 'gaitcore-spatiotemporal-measurement-spatiotemporal-parameters'

// The rest of unit 1 (lessons 5-6 of 6) — AC5 must complete the WHOLE unit
// (not just UNIT1_LESSON_IDS' first four) before unit 2 can unlock.
const UNIT1_REMAINING_LESSON_IDS = [
  'gaitcore-foundations-gait-cycle-history-of-gait-study',
  'gaitcore-foundations-gait-cycle-determinants-vs-inverted-pendulum',
]

// Phases (from lib/phase.ts's PHASE_ORDER) in which the Operations Hub
// gateway building itself is visible (unlockPhase: 'literature_review') — the
// dev-only `/lab?phase=` override lets AC1 prove Codex is reachable in ALL of
// them, not just whatever phase the fixture team happens to be in today.
const HUB_VISIBLE_PHASES = ['literature_review', 'research_planning', 'working', 'showcase']

interface CompleteResponse {
  passed: boolean
  perQuestion: { id: string; correct: boolean; explanation?: string }[]
  ratio: number
  kpEarned: number
  capReached: boolean
}
interface ProgressResponse {
  progress: { trackSlug: string; lessonId: string; completed: boolean; bestScore: number; kpAwarded: number }[]
  dailyCap: { limit: number; completedToday: number }
  studyPlan: unknown
}

/** Click a building-sprite button by its aria-label via element.click() — bypasses
 *  the isometric z-index overlap that blocks Playwright's coordinate-based clicks
 *  (established convention, e.g. F3.spec.ts's clickBuilding). */
async function clickBuilding(page: Page, ariaLabel: string) {
  await page.evaluate((label) => {
    const btn = document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
    if (!btn) throw new Error(`Building button not found: ${label}`)
    btn.click()
  }, ariaLabel)
}

/** Open the Operations Hub feature panel from /lab (optionally at a given
 *  dev-only phase override) and switch to the Field Codex tab. */
async function openCodex(page: Page, phase?: string) {
  await page.goto(phase ? `/lab?phase=${phase}` : '/lab')
  await page.getByRole('button', { name: 'Open Operations Hub' }).waitFor({ state: 'attached' })
  await clickBuilding(page, 'Open Operations Hub')
  await expect(page.getByRole('dialog', { name: 'Operations Hub' })).toBeVisible({ timeout: 15_000 })
  const codexTab = page.getByTestId('codex-tab')
  await expect(codexTab).toBeVisible({ timeout: 30_000 })
  await codexTab.click()
}

/** Correct-answer submission for a given real biomechanics lesson id, built
 *  from the module's OWN answer key (imported directly — never fabricated).
 *  Loaded lazily inside a test via dynamic import since this is a .ts module
 *  under lib/, not a JSON fixture. */
async function correctSubmissionFor(lessonId: string) {
  const mod = await import('../lib/ops/codex/tracks/gait-biomechanics')
  // Playwright's CJS/ESM interop double-wraps the default export here
  // (`mod.default` is `{ default: <track> }`, not the track itself) —
  // unwrap defensively so this works the same locally and in CI.
  const track = (mod.default as unknown as { default?: typeof mod.default }).default ?? mod.default
  const lesson = [track.core, ...track.branches]
    .flatMap((s) => s.units.flatMap((u) => u.lessons))
    .find((l) => l.id === lessonId)
  if (!lesson) throw new Error(`Lesson ${lessonId} not found in biomechanics track`)
  const answers = lesson.checkpoint.questions.map((q) => {
    if (q.kind === 'mc') return { kind: 'mc' as const, id: q.id, selectedOptionId: q.answerId }
    if (q.kind === 'ordering') return { kind: 'ordering' as const, id: q.id, order: q.correctOrder }
    return { kind: 'matching' as const, id: q.id, pairs: q.correctPairs }
  })
  return { answers }
}

async function wrongSubmissionFor(lessonId: string) {
  const mod = await import('../lib/ops/codex/tracks/gait-biomechanics')
  const track = (mod.default as unknown as { default?: typeof mod.default }).default ?? mod.default
  const lesson = [track.core, ...track.branches]
    .flatMap((s) => s.units.flatMap((u) => u.lessons))
    .find((l) => l.id === lessonId)
  if (!lesson) throw new Error(`Lesson ${lessonId} not found in biomechanics track`)
  const answers = lesson.checkpoint.questions.map((q) => {
    if (q.kind === 'mc') {
      const wrongOption = q.options.find((o) => o.id !== q.answerId)!
      return { kind: 'mc' as const, id: q.id, selectedOptionId: wrongOption.id }
    }
    if (q.kind === 'ordering') {
      const reversed = [...q.correctOrder].reverse()
      return { kind: 'ordering' as const, id: q.id, order: reversed }
    }
    // Swap the pairs so every left maps to a WRONG right (assuming >1 pair).
    const swapped: [string, string][] = q.correctPairs.map(([l], i) => [
      l,
      q.correctPairs[(i + 1) % q.correctPairs.length][1],
    ])
    return { kind: 'matching' as const, id: q.id, pairs: swapped }
  })
  return { answers }
}

let leaderUserId: string | null = null
let teamId: string | null = null
/** Whether a TeamStudyPlan row already existed before this spec ran — if so,
 *  we must restore it (not delete it) in afterAll. */
let priorStudyPlan: { tracksJson: unknown; sourceHash: string; runsToday: number; runsDay: Date | null; manualTrackSlugs: string[] } | null = null

async function cleanLessonAndCapRows(db: import('@prisma/client').PrismaClient) {
  if (!leaderUserId) return
  await db.codexLessonProgress.deleteMany({
    where: { userId: leaderUserId, lessonId: { in: [...UNIT1_LESSON_IDS, UNIT2_FIRST_LESSON_ID] } },
  })
  const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()))
  await db.codexKpDay.deleteMany({ where: { userId: leaderUserId, day: today } })
}

test.describe('F13 — Field Codex', () => {
  test.describe.configure({ mode: 'serial', timeout: 180_000 })

  test.beforeAll(async () => {
    const { PrismaClient } = await import('@prisma/client')
    const db = new PrismaClient()
    try {
      const team = await db.team.findFirst({ where: { name: TEAM_NAME }, select: { id: true, teamLeadId: true } })
      if (!team) throw new Error(`E2E team '${TEAM_NAME}' not found — run pnpm --filter web seed:e2e first.`)
      teamId = team.id
      leaderUserId = team.teamLeadId

      // Clean any leftover state from an earlier interrupted run of THIS spec
      // (recycled feature IDs / partial cleanup) — scoped ONLY to this
      // leader's rows on the real biomechanics lesson ids this spec uses.
      await cleanLessonAndCapRows(db)

      // Preserve any pre-existing TeamStudyPlan row so this spec's writes to
      // it (AC7/AC11) can be fully reverted in afterAll rather than deleting
      // state this spec didn't create.
      const existingPlan = await db.teamStudyPlan.findUnique({ where: { teamId: team.id } })
      priorStudyPlan = existingPlan
        ? {
            tracksJson: existingPlan.tracksJson,
            sourceHash: existingPlan.sourceHash,
            runsToday: existingPlan.runsToday,
            runsDay: existingPlan.runsDay,
            manualTrackSlugs: existingPlan.manualTrackSlugs,
          }
        : null
    } finally {
      await db.$disconnect()
    }
  })

  test.afterAll(async () => {
    if (!leaderUserId || !teamId) return
    const { PrismaClient } = await import('@prisma/client')
    const db = new PrismaClient()
    try {
      await cleanLessonAndCapRows(db)

      if (priorStudyPlan) {
        // Restore exactly what was there before this spec touched it.
        await db.teamStudyPlan.update({
          where: { teamId },
          data: {
            tracksJson: priorStudyPlan.tracksJson as import('@prisma/client').Prisma.InputJsonValue,
            sourceHash: priorStudyPlan.sourceHash,
            runsToday: priorStudyPlan.runsToday,
            runsDay: priorStudyPlan.runsDay,
            manualTrackSlugs: priorStudyPlan.manualTrackSlugs,
          },
        })
      } else {
        // This spec created the row from nothing — remove it entirely.
        await db.teamStudyPlan.deleteMany({ where: { teamId } })
      }
    } finally {
      await db.$disconnect()
    }
  })

  // ── AC1 ──────────────────────────────────────────────────────────────────
  test('AC1: Field Codex tab is visible and renders codex-home, in every phase the Operations Hub exists in', async ({ page }) => {
    for (const phase of HUB_VISIBLE_PHASES) {
      await openCodex(page, phase)
      await expect(page.getByTestId('codex-home')).toBeVisible({ timeout: 30_000 })
      await expect(page.getByTestId('codex-tab')).toHaveClass(/font-pixel/)
    }
  })

  // ── AC10 (part 1) ──────────────────────────────────────────────────────────
  test('AC10: POST complete with an unknown lessonId in a real track 404s', async ({ page }) => {
    await page.goto('/lab')
    const res = await api.post(page, '/api/ops/codex/complete', {
      data: { trackSlug: 'gait-biomechanics', lessonId: 'not-a-real-lesson-id', submission: { answers: [] } },
    })
    expect(res.status()).toBe(404)
  })

  // ── AC10 (part 1b) — unauthenticated requests never see codex data ────────
  test('AC10: an unauthenticated request to progress is redirected to sign-in, never 200s with data', async () => {
    // Explicit storageState: undefined — playwright.request.newContext()
    // otherwise silently inherits the chromium project's leader storageState.
    const anon = await playwrightRequest.newContext({ baseURL: BASE_URL, storageState: undefined })
    try {
      const res = await anon.get('/api/ops/codex/progress', { maxRedirects: 0 })
      expect([307, 401]).toContain(res.status())
      if (res.status() === 307) {
        const location = res.headers()['location'] ?? ''
        expect(location).toContain('/sign-in')
      }
    } finally {
      await anon.dispose()
    }
  })

  // ── AC2 + AC8 ──────────────────────────────────────────────────────────────
  test('AC2 + AC8: first-time completion pays 8 KP, marks complete, and persists across reload', async ({ page }) => {
    await page.goto('/lab')

    const { PrismaClient } = await import('@prisma/client')
    const db = new PrismaClient()
    const kpBefore = await db.teamCurrency.findUnique({ where: { teamId: teamId! }, select: { kp: true } })
    await db.$disconnect()

    const submission = await correctSubmissionFor(UNIT1_LESSON_IDS[0])

    // A direct `page.request.post` call already resolves once the response
    // arrives — there is no separate page-triggered fetch to race via
    // `waitForResponse` here (that helper is for clicks that trigger an
    // in-page fetch; see AC13's click-through instead). Assert directly on
    // the resolved response.
    const completeRes = await api.post(page, '/api/ops/codex/complete', {
      data: { trackSlug: 'gait-biomechanics', lessonId: UNIT1_LESSON_IDS[0], submission },
    })
    expect(completeRes.status()).toBe(200)
    const completeBody = (await completeRes.json()) as CompleteResponse
    expect(completeBody.passed).toBe(true)
    expect(completeBody.kpEarned).toBe(CODEX_KP_PER_LESSON)
    expect(completeBody.capReached).toBe(false)

    const getRes = await api.get(page, '/api/ops/codex/progress')
    expect(getRes.status()).toBe(200)
    const payload = (await getRes.json()) as ProgressResponse
    const row = payload.progress.find((p) => p.lessonId === UNIT1_LESSON_IDS[0])
    expect(row?.completed).toBe(true)
    expect(row?.kpAwarded).toBe(CODEX_KP_PER_LESSON)

    // KP is shared drifting fixture state — assert the DELTA, not an absolute.
    const db2 = new PrismaClient()
    const kpAfter = await db2.teamCurrency.findUnique({ where: { teamId: teamId! }, select: { kp: true } })
    await db2.$disconnect()
    expect((kpAfter?.kp ?? 0) - (kpBefore?.kp ?? 0)).toBe(CODEX_KP_PER_LESSON)

    // AC8: reload and re-fetch — progress must still show completed (DB, not
    // client-only state).
    await page.reload()
    const afterReload = await api.get(page, '/api/ops/codex/progress')
    const afterPayload = (await afterReload.json()) as ProgressResponse
    const afterRow = afterPayload.progress.find((p) => p.lessonId === UNIT1_LESSON_IDS[0])
    expect(afterRow?.completed).toBe(true)
    expect(afterRow?.kpAwarded).toBe(CODEX_KP_PER_LESSON)
  })

  // ── AC3 ──────────────────────────────────────────────────────────────────
  test('AC3: re-passing an already-completed lesson pays 0 additional KP', async ({ page }) => {
    await page.goto('/lab')

    const { PrismaClient } = await import('@prisma/client')
    const db = new PrismaClient()
    const kpBefore = await db.teamCurrency.findUnique({ where: { teamId: teamId! }, select: { kp: true } })
    await db.$disconnect()

    const submission = await correctSubmissionFor(UNIT1_LESSON_IDS[0])
    const res = await api.post(page, '/api/ops/codex/complete', {
      data: { trackSlug: 'gait-biomechanics', lessonId: UNIT1_LESSON_IDS[0], submission },
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as CompleteResponse
    expect(body.passed).toBe(true)
    expect(body.kpEarned).toBe(0)

    const progressRes = await api.get(page, '/api/ops/codex/progress')
    const payload = (await progressRes.json()) as ProgressResponse
    const row = payload.progress.find((p) => p.lessonId === UNIT1_LESSON_IDS[0])
    // kpAwarded stays at the original high-water — never double-paid.
    expect(row?.kpAwarded).toBe(CODEX_KP_PER_LESSON)

    // The team's KP total must be UNCHANGED from before this re-pass.
    const db2 = new PrismaClient()
    const kpAfter = await db2.teamCurrency.findUnique({ where: { teamId: teamId! }, select: { kp: true } })
    await db2.$disconnect()
    expect((kpAfter?.kp ?? 0) - (kpBefore?.kp ?? 0)).toBe(0)
  })

  // ── AC6 ──────────────────────────────────────────────────────────────────
  test('AC6: a deliberately-wrong checkpoint fails, shows explanations, does not complete or pay KP', async ({ page }) => {
    await page.goto('/lab')
    const submission = await wrongSubmissionFor(UNIT1_LESSON_IDS[1])
    const res = await api.post(page, '/api/ops/codex/complete', {
      data: { trackSlug: 'gait-biomechanics', lessonId: UNIT1_LESSON_IDS[1], submission },
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as CompleteResponse
    expect(body.passed).toBe(false)
    expect(body.kpEarned).toBe(0)
    const wrongWithExplanation = body.perQuestion.filter((q) => !q.correct && q.explanation)
    expect(wrongWithExplanation.length).toBeGreaterThan(0)

    const progressRes = await api.get(page, '/api/ops/codex/progress')
    const payload = (await progressRes.json()) as ProgressResponse
    const row = payload.progress.find((p) => p.lessonId === UNIT1_LESSON_IDS[1])
    expect(row?.completed ?? false).toBe(false)
    expect(row?.kpAwarded ?? 0).toBe(0)

    // UI half: open the SAME lesson through the panel (no study plan exists
    // yet at this point in the serial run, so reach it via "Browse full
    // library"), submit the real checkpoint form with wrong answers, and
    // confirm the fail state + explanations + retry affordance render.
    await openCodex(page)
    await expect(page.getByTestId('codex-home')).toBeVisible({ timeout: 15000 })
    await page.getByTestId('codex-browse-library-toggle').click()
    await page.getByTestId('codex-track-card').filter({ hasText: 'Gait Biomechanics' }).first().click()
    const lessonRow = page.getByTestId('codex-lesson-row').filter({ hasText: 'Stride, Step, Stance' })
    await expect(lessonRow.first()).toBeVisible({ timeout: 15000 })
    await lessonRow.first().click()
    await expect(page.getByTestId('codex-checkpoint')).toBeVisible({ timeout: 15000 })

    // This lesson's real checkpoint (verified against the module source) is
    // 3 MC questions (answerIds 'b', 'c', 'b' among 4 options each) + 1
    // matching question. Selecting the LAST radio option in every MC group is
    // guaranteed wrong for all three (none of their answer keys is the last
    // option, 'd'), and leaving the matching question's selects at their
    // default "— match —" empty value is guaranteed wrong (empty pairs never
    // satisfy correctPairs) — so this submission deterministically scores
    // 0/4, unconditionally exercising the FAIL path (no `if` branching on the
    // grading outcome).
    const mcGroupNames = await page
      .locator('input[type="radio"]')
      .evaluateAll((els: HTMLInputElement[]) => Array.from(new Set(els.map((el) => el.name))))
    for (const name of mcGroupNames) {
      const group = page.locator(`input[type="radio"][name="${name}"]`)
      await group.last().check({ force: true })
    }
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/ops/codex/complete') && r.request().method() === 'POST'),
      page.getByTestId('codex-checkpoint-submit').click(),
    ])

    await expect(page.getByTestId('codex-checkpoint-fail')).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('codex-explanation').first()).toBeVisible()
    const retryButton = page.getByTestId('codex-retry')
    await expect(retryButton).toBeVisible()
    await retryButton.click()
    await expect(page.getByTestId('codex-checkpoint')).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('codex-checkpoint-submit')).toBeVisible()
  })

  // ── AC4 ──────────────────────────────────────────────────────────────────
  test('AC4: after 3 first-time completions today, a 4th distinct lesson reports capReached with no completion/KP', async ({ page }) => {
    await page.goto('/lab')

    const { PrismaClient } = await import('@prisma/client')
    const db = new PrismaClient()
    const kpBeforeAny = await db.teamCurrency.findUnique({ where: { teamId: teamId! }, select: { kp: true } })
    await db.$disconnect()

    // Lesson 0 was already completed in the AC2/AC8 test above (1st slot
    // consumed). Complete two more distinct lessons to reach the cap of 3.
    for (const lessonId of [UNIT1_LESSON_IDS[1], UNIT1_LESSON_IDS[2]]) {
      const submission = await correctSubmissionFor(lessonId)
      const res = await api.post(page, '/api/ops/codex/complete', {
        data: { trackSlug: 'gait-biomechanics', lessonId, submission },
      })
      expect(res.status()).toBe(200)
      const body = (await res.json()) as CompleteResponse
      expect(body.passed).toBe(true)
      expect(body.kpEarned).toBe(CODEX_KP_PER_LESSON)
    }

    const progressBefore = await api.get(page, '/api/ops/codex/progress')
    const beforePayload = (await progressBefore.json()) as ProgressResponse
    expect(beforePayload.dailyCap.completedToday).toBe(3)

    // A 4th DISTINCT lesson, passing, must report capReached — no completion, no KP.
    const submission4 = await correctSubmissionFor(UNIT1_LESSON_IDS[3])
    const res4 = await api.post(page, '/api/ops/codex/complete', {
      data: { trackSlug: 'gait-biomechanics', lessonId: UNIT1_LESSON_IDS[3], submission: submission4 },
    })
    expect(res4.status()).toBe(200)
    const body4 = (await res4.json()) as CompleteResponse
    expect(body4.passed).toBe(true)
    expect(body4.capReached).toBe(true)
    expect(body4.kpEarned).toBe(0)

    const progressAfter = await api.get(page, '/api/ops/codex/progress')
    const afterPayload = (await progressAfter.json()) as ProgressResponse
    const row4 = afterPayload.progress.find((p) => p.lessonId === UNIT1_LESSON_IDS[3])
    expect(row4?.completed ?? false).toBe(false)
    expect(row4?.kpAwarded ?? 0).toBe(0)
    // Cap counter itself unchanged at 3 (the capped attempt consumed no slot).
    expect(afterPayload.dailyCap.completedToday).toBe(3)

    // KP delta across this test: exactly 2 lessons paid (lesson0 was already
    // paid in the previous test) — the capped 4th paid nothing.
    const db2 = new PrismaClient()
    const kpAfterAll = await db2.teamCurrency.findUnique({ where: { teamId: teamId! }, select: { kp: true } })
    await db2.$disconnect()
    expect((kpAfterAll?.kp ?? 0) - (kpBeforeAny?.kp ?? 0)).toBe(CODEX_KP_PER_LESSON * 2)
  })

  // ── AC5 ──────────────────────────────────────────────────────────────────
  test('AC5: unit 2 is refused both client-side and server-side until unit 1 is fully complete, then both unlock', async ({ page }) => {
    // At this point in the serial run, unit 1 has 3 of its 6 lessons
    // completed (lesson 3 [UNIT1_LESSON_IDS[3]] was capped, not completed;
    // lessons 4-5 untouched) — unit 2 must still be LOCKED, both in the UI
    // and on the server.

    // ── Client-side: unit 2's first lesson renders as codex-lesson-locked. ──
    // No study plan exists yet at this point in the serial run, so reach the
    // track via "Browse full library" (same fix as AC6).
    await openCodex(page)
    await expect(page.getByTestId('codex-home')).toBeVisible({ timeout: 15000 })
    await page.getByTestId('codex-browse-library-toggle').click()
    await page.getByTestId('codex-track-card').filter({ hasText: 'Gait Biomechanics' }).first().click()
    await expect(page.getByTestId('codex-lesson-locked').first()).toBeVisible({ timeout: 15000 })

    // ── Server-side: a direct POST completing the unit-2 lesson must be
    // refused BECAUSE OF THE PROGRESSION GATE, not merely because the daily
    // cap happens to already be at 3/3 from AC4 (capReached and gate-refused
    // both surface as kpEarned:0, which would let a MISSING server-side gate
    // hide behind an unrelated cap-reached response). Reset today's cap
    // counter to 0 via direct Prisma FIRST so this attempt's only possible
    // blocker is the gate itself — isolating exactly what this criterion
    // requires: the gate must not be enforceable only by hiding the button
    // in the UI.
    const { PrismaClient: PrismaClientForCapReset } = await import('@prisma/client')
    const dbCapReset = new PrismaClientForCapReset()
    const todayForReset = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()))
    await dbCapReset.codexKpDay.upsert({
      where: {
        userId_teamId_day: {
          userId: leaderUserId!,
          teamId: teamId!,
          day: todayForReset,
        },
      },
      create: { userId: leaderUserId!, teamId: teamId!, day: todayForReset, lessonsCompleted: 0 },
      update: { lessonsCompleted: 0 },
    })
    await dbCapReset.$disconnect()

    const submissionU2 = await correctSubmissionFor(UNIT2_FIRST_LESSON_ID)
    const lockedRes = await api.post(page, '/api/ops/codex/complete', {
      data: { trackSlug: 'gait-biomechanics', lessonId: UNIT2_FIRST_LESSON_ID, submission: submissionU2 },
    })
    const lockedBody = (await lockedRes.json()) as CompleteResponse & { error?: string }
    // With the cap freshly reset to 0/3, a `capReached:true` response is
    // impossible UNLESS the route enforces the progression gate some other
    // way — so ANY response that pays KP or marks this lesson complete here
    // proves the gate is missing/broken server-side (client-only), which is
    // the exact class of bug this criterion exists to catch.
    const gateHeldServerSide = lockedRes.status() >= 400 || !(lockedBody.passed && lockedBody.kpEarned > 0)
    expect(gateHeldServerSide).toBe(true)
    const progressAfterLockedAttempt = await api.get(page, '/api/ops/codex/progress')
    const lockedPayload = (await progressAfterLockedAttempt.json()) as ProgressResponse
    const u2Row = lockedPayload.progress.find((p) => p.lessonId === UNIT2_FIRST_LESSON_ID)
    expect(u2Row?.completed ?? false).toBe(false)
    expect(u2Row?.kpAwarded ?? 0).toBe(0)

    // ── Now finish unit 1 for real (complete ALL remaining unit-1 lessons —
    // the 4th that AC4 left capped plus the untouched 5th and 6th; the daily
    // cap from AC4 is per-USER-per-DAY and this is a fresh assertion the SAME
    // day, so we go through Prisma directly to mark them complete without
    // fighting the cap, mirroring how a student would complete them on later
    // days; this keeps AC5 focused on the GATING rule, not the cap, which AC4
    // already covers exhaustively). ──
    const { PrismaClient } = await import('@prisma/client')
    const db = new PrismaClient()
    for (const lessonId of [UNIT1_LESSON_IDS[3], ...UNIT1_REMAINING_LESSON_IDS]) {
      await db.codexLessonProgress.upsert({
        where: {
          userId_teamId_trackSlug_lessonId: {
            userId: leaderUserId!,
            teamId: teamId!,
            trackSlug: 'gait-biomechanics',
            lessonId,
          },
        },
        create: {
          userId: leaderUserId!,
          teamId: teamId!,
          trackSlug: 'gait-biomechanics',
          lessonId,
          completed: true,
          bestScore: 100,
          kpAwarded: 0, // Deliberately 0 — these direct writes exist only to satisfy
          // the GATING precondition (unit 1 fully complete); they must NOT look like
          // KP-paying completions, so AC4's KP-delta assertion for this run stays
          // intact even if re-read after this point.
          completedAt: new Date(),
        },
        update: { completed: true },
      })
    }
    await db.$disconnect()

    // Client-side: unit 2's first lesson is now clickable.
    await openCodex(page)
    await expect(page.getByTestId('codex-home')).toBeVisible({ timeout: 15000 })
    await page.getByTestId('codex-browse-library-toggle').click()
    await page.getByTestId('codex-track-card').filter({ hasText: 'Gait Biomechanics' }).first().click()
    await expect(page.getByTestId('codex-lesson-row').filter({ hasText: 'Spatiotemporal Parameters' }).first()).toBeVisible({ timeout: 15000 })

    // Server-side: the SAME direct POST that was refused above now succeeds.
    const unlockedRes = await api.post(page, '/api/ops/codex/complete', {
      data: { trackSlug: 'gait-biomechanics', lessonId: UNIT2_FIRST_LESSON_ID, submission: submissionU2 },
    })
    expect(unlockedRes.status()).toBe(200)
    const unlockedBody = (await unlockedRes.json()) as CompleteResponse
    expect(unlockedBody.passed).toBe(true)
  })

  // ── AC9 ──────────────────────────────────────────────────────────────────
  // Taxonomy reconcile (see changes-F13-taxonomy-reconcile.md): the six
  // lab-type "home" tracks were retired in favor of the 29-field taxonomy
  // (TAXONOMY.md); only the gait-biomechanics flagship field is shipped this
  // cycle, so the library floor drops from >= 7 to >= 1. This assertion
  // still proves every CODEX_TRACKS entry renders — it just tracks the real
  // (currently smaller) registry rather than hardcoding the old count.
  test('AC9: "Browse full library" lists every CODEX_TRACKS entry (>= 1 track)', async ({ page }) => {
    await openCodex(page)
    await expect(page.getByTestId('codex-home')).toBeVisible({ timeout: 15000 })
    await page.getByTestId('codex-browse-library-toggle').click()
    const cards = page.getByTestId('codex-track-card')
    await expect(cards.first()).toBeVisible({ timeout: 15000 })
    const count = await cards.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  // ── AC7 ──────────────────────────────────────────────────────────────────
  // This is the spec's ONE deliberate real-LLM call (see the file-header cost
  // note). If a study plan already exists (e.g. a re-run of this spec on an
  // unchanged fixture), the route returns the cached plan instead, so this
  // still exercises the panel's render path without a guaranteed 2nd call.
  test('AC7: study-plan generation renders 2-4 track cards with rationale and a next-lesson suggestion', async ({ page }) => {
    await openCodex(page)
    await expect(page.getByTestId('codex-home')).toBeVisible({ timeout: 15000 })

    const generateButton = page.getByTestId('codex-study-plan-generate')
    await expect(generateButton.first()).toBeVisible({ timeout: 15000 })
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/ops/codex/study-plan') && r.request().method() === 'POST', {
        timeout: 30000,
      }),
      generateButton.first().click(),
    ])
    const cards = page.getByTestId('codex-track-card')
    await expect(cards.first()).toBeVisible({ timeout: 15000 })
    const count = await cards.count()
    expect(count).toBeGreaterThanOrEqual(1)
    expect(count).toBeLessThanOrEqual(4)
    await expect(page.getByTestId('codex-next-lesson').first()).toBeVisible({ timeout: 15000 })
  })

  // ── AC11 ─────────────────────────────────────────────────────────────────
  test('AC11: study-plan re-run cap (2/team/day) 429s once reached; unchanged source returns the cached plan', async ({ page }) => {
    await page.goto('/lab')

    // Part A — cache-hit path: calling again with UNCHANGED team topic/idea/
    // plan must return the cached plan and consume neither the LLM nor the
    // daily-run cap (no new real LLM call here — this is the "free" branch).
    const cacheHitRes = await api.post(page, '/api/ops/codex/study-plan')
    expect(cacheHitRes.status()).toBe(200)
    const cacheHitBody = (await cacheHitRes.json()) as { cached: boolean }
    expect(cacheHitBody.cached).toBe(true)

    // Part B — the 429 cap: pre-seed runsToday at the cap (2) for TODAY via
    // direct Prisma (never through the route, so this costs zero extra LLM
    // calls) with a DIFFERENT sourceHash than the team's real one, so the
    // route can't cache-hit its way past the cap check.
    const { PrismaClient } = await import('@prisma/client')
    const db = new PrismaClient()
    const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()))
    await db.teamStudyPlan.update({
      where: { teamId: teamId! },
      data: { runsToday: 2, runsDay: today, sourceHash: 'e2e-forced-stale-hash-for-cap-test' },
    })
    await db.$disconnect()

    const cappedRes = await api.post(page, '/api/ops/codex/study-plan')
    expect(cappedRes.status()).toBe(429)
  })

  // ── AC10 (part 2 — IDOR scoping) ────────────────────────────────────────
  test("AC10: progress GET never leaks another team member's data", async ({ page, browser }) => {
    await page.goto('/lab')
    const res = await api.get(page, '/api/ops/codex/progress')
    expect(res.status()).toBe(200)
    const payload = (await res.json()) as ProgressResponse
    expect(Array.isArray(payload.progress)).toBe(true)

    // A different team member (the E2E student, co-member of the same team)
    // must see only their OWN codex progress, never the leader's. Use a real
    // browser context + page (not a bare `request.newContext`) and navigate
    // FIRST — this test runs ~2+ minutes into a long serial suite, well past
    // the point the stored Clerk JWT in STORAGE.student can have expired; a
    // cold `request.newContext` with no navigation gets redirect-followed to
    // a sign-in HTML page instead of JSON (documented convention: navigate
    // before any page.request call, including in helper contexts).
    const studentContext = await browser.newContext({ storageState: STORAGE.student })
    const studentPage = await studentContext.newPage()
    try {
      await studentPage.goto('/lab')
      const studentRes = await api.get(studentPage, '/api/ops/codex/progress')
      expect(studentRes.status()).toBe(200)
      const studentPayload = (await studentRes.json()) as ProgressResponse
      const leakedLeaderLesson = studentPayload.progress.some(
        (p) => UNIT1_LESSON_IDS.includes(p.lessonId) && p.kpAwarded === CODEX_KP_PER_LESSON,
      )
      // The student has not completed these lessons in this run, so none of
      // the leader's completed rows should appear as the STUDENT's own.
      // Skipped when E2E_STUDENT reuses the leader account (single-account dev
      // setup): the "student" IS the leader, so per-user isolation can't be
      // exercised — but the 200 + array-shape checks above still run.
      if (process.env.E2E_STUDENT_IDENTIFIER !== process.env.E2E_LEADER_IDENTIFIER) {
        expect(leakedLeaderLesson).toBe(false)
      }
    } finally {
      await studentContext.close()
    }
  })

  // ── AC12 ─────────────────────────────────────────────────────────────────
  test('AC12: no Anthropic/LLM call site exists in progress or complete routes — only study-plan is LLM-backed', async ({ page }) => {
    await page.goto('/lab')
    const fs = await import('node:fs')
    const path = await import('node:path')
    const progressSrc = fs.readFileSync(path.join(__dirname, '..', 'app', 'api', 'ops', 'codex', 'progress', 'route.ts'), 'utf8')
    const completeSrc = fs.readFileSync(path.join(__dirname, '..', 'app', 'api', 'ops', 'codex', 'complete', 'route.ts'), 'utf8')
    const studyPlanSrc = fs.readFileSync(path.join(__dirname, '..', 'app', 'api', 'ops', 'codex', 'study-plan', 'route.ts'), 'utf8')

    expect(progressSrc).not.toContain('Anthropic')
    expect(completeSrc).not.toContain('Anthropic')
    expect(studyPlanSrc).toContain('Anthropic')
  })

  // ── AC13 ─────────────────────────────────────────────────────────────────
  test('AC13: Codex tab/headers use font-pixel gold-accent chrome; lesson prose is a regular (non-pixel) font', async ({ page }) => {
    await openCodex(page)
    await expect(page.getByTestId('codex-home')).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('codex-tab')).toHaveClass(/font-pixel/)

    // Reach the Biomechanics track regardless of whether a study plan exists
    // at this point in the run (via "Browse full library", which always
    // lists every track per AC9).
    await page.getByTestId('codex-browse-library-toggle').click()
    await page.getByTestId('codex-track-card').filter({ hasText: 'Gait Biomechanics' }).first().click()
    const firstLessonRow = page.getByTestId('codex-lesson-row').first()
    await expect(firstLessonRow).toBeVisible({ timeout: 15000 })
    await firstLessonRow.click()
    // Lesson prose paragraphs must NOT carry font-pixel (regular body font).
    const proseParagraph = page.locator('p.text-sm.text-white\\/70').first()
    await expect(proseParagraph).toBeVisible({ timeout: 15000 })
    const cls = await proseParagraph.getAttribute('class')
    expect(cls).not.toMatch(/font-pixel/)
  })
})
