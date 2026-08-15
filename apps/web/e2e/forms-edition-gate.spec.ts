import { test, expect, allowErrors } from './test'
import { openGateway } from './api'
import { createLab, type OwnedLab } from './lab'

/**
 * The forms checklist's edition notice (REFACTOR2 §0.8).
 *
 * `test/forms-guidance-gate.test.ts` pins the GATE — that the route withholds
 * applicability copy unless the edition is signed, unedited and in date. It
 * cannot pin the other half: that a student actually SEES why the app is not
 * telling them which forms their project needs. This repo has no jsdom, so a
 * `.tsx` is only reachable through a browser, and the forms tab had no E2E
 * coverage at all — on a surface whose whole reason for existing is that wrong
 * guidance here can get a project disqualified.
 *
 * The lab label is deliberately free of words that appear in clickable UI text
 * (it becomes the team NAME, and `getByRole(name:)` matches substrings — see
 * `createLab`'s doc comment).
 */

let lab: OwnedLab

test.describe('Forms checklist — unreviewed edition (§0.8)', () => {

  test.beforeAll(async () => {
    lab = await createLab('edgate')
  })

  test.afterAll(async () => {
    await lab.dispose()
  })

  test('states that scienium does not say which forms apply, and links the official rules', async ({
    page,
  }) => {
    await openGateway(page, 'Science Fair')
    await page.getByRole('button', { name: 'Forms' }).click()

    // The official title is rendered (the catalog reaches the student) …
    await expect(page.getByText('Form 1A: Student Checklist/Research Plan')).toBeVisible({
      timeout: 15_000,
    })

    // … and the notice explains why nothing beside it says when to file it.
    const notice = page.getByTestId('forms-edition-notice')
    await expect(notice).toBeVisible()
    await expect(notice).toContainText('Check the official rules')
    await expect(notice.getByRole('link', { name: /Official rules/ })).toHaveAttribute(
      'href',
      /societyforscience\.org/,
    )
  })
})

/**
 * FormsChecklist's own failure handling (REFACTOR2 P2-4), same "no jsdom, only
 * reachable through a browser" reasoning as above — `page.route()` stands in
 * for the server the way `F2.spec.ts`/`F3.spec.ts`/`placement.spec.ts` already
 * intercept their own routes to force a loading/error state.
 */
let failLab: OwnedLab

test.describe('Forms checklist — load and status-update failures (P2-4)', () => {
  // Every test in this block deliberately makes /api/fairs/forms fail, so the
  // error sentinel (e2e/test.ts) would otherwise fail them for the very thing
  // they exist to prove. Scoped to that one route: an unexpected error anywhere
  // ELSE on the page is still a failure, which is the whole point.
  test.beforeEach(async ({ page }) => {
    allowErrors(page, /\/api\/fairs\/forms/)
  })

  test.beforeAll(async () => {
    failLab = await createLab('p24lab')
  })

  test.afterAll(async () => {
    await failLab.dispose()
  })

  test('unauthorized initial load (stale session redirected to sign-in) shows an error with retry, not a crash', async ({
    page,
  }) => {
    // A stale session makes middleware 307 this fetch to /sign-in, which the
    // browser follows same-origin — the client sees a 200 with an HTML body,
    // not a 401. `r.ok` alone would miss this; only the `Array.isArray(d.forms)`
    // guard catches it.
    await page.route('**/api/fairs/forms', async (route) => {
      if (route.request().method() !== 'GET') return route.continue()
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><body>Sign in</body></html>',
      })
    })

    await openGateway(page, 'Science Fair')
    await page.getByRole('button', { name: 'Forms' }).click()

    const failed = page.getByTestId('forms-load-failed')
    await expect(failed).toBeVisible({ timeout: 10_000 })
    await expect(failed).toContainText("Couldn't load your forms.")
    await expect(failed.getByRole('button', { name: 'Try again' })).toBeVisible()
  })

  test('server-error initial load surfaces the server\'s own error message, with retry', async ({
    page,
  }) => {
    await page.route('**/api/fairs/forms', async (route) => {
      if (route.request().method() !== 'GET') return route.continue()
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Database unavailable' }),
      })
    })

    await openGateway(page, 'Science Fair')
    await page.getByRole('button', { name: 'Forms' }).click()

    const failed = page.getByTestId('forms-load-failed')
    await expect(failed).toBeVisible({ timeout: 10_000 })
    await expect(failed).toContainText('Database unavailable')
  })

  test('retry succeeds after a failed load', async ({ page }) => {
    let calls = 0
    await page.route('**/api/fairs/forms', async (route) => {
      if (route.request().method() !== 'GET') return route.continue()
      calls++
      if (calls === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Database unavailable' }),
        })
      } else {
        await route.continue()
      }
    })

    await openGateway(page, 'Science Fair')
    await page.getByRole('button', { name: 'Forms' }).click()

    const failed = page.getByTestId('forms-load-failed')
    await expect(failed).toBeVisible({ timeout: 10_000 })
    await failed.getByRole('button', { name: 'Try again' }).click()

    await expect(failed).not.toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Form 1A: Student Checklist/Research Plan')).toBeVisible({
      timeout: 10_000,
    })
  })

  test('a failed status update rolls back (no false optimistic state) and surfaces an error; retry then succeeds', async ({
    page,
  }) => {
    let patchCalls = 0
    await page.route('**/api/fairs/forms/*', async (route) => {
      if (route.request().method() !== 'PATCH') return route.continue()
      patchCalls++
      if (patchCalls === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Write failed' }),
        })
      } else {
        await route.continue()
      }
    })

    await openGateway(page, 'Science Fair')
    await page.getByRole('button', { name: 'Forms' }).click()
    await expect(page.getByText('Form 1A: Student Checklist/Research Plan')).toBeVisible({
      timeout: 10_000,
    })

    const row = page.getByTestId(/^form-row-/).first()
    const cycleButton = row.getByRole('button', { name: /Cycle status for/ })

    // Every seeded form starts `not_started` (Circle, text-white/40). A rejected
    // PATCH must leave it there — not snap forward to `in_progress` and quietly
    // snap back, which is indistinguishable from "did nothing" to a student.
    await cycleButton.click()

    // Scoped to `svg[class*=…]`, not a bare attribute selector: every row also
    // has an "Official form" link carrying `text-white/40` in its own class, so
    // an unscoped match would count that anchor alongside the status icon.
    const writeFailed = page.getByTestId('forms-write-failed')
    await expect(writeFailed).toBeVisible({ timeout: 10_000 })
    await expect(writeFailed).toContainText('its status is unchanged')
    await expect(row.locator('svg[class*="text-amber-400"]')).toHaveCount(0)
    await expect(row.locator('svg[class*="text-white/40"]')).toHaveCount(1)

    // Retry re-sends the same transition; the second PATCH is unmocked and
    // succeeds, so the banner clears and the icon actually advances.
    await writeFailed.getByRole('button', { name: 'Try again' }).click()
    await expect(writeFailed).not.toBeVisible({ timeout: 10_000 })
    await expect(row.locator('svg[class*="text-amber-400"]')).toHaveCount(1)
  })
})
