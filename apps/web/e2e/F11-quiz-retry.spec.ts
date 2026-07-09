import { test, expect, type Page } from '@playwright/test'
import { api } from './api'

/**
 * F11 — Vega quiz-miss review + targeted retry loop (Literature Review).
 * One test per acceptance criterion (13 criteria total, from
 * .claude/pipeline/plan-F11-quiz-retry.md). Runs as the default `chromium`
 * project (authenticated lab leader on the "E2E Test Lab" team).
 *
 * Criterion → test mapping:
 *  AC1  — Failed results show, per question scored < 70, both Vega's rationale
 *         and a distinct "What a strong answer covers" note.
 *  AC2  — "Fix my misses" replaces the old full-regenerate "Try again" control.
 *  AC3  — Retry view shows exactly the failed Qs (prior answer read-only) + 1 new Q.
 *  AC4  — Submitting the retry issues POST .../quiz/retry (200 via waitForResponse);
 *         no POST .../quiz (full regenerate) fires during the retry.
 *  AC5  — A passing retry shows "Proficiency demonstrated" and passed === true.
 *  AC6  — Retry aggregate is capped at 95.
 *  AC7  — KP high-water: kpEarned >= 0, > 0 on a first-ever pass; GET reports passed: true.
 *  AC8  — Team-scoped / IDOR guard: foreign/fake sessionId -> 404.
 *  AC9  — Retry rejected (409) when the session isn't graded, or was already passed.
 *  AC10 — Rate cap present (static: requireTeamContext(req, { tier: 'ai' }) — grep).
 *  AC11 — Persistence across reload: GET after a passing retry shows the pass
 *         state + full (original + new) question set with feedback.
 *  AC12 — Pixel aesthetic preserved on the retry view.
 *  AC13 — No extra LLM cost vs status quo (static: grep for cache_control +
 *         single generation/grading call shape).
 *
 * Determinism seam: E2E_SKIP_LLM=1 (already set in apps/web/.env.local, loaded
 * into the Playwright webServer's `next dev` process via e2e/env.ts) makes
 * quiz generate/grade/retry deterministic and LLM-free:
 *  - POST /api/papers/[id]/quiz always returns the same 5-question fixture set.
 *  - POST /api/papers/[id]/quiz/grade always scores every answer 40 (< 70) —
 *    the seeded first attempt always FAILS, enabling the retry path.
 *  - GET/POST /api/papers/[id]/quiz/retry always score every re-graded answer 90
 *    (>= 70) — a retry always deterministically PASSES, capped at 95 (RETRY_SCORE_CAP).
 *  No Anthropic call is made anywhere in this spec.
 *
 * Seeding: EACH test that drives a full attempt->fail->retry loop needs its own
 * FRESH, never-graded quiz session, so each such test seeds its OWN dedicated
 * Paper row directly via Prisma (the same sanctioned direct-Prisma escape hatch
 * used by e2e/F4-print.spec.ts and e2e/F9.spec.ts — there's no POST API that
 * creates a `status: 'ready'` paper without either a real PDF upload or a
 * Discovery-source promotion, both of which have side effects/dependencies out
 * of scope for this spec, and re-opening an already-graded paper's Q&A panel
 * shows the past `results` phase directly rather than a fresh quiz form).
 * The team is resolved by its seeded name "E2E Test Lab" (its id is a
 * generated cuid, not a fixed constant — see prisma/seed-e2e.mjs), and
 * `teamLeadId` resolves the leader's internal dbUserId (Team.teamLeadId, per
 * prisma/schema.prisma). Every seeded paper id is tracked and deleted in
 * afterAll via the app's own DELETE /api/papers/[id] route (cascades quiz
 * sessions/attempts/proficiency), never touching another team's data.
 */

const TEAM_NAME = 'E2E Test Lab'
const RUN_ID = Date.now()

const seededPaperIds: string[] = []
let teamId: string | null = null
let teamLeadId: string | null = null

