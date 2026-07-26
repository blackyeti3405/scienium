import { test, expect } from '@playwright/test'
import { withSeedPage } from './api'
import { e2eDb } from './db'

/**
 * "Your data" — export / erasure requests (REFACTOR2 P1-R9).
 *
 * The unit tests cover the workflow; what they cannot show is whether a student
 * can reach it, and — much more importantly — that reaching it does NOT erase
 * anything. v0.48.0's lesson was that endpoints nobody can click fix nothing;
 * the lesson here is the opposite one, that a destructive-sounding button in a
 * settings panel must provably do nothing until an operator approves.
 *
 * DELIBERATELY NON-DESTRUCTIVE. It files a request and then asserts the account
 * is untouched, and cleans the request row up afterwards so the fixture graph
 * every other spec shares is left exactly as it was found.
 */

async function openSettings(page: import('@playwright/test').Page) {
  await page.goto('/lab')
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByTestId('settings-data-section')).toBeVisible()
}

test.describe('data export and erasure requests', () => {
  test('the section renders with both requests reachable', async ({ browser }) => {
    await withSeedPage(browser, 'leader', async (page) => {
      await openSettings(page)

      await expect(page.getByRole('button', { name: 'Request a copy' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Request deletion' })).toBeVisible()
      // The copy has to say where a bundle actually goes — never to this page.
      await expect(page.getByText(/delivered through your school/i)).toBeVisible()
    })
  })

  test('deletion is two-step and states its consequence before the second click', async ({
    browser,
  }) => {
    await withSeedPage(browser, 'leader', async (page) => {
      await openSettings(page)

      await page.getByRole('button', { name: 'Request deletion' }).click()

      await expect(page.getByText(/It cannot be undone once they approve/i)).toBeVisible()
      await expect(page.getByRole('button', { name: 'Confirm deletion request' })).toBeVisible()

      // Backing out must leave nothing behind.
      await page.getByRole('button', { name: 'Cancel' }).click()
      await expect(page.getByRole('button', { name: 'Confirm deletion request' })).toHaveCount(0)
    })
  })

  test('filing an export request queues it and erases nothing', async ({ browser }) => {
    await withSeedPage(browser, 'leader', async (page) => {
      await openSettings(page)

      const filed = page.waitForResponse(
        (r) => r.url().includes('/api/data-requests') && r.request().method() === 'POST',
      )
      await page.getByRole('button', { name: 'Request a copy' }).click()
      const res = await filed
      expect(res.status()).toBe(200)
      const { request } = await res.json()

      try {
        // Queued for review — NOT approved, NOT run.
        expect(request.status).toBe('requested')
        await expect(page.getByText('awaiting review')).toBeVisible()

        const row = await e2eDb.dataRequest.findUnique({ where: { id: request.id } })
        expect(row?.status).toBe('requested')
        expect(row?.completedAt).toBeNull()

        // The account is untouched: filing is an ask, not an action.
        const user = await e2eDb.user.findUnique({ where: { id: row!.subjectUserId } })
        expect(user?.deletedAt).toBeNull()
        expect(user?.email).toBe(row!.subjectEmail)

        // Re-clicking the same day replays the one request rather than queueing another.
        const again = page.waitForResponse(
          (r) => r.url().includes('/api/data-requests') && r.request().method() === 'POST',
        )
        await page.getByRole('button', { name: 'Request a copy' }).click()
        expect((await (await again).json()).request.id).toBe(request.id)
        expect(await e2eDb.dataRequest.count({ where: { subjectUserId: row!.subjectUserId } })).toBe(
          1,
        )
      } finally {
        await e2eDb.dataRequest.deleteMany({ where: { id: request.id } })
      }
    })
  })
})
