import { test, expect } from '@playwright/test'
import { gotoFresh } from './api'

/**
 * NOT migrated to `createLab()` (e2e/lab.ts), on purpose: this file only READS.
 * A disposable lab costs a team create + a full purge per run and would isolate
 * nothing, because there is nothing here to isolate.
 */

/**
 * Template spec — the pattern every future E2E spec follows: assert observable
 * browser outcomes, never internal state. Runs as the default `chromium`
 * project, which is authenticated as the lab leader (devuser1). To test another
 * role, add `test.use({ storageState: STORAGE.teacher })` importing STORAGE from
 * './roles'.
 */
test('authenticated leader lands on the lab scene', async ({ page }) => {
  // The post-sign-in landing (/dashboard) redirects to the lab — the home surface.
  await gotoFresh(page, '/dashboard')

  await expect(page).toHaveURL(/\/lab/)
  await expect(page).toHaveTitle(/scienium/)
  await expect(page.getByRole('button', { name: 'Open buildings shop' })).toBeVisible()
})