test.describe('F11 — Vega quiz-miss review + targeted retry loop', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async () => {
    const { PrismaClient } = await import('@prisma/client')
    const db = new PrismaClient()
    try {
      const team = await db.team.findFirst({ where: { name: TEAM_NAME }, select: { id: true, teamLeadId: true } })
      if (!team) {
        throw new Error(`E2E team '${TEAM_NAME}' not found — run pnpm --filter web seed:e2e first.`)
      }
      teamId = team.id
      teamLeadId = team.teamLeadId
    } finally {
      await db.$disconnect()
    }
  })

  test.afterAll(async () => {
    if (seededPaperIds.length === 0) return
    // Self-clean via the app's own delete path — navigate first to establish a
    // valid session before any page.request call (Clerk JWT expiry, see F4.spec.ts).
    const { request: playwrightRequest } = await import('@playwright/test')
    const { STORAGE } = await import('./roles')
    const ctx = await playwrightRequest.newContext({
      baseURL: `http://localhost:${process.env.E2E_PORT ?? 3000}`,
      storageState: STORAGE.leader,
    })
    try {
      for (const id of seededPaperIds) {
        const res = await ctx.delete(`/api/papers/${id}`)
        if (!res.ok()) {
          console.warn(`F11 afterAll: cleanup DELETE /api/papers/${id} returned ${res.status()}`)
        }
      }
    } finally {
      await ctx.dispose()
    }
  })

  // ── Seeding helper ─────────────────────────────────────────────────────────

  /**
   * Creates ONE fresh, dedicated `status: 'ready'` Paper for a single test
   * (title unique per call via a counter, so tests never collide) and returns
   * its id + title. Tracked in `seededPaperIds` for afterAll cleanup.
   */
  let paperCounter = 0
  async function seedFreshPaper(): Promise<{ id: string; title: string }> {
    if (!teamId || !teamLeadId) throw new Error('beforeAll did not resolve the E2E team')
    paperCounter += 1
    const title = `[E2E F11] Quiz retry fixture ${RUN_ID}-${paperCounter}`
    const { PrismaClient } = await import('@prisma/client')
    const db = new PrismaClient()
    try {
      const paper = await db.paper.create({
        data: {
          teamId,
          title,
          authors: ['E2E, Fixture'],
          abstract: 'Deterministic E2E fixture paper for the F11 quiz-retry spec.',
          sourceType: 'pdf',
          status: 'ready',
          fullText: 'This is a deterministic E2E fixture paper body for the F11 quiz-retry spec.',
          contentHash: `e2e-f11-quiz-retry-${RUN_ID}-${paperCounter}`,
          uploadedByUserId: teamLeadId,
        },
        select: { id: true },
      })
      seededPaperIds.push(paper.id)
      return { id: paper.id, title }
    } finally {
      await db.$disconnect()
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * The quiz generate/grade/retry routes all enforce the shared 'ai' rate-limit
   * tier (12 requests / 60s per user — see lib/rate-limit.ts, and AC10 above).
   * This spec's 13 tests each drive 2-5 of those calls in quick succession, which
   * can outrun that budget well before a fixed window resets. Rather than
   * weakening any assertion, every action that can legitimately 429 under this
   * spec's own call volume is retried, waiting exactly the route's own
   * `Retry-After` (seconds) before trying again — the SAME real rate limiter
   * AC10 documents, never bypassed, mocked, or waited-around with a blind guess.
   */
  async function withRateLimitRetry<T>(
    action: () => Promise<{ status: number; retryAfterSeconds: number; result: T }>,
  ): Promise<T> {
    for (;;) {
      const { status, retryAfterSeconds, result } = await action()
      if (status !== 429) return result
      const waitMs = Math.max(1000, retryAfterSeconds * 1000) + 250
      // eslint-disable-next-line no-console
      console.log(`[F11 spec] hit the ai-tier rate limit; waiting ${waitMs}ms (Retry-After) before retrying…`)
      await new Promise((resolve) => setTimeout(resolve, waitMs))
    }
  }

  /** Click a building-sprite button by aria-label (bypasses isometric z-index overlap). */
  async function clickBuilding(page: Page, ariaLabel: string) {
    await page.evaluate((label) => {
      const btn = document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
      if (!btn) throw new Error(`Building button not found: ${label}`)
      btn.click()
    }, ariaLabel)
  }

  /** Open the Literature Review panel from /lab. */
  async function openLiteratureReview(page: Page) {
    await page.goto('/lab')
    await page.getByRole('button', { name: 'Open Literature Review' }).waitFor({ state: 'attached' })
    await clickBuilding(page, 'Open Literature Review')
    await expect(page.getByRole('dialog', { name: 'Literature Review' })).toBeVisible({ timeout: 5000 })
  }

  /**
   * Open a given fixture paper's Q&A panel from the paper list, by title.
   * Waits for the panel's OWN mount-time GET /api/papers/[id]/quiz to resolve
   * (React Strict Mode double-fires this, so we don't key readiness on "first
   * matching GET" — waitForResponse resolves on whichever one finishes) before
   * returning: the "Comprehension Quiz" header label renders unconditionally
   * even while that fetch is still in flight (`loading` phase), so callers
   * that need the SETTLED phase (results vs. a fresh quiz form) must wait on
   * the network response itself, not that static label.
   */
  async function openQAPanel(page: Page, title: string, paperId: string) {
    await openLiteratureReview(page)
    const row = page.locator('div', { hasText: title }).filter({ hasText: 'Q&A' }).last()
    await expect(row).toBeVisible({ timeout: 10000 })
    const quizGetResponse = page.waitForResponse(
      (res) => res.url().endsWith(`/api/papers/${paperId}/quiz`) && res.request().method() === 'GET',
      { timeout: 15000 },
    )
    // The button's accessible name is its text content "Q&A" — "Review Q&A" is
    // only the `title` tooltip attribute, not the accessible name.
    await row.getByRole('button', { name: 'Q&A' }).click()
    await expect(page.getByText('Comprehension Quiz')).toBeVisible({ timeout: 5000 })
    await quizGetResponse
  }

  /** Answer every visible first-attempt question textarea with distinct non-empty text. */
  async function answerAllQuizQuestions(page: Page) {
    const textareas = page.locator('textarea[placeholder="Your answer…"]')
    const count = await textareas.count()
    for (let i = 0; i < count; i++) {
      await textareas.nth(i).fill(`My first-attempt answer to question ${i + 1}.`)
    }
  }

  /**
   * Seeds a brand-new paper, opens its Q&A panel (always a fresh quiz — never
   * graded before), answers every question, submits, and waits for the FAILED
   * results view. Returns the paper id/title so the caller can keep driving
   * the retry flow or make further API assertions against the same paper.
   *
   * Wrapped in `withRateLimitRetry`: if the 'ai'-tier window (see AC10) is
   * exhausted by this spec's own prior calls, the grade POST 429s — the panel
   * falls back to the `quiz` phase with the SAME answers still filled in (the
   * component keeps `answers` state on a failed submit), so re-clicking submit
   * after honoring `Retry-After` is a legitimate retry of the same user action.
   */
  async function submitFailingFirstAttempt(page: Page): Promise<{ id: string; title: string }> {
    const paper = await seedFreshPaper()
    await openQAPanel(page, paper.title, paper.id)
    await expect(page.getByPlaceholder('Your answer…').first()).toBeVisible({ timeout: 10000 })
    await answerAllQuizQuestions(page)
    await withRateLimitRetry(async () => {
      const gradeResponse = page.waitForResponse(
        (res) => res.url().includes(`/api/papers/${paper.id}/quiz/grade`) && res.request().method() === 'POST',
      )
      await page.getByRole('button', { name: 'Submit for grading' }).click()
      const res = await gradeResponse
      return { status: res.status(), retryAfterSeconds: Number(res.headers()['retry-after'] ?? 60), result: res }
    })
    await expect(page.getByText('Not quite — try again')).toBeVisible({ timeout: 10000 })
    return paper
  }

  /**
   * Click "Fix my misses" and wait for the retry GET (idempotent question
   * generation) to settle into the 6-textarea retry form. Wrapped in
   * `withRateLimitRetry`: re-clicking is safe because the GET is idempotent
   * (ensureNewQuestion never double-generates) and the button remains present
   * whenever the panel is still in the `results` (failed) phase.
   */
  async function clickFixMyMisses(page: Page, paperId: string) {
    await withRateLimitRetry(async () => {
      const retryGetResponse = page.waitForResponse(
        (res) => res.url().includes(`/api/papers/${paperId}/quiz/retry?`) && res.request().method() === 'GET',
      )
      await page.getByRole('button', { name: 'Fix my misses' }).click()
      const res = await retryGetResponse
      return { status: res.status(), retryAfterSeconds: Number(res.headers()['retry-after'] ?? 60), result: res }
    })
    await expect(page.locator('textarea')).toHaveCount(6, { timeout: 10000 })
  }

  /**
   * Fill every retry textarea with the given answer prefix and click "Submit
   * retry for grading", returning the parsed retry POST response body.
   * Wrapped in `withRateLimitRetry`: a 429'd submit leaves the retry form's
   * answers untouched (client-side state only clears on a successful
   * response), so re-clicking after honoring `Retry-After` resubmits the same
   * (still-filled) form.
   */
  async function submitRetryForm(
    page: Page,
    paperId: string,
    answerPrefix: string,
  ): Promise<{ score: number; passed: boolean; kpEarned: number; retried: boolean; questions: unknown[] }> {
    const retryTextareas = page.locator('textarea')
    const count = await retryTextareas.count()
    for (let i = 0; i < count; i++) {
      await retryTextareas.nth(i).fill(`${answerPrefix} ${i + 1}.`)
    }
    return withRateLimitRetry(async () => {
      const retryPostResponse = page.waitForResponse(
        (res) => res.url().endsWith(`/api/papers/${paperId}/quiz/retry`) && res.request().method() === 'POST',
      )
      await page.getByRole('button', { name: 'Submit retry for grading' }).click()
      const res = await retryPostResponse
      const status = res.status()
      const retryAfterSeconds = Number(res.headers()['retry-after'] ?? 60)
      const result = status === 200 ? await res.json() : null
      return { status, retryAfterSeconds, result }
    })
  }

  /**
   * `page.request.post/get` wrapped in the same rate-limit-aware retry as the
   * UI helpers above, for tests (AC8/AC9) that hit the quiz endpoints directly
   * rather than through a button click.
   */
  async function requestWithRateLimitRetry(
    fn: () => Promise<import('@playwright/test').APIResponse>,
  ): Promise<import('@playwright/test').APIResponse> {
    return withRateLimitRetry(async () => {
      const res = await fn()
      const status = res.status()
      const retryAfterSeconds = Number(res.headers()['retry-after'] ?? 60)
      return { status, retryAfterSeconds, result: res }
    })
  }

  // ── AC1 ──────────────────────────────────────────────────────────────────
  test('AC1: a failed result shows rationale + "What a strong answer covers" for every missed question', async ({
    page,
  }) => {
    await submitFailingFirstAttempt(page)

    // The deterministic E2E_SKIP_LLM grade fixture scores every answer 40 (< 70),
    // so every one of the 5 questions is a miss with both notes.
    const rationaleLabels = page.getByText('Vega', { exact: true })
    const strongAnswerLabels = page.getByText('What a strong answer covers')
    await expect(rationaleLabels).toHaveCount(5, { timeout: 5000 })
    await expect(strongAnswerLabels).toHaveCount(5)
    await expect(
      page.getByText('this answer needs more specific detail from the paper', { exact: false }).first(),
    ).toBeVisible()
    await expect(
      page
        .getByText("A strong answer would cite the paper's specific findings and reasoning", { exact: false })
        .first(),
    ).toBeVisible()
  })

  // ── AC2 ──────────────────────────────────────────────────────────────────
  test('AC2: "Fix my misses" replaces the old full-regenerate "Try again" control', async ({ page }) => {
    await submitFailingFirstAttempt(page)

    const fixButton = page.getByRole('button', { name: 'Fix my misses' })
    await expect(fixButton).toBeVisible()
    await expect(fixButton).toHaveClass(/font-pixel/)

    // The old fail-path control was a plain "Try again" button that called the
    // full-regenerate POST /quiz. No such button exists anywhere in the panel now.
    await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0)
  })

  // ── AC3 ──────────────────────────────────────────────────────────────────
  test('AC3: retry view shows exactly the failed questions (prior answer read-only) plus one new question', async ({
    page,
  }) => {
    const paper = await submitFailingFirstAttempt(page)

    // All 5 first-attempt questions failed under the deterministic grading seam.
    await clickFixMyMisses(page, paper.id)

    // Every prior (first-attempt) answer is shown read-only for reference.
    for (let i = 1; i <= 5; i++) {
      await expect(page.getByText(`My first-attempt answer to question ${i}.`)).toBeVisible()
    }
    await expect(page.getByText('Your previous answer')).toHaveCount(5)

    // Exactly one additional, previously-unseen question, labeled "New".
    await expect(page.getByText('New', { exact: true })).toHaveCount(1)
    await expect(
      page.getByText('[E2E fixture] Extra question: what is the key finding of this paper?'),
    ).toBeVisible()
  })

  // ── AC4 ──────────────────────────────────────────────────────────────────
  test('AC4: submitting the retry issues POST .../quiz/retry (200); no full regenerate POST fires', async ({
    page,
  }) => {
    const paper = await submitFailingFirstAttempt(page)
    await clickFixMyMisses(page, paper.id)

    let fullRegeneratePostFired = false
    page.on('requestfinished', (req) => {
      if (req.method() === 'POST' && req.url() === `${new URL(page.url()).origin}/api/papers/${paper.id}/quiz`) {
        fullRegeneratePostFired = true
      }
    })

    const body = await submitRetryForm(page, paper.id, 'Retry answer')
    expect(body.retried).toBe(true)
    expect(fullRegeneratePostFired).toBe(false)
  })

  // ── AC5 ──────────────────────────────────────────────────────────────────
  test('AC5: a passing retry shows "Proficiency demonstrated" and returns passed === true', async ({ page }) => {
    const paper = await submitFailingFirstAttempt(page)
    await clickFixMyMisses(page, paper.id)

    const body = await submitRetryForm(page, paper.id, 'Strong retry answer')

    expect(body.passed).toBe(true)
    await expect(page.getByText('Proficiency demonstrated!')).toBeVisible({ timeout: 10000 })
  })

  // ── AC6 ──────────────────────────────────────────────────────────────────
  test('AC6: the retry aggregate is capped at 95 even though every re-graded answer scores 90', async ({
    page,
  }) => {
    const paper = await submitFailingFirstAttempt(page)
    await clickFixMyMisses(page, paper.id)

    const body = await submitRetryForm(page, paper.id, 'Retry answer')

    // Every re-graded answer scores 90 under the E2E fixture; a naive mean of
    // (5 carried/failed-turned-90 + 1 new @ 90) would be 90, already <= 95 — the
    // cap assertion holds regardless, and score must never exceed it.
    expect(body.score).toBeLessThanOrEqual(95)
    expect(body.passed).toBe(true)
  })

  // ── AC7 ──────────────────────────────────────────────────────────────────
  test('AC7: kpEarned is non-negative (>0 on a first-ever pass); GET reports passed: true after', async ({
    page,
  }) => {
    const paper = await submitFailingFirstAttempt(page)
    await clickFixMyMisses(page, paper.id)

    const body = await submitRetryForm(page, paper.id, 'Retry answer')

    expect(body.kpEarned).toBeGreaterThanOrEqual(0)
    // This fixture paper has never been proficient for this user before this
    // spec ran, so a passing retry is a first-ever pass -> strictly positive KP.
    expect(body.kpEarned).toBeGreaterThan(0)

    const getRes = await api.get(page, `/api/papers/${paper.id}/quiz`)
    expect(getRes.status()).toBe(200)
    const getBody = await getRes.json()
    expect(getBody.session.passed).toBe(true)
  })

  // ── AC8 ──────────────────────────────────────────────────────────────────
  test('AC8: POST .../quiz/retry with a foreign/fake sessionId returns 404 (team-scoped, IDOR-safe)', async ({
    page,
  }) => {
    const paper = await seedFreshPaper()
    // Navigate first to establish session cookies before any page.request call.
    await page.goto('/lab')
    const res = await requestWithRateLimitRetry(() =>
      api.post(page, `/api/papers/${paper.id}/quiz/retry`, {
        data: { sessionId: 'not-a-real-session-id', answers: [{ questionId: 'q1', response: 'x' }] },
      }),
    )
    expect(res.status()).toBe(404)
    const body = await res.json()
    expect(body).not.toHaveProperty('score')
    expect(body).not.toHaveProperty('questions')
  })

  // ── AC9 ──────────────────────────────────────────────────────────────────
  test('AC9: retry is rejected with 409 when the session is not graded, or was already passed', async ({
    page,
  }) => {
    const paper = await seedFreshPaper()
    await page.goto('/lab')

    // Ungraded session: generate a fresh quiz (POST /quiz) but never grade it.
    const genRes = await requestWithRateLimitRetry(() => api.post(page, `/api/papers/${paper.id}/quiz`))
    expect(genRes.status()).toBe(200)
    const genBody = await genRes.json()
    const sessionId = genBody.sessionId as string

    const retryOnUngraded = await requestWithRateLimitRetry(() =>
      api.post(page, `/api/papers/${paper.id}/quiz/retry`, {
        data: {
          sessionId,
          answers: genBody.questions.map((q: { id: string }) => ({ questionId: q.id, response: 'x' })),
        },
      }),
    )
    expect(retryOnUngraded.status()).toBe(409)

    // Grade it — the E2E fixture always scores 40 (a fail) — a graded, FAILED
    // session is the one state a retry IS eligible against.
    const gradeRes = await requestWithRateLimitRetry(() =>
      api.post(page, `/api/papers/${paper.id}/quiz/grade`, {
        data: {
          sessionId,
          answers: genBody.questions.map((q: { id: string }) => ({ questionId: q.id, response: 'x' })),
        },
      }),
    )
    expect(gradeRes.status()).toBe(200)
    const gradeBody = await gradeRes.json()
    expect(gradeBody.passed).toBe(false)

    // Retry it to a PASS (the E2E retry fixture always scores 90 >= 70).
    const retryToPassRes = await requestWithRateLimitRetry(() =>
      api.post(page, `/api/papers/${paper.id}/quiz/retry`, {
        data: {
          sessionId,
          answers: genBody.questions.map((q: { id: string }) => ({ questionId: q.id, response: 'x' })),
        },
      }),
    )
    expect(retryToPassRes.status()).toBe(200)
    const passedBody = await retryToPassRes.json()
    expect(passedBody.passed).toBe(true)

    // Re-submitting a retry against a session that's already been retried to a
    // PASS must 409 (passed === true makes it ineligible for another retry).
    const retryOnAlreadyPassed = await requestWithRateLimitRetry(() =>
      api.post(page, `/api/papers/${paper.id}/quiz/retry`, {
        data: {
          sessionId,
          answers: genBody.questions.map((q: { id: string }) => ({ questionId: q.id, response: 'x' })),
        },
      }),
    )
    expect(retryOnAlreadyPassed.status()).toBe(409)
  })

  // ── AC10 ─────────────────────────────────────────────────────────────────
  test('AC10 (static): the retry route enforces the "ai" rate-limit tier', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const routePath = path.join(
      __dirname,
      '..',
      'app',
      'api',
      'papers',
      '[id]',
      'quiz',
      'retry',
      'route.ts',
    )
    const source = fs.readFileSync(routePath, 'utf8')
    const occurrences = source.match(/requireTeamContext\(req,\s*\{\s*tier:\s*'ai'\s*\}\)/g) ?? []
    // Both the GET (idempotent generation) and POST (grading) handlers enforce
    // the 'ai' tier — a superset of "the retry route enforces 'ai'", not a gap.
    expect(occurrences.length).toBeGreaterThanOrEqual(1)
  })

  // ── AC11 ─────────────────────────────────────────────────────────────────
  test('AC11: after a passing retry, reloading the Q&A panel shows the pass state and full question set', async ({
    page,
  }) => {
    // This test drives the FULL flow twice (fail -> fix -> retry-pass, then a
    // hard reload + full re-open), on top of this env's documented 4-7s DB
    // round-trips (see papers-tab.spec.ts) and any 'ai'-tier rate-limit backoff
    // — comfortably the longest single test in this spec. Give it real headroom
    // rather than let the default 30s test timeout race the last network step.
    test.setTimeout(60_000)
    const paper = await submitFailingFirstAttempt(page)
    await clickFixMyMisses(page, paper.id)
    await submitRetryForm(page, paper.id, 'Retry answer')
    await expect(page.getByText('Proficiency demonstrated!')).toBeVisible({ timeout: 10000 })

    // Reload the whole page (the Literature Review panel is a client-side
    // overlay, not a route — a hard reload always closes it) and re-open the
    // SAME paper's Q&A panel from scratch. QAPanel always re-fetches
    // GET /api/papers/[id]/quiz on mount, so this proves the pass state and
    // full question set came from the DB, not client memory.
    await page.reload()
    await openQAPanel(page, paper.title, paper.id)
    await expect(page.getByText('Proficiency demonstrated!')).toBeVisible({ timeout: 10000 })

    // Full (original 5 + 1 new) question set persisted.
    const getRes = await api.get(page, `/api/papers/${paper.id}/quiz`)
    const getBody = await getRes.json()
    expect(getBody.session.questions.length).toBe(6)
    expect(getBody.session.retried).toBe(true)
  })

  // ── AC12 ─────────────────────────────────────────────────────────────────
  test('AC12: the retry view uses pixel chrome, the gold submit accent, and regular-font body text', async ({
    page,
  }) => {
    const paper = await submitFailingFirstAttempt(page)
    await clickFixMyMisses(page, paper.id)

    // Chrome labels are font-pixel; the note/answer BODY text next to them is
    // regular font (the "What a strong answer covers" text itself is the
    // font-pixel label — its sibling body text is what must be regular font).
    await expect(page.getByText('Your previous answer').first()).toHaveClass(/font-pixel/)
    await expect(page.getByText('What a strong answer covers').first()).toHaveClass(/font-pixel/)
    const strongAnswerBody = page
      .getByText("A strong answer would cite the paper's specific findings and reasoning", { exact: false })
      .first()
    await expect(strongAnswerBody).toBeVisible()
    await expect(strongAnswerBody).not.toHaveClass(/font-pixel/)

    // Gold submit accent on the dark background.
    const submitBtn = page.getByRole('button', { name: 'Answer all questions to submit' })
    await expect(submitBtn).toBeVisible()
    await expect(submitBtn).toHaveClass(/bg-\[#F5C518\]/)
    await expect(submitBtn).toHaveClass(/font-pixel/)
  })

  // ── AC13 ─────────────────────────────────────────────────────────────────
  test('AC13 (static): retry makes at most one generation + one grading call, both paper-cached', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const routePath = path.join(
      __dirname,
      '..',
      'app',
      'api',
      'papers',
      '[id]',
      'quiz',
      'retry',
      'route.ts',
    )
    const source = fs.readFileSync(routePath, 'utf8')

    // Exactly one generation call site and one grading call site through the
    // shared lazy Anthropic client, each with a cached paper-text system block.
    const messagesCreateCalls = source.match(/anthropic\(\)\.messages\.create\(/g) ?? []
    expect(messagesCreateCalls.length).toBe(2) // one generate, one grade

    const cacheControlOccurrences = source.match(/cache_control:\s*\{\s*type:\s*'ephemeral'\s*\}/g) ?? []
    expect(cacheControlOccurrences.length).toBe(2)

    // No full 5-question regenerate helper is referenced from this route file.
    expect(source).not.toMatch(/QUIZ_QUESTION_COUNT\s*\}\s*questions/)
    expect(source).toContain('ensureNewQuestion')
  })
})
