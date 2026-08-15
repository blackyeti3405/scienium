import { test, expect } from './test'
import { type Page } from '@playwright/test'
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

  // ── §0.9 Row B ──────────────────────────────────────────────────────────────
  // Each of these was a control a mouse could operate and a keyboard or screen
  // reader could not. They are asserted through ROLE, so a `<div onClick>` or an
  // icon button with no name cannot satisfy them.

  test('the upload dropzone is a real, focusable, named button', async ({ page }) => {
    // A disposable lab, because the shared fixture's Literature Review can be
    // at its source cap — and the upload affordance only renders in an EMPTY
    // slot. A skipped a11y assertion proves nothing.
    await withLab('a11y-upload', async () => {
      await gotoFresh(page, '/lab')
      await page.getByRole('button', { name: 'Open Literature Review' }).click({ timeout: 10_000 })
      await expect(page.getByRole('dialog', { name: 'Literature Review' })).toBeVisible()

      // `getByRole` is the pin: the old markup was a <div onClick> with no role
      // and no tabIndex, so it could never match this, at any name.
      const upload = page.getByRole('button', { name: 'Upload source' })
      await expect(upload).toBeVisible({ timeout: 10_000 })

      await upload.focus()
      expect(
        await page.evaluate(() => document.activeElement?.tagName),
        'the dropzone must be able to hold focus',
      ).toBe('BUTTON')
    })
  })

  test('the Vega study composer’s send button has an accessible name', async ({ page }) => {
    // The name is defaulted at the ChatThread seam, so this covers PaperChat and
    // every future consumer too — VegaStudyTab is simply the one that shipped
    // without it.
    await gotoFresh(page, '/lab')
    await page.getByRole('button', { name: 'Open Operations Hub' }).click({ timeout: 10_000 })
    await page.getByTestId('vega-tab').click()
    await expect(page.getByTestId('vega-study-tab')).toBeVisible({ timeout: 10_000 })

    await expect(
      page.getByTestId('vega-study-tab').getByRole('button', { name: 'Send message' }),
    ).toBeVisible()
  })

  test('the topic search announces itself as a combobox', async ({ page }) => {
    await withLab('a11y-combobox', async () => {
      await gotoFresh(page, '/discovery')
      await page.getByRole('button', { name: /Continue Exploring|Start Exploring/ }).click()

      // Arrow/Enter/Escape behaviour already existed; NONE of it was announced.
      // Only the static contract is asserted here — the listbox appears on a
      // live Wikipedia search, which is not this suite's to depend on.
      const box = page.getByRole('combobox', { name: /Search another starting topic/i })
      await expect(box).toBeVisible({ timeout: 15000 })
      await expect(box).toHaveAttribute('aria-expanded', 'false')
      await expect(box).toHaveAttribute('aria-autocomplete', 'list')
    })
  })

  test('the explorer divider is a separator and resizes from the keyboard', async ({ page }) => {
    await withLab('a11y-divider', async () => {
      await gotoFresh(page, '/discovery')
      await page.getByRole('button', { name: /Continue Exploring|Start Exploring/ }).click()

      const divider = page.getByRole('separator', { name: 'Resize the explorer panel' })
      await expect(divider).toBeVisible({ timeout: 15000 })
      await expect(divider).toHaveAttribute('aria-orientation', 'vertical')

      const before = Number(await divider.getAttribute('aria-valuenow'))
      await divider.focus()
      expect(
        await page.evaluate(() => document.activeElement?.getAttribute('role')),
        'the divider must be able to hold focus',
      ).toBe('separator')

      // The whole point: a keyboard user can move it. It was mousedown-only.
      await page.keyboard.press('ArrowLeft')
      await expect(divider).not.toHaveAttribute('aria-valuenow', String(before))
      expect(Number(await divider.getAttribute('aria-valuenow'))).toBeGreaterThan(before)
    })
  })
})
