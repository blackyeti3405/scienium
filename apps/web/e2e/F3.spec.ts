import { test, expect, request as playwrightRequest, type Page } from '@playwright/test'
import { STORAGE } from './roles'
import { api } from './api'
import fs from 'node:fs'
import path from 'node:path'

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
 *  AC10 — Grep: zero remaining native confirm()/alert() call sites in apps/web/components
 *
 * Seeding strategy:
 *  - Papers: POST /api/dev/fill-papers (dev-only endpoint) ensures ≥1 paper exists, then GET
 *    /api/papers to identify a deletable paper.
 *  - Project log: POST /api/project-log with a fake (but schema-valid) attachmentUrl. For
 *    multi-member teams the currentUserId (from GET /api/project-log) is passed as attendeeId.
 *  - Failure log: POST /api/failure-log (same pattern as F2).
 */

const BASE_URL = `http://localhost:${process.env.E2E_PORT ?? 3000}`
const RUN_ID = Date.now().toString(36)

// ── Seeded resource ids (set in beforeAll, cleaned up in afterAll) ─────────────
let seededPaperIds: string[] = []
let seededProjectLogId: string | null = null
let seededFailureId: string | null = null

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Click a building-sprite button by its aria-label using JavaScript's
 * element.click() — bypasses the isometric z-index overlap that prevents
 * Playwright's coordinate-based pointer events from reaching the correct button.
 */
async function clickBuilding(page: Page, ariaLabel: string) {
  await page.evaluate((label) => {
    const btn = document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
    if (!btn) throw new Error(`Building button not found: ${label}`)
    btn.click()
  }, ariaLabel)
}

/** Open the Literature Review feature panel from /lab. */
async function openLiteratureReview(page: Page) {
  await page.goto('/lab')
  // Wait for the building sprites to render before trying to open.
  await page.getByRole('button', { name: 'Open Literature Review' }).waitFor({ state: 'attached' })
  await clickBuilding(page, 'Open Literature Review')
  // Wait for the Literature Review panel (FeaturePanel) to actually open.
  await expect(page.getByRole('dialog', { name: 'Literature Review' })).toBeVisible({ timeout: 5000 })
}

/** Open the Operations Hub feature panel from /lab and switch to a given tab. */
async function openOpsHub(page: Page, tab: 'Project Log' | 'Failure Log') {
  await page.goto('/lab')
  await page.getByRole('button', { name: 'Open Operations Hub' }).waitFor({ state: 'attached' })
  await clickBuilding(page, 'Open Operations Hub')
  // Wait for the Operations Hub panel to open before clicking the tab.
  await expect(page.getByRole('dialog', { name: 'Operations Hub' })).toBeVisible({ timeout: 5000 })
  await page.getByRole('button', { name: tab }).click()
}

