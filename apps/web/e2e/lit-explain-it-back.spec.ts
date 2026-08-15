import { test, expect } from './test'
import { request as playwrightRequest, type Page } from '@playwright/test'
import { api, withRateLimitRetry, openLiteratureReview, gotoFresh } from './api'
import { createLab, type OwnedLab } from './lab'
import { e2eDb } from './db'

/**
 * lit-explain-it-back — "Explain it back" (Feynman mode) in the Literature
 * Review, from .claude/pipeline/plan-lit-explain-it-back.md (change log:
 * changes-lit-explain-it-back.md). Runs as the default `chromium` project
 * (authenticated lab leader / devuser1, "E2E Test Lab" team). Route: `/lab` →
 * "Open Literature Review" building → a paper's "Q&A" button → the
 * `data-testid="explain-tab"` tab inside `QAPanel`.
 *
 * Criterion → test mapping (plan's 18 acceptance criteria, plus one
 * unauthenticated-redirect check the tester playbook calls out explicitly):
 *  AC1  — the "Explain it back" tab is visible and clicking it shows the
 *         write-form textarea (placeholder "Explain it back in your own
 *         words…") within 2s.
 *  AC2  — the submit button is disabled under 40 non-whitespace chars, enabled
 *         at/above it.
 *  AC3  — a first submission POSTs 200 and shows the orange "Not yet — Vega
 *         pushed back" verdict banner within 10s.
 *  AC4  — the failing verdict shows >=1 "What you left out" item, >=1 "What
 *         you got wrong" item, and a "Vega asks" follow-up question.
 *  AC5  — the banner shows both sub-scores + threshold: "Accuracy 45% ·
 *         Completeness 40% · pass 70% each".
 *  AC6  — after the failing verdict, the textarea still holds the student's
 *         previous text and the button reads "Revise and re-submit".
 *  AC7  — re-submitting POSTs 200 with `passed === true` and shows the green
 *         "Explanation accepted" banner.
 *  AC8  — the passing response has `kpEarned === 25`, rendered as "+25 KP".
 *  AC9  — once-ever KP: a third passing POST on the SAME paper returns
 *         `kpEarned === 0`; the team's KP balance does not move a second time.
 *  AC10 — persistence: after a hard reload, the latest text + accepted
 *         verdict are on screen again (DB-backed, not client memory).
 *  AC11 — team-scoped IDOR: POST/GET for a foreign/fake paper id 404s, with no
 *         verdict/accuracy/kpEarned in the body.
 *  AC12 — (static) the POST handler enforces the 'ai' rate-limit tier.
 *  AC13 — (static) exactly one `anthropic().messages.create(` call site, fed
 *         by the shared, byte-identical `paperTextBlock` (the sole source of
 *         this call's one `cache_control: { type: 'ephemeral' }`).
 *  AC14 — (static) KP is written only as the flat `EXPLAIN_KP_AWARD` constant;
 *         accuracy/completeness pass through `clampScore` before persistence.
 *  AC15 — (static) the prompt wraps the student's text in
 *         `<student_explanation>` and declares both blocks untrusted data.
 *  AC16 — submitting `<img src=x onerror=alert(1)>` renders as literal text in
 *         "Your last explanation" and creates no `img` element.
 *  AC17 — pixel aesthetic: tab + verdict labels carry `font-pixel`; the submit
 *         button carries `font-pixel` + `bg-[#F5C518]`; explanation body text
 *         does not carry `font-pixel`.
 *  AC18 — the quiz is unaffected: "Quiz results" still shows the graded quiz
 *         after using Explain, and `GET /api/papers/{id}`'s
 *         `proficiencyDemonstrated` is unchanged by an explanation submission.
 *  (unauth) — an unauthenticated POST to the explain route gets a JSON 401 from
 *         /sign-in (never 401), with no verdict data in the body.
 *
 * Determinism seam: E2E_SKIP_LLM=1 (playwright.config.ts) makes the POST route
 * return `e2eFixtureVerdict(attemptCount)` with NO Anthropic call:
 *  - attemptCount === 0 (first submission) → FAILS: accuracy 45, completeness
 *    40, one `missedPoints`, one `misconceptions`, one `followUpQuestion`.
 *  - attemptCount >= 1 (any revision) → PASSES: accuracy 90, completeness 85,
 *    which also mints the once-ever 25 KP (`EXPLAIN_KP_AWARD`).
 *
 * Seeding: EACH test that drives its own submit/revise flow needs a FRESH,
 * never-explained paper for the leader (the KP claim + pass/fail state is
 * per (paperId, userId), so a shared paper would leak state between tests).
 * Seeded directly via Prisma (the sanctioned direct-Prisma escape hatch also
 * used by e2e/F11-quiz-retry.spec.ts / e2e/F4-print.spec.ts — there is no
 * POST API that creates a `status: 'ready'` paper without a real PDF upload or
 * a Discovery-source promotion).
 *
 * This file owns a DISPOSABLE LAB (`createLab`, e2e/lab.ts) rather than seeding
 * into the shared "E2E Test Lab". That replaces the whole per-paper cleanup
 * loop: `dispose()` purges the lab through the same ordered inventory
 * `reset:e2e` uses, so nothing has to be tracked, and a crashed run leaves a
 * stray `[E2E explain]` lab for the sweep instead of papers in everyone's
 * fixture. KP minted during AC7-AC9/AC18 no longer leaks either — it dies with
 * the lab — though the assertions stay DELTA-based, which is correct regardless
 * of which team they run against.
 */

