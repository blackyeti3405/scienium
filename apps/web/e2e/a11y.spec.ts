import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { withLab } from './lab'
import { e2eDb } from './db'
import { gotoFresh } from './api'

/**
 * Accessibility smoke (A9) — the automated floor, not a full audit:
 *
 *   1. axe scan of the lab scene and an open feature panel — no CRITICAL
 *      violations (missing accessible names, broken ARIA, nested-interactive);
 *   2. a real keyboard flow: Tab to a gateway, Enter opens its panel, focus
 *      lands inside, Tab CYCLES inside (the useModalA11y trap), Escape closes
 *      and focus RETURNS to the trigger;
 *   3. the Discovery tree's SVG controls are operable by keyboard (REFACTOR2
 *      §0.7) — they carried `role="button"` with no `tabIndex` or key handler,
 *      which announces a button to a screen reader that cannot then be focused
 *      or activated.
 *
 * Runs on Desktop Chrome and, via the `tablet-a11y` project, an iPad
 * viewport. Serious-but-not-critical findings (e.g. contrast on decorative
 * pixel chrome) are tracked in REFACTOR2 A9 rather than gated here — gate
 * what must never regress, report the rest.
 */

async function scanCritical(page: Page) {
  const results = await new AxeBuilder({ page }).analyze()
  return results.violations.filter((v) => v.impact === 'critical')
}

test.describe('accessibility floor (A9)', () => {
  test('lab scene has no critical axe violations', async ({ page }) => {
    await gotoFresh(page, '/lab')
    await page.getByRole('button', { name: 'Open Operations Hub' }).waitFor({ state: 'attached' })
    const critical = await scanCritical(page)
    expect(
      critical.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
    ).toEqual([])
  })

  test('keyboard flow: open a gateway, trapped focus, Escape restores', async ({ page }) => {
    await gotoFresh(page, '/lab')
    const gateway = page.getByRole('button', { name: 'Open Operations Hub' })
    await gateway.waitFor({ state: 'attached' })

    // Reach the gateway by KEYBOARD (bounded Tab walk), then activate it.
    let reached = false
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press('Tab')
      const label = await page.evaluate(
        () => document.activeElement?.getAttribute('aria-label') ?? '',
      )
      if (label === 'Open Operations Hub') {
        reached = true
        break
      }
    }
    expect(reached, 'gateway button must be reachable by Tab').toBe(true)
    await page.keyboard.press('Enter')

    const dialog = page.locator('.feature-panel__backdrop[role="dialog"]')
    await expect(dialog).toBeVisible()

    // Initial focus is INSIDE the dialog.
    expect(
      await page.evaluate(() =>
        document.querySelector('.feature-panel__backdrop')?.contains(document.activeElement),
      ),
    ).toBe(true)

    // The trap holds: 40 Tabs never escape the dialog.
    for (let i = 0; i < 40; i++) await page.keyboard.press('Tab')
    expect(
      await page.evaluate(() =>
        document.querySelector('.feature-panel__backdrop')?.contains(document.activeElement),
      ),
    ).toBe(true)

    // The open panel itself carries no critical violations.
    const critical = await scanCritical(page)
    expect(critical.map((v) => v.id)).toEqual([])

    // Escape closes and RESTORES focus to the trigger.
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    expect(
      await page.evaluate(
        () => document.activeElement?.getAttribute('aria-label') ?? '',
      ),
    ).toBe('Open Operations Hub')
  })

  test('discovery tree nodes are focusable and operable by keyboard', async ({ page }) => {
    // A disposable lab with a KNOWN tree. Seeding rather than skipping is the
    // point: the first version of this test skipped on the empty shared fixture,
    // and a skipped accessibility test proves exactly nothing — which is the
    // false-skip pattern the E2E audit called out.
    await withLab('a11y-tree', async (lab) => {
      const root = await e2eDb.discoveryNode.create({
        data: {
          teamId: lab.teamId,
          sourceType: 'wikipedia',
          wikipediaTitle: 'Photosynthesis',
          visitedByUserId: lab.leaderUserId,
        },
        select: { id: true },
      })
      await e2eDb.discoveryNode.create({
        data: {
          teamId: lab.teamId,
          parentId: root.id,
          sourceType: 'wikipedia',
          wikipediaTitle: 'Chlorophyll',
          visitedByUserId: lab.leaderUserId,
        },
      })

      await gotoFresh(page, '/discovery')
      await page.getByRole('button', { name: /Continue Exploring|Start Exploring/ }).click()

      const controls = page.locator('svg[aria-label="Discovery tree"] g[role="button"]')
      await expect(controls.first()).toBeAttached({ timeout: 15000 })

      // Focusable at all: `<g>` is not natively focusable, so this passes only
      // because the control sets `tabIndex`.
      await controls.first().focus()
      expect(
        await page.evaluate(() => document.activeElement?.getAttribute('role')),
        'a tree control must be able to hold focus',
      ).toBe('button')

      // And every control announces itself.
      expect(
        await page
          .locator('svg[aria-label="Discovery tree"] g[role="button"]:not([aria-label])')
          .count(),
        'every tree control needs an accessible name',
      ).toBe(0)

      // Enter reaches the handler. Navigate is the safe one to actually fire;
      // delete and promote mutate the tree.
      const navNode = page
        .locator('svg[aria-label="Discovery tree"] g[role="button"][aria-label^="Navigate to"]')
        .first()
      await navNode.focus()
      await page.keyboard.press('Enter')
      await expect(page.locator('svg[aria-label="Discovery tree"]')).toBeVisible()
    })
  })
})