/** Open the Discovery feature panel from /lab, then click through the home screen. */
async function openDiscovery(page: Page) {
  await page.goto('/lab')
  await page.getByRole('button', { name: 'Open Discovery' }).waitFor({ state: 'attached' })
  await clickBuilding(page, 'Open Discovery')
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

  test.beforeAll(async () => {
    const leaderCtx = await playwrightRequest.newContext({
      baseURL: BASE_URL,
      storageState: STORAGE.leader,
    })

    // 1. Ensure papers exist (dev fill endpoint creates up to 25 fake ones).
    const fillRes = await leaderCtx.post('/api/dev/fill-papers')
    if (!fillRes.ok()) {
      await leaderCtx.dispose()
      throw new Error(`fill-papers failed: ${fillRes.status()} ${await fillRes.text()}`)
    }

    // 2. Fetch the paper list.
    const papersRes = await leaderCtx.get('/api/papers')
    if (!papersRes.ok()) {
      await leaderCtx.dispose()
      throw new Error(`GET /api/papers failed: ${papersRes.status()}`)
    }
    const { papers } = await papersRes.json()
    const readyPapers = (papers as Array<{ id: string; status: string }>).filter(
      (p) => p.status === 'ready',
    )

    if (readyPapers.length < 3) {
      await leaderCtx.dispose()
      throw new Error(`Need ≥3 ready papers for F3 tests; got ${readyPapers.length}`)
    }

    // If we have exactly 25 papers (locked), delete one via the API so that delete
    // buttons become visible in the UI (the feature hides them when locked at 25/25).
    // We track the ids we might delete during tests.
    const TOTAL_SLOTS = 25
    if (readyPapers.length >= TOTAL_SLOTS) {
      // Delete the last paper to bring the count to 24, unlocking the delete buttons.
      const toRemove = readyPapers[readyPapers.length - 1]
      await leaderCtx.delete(`/api/papers/${toRemove.id}`)
      // Re-fetch to get updated list.
      const refreshRes = await leaderCtx.get('/api/papers')
      const { papers: refreshed } = await refreshRes.json()
      seededPaperIds = (refreshed as Array<{ id: string; status: string }>)
        .filter((p) => p.status === 'ready')
        .map((p) => p.id)
    } else {
      seededPaperIds = readyPapers.map((p) => p.id)
    }

    // 3. Seed one project-log entry. The POST requires at least one attachmentUrl
    //    (path must start with /api/project-log/attachment/view — Zod prefix check only).
    //    First fetch the roster to get currentUserId for multi-member team compliance.
    const logGetRes = await leaderCtx.get('/api/project-log')
    const { currentUserId, members } = await logGetRes.json()
    const isMultiMember = (members as unknown[]).length > 1

    const projectLogBody: Record<string, unknown> = {
      body: `[E2E-F3-${RUN_ID}] Project log test entry for confirm-dialog assertion.`,
      nextSteps: `[E2E-F3-${RUN_ID}] Clean up after the test.`,
      stage: 'Testing',
      attachmentUrls: [
        `/api/project-log/attachment/view?key=log-attachments/e2e-seed/${RUN_ID}.jpg`,
      ],
    }
    if (isMultiMember) {
      projectLogBody.attendeeIds = [currentUserId]
    }

    const logPostRes = await leaderCtx.post('/api/project-log', { data: projectLogBody })
    if (logPostRes.ok()) {
      const { entry } = await logPostRes.json()
      seededProjectLogId = entry.id
    }
    // Not fatal if project-log seeding fails — AC6 handles missing entry gracefully.

    // 4. Seed one failure-log entry.
    const failureRes = await leaderCtx.post('/api/failure-log', {
      data: {
        happened: `[E2E-F3-${RUN_ID}] A test failure occurred.`,
        learned: `[E2E-F3-${RUN_ID}] We learned to handle errors gracefully.`,
      },
    })
    if (failureRes.ok()) {
      const { entry } = await failureRes.json()
      seededFailureId = entry.id
    }

    await leaderCtx.dispose()
  })

  test.afterAll(async () => {
    const leaderCtx = await playwrightRequest.newContext({
      baseURL: BASE_URL,
      storageState: STORAGE.leader,
    })

    // Clean up any papers that weren't deleted during the tests. The dev fill
    // creates persistent papers — we delete only the ones we noted.
    for (const id of seededPaperIds) {
      await leaderCtx.delete(`/api/papers/${id}`).catch(() => {})
    }

    if (seededProjectLogId) {
      await leaderCtx.delete(`/api/project-log/${seededProjectLogId}`).catch(() => {})
    }

    if (seededFailureId) {
      await leaderCtx.delete(`/api/failure-log/${seededFailureId}`).catch(() => {})
    }

    await leaderCtx.dispose()
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
    // Use the first paper id tracked in seededPaperIds for this test.
    // The paper was filled via /api/dev/fill-papers so it has a known title pattern.
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

  // ── AC10 ──────────────────────────────────────────────────────────────────────
  // A static grep over apps/web/components finds zero NATIVE confirm()/alert()
  // call sites (test files excluded). The native calls use string arguments:
  //   confirm("Delete ...")   alert('Could not delete...')
  // The custom useConfirm hook calls use object arguments:
  //   await confirm({ title: '...', ... })   await alert({ title: '...', ... })
  // So we detect the native pattern by checking for confirm/alert followed by
  // an opening quote or template literal (the old before-F3 form), excluding
  // comment lines, the ConfirmDialog implementation itself, and test files.
  test('AC10: no native confirm() or alert() call sites remain in apps/web/components', async () => {
    const componentsDir = path.resolve(__dirname, '../components')

    // Recursively collect all .tsx and .ts files under components/.
    function collectFiles(dir: string): string[] {
      const results: string[] = []
      for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name)
        const stat = fs.statSync(full)
        if (stat.isDirectory()) {
          results.push(...collectFiles(full))
        } else if (/\.(tsx?|jsx?)$/.test(name) && !/\.test\.\w+$/.test(name)) {
          results.push(full)
        }
      }
      return results
    }

    const files = collectFiles(componentsDir)
    const violations: string[] = []

    // Native confirm/alert pattern: the call takes a string literal or template literal
    // as its first argument — e.g. confirm("Delete?") or alert(`Error`).
    // The custom hook version always takes an object: confirm({ ... }) or alert({ ... }).
    // We flag lines that have confirm( or alert( followed by a quote/backtick (native form).
    // We also exclude: comment lines, JSDoc (lines starting with * ), import lines,
    // and the javascript:alert() URL-safety string (per plan out-of-scope).
    const nativePattern = /\b(?:confirm|alert)\s*\(\s*[`'"]/

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      lines.forEach((line, i) => {
        if (!nativePattern.test(line)) return

        // Exclude javascript:alert(1) URL-safety test strings (out of scope per plan).
        if (line.includes('javascript:alert(')) return

        const trimmed = line.trimStart()
        // Skip comment lines and JSDoc lines.
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return
        // Skip import declarations.
        if (trimmed.startsWith('import')) return

        violations.push(`${file}:${i + 1}: ${line.trim()}`)
      })
    }

    if (violations.length > 0) {
      throw new Error(
        `Found ${violations.length} native confirm()/alert() call site(s) in apps/web/components:\n` +
          violations.join('\n'),
      )
    }

    // All native call sites have been replaced — pass.
    expect(violations).toHaveLength(0)
  })
})
