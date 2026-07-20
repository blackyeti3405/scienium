import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Accessibility smoke (A9) — the automated floor, not a full audit:
 *
 *   1. axe scan of the lab scene and an open feature panel — no CRITICAL
 *      violations (missing accessible names, broken ARIA, nested-interactive);
 *   2. a real keyboard flow: Tab to a gateway, Enter opens its panel, focus
 *      lands inside, Tab CYCLES inside (the useModalA11y trap), Escape closes
 *      and focus RETURNS to the trigger.
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
    await page.goto('/lab')
    await page.getByRole('button', { name: 'Open Operations Hub' }).waitFor({ state: 'attached' })
    const critical = await scanCritical(page)
    expect(
      critical.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
    ).toEqual([])
  })

  test('keyboard flow: open a gateway, trapped focus, Escape restores', async ({ page }) => {
    await page.goto('/lab')
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
})
