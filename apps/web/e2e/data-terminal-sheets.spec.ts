import { test, expect, type Page } from '@playwright/test'
import { createLab, type OwnedLab } from './lab'
import { e2eDb } from './db'

/**
 * Data Terminal — Sheets mode (Chart view), phase B of the revamp.
 * See docs/SPEC.md §7.6 (Data Terminal).
 *
 * Runs on a disposable lab so its dataset rows neither depend on nor damage the
 * shared fixture. The fixture phase is `showcase` (past `working`), so
 * `data_terminal` is unlocked.
 *
 * Acceptance criteria (plan §6, phase B):
 *  B1 — select two columns → a chart appears with no network request for a
 *       runtime (recharts is a bundled dependency; zero Python, zero fetch).
 *  B2 — a polynomial trendline displays its equation and R².
 *  B3 — PNG export triggers a download.
 */

let lab: OwnedLab

test.beforeAll(async () => {
  lab = await createLab('sheets')
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

/** Import a small XY table (Time as X, Mass as Y = Time², a clean parabola). */
async function importParabola(page: Page) {
  await page.getByTestId('import-toggle').click()
  await page.getByTestId('import-text').fill('Time,Mass\n1,1\n2,4\n3,9\n4,16')
  await page.getByTestId('import-apply').click()
  await expect(page.getByTestId('cell-3-1')).toHaveText('16')
}

test('B1: selecting two columns renders a chart with no runtime fetch', async ({ page }) => {
  const runtimeRequests: string[] = []
  page.on('request', (r) => {
    const url = r.url()
    // A Python/WASM runtime would be a large asset fetch — Sheets mode pulls none.
    if (/\.(wasm|whl)(\?|$)/.test(url) || url.includes('pyodide')) runtimeRequests.push(url)
  })

  await openDataLane(page)
  await newDataset(page, 'Chart run')
  await importParabola(page)

  await page.getByTestId('view-chart').click()
  // A fresh dataset has no charts — create the first one.
  await page.getByTestId('chart-add').click()

  // blankChart auto-picks X (Time) and the first Y (Mass): the SVG appears at once.
  await expect(page.getByTestId('chart-svg').locator('svg.recharts-surface').first()).toBeVisible({
    timeout: 5_000,
  })
  expect(runtimeRequests).toEqual([])
})

test('B2: a polynomial trendline shows its equation and R²', async ({ page }) => {
  await openDataLane(page)
  await newDataset(page, 'Chart run')
  await importParabola(page)

  await page.getByTestId('view-chart').click()
  await page.getByTestId('chart-add').click()

  // Scatter gives a numeric X axis; a degree-2 fit of y = x² is exact.
  await page.getByTestId('chart-type').selectOption('scatter')
  await page.getByTestId('chart-trend-c2').selectOption('polynomial')

  const eq = page.getByTestId('chart-equation')
  await expect(eq).toContainText('y =', { timeout: 5_000 })
  await expect(eq).toContainText('R²')
  // A perfect quadratic fit reports R² = 1.
  await expect(eq).toContainText('R² = 1.0000')
})

test('B3: PNG export triggers a download', async ({ page }) => {
  await openDataLane(page)
  await newDataset(page, 'Chart run')
  await importParabola(page)

  await page.getByTestId('view-chart').click()
  await page.getByTestId('chart-add').click()
  await expect(page.getByTestId('chart-svg').locator('svg.recharts-surface').first()).toBeVisible({
    timeout: 5_000,
  })

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15_000 }),
    page.getByTestId('chart-export-png').click(),
  ])
  expect(download.suggestedFilename()).toMatch(/\.png$/)
})
