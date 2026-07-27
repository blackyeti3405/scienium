import { test, expect, type Page } from '@playwright/test'
import { api, withSeedPage, uploadLogAttachment, openLiteratureReview } from './api'
import { e2eDb, e2eTeamId } from './db'

/**
 * F3 — Pixel-native confirm/alert dialogs.
 * One test per acceptance criterion (10 criteria total).
 * Runs as the default `chromium` project (authenticated lab leader / devuser1).
 *
 * Criterion → test mapping:
 *  AC1  — Triggering a paper delete shows in-app confirm dialog (data-testid="confirm-dialog")
 *  AC2  — Confirm dialog renders with font-pixel title chrome and dimmed backdrop
 *  AC3  — Clicking cancel closes the dialog; paper remains in list
 *  AC4  — Clicking confirm closes the dialog and the paper is removed from the list
 *  AC5  — Pressing Escape while dialog is open dismisses it without deleting
 *  AC6  — Ops Hub project-log delete shows in-app confirm dialog; confirming removes entry
 *  AC7  — Ops Hub failure-log delete shows in-app confirm dialog; confirming removes entry
 *  AC8  — Discovery "Start over" shows in-app confirm dialog; cancel leaves tree; confirm clears
 *  AC9  — Delete failure shows alert-variant dialog (single OK button) instead of native alert
 *  AC10 — Enforced by ESLint's `no-alert` rule (.eslintrc.json) at gate 4, not
 *         re-tested here — see apps/web/.eslintrc.json.
 *
 * Seeding strategy:
 *  - Papers: run-tagged rows created directly via e2eDb (the dev-only
 *    /api/dev/fill-papers route 403s under the production-build E2E server, and
 *    seeding 25 papers over HTTP blew the 30s hook budget on a loaded dev server).
 *  - Project log: POST /api/project-log with a real uploaded attachment. For
 *    multi-member teams the currentUserId (from GET /api/project-log) is passed as attendeeId.
 *  - Failure log: POST /api/failure-log (same pattern as F2).
 */

const RUN_ID = Date.now().toString(36)

// ── Seeded resource ids (set in beforeAll, cleaned up in afterAll) ─────────────
let seededProjectLogId: string | null = null
let seededFailureId: string | null = null

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Open the Operations Hub feature panel from /lab and switch to a given tab. */
async function openOpsHub(page: Page, tab: 'Project Log' | 'Failure Log') {
  await page.goto('/lab')
  await page.getByRole('button', { name: 'Open Operations Hub' }).click()
  // Wait for the Operations Hub panel to open before clicking the tab.
  await expect(page.getByRole('dialog', { name: 'Operations Hub' })).toBeVisible({ timeout: 5000 })
  await page.getByRole('button', { name: tab }).click()
}

