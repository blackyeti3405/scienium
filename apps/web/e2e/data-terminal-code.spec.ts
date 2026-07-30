import { test, expect, type Page } from '@playwright/test'
import { createLab, type OwnedLab } from './lab'
import { e2eDb } from './db'

/**
 * Data Terminal — Code mode (Pyodide), phase C of the revamp.
 * See docs/SPEC.md §7.6 (Data Terminal).
 *
 * Runs on a disposable lab so its datasets neither depend on nor damage the
 * shared fixture. The fixture phase is `showcase` (past `working`), so
 * `data_terminal` is unlocked.
 *
 * The first Pyodide run pulls ~30 MB of wheels through the same-origin proxy, so
 * every "wait for Run to enable" / "wait for figure" step is given a generous
 * timeout, and each test sets a long overall budget.
 *
 * Acceptance criteria (plan §6, phase C) + the C1-review security probes:
 *  C-AC1 — numpy + matplotlib renders a figure (an <img> with a
 *          data:image/svg+xml src appears).
 *  C-AC3 — a network call fails closed (js.fetch → error, not success); a
 *          nested-Worker attempt fails closed; a hostile <svg onload>/<image>
 *          figure renders via <img> and is inert (no canary request fires).
 *  C-AC2 — an infinite loop is terminated by the ~15 s timeout and reported.
 *  C-AC4 — a saved script persists across a reload and re-runs identically.
 */

let lab: OwnedLab

test.beforeAll(async () => {
  lab = await createLab('code')
})

test.afterAll(async () => {
  await lab.dispose()
})

test.afterEach(async () => {
  await e2eDb.dataset.deleteMany({ where: { teamId: lab.teamId } })
})

async function openDataLane(page: Page) {
  await page.goto('/lab')
  await page.getByRole('button', { name: 'Open Operations Hub' }).click({ timeout: 10_000 })
  await expect(page.getByRole('dialog', { name: 'Operations Hub' })).toBeVisible({ timeout: 15_000 })
  const terminalTab = page.getByTestId('data-terminal-tab')
  await expect(terminalTab).toBeVisible({ timeout: 30_000 })
  await terminalTab.click()
  const dataSubTab = page.getByTestId('data-subtab')
  await expect(dataSubTab).toBeVisible({ timeout: 15_000 })
  await dataSubTab.click()
}

async function newDataset(page: Page, name: string, tableType = 'xy') {
  await page.getByTestId('new-dataset').click()
  await page.getByTestId('new-dataset-name').fill(name)
  await page.getByTestId(`table-type-${tableType}`).click()
  await page.getByTestId('create-dataset').click()
  await expect(page.getByTestId('dataset-name')).toHaveValue(name, { timeout: 15_000 })
  await expect(page.getByTestId('data-grid')).toBeVisible({ timeout: 15_000 })
}

/** Reopen a dataset from the list by its name (after a fresh navigation). */
async function openDataset(page: Page, name: string) {
  await page.locator('.dt-list__open').filter({ hasText: name }).click()
  await expect(page.getByTestId('dataset-name')).toHaveValue(name, { timeout: 15_000 })
}

/** Switch to the Code lane and seed a starter script. */
async function openCodeLane(page: Page) {
  await page.getByTestId('lane-code').click()
  await page.getByTestId('code-add').click()
  await expect(page.getByTestId('code-editor')).toBeVisible({ timeout: 15_000 })
}

/** Replace the editor and Run — waiting until the runtime is ready first. */
async function run(page: Page, code: string) {
  // Run is disabled until the worker reports ready (first load ~30 MB) and
  // re-disabled while running / after a timeout respawn — so this wait covers
  // both the initial load and every subsequent run.
  await expect(page.getByTestId('code-run')).toBeEnabled({ timeout: 90_000 })
  await page.getByTestId('code-editor').fill(code)
  await page.getByTestId('code-run').click()
}

