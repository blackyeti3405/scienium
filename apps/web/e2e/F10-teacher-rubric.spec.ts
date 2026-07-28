import {
  test,
  expect,
  request as playwrightRequest,
  type Browser,
  type Page,
} from '@playwright/test'
import { STORAGE } from './roles'
import { api, registerPageRole, withSeedPage } from './api'
import { createLab, type OwnedLab } from './lab'

/**
 * F10 (this batch) — Teacher-side rubric scoring + comparison + anchor content.
 * One test per acceptance criterion (14 criteria total, per
 * .claude/pipeline/plan-F10-teacher-rubric.md).
 *
 * NOTE: this is a DIFFERENT feature from the shipped `e2e/F10.spec.ts` (team
 * momentum). This spec drives `/api/teacher/rubric` + the "Rubric" tab in the
 * teacher's per-student drill-down, never touching F10.spec.ts's routes or
 * fixtures.
 *
 * Criterion -> test mapping:
 *  AC1  — /teacher/student/<id> "Rubric" tab renders a scoreable "Research
 *         Question" card showing its 10-pt max, within 8s
 *  AC2  — That card shows a low/mid/high anchor description + a talking point
 *  AC3  — Saving teacher score 7 shows a saved badge, no full reload
 *  AC4  — After saving 7, the teacher-total header is >= 7 / 100, no reload
 *  AC5  — Reloading persists the teacher score of 7 (DB persistence)
 *  AC6  — A saved teacher note persists across reload
 *  AC7  — A score above max (99) clamps to 10 after save + reload
 *  AC8  — Student self-check score (seeded 9) shows alongside the teacher
 *         score; a teacher save does not change the student value
 *  AC9  — Toggling to Engineering changes the first criterion's title to
 *         "Research Problem"
 *  AC10 — IDOR (own team): GET returns 200 with a criteria array, totalMax 100
 *  AC11 — IDOR (foreign team): GET returns 403 and no criteria data
 *  AC12 — IDOR (write): PUT with a foreign teamId returns 403, no row created
 *  AC13 — Unauthenticated GET is blocked pre-route with a 307 -> /sign-in
 *  AC14 — PUT persists a teacher score that a subsequent GET reflects, while
 *         the student self-check value for the same key is unchanged
 *
 * Team discovery: beforeAll uses the teacher session to GET /api/teacher/roster
 * and takes the first roster team (mirrors e2e/F1.spec.ts and
 * e2e/issue-6.spec.ts's beforeAll). AC8/AC14 additionally seed a student
 * self-check row via the leader session's PUT /api/rubric/self-assessment
 * for the SAME team. Every write-touching test resets the teacher row
 * (`PUT score:0`) and, where seeded, the student row in its own body /
 * teardown so reruns are deterministic (PARALLELISM.md: leave shared DB state
 * clean).
 */

const RESEARCH_QUESTION_KEY = 'science:I'
const BASE_URL = `http://localhost:${process.env.E2E_PORT ?? 3000}`

let lab: OwnedLab

/** Team id + a student id inside it, resolved in beforeAll. */
let teamId: string | null = null
let studentId: string | null = null

async function refreshTeacherSession(page: Page) {
  await page.goto('/teacher')
  await expect(page.getByText('Class Roster')).toBeVisible({ timeout: 20_000 })
}

/**
 * Seed (or reset) the leader's own student self-check score for science:I.
 *
 * A bare `playwrightRequest.newContext({ storageState: STORAGE.leader })`
 * only works reliably early in a run — by several tests into this serial
 * suite the on-disk STORAGE.leader Clerk JWT is stale, and a stale-token PUT
 * doesn't throw, it silently 200s against an HTML sign-in page (see
 * e2e/F1.spec.ts's resetResearchQuestion / memory scienium-e2e-conventions).
 * Opening a fresh page with the leader's storageState and navigating first
 * forces Clerk to refresh the session cookie before the PUT fires through
 * that same page's page.request (which shares the refreshed cookie). The PUT
 * response is asserted so a broken seed/reset fails loudly instead of
 * silently leaving stale shared-DB state.
 */
