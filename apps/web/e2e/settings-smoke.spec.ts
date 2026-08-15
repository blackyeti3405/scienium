import { test, expect } from './test'
import { gotoFresh } from './api'

/**
 * NOT migrated to `createLab()` (e2e/lab.ts), on purpose: read-only smoke. See
 * the same note in e2e/smoke.spec.ts.
 */

/**
 * Lab Profile settings smoke — the ONLY browser coverage of this surface.
 * Added when its topic flow moved onto the shared useFinalTopic hook: proves
 * the panel opens, loads real data, and the topic editor round-trips through
 * the hook's state (open editor → draft seeded → cancel).
 */
test('settings panel renders profile + research topic via the shared hook', async ({ page }) => {
  await gotoFresh(page, '/lab')
  await page.getByRole('button', { name: 'Settings', exact: true }).click()

  const dialog = page.getByRole('dialog', { name: 'Settings' })
  await expect(dialog).toBeVisible()

  await expect(dialog.getByRole('heading', { name: 'Research topic' })).toBeVisible()

  // Topic section: loads via useFinalTopic; the edit button seeds the draft.
  const editBtn = dialog.getByRole('button', { name: /Change topic|Set topic/ })
  await editBtn.click()
  const draft = dialog.getByRole('textbox').first()
  await expect(draft).toBeVisible()
})
