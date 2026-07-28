import { test, expect, request as playwrightRequest } from '@playwright/test'
import { STORAGE } from './roles'
import { api, withSeedPage } from './api'

/**
 * NOT migrated to `createLab()` (e2e/lab.ts), on purpose. This file writes
 * nothing, and its central invariant is that `reports.teamCount` equals the
 * number of distinct teams on the teacher's WHOLE roster. A disposable lab adds
 * a team to that roster for the duration, which is the one thing that would
 * make the assertion measure something other than what it means.
 */

/**
 * F8 — Teacher class-wide analytics / Reports tab.
 * One test per acceptance criterion, per `.claude/pipeline/plan-F8-reports.md`.
 * Zero LLM in this feature — no seams needed. Read-only aggregation: this spec
 * creates/mutates nothing and asserts structurally against whatever the seeded
 * E2E teacher/class/team fixture graph already contains.
 *
 * Criterion -> test mapping:
 *  AC1  — Teacher navigating to /teacher/reports sees <h1> "Class Reports" within 3s
 *  AC2  — Teacher layout nav shows a "Reports" link with href /teacher/reports
 *  AC3  — GET /api/teacher/reports as teacher -> 200 JSON with the 5 aggregate keys
 *  AC4  — CORRECTED per task brief: unauthenticated GET is blocked pre-route by
 *         Clerk middleware with a 307 -> /sign-in (not 401), no data in body
 *  AC5  — CORRECTED per task brief: authenticated non-teacher (leader/student)
 *         gets whatever requireTeacher's role layer actually returns (403 JSON
 *         `{ error: 'Teacher access required' }`), asserted as that real behavior
 *  AC6  — [data-testid="report-phase-distribution"] visible after load
 *  AC7  — [data-testid="report-proficiency-heatmap"] visible with >= 1 team row
 *  AC8  — [data-testid="report-kp-distribution"] visible after load
 *  AC9  — [data-testid="report-pacing"] visible with >= 1 pacing row
 *  AC10 — [data-testid="report-summary"] text matches /\d+ students/
 *  AC11 — "Print / Save as PDF" control visible, inside a [data-print-hide] wrapper
 *  AC12 — IDOR/scoping: reports' teamCount equals the distinct team count
 *         derived from GET /api/teacher/roster for the same teacher
 *
 * Note on the coder's documented deviation (changes-F8-reports.md): the page
 * header ("Class Reports" <h1>) lives only in page.tsx, not duplicated in
 * TeacherReports.tsx — AC1 is asserted against the page's <h1>, which this spec
 * does not care is emitted by the page vs. the component.
 */

const BASE_URL = `http://localhost:${process.env.E2E_PORT ?? 3000}`