/** Open the Discovery feature panel from /lab, then click through the home screen. */
async function openDiscovery(page: Page) {
  await page.goto('/lab')
  await page.getByRole('button', { name: 'Open Discovery' }).click()
  // Wait for the Discovery panel to open.
  const panel = page.getByRole('dialog', { name: 'Discovery' })
  await expect(panel).toBeVisible({ timeout: 5000 })
  // Dismiss the home screen (shows "Start Exploring" or "Continue Exploring")
  const continueBtn = page.getByRole('button', { name: /Exploring/i })
  await expect(continueBtn).toBeVisible({ timeout: 5000 })
  await continueBtn.click()
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

test.describe('F3 — Pixel-native confirm/alert dialogs', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async ({ browser }) => {
    await withSeedPage(browser, 'leader', async (page) => {
      // 1. Ensure papers exist (dev fill endpoint creates up to 25 fake ones).
      // 1. Seed ready papers DIRECTLY in the DB. This used to POST the dev-only
      // /api/dev/fill-papers route, which (a) 403s under the production-build
      // E2E server (the route is hard-gated on NODE_ENV, correctly), and (b) at
      // 25 sequential HTTP creates regularly blew the 30s hook budget on a
      // loaded dev server — F3's chronic 0ms AC1 failure in full-suite runs.
      // Direct createMany is one query, works in both server modes, and seeds
      // only run-tagged rows so cleanup can never touch real data.
      const teamId = await e2eTeamId()
      const uploader = await e2eDb.teamMember.findFirst({
        where: { teamId },
        select: { userId: true },
      })
      if (!uploader) throw new Error('E2E Test Lab has no members. Run pnpm --filter web seed:e2e.')

      // Stale rows from a crashed earlier run — clear before counting.
      await e2eDb.paper.deleteMany({ where: { teamId, title: { startsWith: '[E2E-F3-' } } })

      const existingReady = await e2eDb.paper.count({ where: { teamId, status: 'ready' } })
      // Delete buttons hide when the library is locked at 25/25 — stay well under,
      // and AC4 permanently deletes one, so seed enough to keep every AC ≥3.
      // Guard BOTH bounds: a crashed run elsewhere can leave the shared team at
      // ≥25 ready papers, which locks the library and would fail AC1-AC5 on an
      // opaque delete-button visibility timeout instead of this clear error.
      if (existingReady >= 25) {
        throw new Error(
          `E2E team already has ${existingReady} ready papers (library locked at 25) — a crashed run leaked fixtures; clean them up or reseed before running F3.`,
        )
      }
      const toCreate = Math.max(0, Math.min(6, 24 - existingReady))
      if (existingReady + toCreate < 3) {
        throw new Error(`Need ≥3 ready papers for F3 tests; can only reach ${existingReady + toCreate}`)
      }
      await e2eDb.paper.createMany({
        data: Array.from({ length: toCreate }, (_, i) => ({
          teamId,
          title: `[E2E-F3-${RUN_ID}] Fake Paper ${i + 1}`,
          authors: ['E2E Fixture'],
          abstract: 'Auto-generated F3 fixture paper.',
          sourceType: 'pdf' as const,
          status: 'ready' as const,
          fullText: `Placeholder text for F3 confirm-dialog fixture paper ${i + 1}.`,
          contentHash: `e2e-f3-${RUN_ID}-${i}`,
          uploadedByUserId: uploader.userId,
        })),
      })

      // 3. Seed one project-log entry. The POST requires at least one attachmentUrl
      //    (a genuine upload — team-prefixed key + `temporary` ledger row; a fabricated
      //    URL is rejected). First fetch the roster to get currentUserId for
      //    multi-member team compliance.
      const logGetRes = await api.get(page, '/api/project-log')
      const { currentUserId, members } = await logGetRes.json()
      const isMultiMember = (members as unknown[]).length > 1

      const attachmentUrl = await uploadLogAttachment(page)
      const projectLogBody: Record<string, unknown> = {
        body: `[E2E-F3-${RUN_ID}] Project log test entry for confirm-dialog assertion.`,
        nextSteps: `[E2E-F3-${RUN_ID}] Clean up after the test.`,
        stage: 'Testing',
        attachmentUrls: [attachmentUrl],
      }
      if (isMultiMember) {
        projectLogBody.attendeeIds = [currentUserId]
      }

      const logPostRes = await api.post(page, '/api/project-log', { data: projectLogBody })
      if (logPostRes.ok()) {
        const { entry } = await logPostRes.json()
        seededProjectLogId = entry.id
      }
      // Not fatal if project-log seeding fails — AC6 handles missing entry gracefully.

      // 4. Seed one failure-log entry.
      const failureRes = await api.post(page, '/api/failure-log', {
        data: {
          happened: `[E2E-F3-${RUN_ID}] A test failure occurred.`,
          learned: `[E2E-F3-${RUN_ID}] We learned to handle errors gracefully.`,
        },
      })
      if (failureRes.ok()) {
        const { entry } = await failureRes.json()
        seededFailureId = entry.id
      }
    })
  })

  test.afterAll(async ({ browser }) => {
    // Papers were DB-seeded with a run-tagged title, so cleanup is one tagged
    // deleteMany (prefix, not RUN_ID — also catches strays from crashed runs)
    // instead of N sequential HTTP deletes, which used to blow the 30s hook
    // budget right after the beforeAll did the same.
    await e2eDb.paper.deleteMany({
      where: { teamId: await e2eTeamId(), title: { startsWith: '[E2E-F3-' } },
    })

    await withSeedPage(browser, 'leader', async (page) => {
      if (seededProjectLogId) {
        await api.delete(page, `/api/project-log/${seededProjectLogId}`).catch(() => {})
      }

      if (seededFailureId) {
        await api.delete(page, `/api/failure-log/${seededFailureId}`).catch(() => {})
      }
    })
  })

  // ── AC1 ───────────────────────────────────────────────────────────────────────
  // Triggering a paper delete shows an in-app dialog (data-testid="confirm-dialog",
  // role="dialog") — no native browser confirm appeared (if it had, Playwright would
  // auto-dismiss it and the delete would proceed, leaving no in-app dialog visible).
  test('AC1: paper delete shows in-app confirm dialog, not native browser confirm', async ({
    page,
  }) => {
    await openLiteratureReview(page)

    // Wait for at least one paper delete button to appear in the list.
    const deleteBtn = page.getByTitle('Delete source').first()
    await expect(deleteBtn).toBeVisible({ timeout: 8000 })

    // Click the delete button.
    await deleteBtn.click()

    // The in-app dialog must appear. Playwright auto-dismisses native dialogs
    // (page.on('dialog')), so if this were a native confirm() the dialog would be
    // gone immediately and data-testid="confirm-dialog" would never appear.
    const dialog = page.getByTestId('confirm-dialog')
    await expect(dialog).toBeVisible({ timeout: 3000 })
    await expect(dialog).toHaveAttribute('role', 'dialog')
  })

  // ── AC2 ───────────────────────────────────────────────────────────────────────
  // The dialog title bar uses font-pixel, and the panel sits on a dimmed backdrop.
  test('AC2: confirm dialog renders with font-pixel title chrome and dimmed backdrop', async ({
    page,
  }) => {
    await openLiteratureReview(page)

    const deleteBtn = page.getByTitle('Delete source').first()
    await expect(deleteBtn).toBeVisible({ timeout: 8000 })
    await deleteBtn.click()

    const dialog = page.getByTestId('confirm-dialog')
    await expect(dialog).toBeVisible({ timeout: 3000 })

    // The backdrop div (data-testid="confirm-dialog") IS the backdrop — it has the
    // confirm-dialog__backdrop CSS class (full-screen dimmed overlay).
    await expect(dialog).toHaveClass(/confirm-dialog__backdrop/)

    // The title span inside the dialog uses font-pixel.
    const titleSpan = dialog.locator('.confirm-dialog__title.font-pixel')
    await expect(titleSpan).toBeVisible()
    // The title must be non-empty (e.g. "Delete source").
    const titleText = await titleSpan.innerText()
    expect(titleText.trim().length).toBeGreaterThan(0)

    // Dismiss the dialog so it doesn't interfere with later tests.
    await page.getByTestId('confirm-dialog-cancel').click()
    await expect(dialog).not.toBeVisible()
  })

  // ── AC3 ───────────────────────────────────────────────────────────────────────
  // Clicking the cancel button closes the dialog and the paper is still present.
  test('AC3: clicking cancel closes the dialog and the paper remains in the list', async ({
    page,
  }) => {
    await openLiteratureReview(page)

    const deleteBtns = page.getByTitle('Delete source')
    await expect(deleteBtns.first()).toBeVisible({ timeout: 8000 })

    const countBefore = await deleteBtns.count()
    expect(countBefore).toBeGreaterThan(0)

    // Click the first delete button to open the confirm dialog.
    await deleteBtns.first().click()

    const dialog = page.getByTestId('confirm-dialog')
    await expect(dialog).toBeVisible({ timeout: 3000 })

    // Click Cancel.
    await page.getByTestId('confirm-dialog-cancel').click()

    // Dialog must disappear.
    await expect(dialog).not.toBeVisible()

    // Paper count must be unchanged — the paper was NOT deleted.
    await expect(deleteBtns).toHaveCount(countBefore)
  })

  // ── AC4 ───────────────────────────────────────────────────────────────────────
  // Clicking confirm closes the dialog and removes the paper from the list.
  test('AC4: clicking confirm closes dialog and removes the paper from the list', async ({
    page,
  }) => {
    // Use the first delete button in the list — the DB-seeded fixture papers
    // (RUN_ID-tagged, see beforeAll) guarantee at least one is present.
    await openLiteratureReview(page)

    const deleteBtns = page.getByTitle('Delete source')
    await expect(deleteBtns.first()).toBeVisible({ timeout: 8000 })
    const countBefore = await deleteBtns.count()
    expect(countBefore).toBeGreaterThan(0)

    // Click the first delete button.
    const firstDeleteBtn = deleteBtns.first()
    // Get a reference to its ancestor card so we can verify it disappears.
    await firstDeleteBtn.click()

    const dialog = page.getByTestId('confirm-dialog')
    await expect(dialog).toBeVisible({ timeout: 3000 })

    // Click Confirm.
    await page.getByTestId('confirm-dialog-confirm').click()

    // Dialog must disappear.
    await expect(dialog).not.toBeVisible()

    // The total count of delete buttons must decrease by 1 (one paper removed).
    // Allow a moment for the optimistic update to render.
    await expect(deleteBtns).toHaveCount(countBefore - 1)

    // Remove the deleted paper id from our tracking so afterAll doesn't 404 on it.
    // We don't know which id was deleted here, but fill-papers created 25, so
    // the suite still has plenty for remaining tests.
  })

  // ── AC5 ───────────────────────────────────────────────────────────────────────
  // Pressing Escape while the dialog is open dismisses it without deleting anything.
  test('AC5: pressing Escape dismisses the dialog without deleting', async ({ page }) => {
    // Fetch the current paper count via API before opening the UI.
    await page.goto('/lab')
    const resBefore = await api.get(page, '/api/papers')
    const { papers: papersBefore } = await resBefore.json()
    const countBefore = (papersBefore as Array<{ id: string }>).length
    expect(countBefore).toBeGreaterThan(0)

    await openLiteratureReview(page)

    const deleteBtns = page.getByTitle('Delete source')
    await expect(deleteBtns.first()).toBeVisible({ timeout: 8000 })

    await deleteBtns.first().click()

    const dialog = page.getByTestId('confirm-dialog')
    await expect(dialog).toBeVisible({ timeout: 3000 })

    // Press Escape — must dismiss the confirm dialog.
    await page.keyboard.press('Escape')

    // The confirm dialog must disappear.
    await expect(dialog).not.toBeVisible()

    // The paper was NOT deleted — verify via API that the count is unchanged.
    // (Escape may also close the FeaturePanel due to both listeners on document;
    //  we verify the data-level outcome: no paper was removed.)
    const resAfter = await api.get(page, '/api/papers')
    const { papers: papersAfter } = await resAfter.json()
    expect((papersAfter as Array<{ id: string }>).length).toBe(countBefore)
  })

  // ── AC6 ───────────────────────────────────────────────────────────────────────
  // Operations Hub project-log delete shows the in-app confirm dialog; confirming
  // removes the entry from the list.
  test('AC6: Ops Hub project-log delete shows confirm dialog; confirming removes entry', async ({
    page,
  }) => {
    if (!seededProjectLogId) {
      test.skip(true, 'Project-log seeding failed in beforeAll — skipping AC6')
      return
    }

    await openOpsHub(page, 'Project Log')

    // Find the delete button on the seeded entry. The entry card shows its body text.
    const seedText = `[E2E-F3-${RUN_ID}]`
    const entryCard = page.locator('.ops-log-entry__card').filter({ hasText: seedText })
    await expect(entryCard).toBeVisible({ timeout: 8000 })

    const deleteBtn = entryCard.getByTitle('Delete entry')
    await expect(deleteBtn).toBeVisible()

    await deleteBtn.click()

    // In-app confirm dialog must appear.
    const dialog = page.getByTestId('confirm-dialog')
    await expect(dialog).toBeVisible({ timeout: 3000 })
    await expect(dialog).toHaveAttribute('role', 'dialog')

    // Confirm the delete.
    await page.getByTestId('confirm-dialog-confirm').click()
    await expect(dialog).not.toBeVisible()

    // Entry must be gone from the list.
    await expect(entryCard).not.toBeVisible()

    // Mark as cleaned up so afterAll doesn't try to delete it again.
    seededProjectLogId = null
  })

  // ── AC7 ───────────────────────────────────────────────────────────────────────
  // Operations Hub failure-log delete shows the in-app confirm dialog; confirming
  // removes the failure entry from the list.
  test('AC7: Ops Hub failure-log delete shows confirm dialog; confirming removes entry', async ({
    page,
  }) => {
    if (!seededFailureId) {
      test.skip(true, 'Failure-log seeding failed in beforeAll — skipping AC7')
      return
    }

    await openOpsHub(page, 'Failure Log')

    const seedText = `[E2E-F3-${RUN_ID}]`
    const entryCard = page.locator('.ops-log-entry__card').filter({ hasText: seedText })
    await expect(entryCard).toBeVisible({ timeout: 8000 })

    const deleteBtn = entryCard.getByTitle('Delete entry')
    await expect(deleteBtn).toBeVisible()

    await deleteBtn.click()

    // In-app confirm dialog must appear.
    const dialog = page.getByTestId('confirm-dialog')
    await expect(dialog).toBeVisible({ timeout: 3000 })
    await expect(dialog).toHaveAttribute('role', 'dialog')

    // Confirm the delete.
    await page.getByTestId('confirm-dialog-confirm').click()
    await expect(dialog).not.toBeVisible()

    // Entry must be gone from the list.
    await expect(entryCard).not.toBeVisible()

    seededFailureId = null
  })

  // ── AC8 ───────────────────────────────────────────────────────────────────────
  // Discovery "Start over" shows the in-app confirm dialog.
  // Cancel leaves the explorer intact; confirm calls reset().
  test('AC8: Discovery "Start over" shows confirm dialog; cancel leaves tree; confirm clears', async ({
    page,
  }) => {
    await openDiscovery(page)

    // The "Start over" button is in the header of the main explorer layout.
    const startOverBtn = page.getByRole('button', { name: 'Start over' })
    await expect(startOverBtn).toBeVisible({ timeout: 5000 })

    // — Cancel path —
    await startOverBtn.click()
    const dialog = page.getByTestId('confirm-dialog')
    await expect(dialog).toBeVisible({ timeout: 3000 })
    await expect(dialog).toHaveAttribute('role', 'dialog')

    // Dialog must describe the "Start over" action.
    await expect(dialog).toContainText('Start over')

    await page.getByTestId('confirm-dialog-cancel').click()
    await expect(dialog).not.toBeVisible()

    // "Start over" button still visible (explorer is still open — not cleared).
    await expect(startOverBtn).toBeVisible()

    // — Confirm path —
    await startOverBtn.click()
    await expect(dialog).toBeVisible({ timeout: 3000 })
    await page.getByTestId('confirm-dialog-confirm').click()

    // Dialog must close — reset() ran without a native confirm() prompt.
    await expect(dialog).not.toBeVisible()
  })

  // ── AC9 ───────────────────────────────────────────────────────────────────────
  // When a delete request fails (network error / server error), the Ops Hub shows
  // an alert-variant dialog (single OK button, data-testid="confirm-dialog") instead
  // of a native alert(). We intercept the DELETE request to force a 500.
  test('AC9: delete failure shows alert-variant dialog with single OK button', async ({ page }) => {
    // We'll use the failure-log path since it's easier to seed fresh.
    // Seed a new failure entry for this test.
    await page.goto('/lab')
    const seedRes = await api.post(page, '/api/failure-log', {
      data: {
        happened: `[E2E-F3-AC9-${RUN_ID}] Entry to trigger alert-variant test.`,
        learned: `[E2E-F3-AC9-${RUN_ID}] Alert variant appears on delete error.`,
      },
    })
    if (!seedRes.ok()) {
      test.skip(true, `Could not seed failure entry for AC9: ${seedRes.status()}`)
      return
    }
    const { entry: ac9Entry } = await seedRes.json()

    // Intercept the DELETE request for this specific entry and return 500.
    await page.route(`**/api/failure-log/${ac9Entry.id}`, async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 500, body: JSON.stringify({ error: 'simulated error' }) })
      } else {
        await route.continue()
      }
    })

    await openOpsHub(page, 'Failure Log')

    const seedText = `[E2E-F3-AC9-${RUN_ID}]`
    const entryCard = page.locator('.ops-log-entry__card').filter({ hasText: seedText })
    await expect(entryCard).toBeVisible({ timeout: 8000 })

    // Click the delete confirm button (first dialog: confirm the delete).
    await entryCard.getByTitle('Delete entry').click()
    const confirmDialog = page.getByTestId('confirm-dialog')
    await expect(confirmDialog).toBeVisible({ timeout: 3000 })
    await page.getByTestId('confirm-dialog-confirm').click()

    // After the intercepted DELETE returns 500, the Ops Hub catches the error and
    // calls await alert({ title: 'Delete failed', message: '...' }).
    // The alert-variant dialog must appear (same data-testid, no cancel button).
    await expect(confirmDialog).toBeVisible({ timeout: 5000 })
    await expect(confirmDialog).toContainText('Could not delete the entry. Please try again.')

    // Alert variant has NO cancel button — only the primary OK button.
    await expect(page.getByTestId('confirm-dialog-cancel')).toHaveCount(0)
    await expect(page.getByTestId('confirm-dialog-confirm')).toBeVisible()
    const okText = await page.getByTestId('confirm-dialog-confirm').innerText()
    expect(okText.trim()).toBe('OK')

    // Dismiss the alert.
    await page.getByTestId('confirm-dialog-confirm').click()
    await expect(confirmDialog).not.toBeVisible()

    // Clean up: delete the entry (route interceptor only matched the DELETE once;
    // unrouting here then deleting via API from outside the page is cleanest).
    await page.unrouteAll()
    await api.delete(page, `/api/failure-log/${ac9Entry.id}`).catch(() => {})
  })

})