const RUN_ID = Date.now()
const EXPLAIN_KP_AWARD = 25 // D3 — flat, once-ever (lib/literature/explain.ts)

let lab: OwnedLab

test.describe('lit-explain-it-back — "Explain it back" (Feynman mode)', () => {

  test.beforeAll(async () => {
    lab = await createLab('explain')
  })

  test.afterAll(async () => {
    await lab.dispose()
  })

  // ── Seeding helper ─────────────────────────────────────────────────────────

  let paperCounter = 0
  async function seedFreshPaper(): Promise<{ id: string; title: string }> {
    paperCounter += 1
    const title = `[E2E explain] fixture ${RUN_ID}-${paperCounter}`
    const paper = await e2eDb.paper.create({
      data: {
        teamId: lab.teamId,
        title,
        authors: ['E2E, Fixture'],
        abstract: 'Deterministic E2E fixture paper for the lit-explain-it-back spec.',
        sourceType: 'pdf',
        status: 'ready',
        fullText: 'This is a deterministic E2E fixture paper body for the lit-explain-it-back spec.',
        contentHash: `e2e-explain-${RUN_ID}-${paperCounter}`,
        uploadedByUserId: lab.leaderUserId,
      },
      select: { id: true },
    })
    return { id: paper.id, title }
  }

  // ── Navigation / open-panel helpers ─────────────────────────────────────

  /**
   * Open a given fixture paper's Q&A panel and wait for it to reach a STABLE
   * phase before returning. `phase` is one shared state machine (`usePaperQuiz`)
   * that also drives the Explain tab's visible pane (QAPanel routes `phase ===
   * 'explain'` to `ExplainPanel`) — so any action that switches phase (like
   * clicking the Explain tab) must happen AFTER `usePaperQuiz`'s own mount
   * sequence has finished landing on ITS terminal phase, or that later,
   * in-flight `setPhase(...)` clobbers ours.
   *
   * Mount has exactly two terminal phases, and neither of them spends money:
   * a paper with no graded session lands on `idle` — the "Start the quiz"
   * panel, whose only exit is the student pressing that button (v0.75.5: the
   * mount effect used to call `generateQuiz()` itself, POSTing a paid Vega
   * generation with no click) — and a paper WITH one lands on `results`, which
   * renders the graded tab-strip. Racing those two DOM states is the
   * observable proxy for "the phase machine has settled and won't move again
   * on its own", which is what a following tab click needs.
   *
   * Nothing in this file asserts on the quiz itself (its subject is the
   * Feynman tab), so the fresh-paper branch deliberately waits for the idle
   * panel rather than pressing the button — generating a quiz here would be a
   * paid call this spec has no use for. F11-quiz-retry, whose subject IS the
   * quiz, presses it.
   */
  async function openQAPanel(page: Page, title: string, paperId: string) {
    await openLiteratureReview(page)
    const row = page.locator('div', { hasText: title }).filter({ hasText: 'Q&A' }).last()
    await expect(row).toBeVisible({ timeout: 10000 })
    const explainGet = page.waitForResponse(
      (res) => res.url().endsWith(`/api/papers/${paperId}/explain`) && res.request().method() === 'GET',
      { timeout: 15000 },
    )
    await row.getByRole('button', { name: 'Q&A' }).click()
    await explainGet
    await Promise.race([
      page.getByRole('button', { name: 'Start the quiz' }).waitFor({ state: 'visible', timeout: 15000 }),
      page.getByRole('button', { name: /Quiz results/ }).waitFor({ state: 'visible', timeout: 15000 }),
    ])
  }

  /** Open the Q&A panel, then switch to the "Explain it back" tab and wait for
   *  its write-form textarea to be visible. */
  async function openExplainTab(page: Page, title: string, paperId: string) {
    await openQAPanel(page, title, paperId)
    await page.getByTestId('explain-tab').click()
    await expect(page.getByTestId('explain-textarea')).toBeVisible({ timeout: 5000 })
  }

  /** Fill the explain textarea and submit, waiting for the POST to settle.
   *  Wrapped in the ai-tier rate-limit retry (a 429'd submit leaves the
   *  textarea's text untouched, so re-clicking after `Retry-After` resubmits
   *  the same text — see useExplainBack: the draft only clears on success,
   *  and it never clears at all here since the panel keeps it for revision). */
  async function submitExplain(
    page: Page,
    paperId: string,
    text: string,
  ): Promise<{ status: number; body: Record<string, unknown> | null }> {
    await page.getByTestId('explain-textarea').fill(text)
    return withRateLimitRetry(async () => {
      const postResponse = page.waitForResponse(
        (res) => res.url().endsWith(`/api/papers/${paperId}/explain`) && res.request().method() === 'POST',
      )
      await page.getByRole('button', { name: /^(Submit explanation|Revise and re-submit)$/ }).click()
      const res = await postResponse
      const status = res.status()
      const retryAfterSeconds = Number(res.headers()['retry-after'] ?? 60)
      const body = status === 200 ? await res.json() : null
      return { status, retryAfterSeconds, result: { status, body } }
    }, 'lit-explain-it-back')
  }

  /** Seed a fresh paper, open its Explain tab, and drive one failing (attempt
   *  1) submission via the UI. Returns the paper + the parsed response body. */
  async function seedAndReachFailingVerdict(page: Page) {
    const paper = await seedFreshPaper()
    await openExplainTab(page, paper.title, paper.id)
    const { status, body } = await submitExplain(
      page,
      paper.id,
      'This paper found something interesting about the general topic, and it matters for the field.',
    )
    return { paper, status, body }
  }

  /** Extends `seedAndReachFailingVerdict` with a second (revision) submission,
   *  which always PASSES under the E2E fixture (attemptCount >= 1). */
  async function seedAndReachPassingVerdict(page: Page) {
    const { paper } = await seedAndReachFailingVerdict(page)
    const revisedText =
      'On revision: the paper actually reported a specific quantitative result, and it matters because of its broader implication.'
    const { status, body } = await submitExplain(page, paper.id, revisedText)
    return { paper, status, body, revisedText }
  }

  // ── AC1 ──────────────────────────────────────────────────────────────────
  test('AC1: the "Explain it back" tab is visible and clicking it shows the write-form textarea within 2s', async ({
    page,
  }) => {
    const paper = await seedFreshPaper()
    await openQAPanel(page, paper.title, paper.id)

    const tab = page.getByTestId('explain-tab')
    await expect(tab).toBeVisible()
    await expect(tab).toContainText('Explain it back')

    await tab.click()
    await expect(page.getByPlaceholder('Explain it back in your own words…')).toBeVisible({ timeout: 2000 })
  })

  // ── AC2 ──────────────────────────────────────────────────────────────────
  test('AC2: the submit button is disabled under 40 non-whitespace chars and enabled at/above it', async ({
    page,
  }) => {
    const paper = await seedFreshPaper()
    await openExplainTab(page, paper.title, paper.id)

    const textarea = page.getByTestId('explain-textarea')
    await textarea.fill('a'.repeat(20)) // 20 chars — under the 40-char floor
    const disabledBtn = page.getByRole('button', { name: 'Write a little more to submit' })
    await expect(disabledBtn).toBeVisible()
    await expect(disabledBtn).toBeDisabled()

    await textarea.fill('a'.repeat(45)) // 45 chars — at/above the floor
    const enabledBtn = page.getByRole('button', { name: 'Submit explanation' })
    await expect(enabledBtn).toBeVisible()
    await expect(enabledBtn).toBeEnabled()
  })

  // ── AC3 ──────────────────────────────────────────────────────────────────
  test('AC3: a first submission POSTs 200 and shows the orange "Not yet — Vega pushed back" banner within 10s', async ({
    page,
  }) => {
    const { status } = await seedAndReachFailingVerdict(page)
    expect(status).toBe(200)
    await expect(page.getByTestId('explain-verdict')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Not yet — Vega pushed back')).toBeVisible()
  })

  // ── AC4 ──────────────────────────────────────────────────────────────────
  test('AC4: the failing verdict shows "What you left out", "What you got wrong", and a "Vega asks" question', async ({
    page,
  }) => {
    await seedAndReachFailingVerdict(page)

    await expect(page.getByText('What you left out')).toBeVisible()
    await expect(
      page.getByText("You left out the paper's specific quantitative finding.", { exact: false }),
    ).toBeVisible()

    await expect(page.getByText('What you got wrong')).toBeVisible()
    await expect(
      page.getByText('You stated a causal claim the paper does not actually support.', { exact: false }),
    ).toBeVisible()

    await expect(page.getByText('Vega asks')).toBeVisible()
    await expect(
      page.getByText('What specific evidence in the paper supports its main conclusion?', { exact: false }),
    ).toBeVisible()
  })

  // ── AC5 ──────────────────────────────────────────────────────────────────
  test('AC5: the verdict banner shows both sub-scores and the pass threshold', async ({ page }) => {
    await seedAndReachFailingVerdict(page)
    await expect(page.getByText('Accuracy 45% · Completeness 40% · pass 70% each')).toBeVisible({ timeout: 10000 })
  })

  // ── AC6 ──────────────────────────────────────────────────────────────────
  test('AC6: after the failing verdict, the textarea still holds the previous text and the button reads "Revise and re-submit"', async ({
    page,
  }) => {
    const firstText = 'This paper found something interesting about the general topic, and it matters for the field.'
    const paper = await seedFreshPaper()
    await openExplainTab(page, paper.title, paper.id)
    await submitExplain(page, paper.id, firstText)

    await expect(page.getByTestId('explain-verdict')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('explain-textarea')).toHaveValue(firstText)
    await expect(page.getByRole('button', { name: 'Revise and re-submit' })).toBeVisible()
  })

  // ── AC7 ──────────────────────────────────────────────────────────────────
  test('AC7: re-submitting POSTs 200 with passed === true and shows the green "Explanation accepted" banner', async ({
    page,
  }) => {
    const { status, body } = await seedAndReachPassingVerdict(page)
    expect(status).toBe(200)
    expect(body?.passed).toBe(true)
    await expect(page.getByText('Explanation accepted')).toBeVisible({ timeout: 10000 })
  })

  // ── AC8 ──────────────────────────────────────────────────────────────────
  test('AC8: the passing response has kpEarned === 25, rendered as "+25 KP"', async ({ page }) => {
    const { body } = await seedAndReachPassingVerdict(page)
    expect(body?.kpEarned).toBe(EXPLAIN_KP_AWARD)
    await expect(page.getByText('+25 KP')).toBeVisible({ timeout: 10000 })
  })

  // ── AC9 ──────────────────────────────────────────────────────────────────
  test('AC9: once-ever KP — a third passing submission on the same paper earns 0 more KP', async ({ page }) => {
    const { paper } = await seedAndReachPassingVerdict(page)

    const kpBefore = await e2eDb.teamCurrency.findUnique({ where: { teamId: lab.teamId }, select: { kp: true } })

    const thirdText =
      'A further revision restating the same specific quantitative result and why it matters for the field.'
    const { status, body } = await submitExplain(page, paper.id, thirdText)

    expect(status).toBe(200)
    expect(body?.passed).toBe(true)
    expect(body?.kpEarned).toBe(0)

    const kpAfter = await e2eDb.teamCurrency.findUnique({ where: { teamId: lab.teamId }, select: { kp: true } })
    expect((kpAfter?.kp ?? 0) - (kpBefore?.kp ?? 0)).toBe(0)
  })

  // ── AC10 ─────────────────────────────────────────────────────────────────
  test('AC10: persistence — after a hard reload, the latest text and the accepted verdict are on screen again', async ({
    page,
  }) => {
    test.setTimeout(60_000)
    const { paper, revisedText } = await seedAndReachPassingVerdict(page)
    await expect(page.getByText('Explanation accepted')).toBeVisible({ timeout: 10000 })

    await page.reload()
    await openExplainTab(page, paper.title, paper.id)

    await expect(page.getByTestId('explain-textarea')).toHaveValue(revisedText)
    await expect(page.getByText('Explanation accepted')).toBeVisible({ timeout: 10000 })
  })

  // ── AC11 ─────────────────────────────────────────────────────────────────
  test('AC11: team-scoped IDOR — POST/GET on a foreign/fake paper id 404s with no verdict data in the body', async ({
    page,
  }) => {
    await gotoFresh(page, '/lab') // establish a live, refreshable Clerk session before any page.request call
    const fakeId = 'clxxxxxxxxxxxxxxxxxxxxxxx'

    const postRes = await api.post(page, `/api/papers/${fakeId}/explain`, {
      data: { text: 'a'.repeat(50) },
    })
    expect(postRes.status()).toBe(404)
    const postBody = await postRes.json()
    expect(postBody).not.toHaveProperty('verdict')
    expect(postBody).not.toHaveProperty('accuracy')
    expect(postBody).not.toHaveProperty('kpEarned')

    const getRes = await api.get(page, `/api/papers/${fakeId}/explain`)
    expect(getRes.status()).toBe(404)
  })

  // AC12-AC15 (static source assertions) MOVED to vitest — `test/ai-route-cost-shape.test.ts`
  // and `test/prompt-injection-pins.test.ts`. They read route source and need no
  // browser; living here meant they only ran when somebody remembered to run this
  // 30-minute suite, and AC13's `anthropic().messages.create(` pattern had been
  // matching zero call sites since v0.45.0 moved the call behind `aiCreate`.

  // ── AC16 ─────────────────────────────────────────────────────────────────
  test('AC16: no HTML injection — an <img> payload renders as literal text, no <img> element is created', async ({
    page,
  }) => {
    const paper = await seedFreshPaper()
    await openExplainTab(page, paper.title, paper.id)
    const payload =
      'My explanation includes this literal tag: <img src=x onerror=alert(1)> and it should never render as an image.'
    await submitExplain(page, paper.id, payload)

    await expect(page.getByTestId('explain-verdict')).toBeVisible({ timeout: 10000 })
    // Scope to the "Your last explanation" echo (a <p>) specifically — the
    // still-populated textarea (AC6: draft isn't cleared on submit) legitimately
    // contains the same literal text too, which would make an unscoped
    // getByText match both and violate Playwright's strict mode.
    const lastExplanationEcho = page.locator('p', { hasText: 'Your last explanation' })
    await expect(lastExplanationEcho).toContainText('<img src=x onerror=alert(1)>')
    await expect(page.locator('img[src="x"]')).toHaveCount(0)
  })

  // ── AC17 ─────────────────────────────────────────────────────────────────
  test('AC17: pixel aesthetic — tab/verdict labels + submit button carry font-pixel; body text does not', async ({
    page,
  }) => {
    await seedAndReachFailingVerdict(page)

    await expect(page.getByTestId('explain-tab')).toHaveClass(/font-pixel/)
    await expect(page.getByText('What you left out')).toHaveClass(/font-pixel/)
    await expect(page.getByText('Vega asks')).toHaveClass(/font-pixel/)

    const submitBtn = page.getByRole('button', { name: 'Revise and re-submit' })
    await expect(submitBtn).toHaveClass(/font-pixel/)
    await expect(submitBtn).toHaveClass(/bg-\[#F5C518\]/)

    // The missed-point BODY text itself (sibling of the font-pixel label) is
    // regular font, matching the quiz panel's established pixel/body split.
    const missedPointBody = page.getByText("You left out the paper's specific quantitative finding.", {
      exact: false,
    })
    await expect(missedPointBody).toBeVisible()
    await expect(missedPointBody).not.toHaveClass(/font-pixel/)
  })

  // ── AC18 ─────────────────────────────────────────────────────────────────
  test('AC18: the quiz is unaffected — "Quiz results" still shows after using Explain, and proficiencyDemonstrated is unchanged', async ({
    page,
  }) => {
    const paper = await seedFreshPaper()
    await gotoFresh(page, '/lab') // live session for the direct API calls below

    // Generate + grade a quiz (E2E fixture always fails the first grade —
    // see e2e/F11-quiz-retry.spec.ts) so hasPastResults is true and the
    // "Quiz results" tab exists. Pass/fail doesn't matter for this criterion.
    const genRes = await withRateLimitRetry(async () => {
      const res = await api.post(page, `/api/papers/${paper.id}/quiz`)
      return { status: res.status(), retryAfterSeconds: Number(res.headers()['retry-after'] ?? 60), result: res }
    }, 'lit-explain-it-back')
    expect(genRes.status()).toBe(200)
    const genBody = await genRes.json()

    const gradeRes = await withRateLimitRetry(async () => {
      const res = await api.post(page, `/api/papers/${paper.id}/quiz/grade`, {
        data: {
          sessionId: genBody.sessionId,
          answers: genBody.questions.map((q: { id: string }) => ({ questionId: q.id, response: 'An answer.' })),
        },
      })
      return { status: res.status(), retryAfterSeconds: Number(res.headers()['retry-after'] ?? 60), result: res }
    }, 'lit-explain-it-back')
    expect(gradeRes.status()).toBe(200)

    const beforeRes = await api.get(page, `/api/papers/${paper.id}`)
    const proficiencyBefore = (await beforeRes.json()).proficiencyDemonstrated

    await openQAPanel(page, paper.title, paper.id)
    await expect(page.getByRole('button', { name: /Quiz results/ })).toBeVisible({ timeout: 10000 })

    await page.getByTestId('explain-tab').click()
    await expect(page.getByTestId('explain-textarea')).toBeVisible({ timeout: 5000 })
    await submitExplain(
      page,
      paper.id,
      'This paper found something interesting about the general topic, and it matters for the field.',
    )
    await expect(page.getByTestId('explain-verdict')).toBeVisible({ timeout: 10000 })

    // Switching back to "Quiz results" still shows the graded quiz, untouched
    // by the explanation submission.
    await page.getByRole('button', { name: /Quiz results/ }).click()
    await expect(page.getByText(/Not quite — try again|Proficiency demonstrated!/)).toBeVisible({ timeout: 5000 })

    const afterRes = await api.get(page, `/api/papers/${paper.id}`)
    const proficiencyAfter = (await afterRes.json()).proficiencyDemonstrated
    expect(proficiencyAfter).toBe(proficiencyBefore)
  })

  // ── Unauthenticated POST ─────────────────────────────────────────────────
  test('unauthenticated POST to the explain route gets a JSON 401 (never sign-in HTML), with no verdict data in the body', async ({
    page,
  }) => {
    const paper = await seedFreshPaper()
    await gotoFresh(page, '/lab') // confirm the route exists/is reachable under a real session first

    const BASE_URL = `http://localhost:${process.env.E2E_PORT ?? 3000}`
    // storageState MUST be explicitly cleared: newContext otherwise inherits
    // the chromium project's default storageState (the leader session).
    const anonCtx = await playwrightRequest.newContext({ baseURL: BASE_URL, storageState: undefined })
    try {
      const res = await anonCtx.post(`/api/papers/${paper.id}/explain`, {
        data: { text: 'a'.repeat(50) },
        maxRedirects: 0,
      })
      // v0.78.0 (febe752e): /api/* answers an unauthenticated caller with JSON 401,
      // NOT a 307 to /sign-in. A fetch follows that redirect and hands the caller a
      // 200 carrying sign-in HTML, so `res.ok` is true and `res.json()` dies on
      // "<!DOCTYPE". The block is still pre-route — no handler runs — which is what
      // the no-leak assertions below prove.
      expect(res.status()).toBe(401)

      const text = await res.text()
      expect(text).not.toContain('"verdict"')
      expect(text).not.toContain('"accuracy"')
      expect(text).not.toContain('"kpEarned"')
    } finally {
      await anonCtx.dispose()
    }
  })
})