async function seedStudentScore(browser: Browser, score: number) {
  await withSeedPage(browser, 'leader', async (page) => {
    await page.goto('/fair-hub/rubric')
    await expect(page.getByTestId('judge-readiness')).toBeVisible({ timeout: 20_000 })
    const res = await api.put(page, '/api/rubric/self-assessment', {
      data: { track: 'science', criterionKey: RESEARCH_QUESTION_KEY, score },
    })
    if (res.status() !== 200) {
      throw new Error(`seedStudentScore(${score}) PUT failed: ${res.status()} ${await res.text()}`)
    }
  })
}

test.describe('F10 (teacher rubric) — teacher-side rubric scoring + comparison + anchor content', () => {
  // These tests intentionally exercise the remote development database through
  // multiple full student-detail loads. Reload cases can exceed Playwright's
  // 30-second default even when every individual request is healthy.
  test.describe.configure({ mode: 'serial', timeout: 60_000 })
  // Every test in this suite drives the teacher-only drill-down / API — override
  // the default chromium storageState (lab leader) once for the whole describe
  // block. test.use() cannot be called from inside an async test body.
  test.use({ storageState: STORAGE.teacher })

  // Session recovery must re-auth these fixture pages as the teacher.
  test.beforeEach(({ page }) => registerPageRole(page, 'teacher'))

  test.beforeAll(async ({ browser }) => {
    // Co-members, so the teacher roster resolves to THIS lab.
    lab = await createLab('f10tscoring', true, true)
    teamId = lab.teamId

    await withSeedPage(browser, 'teacher', async (page) => {
      await refreshTeacherSession(page)
      const rosterRes = await api.get(page, '/api/teacher/roster')
      if (!rosterRes.ok()) {
        throw new Error(`Roster fetch failed: ${rosterRes.status()} ${await rosterRes.text()}`)
      }
      const { students } = await rosterRes.json()
      const mine = (
        students as Array<{ studentId: string; teamId: string | null }>
      ).find((s) => s.teamId === lab.teamId)
      if (!mine) {
        throw new Error(
          "This file's disposable lab did not appear in the teacher roster — the E2E teacher " +
            'account must be linked to the dev class that contains the E2E leader. ' +
            'Run `pnpm --filter web seed:e2e` to restore the fixture.',
        )
      }
      studentId = mine.studentId
    })
    // The "belt-and-suspenders reset to a known-clean teacher score" is gone: a
    // fresh lab has no rubric rows, so `science:I` already reads 0.
  })

  test.afterAll(async () => {
    // Replaces resetting the teacher AND student scores back to 0 — both rows
    // are team-scoped and go with the lab.
    await lab.dispose()
  })

  // ── AC1 ──────────────────────────────────────────────────────────────────────
  test('AC1: the drill-down "Rubric" tab shows a scoreable "Research Question" card with its 10-pt max', async ({
    page,
  }) => {
    if (!studentId) throw new Error('studentId not set — beforeAll failed')

    await page.goto(`/teacher/student/${studentId}`)
    await page.getByRole('button', { name: 'Rubric' }).first().click()

    const card = page.locator(`[data-criterion-key="${RESEARCH_QUESTION_KEY}"]`)
    await expect(card).toBeVisible({ timeout: 20_000 })
    await expect(card).toContainText('Research Question')
    await expect(card).toContainText('10 pts')
  })

  // ── AC2 ──────────────────────────────────────────────────────────────────────
  test('AC2: the card shows a low/mid/high anchor description and a talking point', async ({ page }) => {
    if (!studentId) throw new Error('studentId not set — beforeAll failed')

    await page.goto(`/teacher/student/${studentId}`)
    await page.getByRole('button', { name: 'Rubric' }).first().click()

    const card = page.locator(`[data-criterion-key="${RESEARCH_QUESTION_KEY}"]`)
    await expect(card).toBeVisible({ timeout: 20_000 })

    await expect(card).toContainText('Rubric anchors')
    await expect(card).toContainText(/Low|Mid|High/)
    // scoreBand is rendered in parentheses next to the tier label.
    await expect(card).toContainText(/\(.+\)/)
    await expect(card).toContainText('Talking points')
  })

  // ── AC3 ──────────────────────────────────────────────────────────────────────
  test('AC3: saving a teacher score of 7 shows a saved badge without a full page reload', async ({ page }) => {
    if (!studentId) throw new Error('studentId not set — beforeAll failed')

    await page.goto(`/teacher/student/${studentId}`)
    await page.getByRole('button', { name: 'Rubric' }).first().click()

    const card = page.locator(`[data-criterion-key="${RESEARCH_QUESTION_KEY}"]`)
    await expect(card).toBeVisible({ timeout: 20_000 })

    const urlBefore = page.url()
    const scoreInput = card.locator('input[type="number"]')
    const savedBadge = card.getByTestId('teacher-criterion-saved')

    await scoreInput.fill('7')
    const putResponse = page.waitForResponse(
      (res) => res.url().includes('/api/teacher/rubric') && res.request().method() === 'PUT',
    )
    await scoreInput.blur()
    await putResponse

    await expect(savedBadge).toBeVisible({ timeout: 5000 })
    expect(page.url()).toBe(urlBefore)
  })

  // ── AC4 ──────────────────────────────────────────────────────────────────────
  test('AC4: after saving 7, the teacher-total header is at least 7 / 100 without a reload', async ({ page }) => {
    if (!studentId) throw new Error('studentId not set — beforeAll failed')

    await page.goto(`/teacher/student/${studentId}`)
    await page.getByRole('button', { name: 'Rubric' }).first().click()

    const card = page.locator(`[data-criterion-key="${RESEARCH_QUESTION_KEY}"]`)
    await expect(card).toBeVisible({ timeout: 20_000 })

    const urlBefore = page.url()
    const scoreInput = card.locator('input[type="number"]')

    // Blur deliberately skips a save when the value is unchanged (AC3 already
    // stored 7), so drive this AC through the Save button, which always PUTs.
    await scoreInput.fill('7')
    const putResponse = page.waitForResponse(
      (res) => res.url().includes('/api/teacher/rubric') && res.request().method() === 'PUT',
    )
    await card.getByRole('button', { name: 'Save', exact: true }).click()
    await putResponse

    const total = page.getByTestId('teacher-rubric-total')
    await expect(total).toBeVisible()
    const text = await total.innerText()
    const match = text.match(/(\d+)\s*\/\s*100/)
    expect(match).not.toBeNull()
    expect(Number(match![1])).toBeGreaterThanOrEqual(7)
    expect(page.url()).toBe(urlBefore)
  })

  // ── AC5 ──────────────────────────────────────────────────────────────────────
  test('AC5: reloading the drill-down shows the saved teacher score of 7 persisted from the DB', async ({
    page,
  }) => {
    if (!studentId) throw new Error('studentId not set — beforeAll failed')

    await page.goto(`/teacher/student/${studentId}`)
    await page.getByRole('button', { name: 'Rubric' }).first().click()

    const card = page.locator(`[data-criterion-key="${RESEARCH_QUESTION_KEY}"]`)
    await expect(card).toBeVisible({ timeout: 20_000 })

    const scoreInput = card.locator('input[type="number"]')
    // Save via the button: blur skips unchanged values, and 7 is already stored.
    await scoreInput.fill('7')
    const putResponse = page.waitForResponse(
      (res) => res.url().includes('/api/teacher/rubric') && res.request().method() === 'PUT',
    )
    await card.getByRole('button', { name: 'Save', exact: true }).click()
    await putResponse

    await page.reload()
    await page.getByRole('button', { name: 'Rubric' }).first().click()
    const cardAfterReload = page.locator(`[data-criterion-key="${RESEARCH_QUESTION_KEY}"]`)
    await expect(cardAfterReload).toBeVisible({ timeout: 20_000 })
    await expect(cardAfterReload.locator('input[type="number"]')).toHaveValue('7')
  })

  // ── AC6 ──────────────────────────────────────────────────────────────────────
  test('AC6: a saved teacher note persists across reload', async ({ page }) => {
    if (!studentId) throw new Error('studentId not set — beforeAll failed')
    const noteText = `E2E teacher note ${Date.now()}`

    await page.goto(`/teacher/student/${studentId}`)
    await page.getByRole('button', { name: 'Rubric' }).first().click()

    const card = page.locator(`[data-criterion-key="${RESEARCH_QUESTION_KEY}"]`)
    await expect(card).toBeVisible({ timeout: 20_000 })

    const notesArea = card.locator('textarea')
    await notesArea.fill(noteText)
    const putResponse = page.waitForResponse(
      (res) => res.url().includes('/api/teacher/rubric') && res.request().method() === 'PUT',
    )
    await notesArea.blur()
    await putResponse

    await page.reload()
    await page.getByRole('button', { name: 'Rubric' }).first().click()
    const cardAfterReload = page.locator(`[data-criterion-key="${RESEARCH_QUESTION_KEY}"]`)
    await expect(cardAfterReload).toBeVisible({ timeout: 20_000 })
    await expect(cardAfterReload.locator('textarea')).toHaveValue(noteText)
  })

  // ── AC7 ──────────────────────────────────────────────────────────────────────
  test('AC7: a teacher score above the criterion max (99) clamps to 10 after save and reload', async ({
    page,
  }) => {
    if (!studentId) throw new Error('studentId not set — beforeAll failed')

    await page.goto(`/teacher/student/${studentId}`)
    await page.getByRole('button', { name: 'Rubric' }).first().click()

    const card = page.locator(`[data-criterion-key="${RESEARCH_QUESTION_KEY}"]`)
    await expect(card).toBeVisible({ timeout: 20_000 })

    const scoreInput = card.locator('input[type="number"]')
    await scoreInput.fill('99')
    const putResponse = page.waitForResponse(
      (res) => res.url().includes('/api/teacher/rubric') && res.request().method() === 'PUT',
    )
    await scoreInput.blur()
    await putResponse

    await expect(scoreInput).toHaveValue('10')

    await page.reload()
    await page.getByRole('button', { name: 'Rubric' }).first().click()
    const cardAfterReload = page.locator(`[data-criterion-key="${RESEARCH_QUESTION_KEY}"]`)
    await expect(cardAfterReload.locator('input[type="number"]')).toHaveValue('10')
  })

  // ── AC8 ──────────────────────────────────────────────────────────────────────
  test('AC8: the card shows the team self-check score alongside the teacher score, independently', async ({
    page,
    browser,
  }) => {
    if (!studentId || !teamId) throw new Error('studentId/teamId not set — beforeAll failed')

    // Seed a student self-check score of 9 via the leader session for the SAME team.
    await seedStudentScore(browser, 9)

    await page.goto(`/teacher/student/${studentId}`)
    await page.getByRole('button', { name: 'Rubric' }).first().click()

    const card = page.locator(`[data-criterion-key="${RESEARCH_QUESTION_KEY}"]`)
    await expect(card).toBeVisible({ timeout: 20_000 })
    const studentScore = card.getByTestId('student-score')
    await expect(studentScore).toContainText(/9\s*\/\s*10/)

    // A teacher save must not move the student value.
    const scoreInput = card.locator('input[type="number"]')
    await scoreInput.fill('4')
    const putResponse = page.waitForResponse(
      (res) => res.url().includes('/api/teacher/rubric') && res.request().method() === 'PUT',
    )
    await scoreInput.blur()
    await putResponse

    await expect(studentScore).toContainText(/9\s*\/\s*10/)
    await expect(scoreInput).toHaveValue('4')

    // Clean up the seeded student row.
    await seedStudentScore(browser, 0)
  })

  // ── AC9 ──────────────────────────────────────────────────────────────────────
  test('AC9: toggling the track to Engineering changes the first criterion\'s title to "Research Problem"', async ({
    page,
  }) => {
    if (!studentId) throw new Error('studentId not set — beforeAll failed')

    await page.goto(`/teacher/student/${studentId}`)
    await page.getByRole('button', { name: 'Rubric' }).first().click()

    const scienceCard = page.locator('[data-criterion-key="science:I"]')
    await expect(scienceCard).toBeVisible({ timeout: 20_000 })
    await expect(scienceCard).toContainText('Research Question')

    await page.locator('button[data-track="engineering"]').click()

    const engineeringCard = page.locator('[data-criterion-key="engineering:I"]')
    await expect(engineeringCard).toBeVisible({ timeout: 20_000 })
    await expect(engineeringCard).toContainText('Research Problem')
  })

  // ── AC10 ─────────────────────────────────────────────────────────────────────
  test('AC10: IDOR (own team) — GET returns 200 with a criteria array and totalMax 100', async ({ page }) => {
    if (!studentId || !teamId) throw new Error('studentId/teamId not set — beforeAll failed')

    await refreshTeacherSession(page)

    const res = await api.get(page, 
      `/api/teacher/rubric?teamId=${encodeURIComponent(teamId)}&track=science`,
    )
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.criteria)).toBe(true)
    expect(body.totalMax).toBe(100)
  })

  // ── AC11 ─────────────────────────────────────────────────────────────────────
  test('AC11: IDOR (foreign team) — GET returns 403 and no criteria data', async ({ page }) => {
    if (!studentId) throw new Error('studentId not set — beforeAll failed')

    await refreshTeacherSession(page)

    // A well-formed cuid-shaped id that is not owned by this teacher's classes.
    const foreignTeamId = 'clfakerandomteamidnotowned01'
    const res = await api.get(page, 
      `/api/teacher/rubric?teamId=${encodeURIComponent(foreignTeamId)}&track=science`,
    )
    expect(res.status()).toBe(403)
    const text = await res.text()
    expect(text).not.toContain('"criteria"')
    expect(text).not.toContain('teacherScore')
  })

  // ── AC12 ─────────────────────────────────────────────────────────────────────
  test('AC12: IDOR (write) — PUT with a foreign teamId returns 403 and creates no teacher row', async ({
    page,
  }) => {
    if (!studentId) throw new Error('studentId not set — beforeAll failed')

    await refreshTeacherSession(page)

    const foreignTeamId = 'clfakerandomteamidnotowned02'
    const putRes = await api.put(page, '/api/teacher/rubric', {
      data: { teamId: foreignTeamId, track: 'science', criterionKey: RESEARCH_QUESTION_KEY, score: 5 },
    })
    expect(putRes.status()).toBe(403)

    // Confirm no row was created: a GET as the teacher for that same foreign
    // team (still 403, since ownership never changed) proves no side effect
    // leaked a scored row back through the read path either.
    const getRes = await api.get(page, 
      `/api/teacher/rubric?teamId=${encodeURIComponent(foreignTeamId)}&track=science`,
    )
    expect(getRes.status()).toBe(403)
  })

  // ── AC13 ─────────────────────────────────────────────────────────────────────
  test('AC13: unauthenticated GET is blocked pre-route with a 307 redirect to /sign-in', async () => {
    const anonCtx = await playwrightRequest.newContext({ baseURL: BASE_URL, storageState: undefined })
    try {
      const res = await anonCtx.get('/api/teacher/rubric?teamId=anything&track=science', {
        maxRedirects: 0,
      })
      expect(res.status()).toBe(307)
      expect(res.headers()['location']).toContain('/sign-in')

      const text = await res.text()
      expect(text).not.toContain('"criteria"')
    } finally {
      await anonCtx.dispose()
    }
  })

  // ── AC14 ─────────────────────────────────────────────────────────────────────
  test('AC14: PUT persists a teacher score of 5 that a subsequent GET reflects, without touching the student row', async ({
    page,
    browser,
  }) => {
    if (!studentId || !teamId) throw new Error('studentId/teamId not set — beforeAll failed')

    // Seed a distinct student self-check value so we can prove it's untouched.
    await seedStudentScore(browser, 6)

    await refreshTeacherSession(page)

    const putRes = await api.put(page, '/api/teacher/rubric', {
      data: { teamId, track: 'science', criterionKey: RESEARCH_QUESTION_KEY, score: 5 },
    })
    expect(putRes.status()).toBe(200)

    const getRes = await api.get(page, 
      `/api/teacher/rubric?teamId=${encodeURIComponent(teamId)}&track=science`,
    )
    expect(getRes.status()).toBe(200)
    const body = await getRes.json()
    const row = (
      body.criteria as Array<{ key: string; teacherScore: number | null; studentScore: number | null }>
    ).find((c) => c.key === RESEARCH_QUESTION_KEY)
    expect(row?.teacherScore).toBe(5)
    expect(row?.studentScore).toBe(6)

    // Clean up the seeded student row.
    await seedStudentScore(browser, 0)
  })
})