test.describe('F8 — Teacher Reports', () => {
  test.use({ storageState: STORAGE.teacher })

  // ── AC1 ──────────────────────────────────────────────────────────────────
  test('AC1: teacher navigating to /teacher/reports sees <h1> "Class Reports" within 3s', async ({
    page,
  }) => {
    await page.goto('/teacher/reports')
    await expect(page.getByRole('heading', { level: 1, name: 'Class Reports' })).toBeVisible({
      timeout: 3000,
    })
  })

  // ── AC2 ──────────────────────────────────────────────────────────────────
  test('AC2: teacher layout nav shows a "Reports" link that navigates to /teacher/reports', async ({
    page,
  }) => {
    await page.goto('/teacher')
    const link = page.getByRole('link', { name: 'Reports' })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', '/teacher/reports')

    await link.click()
    await expect(page).toHaveURL(/\/teacher\/reports/)
  })

  // ── AC3 ──────────────────────────────────────────────────────────────────
  test('AC3: GET /api/teacher/reports as the teacher returns 200 with the aggregate keys', async ({
    page,
  }) => {
    // Navigate first — a stored Clerk session cookie can be minutes-stale by
    // the time a serial suite reaches a bare page.request call.
    await page.goto('/teacher/reports')
    await expect(page.getByRole('heading', { level: 1, name: 'Class Reports' })).toBeVisible({
      timeout: 3000,
    })

    const res = await api.get(page, '/api/teacher/reports')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('hasClasses')
    expect(body).toHaveProperty('phaseCounts')
    expect(body).toHaveProperty('kpDistribution')
    expect(body).toHaveProperty('proficiency')
    expect(body).toHaveProperty('pacing')
  })

  // ── AC4 (corrected) ────────────────────────────────────────────────────────
  test('AC4: unauthenticated GET is blocked pre-route with a 307 redirect to /sign-in', async () => {
    // storageState MUST be explicitly cleared: playwrightRequest.newContext
    // otherwise inherits the chromium project's default storageState
    // (STORAGE.leader), which would make this "unauthenticated" request
    // actually authenticated as the leader.
    const anonCtx = await playwrightRequest.newContext({ baseURL: BASE_URL, storageState: undefined })
    try {
      const res = await anonCtx.get('/api/teacher/reports', { maxRedirects: 0 })
      expect(res.status()).toBe(307)
      expect(res.headers()['location']).toContain('/sign-in')

      const text = await res.text()
      expect(text).not.toContain('"phaseCounts"')
      expect(text).not.toContain('"proficiency"')
    } finally {
      await anonCtx.dispose()
    }
  })

  // ── AC5 (corrected) ────────────────────────────────────────────────────────
  test('AC5: an authenticated non-teacher (leader) gets requireTeacher\'s real role-gate response (403)', async ({
    browser,
  }) => {
    // The describe default session is the teacher; this cross-role check needs a
    // LEADER session instead. withSeedPage opens a fresh authed leader page
    // (navigating to /lab so clerk-js mints a live token — same freshness
    // convention as F10's IDOR checks) and hands it to api.get, which
    // re-refreshes the Clerk session before the call.
    await withSeedPage(browser, 'leader', async (page) => {
      const res = await api.get(page, '/api/teacher/reports')
      expect(res.status()).toBe(403)
      const body = await res.json()
      expect(body).toEqual({ error: 'Teacher access required' })
    })
  })

  // ── AC6 ──────────────────────────────────────────────────────────────────
  test('AC6: [data-testid="report-phase-distribution"] is visible after load', async ({ page }) => {
    await page.goto('/teacher/reports')
    await expect(page.getByTestId('report-phase-distribution')).toBeVisible({ timeout: 8000 })
  })

  // ── AC7 ──────────────────────────────────────────────────────────────────
  test('AC7: [data-testid="report-proficiency-heatmap"] is visible with at least one team row', async ({
    page,
  }) => {
    await page.goto('/teacher/reports')
    const heatmap = page.getByTestId('report-proficiency-heatmap')
    await expect(heatmap).toBeVisible({ timeout: 8000 })
    await expect(heatmap.getByTestId('report-proficiency-row').first()).toBeVisible()
    expect(await heatmap.getByTestId('report-proficiency-row').count()).toBeGreaterThan(0)
  })

  // ── AC8 ──────────────────────────────────────────────────────────────────
  test('AC8: [data-testid="report-kp-distribution"] is visible after load', async ({ page }) => {
    await page.goto('/teacher/reports')
    await expect(page.getByTestId('report-kp-distribution')).toBeVisible({ timeout: 8000 })
  })

  // ── AC9 ──────────────────────────────────────────────────────────────────
  test('AC9: [data-testid="report-pacing"] is visible with at least one pacing row', async ({ page }) => {
    await page.goto('/teacher/reports')
    const pacing = page.getByTestId('report-pacing')
    await expect(pacing).toBeVisible({ timeout: 8000 })
    await expect(pacing.getByTestId('report-pacing-row').first()).toBeVisible()
    expect(await pacing.getByTestId('report-pacing-row').count()).toBeGreaterThan(0)
  })

  // ── AC10 ─────────────────────────────────────────────────────────────────
  test('AC10: [data-testid="report-summary"] text includes the seeded student count', async ({ page }) => {
    await page.goto('/teacher/reports')
    const summary = page.getByTestId('report-summary')
    await expect(summary).toBeVisible({ timeout: 8000 })
    await expect(summary).toHaveText(/\d+ students/)
  })

  // ── AC11 ─────────────────────────────────────────────────────────────────
  test('AC11: a "Print / Save as PDF" control is visible inside a [data-print-hide] wrapper', async ({
    page,
  }) => {
    await page.goto('/teacher/reports')
    const printButton = page.getByRole('button', { name: 'Print / Save as PDF' })
    await expect(printButton).toBeVisible({ timeout: 8000 })

    const hideWrapper = page.locator('[data-print-hide]', {
      has: page.getByRole('button', { name: 'Print / Save as PDF' }),
    })
    await expect(hideWrapper).toHaveCount(1)
  })

  // ── AC12 ─────────────────────────────────────────────────────────────────
  test('AC12: reports teamCount equals the distinct team count from the roster for the same teacher', async ({
    page,
  }) => {
    await page.goto('/teacher/reports')
    await expect(page.getByRole('heading', { level: 1, name: 'Class Reports' })).toBeVisible({
      timeout: 3000,
    })

    const reportsRes = await api.get(page, '/api/teacher/reports')
    expect(reportsRes.status()).toBe(200)
    const reportsBody = await reportsRes.json()

    const rosterRes = await api.get(page, '/api/teacher/roster')
    expect(rosterRes.status()).toBe(200)
    const rosterBody = await rosterRes.json()

    const rosterTeamIds = new Set(
      (rosterBody.students as Array<{ teamId: string | null }>)
        .map((s) => s.teamId)
        .filter((id): id is string => !!id),
    )

    expect(reportsBody.teamCount).toBe(rosterTeamIds.size)
  })
})
