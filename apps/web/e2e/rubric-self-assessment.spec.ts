import { test, expect, type Page } from '@playwright/test'
import { api, withSeedPage, clickBuilding } from './api'

/**
 * Rubric self-assessment (Feature F1 — Rubric self-assessment).
 * One test per acceptance criterion (12 criteria total, per
 * .claude/pipeline/plan-F1-rubric-self-assessment.md). Runs as the default
 * `chromium` project (authenticated lab leader / devuser1).
 *
 * NOTE: this is a DIFFERENT feature from the shipped `e2e/F1.spec.ts`
 * (student-facing teacher-feedback inbox) — this spec intentionally uses a
 * non-colliding filename and drives `/api/rubric/self-assessment` +
 * `/fair-hub/rubric`, never touching F1.spec.ts's routes or fixtures.
 *
 * Criterion → test mapping:
 *  AC1  — /fair-hub/rubric renders "ISEF Rubric" heading, no TODO text
 *  AC2  — "Judge-readiness" total visible, matches /\/\s*100/
 *  AC3  — "Research Question" card visible with its 10-pt max
 *  AC4  — Saving score 8 on "Research Question" shows a saved indicator, no reload
 *  AC5  — After saving 8, Judge-readiness total is >= 8/100, no reload
 *  AC6  — Reload persists the saved score of 8 (DB persistence)
 *  AC7  — Note text persists across reload
 *  AC8  — Score above max (99) clamps to the criterion's max (10) after save
 *  AC9  — Toggling to Engineering changes criterion I's title to "Research Problem"
 *  AC10 — /lab → Science Fair gateway → "Self-check" tab shows Judge-readiness within 2s
 *  AC11 — GET returns 200, criteria is an array, totalMax === 100
 *  AC12 — PUT science:I score:5 → 200; subsequent GET reflects score:5 (team-scoped)
 *
 * Seeding / reset strategy: every score-mutating test resets `science:I` to
 * `score: 0, notes: undefined` via a direct PUT in the test body (no DELETE
 * endpoint exists — a 0-score PUT is the documented reset), so reruns are
 * deterministic. beforeAll/afterAll also reset around the whole suite as a
 * belt-and-suspenders guard against a failed test leaving dirty state.
 * Both hooks reset via withSeedPage (a fresh authed page whose Clerk session
 * api.* refreshes before every call), which sidesteps the same stale-session-
 * token issue AC11/AC12 guard against in their own bodies — by ~2 minutes into
 * this serial suite the on-disk STORAGE.leader token is stale, so a bare
 * request-context call would silently 307 to an HTML sign-in page instead of
 * running the reset.
 */

const RESEARCH_QUESTION_KEY = 'science:I'

/**
 * Reset science:I to score 0 / notes null, scoped to the leader's team.
 *
 * Called from both beforeAll and afterAll (see the hooks below) on a fresh
 * authed seed page. `api.put` refreshes the Clerk session before firing, so
 * this stays reliable even in afterAll — ~2 minutes into this serial suite,
 * by which point the on-disk STORAGE.leader token is stale and a bare
 * request-context PUT would silently 307 to an HTML sign-in page (Playwright
 * doesn't reject on a 200-with-HTML response) and leave science:I dirty for
 * whatever the last test set it to, breaking the next run's determinism (e.g.
 * AC5's exact "8 / 100" assertion assumes a 0 starting score). The status
 * check asserts the PUT actually succeeded so a broken reset fails loudly
 * instead of silently leaving dirty shared-DB state (PARALLELISM.md:
 * write-touching specs must leave their own data clean).
 */
async function resetResearchQuestion(page: Page) {
  const res = await api.put(page, '/api/rubric/self-assessment', {
    data: { track: 'science', criterionKey: RESEARCH_QUESTION_KEY, score: 0 },
  })
  if (res.status() !== 200) {
    throw new Error(`resetResearchQuestion PUT failed: ${res.status()} ${await res.text()}`)
  }
}

/** Open the Science Fair Hub feature panel from /lab (mirrors F3.spec.ts's openLiteratureReview). */
async function openScienceFairHub(page: Page) {
  await page.goto('/lab')
  await page.getByRole('button', { name: 'Open Science Fair' }).waitFor({ state: 'attached', timeout: 10_000 })
  await clickBuilding(page, 'Open Science Fair')
  await expect(page.getByRole('dialog', { name: 'Science Fair' })).toBeVisible({ timeout: 5000 })
}

/**
 * Fill a criterion card's score input and save it via the explicit Save
 * button, as ONE deterministic save() call.
 *
 * RubricSelfCheck.tsx's score input saves on blur (`onBlur={save}`) AND the
 * Save button saves on click (`onClick={save}`). `input.fill(value)` leaves
 * the input focused, so immediately clicking Save fires TWO overlapping
 * save() calls — a blur-triggered one (from the click moving focus away) and
 * the button's own — each independently flipping the "Saved" badge visible
 * for its own untied 2s window. That race can hide the badge before an
 * assertion's first poll lands on it. Settling the blur-save first (and
 * waiting for its badge to appear AND clear) means the follow-up button click
 * is the only save() in flight when the caller asserts on it.
 */
