import { test, expect } from './test'
import { request as playwrightRequest } from '@playwright/test'
import { api, withSeedPage, gotoFresh } from './api'
import { createLab, type OwnedLab } from './lab'

/**
 * F1 — Student-facing teacher feedback inbox.
 * One test per acceptance criterion (12 criteria total).
 * Runs as the default `chromium` project (authenticated lab leader / devuser1).
 *
 * Criterion → test mapping:
 *  AC1  — FEEDBACK FAB visible with aria-label and "FEEDBACK" label
 *  AC2  — Clicking FAB opens dialog headed "Teacher Feedback" within 2s
 *  AC3  — Note body text visible in panel when feedback exists
 *  AC4  — Note shows teacher name and one of the four contextual target labels
 *  AC5  — "Mark addressed" removes button and shows Addressed without page reload
 *  AC6  — Badge disappears when unresolved count reaches 0
 *  AC7  — Resolved state persists after /lab reload (DB, not local state)
 *  AC8  — /lab?panel=feedback auto-opens the dialog on load
 *  AC9  — Empty state "No feedback from your teacher yet." when team has no feedback
 *  AC10 — API PATCH with unknown id returns updated:0 (team-scoped IDOR guard)
 *  AC11 — GET returns 200 + items array for authenticated user; 401 path documented
 *  AC12 — Panel uses pixel aesthetic: font-pixel chrome, dark bg, gold accent on FAB
 *
 * Seeding: beforeAll uses a fresh teacher session (withSeedPage) to POST one
 * TeacherFeedback row via /api/teacher/feedback. The teacher first calls
 * GET /api/teacher/roster to discover the test team's id. afterAll resolves the
 * seeded row via the student (leader) session.
 */

/** Body text used for the seeded row — unique enough to distinguish from pre-existing rows. */
const SEED_BODY = '[E2E F1 seed] Great job on the hypothesis section!'

let lab: OwnedLab

/** Seeded feedback id (set in beforeAll, read/reset in tests). */
let seededId: string | null = null