test('C-AC1 + security: figure renders; network + nested-worker fail closed; hostile SVG is inert', async ({
  page,
}) => {
  test.setTimeout(180_000)

  // A live (non-inert) hostile figure would fetch this URL; via <img> it must not.
  const canaryHits: string[] = []
  page.on('request', (r) => {
    if (r.url().includes('canary-xss')) canaryHits.push(r.url())
  })

  await openDataLane(page)
  await newDataset(page, 'Code run')
  await openCodeLane(page)

  // ── C-AC1: numpy + matplotlib renders a figure, rendered as an inert <img>.
  await run(
    page,
    ['import numpy as np', 'import matplotlib.pyplot as plt', 'x = np.linspace(0, 6, 40)', 'fig, ax = plt.subplots()', 'ax.plot(x, np.sin(x))'].join('\n'),
  )
  const figure = page.getByTestId('code-figure').first()
  await expect(figure).toBeVisible({ timeout: 90_000 })
  expect(await figure.getAttribute('src')).toMatch(/^data:image\/svg\+xml/)

  // ── C-AC3: js.fetch fails closed. The figure disappearing is the signal the
  // NEW (error) result rendered — so the assertion can't pass on a stale error.
  await run(page, "import js\njs.fetch('/api/data-terminal/datasets')")
  await expect(page.getByTestId('code-figure')).toHaveCount(0, { timeout: 60_000 })
  await expect(page.getByTestId('code-error')).toContainText('disabled')

  // ── C-AC3 (C1 probe): a hostile <svg onload>/<image href> figure. It renders
  // as an <img> (data: URL) and is inert — no script runs, no canary request.
  await run(
    page,
    `import matplotlib.pyplot as plt
CANARY = "http://localhost:65535/canary-xss"
fig = plt.figure()
def evil(self, *a, **k):
    a[0].write('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><image href="' + CANARY + '"/><rect width="20" height="20" onload="fetch(\\'' + CANARY + '\\')"/></svg>')
type(fig).savefig = evil`,
  )
  const hostile = page.getByTestId('code-figure').first()
  await expect(hostile).toBeVisible({ timeout: 60_000 })
  expect(await hostile.getAttribute('src')).toMatch(/^data:image\/svg\+xml/)
  await page.waitForTimeout(1000)
  expect(canaryHits).toEqual([])

  // ── C-AC3 (C1 probe): a nested Worker (fresh, un-neutralized realm) fails
  // closed. Figure disappears again → the error result is the fresh one.
  await run(page, "import js\njs.Worker.new('data:application/javascript,0')")
  await expect(page.getByTestId('code-figure')).toHaveCount(0, { timeout: 60_000 })
  await expect(page.getByTestId('code-error')).toContainText('disabled')
})

test('C-AC2: an infinite loop is terminated by the timeout and reported', async ({ page }) => {
  test.setTimeout(180_000)

  await openDataLane(page)
  await newDataset(page, 'Loop code')
  await openCodeLane(page)

  await run(page, 'while True:\n    pass')
  // The main-thread wall-clock kill is ~15 s; give the assertion a wide margin.
  await expect(page.getByTestId('code-error')).toContainText('Timed out', { timeout: 45_000 })
})

test('C-AC4: a saved script persists across a reload and re-runs identically', async ({ page }) => {
  test.setTimeout(180_000)

  await openDataLane(page)
  await newDataset(page, 'Persist code')
  await page.getByTestId('lane-code').click()
  await page.getByTestId('code-add').click()

  const marker = 'print("scienium-4-2-1")'
  await page.getByTestId('code-editor').fill(marker)
  // Wait for the debounced autosave to land before navigating away.
  await expect(page.getByTestId('save-state')).toContainText('Saved', { timeout: 15_000 })

  // A fresh navigation (= reload) drops the hub; reopen from the list.
  await openDataLane(page)
  await openDataset(page, 'Persist code')
  await page.getByTestId('lane-code').click()

  // The saved code survived the round-trip…
  await expect(page.getByTestId('code-editor')).toHaveValue(marker, { timeout: 15_000 })
  // …and re-runs to the same output.
  await run(page, marker)
  await expect(page.getByTestId('code-stdout')).toContainText('scienium-4-2-1', { timeout: 90_000 })
})