async function fillAndSave(card: import('@playwright/test').Locator, value: string) {
  const scoreInput = card.locator('input[type="number"]')
  const savedBadge = card.getByTestId('criterion-saved')
  await scoreInput.fill(value)
  await scoreInput.blur()
  await expect(savedBadge).toBeVisible({ timeout: 5000 })
  await expect(savedBadge).toBeHidden({ timeout: 3000 })

  await card.getByRole('button', { name: /^Save$/ }).click()
  await expect(savedBadge).toBeVisible({ timeout: 5000 })
  return { scoreInput, savedBadge }
}

test.describe('Rubric self-assessment (F1)', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async ({ browser }) => {
    await withSeedPage(browser, 'leader', (page) => resetResearchQuestion(page))
  })

  test.afterAll(async ({ browser }) => {
    await withSeedPage(browser, 'leader', (page) => resetResearchQuestion(page))
  })

  // ── AC1 ───────────────────────────────────────────────────────────────────
  test('AC1: /fair-hub/rubric renders a self-check surface with no TODO placeholder', async ({
    page,
  }) => {
    await page.goto('/fair-hub/rubric')
    await expect(page.getByRole('heading', { name: 'ISEF Rubric' })).toBeVisible({ timeout: 8000 })
    await expect(page.getByText('TODO', { exact: false })).toHaveCount(0)
  })

  // ── AC2 ───────────────────────────────────────────────────────────────────
  test('AC2: a "Judge-readiness" total out of 100 is visible', async ({ page }) => {
    await page.goto('/fair-hub/rubric')
    const readiness = page.getByTestId('judge-readiness')
    await expect(readiness).toBeVisible({ timeout: 8000 })
    await expect(readiness).toContainText(/\/\s*100/)
  })

  // ── AC3 ───────────────────────────────────────────────────────────────────
  test('AC3: a scoreable "Research Question" card shows its 10-pt max', async ({ page }) => {
    await page.goto('/fair-hub/rubric')
    const card = page.locator(`[data-criterion-key="${RESEARCH_QUESTION_KEY}"]`)
    await expect(card).toBeVisible({ timeout: 8000 })
    await expect(card).toContainText('Research Question')
    await expect(card).toContainText('10 pts')
  })

  // ── AC4 ───────────────────────────────────────────────────────────────────
  test('AC4: saving a score shows a saved indicator without a full reload', async ({ page }) => {
    await page.goto('/fair-hub/rubric')
    const urlBefore = page.url()
    const card = page.locator(`[data-criterion-key="${RESEARCH_QUESTION_KEY}"]`)
    await expect(card).toBeVisible({ timeout: 8000 })

    await fillAndSave(card, '8')

    await expect(card.getByTestId('criterion-saved')).toBeVisible()
    expect(page.url()).toBe(urlBefore)
  })

  // ── AC5 ───────────────────────────────────────────────────────────────────
  test('AC5: after saving, the Judge-readiness total reflects the new score without a reload', async ({
    page,
  }) => {
    await page.goto('/fair-hub/rubric')
    const urlBefore = page.url()
    const card = page.locator(`[data-criterion-key="${RESEARCH_QUESTION_KEY}"]`)
    await expect(card).toBeVisible({ timeout: 8000 })

    await fillAndSave(card, '8')

    // The label and value are adjacent sibling <span>s with no text-node
    // whitespace between them in the DOM (only CSS flex spacing, which
    // doesn't affect textContent), so the raw string toContainText matches
    // against is "Judge-readiness8 / 100" — a regex anchored on \b before the
    // digit can never match there (both the trailing letter and the digit are
    // \w, so no boundary exists). Match the digits directly instead. Starting
    // from the beforeAll reset (score 0) and saving exactly 8 makes "8 / 100"
    // the precise expected total, not just a lower bound.
    const readiness = page.getByTestId('judge-readiness')
    await expect(readiness).toContainText(/8\s*\/\s*100/)
    expect(page.url()).toBe(urlBefore)
  })

  // ── AC6 ───────────────────────────────────────────────────────────────────
  test('AC6: reloading the page shows the saved score persisted from the DB', async ({ page }) => {
    await page.goto('/fair-hub/rubric')
    const card = page.locator(`[data-criterion-key="${RESEARCH_QUESTION_KEY}"]`)
    await expect(card).toBeVisible({ timeout: 8000 })

    await fillAndSave(card, '8')

    await page.reload()
    const cardAfterReload = page.locator(`[data-criterion-key="${RESEARCH_QUESTION_KEY}"]`)
    await expect(cardAfterReload).toBeVisible({ timeout: 8000 })
    await expect(cardAfterReload.locator('input[type="number"]')).toHaveValue('8')
  })

  // ── AC7 ───────────────────────────────────────────────────────────────────
  test('AC7: a saved note persists across reload', async ({ page }) => {
    const noteText = `E2E note ${Date.now()}`
    await page.goto('/fair-hub/rubric')
    const card = page.locator(`[data-criterion-key="${RESEARCH_QUESTION_KEY}"]`)
    await expect(card).toBeVisible({ timeout: 8000 })

    const notesArea = card.locator('textarea')
    const savedBadge = card.getByTestId('criterion-saved')
    await notesArea.fill(noteText)
    await notesArea.blur()
    await expect(savedBadge).toBeVisible({ timeout: 5000 })
    await expect(savedBadge).toBeHidden({ timeout: 3000 })

    await card.getByRole('button', { name: /^Save$/ }).click()
    await expect(savedBadge).toBeVisible({ timeout: 5000 })

    await page.reload()
    const cardAfterReload = page.locator(`[data-criterion-key="${RESEARCH_QUESTION_KEY}"]`)
    await expect(cardAfterReload).toBeVisible({ timeout: 8000 })
    await expect(cardAfterReload.locator('textarea')).toHaveValue(noteText)
  })

  // ── AC8 ───────────────────────────────────────────────────────────────────
  test('AC8: a score above the criterion max clamps to the max after save', async ({ page }) => {
    await page.goto('/fair-hub/rubric')
    const card = page.locator(`[data-criterion-key="${RESEARCH_QUESTION_KEY}"]`)
    await expect(card).toBeVisible({ timeout: 8000 })

    const { scoreInput } = await fillAndSave(card, '99')

    // Displayed/persisted score must be clamped to 10, not 99.
    await expect(scoreInput).toHaveValue('10')
    await page.reload()
    const cardAfterReload = page.locator(`[data-criterion-key="${RESEARCH_QUESTION_KEY}"]`)
    await expect(cardAfterReload.locator('input[type="number"]')).toHaveValue('10')
  })

  // ── AC9 ───────────────────────────────────────────────────────────────────
  test('AC9: toggling to Engineering changes criterion I\'s title to "Research Problem"', async ({
    page,
  }) => {
    await page.goto('/fair-hub/rubric')
    const scienceCard = page.locator('[data-criterion-key="science:I"]')
    await expect(scienceCard).toBeVisible({ timeout: 8000 })
    await expect(scienceCard).toContainText('Research Question')

    await page.locator('button[data-track="engineering"]').click()

    const engineeringCard = page.locator('[data-criterion-key="engineering:I"]')
    await expect(engineeringCard).toBeVisible({ timeout: 8000 })
    await expect(engineeringCard).toContainText('Research Problem')
  })

  // ── AC10 ──────────────────────────────────────────────────────────────────
  test('AC10: /lab → Science Fair Hub → "Self-check" tab shows the scoreable rubric within 2s', async ({
    page,
  }) => {
    await openScienceFairHub(page)

    await page.getByRole('button', { name: 'Self-check' }).click({ timeout: 10_000 })

    const t0 = Date.now()
    const readiness = page.getByTestId('judge-readiness')
    await expect(readiness).toBeVisible({ timeout: 2000 })
    expect(Date.now() - t0).toBeLessThan(2000)
  })

  // ── AC11 ──────────────────────────────────────────────────────────────────
  test('AC11: GET returns 200 with an array of criteria and totalMax 100', async ({ page }) => {
    // Navigate first to establish/refresh session cookies before using
    // page.request (house convention — see F4.spec.ts:518-519). Each test's
    // page fixture starts from auth.setup's storage state; by ~2 minutes into
    // this serial suite that Clerk JWT is stale, and an unauthenticated
    // page.request call gets redirected to an HTML page instead of hitting
    // the route (a 200 whose body is "<!DOCTYPE ..." instead of JSON — not a
    // route bug). Waiting on judge-readiness confirms the client-side session
    // refresh has actually landed before firing the API request below.
    await page.goto('/fair-hub/rubric')
    await expect(page.getByTestId('judge-readiness')).toBeVisible({ timeout: 8000 })

    const res = await api.get(page, '/api/rubric/self-assessment?track=science')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.criteria)).toBe(true)
    expect(body.totalMax).toBe(100)
  })

  // ── AC12 ──────────────────────────────────────────────────────────────────
  test('AC12: PUT persists a score that a subsequent team-scoped GET reflects', async ({ page }) => {
    // Same session-refresh rationale as AC11 — see comment there.
    await page.goto('/fair-hub/rubric')
    await expect(page.getByTestId('judge-readiness')).toBeVisible({ timeout: 8000 })

    const putRes = await api.put(page, '/api/rubric/self-assessment', {
      data: { track: 'science', criterionKey: RESEARCH_QUESTION_KEY, score: 5 },
    })
    expect(putRes.status()).toBe(200)

    const getRes = await api.get(page, '/api/rubric/self-assessment?track=science')
    expect(getRes.status()).toBe(200)
    const body = await getRes.json()
    const row = (body.criteria as Array<{ key: string; score: number | null }>).find(
      (c) => c.key === RESEARCH_QUESTION_KEY,
    )
    expect(row?.score).toBe(5)
  })
})