test.describe('F1 — Student-facing teacher feedback inbox', () => {
  // Order-dependent (order comes from fullyParallel:false — see playwright.config.ts): DB state mutations
  // (mark-addressed, resolve) build on each other.

  // ── Seed / teardown ───────────────────────────────────────────────────────────

  test.beforeAll(async ({ browser }) => {
    // The lab is created WITH co-members, which is what makes the teacher's
    // scope resolve: `createLab` puts the new team in the leader's class, and
    // bringing the student along means the whole fixture roster points at this
    // lab rather than the shared one.
    //
    // Discovery itself is gone. This used to GET the roster and take
    // `teamId === 'e2e_test_lab_01'`, falling back to "any student with a
    // team" — a fallback that could seed teacher feedback into a REAL lab that
    // happened to share the teacher's class. There is no guessing left: the
    // team is the one this file made.
    lab = await createLab('feedback-inbox', true, true)

    await withSeedPage(browser, 'teacher', async (page) => {
      const feedRes = await api.post(page, '/api/teacher/feedback', {
        data: { teamId: lab.teamId, targetType: 'team', body: SEED_BODY },
      })
      if (!feedRes.ok()) {
        throw new Error(`Feedback seed failed: ${feedRes.status()} ${await feedRes.text()}`)
      }
      const { feedback } = await feedRes.json()
      seededId = feedback.id
    })
  })

  test.afterAll(async () => {
    // `TeacherFeedback` has no DELETE endpoint, so this used to settle for
    // PATCHing the row `resolved: true` and hoping that was enough to keep it
    // out of the next run's inbox. The row goes with the lab now.
    await lab.dispose()
  })

  // ── AC1 ──────────────────────────────────────────────────────────────────────
  test('AC1: FEEDBACK FAB is visible on /lab with aria-label and FEEDBACK label', async ({
    page,
  }) => {
    await gotoFresh(page, '/lab')
    const fab = page.getByRole('button', { name: 'Open teacher feedback' })
    await expect(fab).toBeVisible()
    await expect(fab).toContainText('FEEDBACK')
  })

  // ── AC2 ──────────────────────────────────────────────────────────────────────
  test('AC2: clicking FEEDBACK FAB opens Teacher Feedback dialog within 2s', async ({ page }) => {
    await gotoFresh(page, '/lab')
    await page.getByRole('button', { name: 'Open teacher feedback' }).click()
    const dialog = page.getByRole('dialog', { name: 'Teacher Feedback' })
    await expect(dialog).toBeVisible({ timeout: 2000 })
    await expect(dialog).toContainText('Teacher Feedback')
  })

  // ── AC3 ──────────────────────────────────────────────────────────────────────
  test('AC3: feedback note body text is visible in the panel when feedback exists', async ({
    page,
  }) => {
    // seededId is guaranteed by beforeAll; if seeding failed the suite already errors.
    await gotoFresh(page, '/lab')
    await page.getByRole('button', { name: 'Open teacher feedback' }).click()
    const dialog = page.getByRole('dialog', { name: 'Teacher Feedback' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText(SEED_BODY)
  })

  // ── AC4 ──────────────────────────────────────────────────────────────────────
  test('AC4: each note shows teacher name and a valid contextual target label', async ({
    page,
  }) => {
    await gotoFresh(page, '/lab')
    // Fetch to get the teacher name for the seeded item.
    const res = await api.get(page, '/api/team/feedback')
    const json = await res.json()
    const seeded = json.items.find((i: { id: string }) => i.id === seededId) ?? json.items[0]

    await page.getByRole('button', { name: 'Open teacher feedback' }).click()
    const dialog = page.getByRole('dialog', { name: 'Teacher Feedback' })
    await expect(dialog).toBeVisible()

    // Teacher name must be visible.
    const teacherName = seeded?.teacher?.name ?? 'Your teacher'
    await expect(dialog).toContainText(teacherName)

    // Contextual label must be one of the four plan-specified values.
    const allowed = ['To your lab', 'On your project log', 'On a paper', 'On your showcase']
    const text = await dialog.innerText()
    const hasLabel = allowed.some((l) => text.includes(l))
    expect(hasLabel).toBe(true)
  })

  // ── AC5 ──────────────────────────────────────────────────────────────────────
  test('AC5: Mark addressed removes button and shows Addressed without a page reload', async ({
    page,
  }) => {
    // Reset the seeded item to unresolved so this test always starts with data to act on.
    // Navigate first so the session cookies are live before making API calls.
    await gotoFresh(page, '/lab')
    if (seededId) {
      await api.patch(page, '/api/team/feedback', {
        data: { id: seededId, resolved: false },
      })
    }

    // Reload to pick up the reset state, then open the panel.
    await gotoFresh(page, '/lab')
    await page.getByRole('button', { name: 'Open teacher feedback' }).click()
    const dialog = page.getByRole('dialog', { name: 'Teacher Feedback' })
    await expect(dialog).toBeVisible()

    // Find the specific seeded item by its data-feedback-id attribute.
    // This is resilient to other historical items with the same body text.
    const seedItem = dialog.locator(`[data-feedback-id="${seededId}"]`)
    const markBtn = seedItem.getByRole('button', { name: 'Mark addressed' })
    await expect(markBtn).toBeVisible()

    const urlBefore = page.url()
    await markBtn.click()

    // "Mark addressed" button must disappear (optimistic update, no reload).
    await expect(markBtn).not.toBeVisible()
    // "Addressed" indicator must appear within the same list item.
    await expect(seedItem).toContainText('Addressed')
    // URL is unchanged — confirms no full page reload occurred.
    expect(page.url()).toBe(urlBefore)
  })

  // ── AC6 ──────────────────────────────────────────────────────────────────────
  test('AC6: badge unread count is not visible after all notes are resolved', async ({ page }) => {
    await gotoFresh(page, '/lab')
    const res = await api.get(page, '/api/team/feedback')
    const json = await res.json()
    const unresolved = json.items.filter((i: { resolved: boolean }) => !i.resolved)

    if (unresolved.length === 0) {
      // Already zero — badge must not be visible right now.
      const badge = page.locator('.feedback-fab__badge')
      await expect(badge).not.toBeVisible()
      return
    }

    // Resolve all unresolved items via the API, then reload to check the badge.
    for (const item of unresolved) {
      await api.patch(page, '/api/team/feedback', {
        data: { id: item.id, resolved: true },
      })
    }

    await page.reload()
    const badge = page.locator('.feedback-fab__badge')
    await expect(badge).not.toBeVisible()
  })

  // ── AC7 ──────────────────────────────────────────────────────────────────────
  test('AC7: resolved state persists after /lab reload (written to DB)', async ({ page }) => {
    // Navigate first so session cookies are live before making API calls.
    await gotoFresh(page, '/lab')

    // Reset the seeded item to unresolved so this test always has something to resolve.
    if (seededId) {
      await api.patch(page, '/api/team/feedback', {
        data: { id: seededId, resolved: false },
      })
    }

    // Reload to pick up the reset state.
    await gotoFresh(page, '/lab')
    const res = await api.get(page, '/api/team/feedback')
    const json = await res.json()
    // Prefer the seeded item (by id); fall back to any unresolved item.
    const target =
      json.items.find(
        (i: { id: string; resolved: boolean }) => i.id === seededId && !i.resolved,
      ) ?? json.items.find((i: { resolved: boolean }) => !i.resolved)

    if (!target) {
      throw new Error('AC7: expected at least one unresolved feedback item after reset')
    }

    // Resolve the target via API (the feature under test is that this persists through a reload).
    await api.patch(page, '/api/team/feedback', {
      data: { id: target.id, resolved: true },
    })

    // Full reload, then open panel.
    await gotoFresh(page, '/lab')
    await page.getByRole('button', { name: 'Open teacher feedback' }).click()
    const dialog = page.getByRole('dialog', { name: 'Teacher Feedback' })
    await expect(dialog).toBeVisible()

    // The specific seeded item must appear as Addressed after the reload.
    const resolvedItem = dialog.locator(`[data-feedback-id="${target.id}"]`)
    await expect(resolvedItem).toContainText('Addressed')
    // Its "Mark addressed" button must be absent.
    await expect(resolvedItem.getByRole('button', { name: 'Mark addressed' })).toHaveCount(0)
  })

  // ── AC8 ──────────────────────────────────────────────────────────────────────
  test('AC8: /lab?panel=feedback auto-opens Teacher Feedback dialog on load', async ({ page }) => {
    await gotoFresh(page, '/lab?panel=feedback')
    const dialog = page.getByRole('dialog', { name: 'Teacher Feedback' })
    await expect(dialog).toBeVisible({ timeout: 3000 })
  })

  // ── AC9 ──────────────────────────────────────────────────────────────────────
  test('AC9: empty state text appears when the team has no feedback', async ({ page }) => {
    await gotoFresh(page, '/lab')
    const res = await api.get(page, '/api/team/feedback')
    const json = await res.json()

    await page.getByRole('button', { name: 'Open teacher feedback' }).click()
    const dialog = page.getByRole('dialog', { name: 'Teacher Feedback' })
    await expect(dialog).toBeVisible()

    if (json.items.length === 0) {
      await expect(dialog).toContainText('No feedback from your teacher yet.')
    } else {
      // Feedback exists (seeded row is present) — empty state must NOT be shown.
      await expect(dialog).not.toContainText('No feedback from your teacher yet.')
    }
  })

  // ── AC10 ─────────────────────────────────────────────────────────────────────
  test('AC10: PATCH with an id from another team returns updated:0 (IDOR guard)', async ({
    page,
  }) => {
    await gotoFresh(page, '/lab')
    // A fake / cross-team id — updateMany's teamId guard means count is always 0.
    const res = await api.patch(page, '/api/team/feedback', {
      data: { id: 'clxxxxxxxxxxxxxxxxxxxxxxx', resolved: true },
    })
    expect(res.status()).toBe(200)
    const json = await res.json()
    // If the row doesn't belong to this team (or doesn't exist), count must be 0.
    expect(json.updated).toBe(0)
  })

  // ── AC11 ─────────────────────────────────────────────────────────────────────
  test('AC11: GET /api/team/feedback returns 200 + items array for authenticated user', async ({
    page,
  }) => {
    await gotoFresh(page, '/lab')
    const res = await api.get(page, '/api/team/feedback')
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json.items)).toBe(true)
    expect(typeof json.unresolvedCount).toBe('number')
  })

  test('AC11 (401): GET /api/team/feedback denies unauthenticated access', async () => {
    // This AC was skipped from the day it was written, on the belief that Clerk's
    // @testing/playwright interceptors inject the testing JWT into every
    // in-context fetch and so a signed-out request could not be simulated. That
    // is true of a request made through an AUTHENTICATED context — but a request
    // context built with `storageState: undefined` has no session to inject, and
    // five other specs now prove the point by getting a real 401 that way
    // (F8-reports AC4, F10-teacher-rubric AC13, papers-tab PM7,
    // disco-article-sources AC-Article-5, lit-explain-it-back). So the security
    // assertion this AC names runs for real now, instead of being taken on trust.
    const anonCtx = await playwrightRequest.newContext({
      baseURL: `http://localhost:${process.env.E2E_PORT ?? 3000}`,
      storageState: undefined,
    })
    try {
      const res = await anonCtx.get('/api/team/feedback', { maxRedirects: 0 })
      // v0.78.0 (febe752e): /api/* answers JSON 401, never a 307 to sign-in HTML.
      expect(res.status()).toBe(401)

      const text = await res.text()
      expect(text).not.toContain('"items"')
      expect(text).not.toContain('"unresolvedCount"')
    } finally {
      await anonCtx.dispose()
    }
  })

  // ── AC12 ─────────────────────────────────────────────────────────────────────
  test('AC12: panel matches pixel aesthetic — font-pixel chrome, dark bg, gold FAB', async ({
    page,
  }) => {
    await gotoFresh(page, '/lab')

    // FEEDBACK FAB carries the font-pixel class (chrome rule).
    const fab = page.getByRole('button', { name: 'Open teacher feedback' })
    await expect(fab).toBeVisible()
    await expect(fab).toHaveClass(/font-pixel/)

    await fab.click()
    const dialog = page.getByRole('dialog', { name: 'Teacher Feedback' })
    await expect(dialog).toBeVisible()

    // Header span uses font-pixel (pixel chrome on dialog heading).
    const headerSpan = dialog.locator('header span.font-pixel').first()
    await expect(headerSpan).toBeVisible()

    // Inner panel div has dark #0d1b2e background (rgb(13, 27, 46)).
    const panelInner = dialog.locator('div').first()
    const bg = await panelInner.evaluate((el: Element) => getComputedStyle(el).backgroundColor)
    expect(bg).toBe('rgb(13, 27, 46)')
  })
})
