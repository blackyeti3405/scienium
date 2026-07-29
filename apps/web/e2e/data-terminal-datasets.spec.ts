import { test, expect, type Page } from '@playwright/test'
import { createLab, type OwnedLab } from './lab'
import { e2eDb } from './db'

/**
 * Data Terminal — the Data lane (datasets), phase A of the revamp.
 * See docs/architecture/data-terminal-revamp-plan.md.
 *
 * Runs on a disposable lab (`createLab`) so the dataset rows this spec creates
 * neither depend on nor damage the shared fixture. The fixture phase is
 * `showcase`, which is past `working`, so `data_terminal` is unlocked — the
 * phase-lock screen itself is asserted through the dev-only `?phase=` override.
 *
 * Acceptance criteria (plan §6, phase A):
 *  AC1 — a CSV with mixed-type columns imports, renders in the grid, and
 *        survives a reload with identical values.
 *  AC2 — a column formula recomputes over every row.
 *  AC3 — the table type gates which roles exist (a Column table has no X).
 *  AC4 — blank cells stay blank, never zero, end to end through the database.
 *  AC5 — datasets are locked before the `working` phase.
 */

let lab: OwnedLab

test.beforeAll(async () => {
  lab = await createLab('datasets')
})

test.afterAll(async () => {
  await lab.dispose()
})

test.afterEach(async () => {
  // Each test starts from an empty dataset list. Scoped to this disposable
  // lab's id only — never a blanket delete.
  await e2eDb.dataset.deleteMany({ where: { teamId: lab.teamId } })
})

/** Open the Operations Hub and reveal the Data Terminal's sub-tabs. */
async function openDataTerminal(page: Page) {
  await page.goto('/lab')
  await page.getByRole('button', { name: 'Open Operations Hub' }).click({ timeout: 10_000 })
  await expect(page.getByRole('dialog', { name: 'Operations Hub' })).toBeVisible({ timeout: 15_000 })
  const terminalTab = page.getByTestId('data-terminal-tab')
  await expect(terminalTab).toBeVisible({ timeout: 30_000 })
  await terminalTab.click()
}

/** Open the Operations Hub and switch to the Data Terminal's Data sub-tab. */
async function openDataLane(page: Page) {
  await openDataTerminal(page)
  const dataSubTab = page.getByTestId('data-subtab')
  await expect(dataSubTab).toBeVisible({ timeout: 15_000 })
  await dataSubTab.click()
}

/** Open the Operations Hub and switch to the Charts Guide sub-tab. */
async function openChartsGuide(page: Page) {
  await openDataTerminal(page)
  const chartsTab = page.getByTestId('charts-guide-tab')
  await expect(chartsTab).toBeVisible({ timeout: 15_000 })
  await chartsTab.click()
  await expect(page.getByTestId('charts-guide')).toBeVisible({ timeout: 15_000 })
}

/** Create a dataset through the UI and land in its editor. */
async function newDataset(page: Page, name: string, tableType = 'xy') {
  await page.getByTestId('new-dataset').click()
  await page.getByTestId('new-dataset-name').fill(name)
  await page.getByTestId(`table-type-${tableType}`).click()
  await page.getByTestId('create-dataset').click()
  // A new dataset arrives pre-shaped for its table type, so the grid — not the
  // "add a column" placeholder — is what renders.
  await expect(page.getByTestId('dataset-name')).toHaveValue(name, { timeout: 15_000 })
  await expect(page.getByTestId('data-grid')).toBeVisible({ timeout: 15_000 })
}

/** Wait for the debounced autosave to report the server holds the latest. */
async function waitSaved(page: Page) {
  await expect(page.getByTestId('save-state')).toHaveText(/Saved/, { timeout: 15_000 })
}

test('AC1: a pasted CSV imports, renders, and survives a reload', async ({ page }) => {
  await openDataLane(page)
  await newDataset(page, 'Growth run')

  await page.getByTestId('import-toggle').click()
  await page
    .getByTestId('import-text')
    .fill('Plant,Day,Height\nA,1,4.2\nA,2,6.8\nB,1,3.9\nB,2,7.1')
  await page.getByTestId('import-apply').click()

  await expect(page.getByTestId('import-note')).toContainText('4 rows')
  await expect(page.getByTestId('import-note')).toContainText('first row used as titles')

  // Text column becomes a label, first numeric column becomes X, rest Y.
  await expect(page.getByTestId('grid-header-c1')).toContainText('Plant')
  await expect(page.getByTestId('grid-header-c1')).toContainText('LBL')
  await expect(page.getByTestId('grid-header-c2')).toContainText('X')
  await expect(page.getByTestId('grid-header-c3')).toContainText('Y')

  await expect(page.getByTestId('cell-0-2')).toHaveText('4.2')
  await waitSaved(page)

  await page.reload()
  await openDataLane(page)
  await page.getByText('Growth run').click()
  await expect(page.getByTestId('data-grid')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('cell-0-0')).toHaveText('A')
  await expect(page.getByTestId('cell-3-2')).toHaveText('7.1')
})

test('AC2: a column formula fills every row', async ({ page }) => {
  await openDataLane(page)
  await newDataset(page, 'Density')

  await page.getByTestId('import-toggle').click()
  await page.getByTestId('import-text').fill('Mass,Volume\n10,2\n20,5\n30,4')
  await page.getByTestId('import-apply').click()
  await expect(page.getByTestId('cell-0-0')).toHaveText('10')

  // Add a third column and give it a formula over the first two.
  await page.getByTestId('add-column').click()
  await expect(page.getByTestId('column-editor')).toBeVisible()
  await page.getByTestId('column-name').fill('Density')
  await page.getByTestId('column-formula').fill('=col(Mass) / col(Volume)')
  await page.getByTestId('apply-formula').click()

  await expect(page.getByTestId('cell-0-2')).toHaveText('5')
  await expect(page.getByTestId('cell-1-2')).toHaveText('4')
  await expect(page.getByTestId('cell-2-2')).toHaveText('7.5')
  await waitSaved(page)
})

test('AC3: the table type decides which roles a column may take', async ({ page }) => {
  await openDataLane(page)
  await newDataset(page, 'Groups', 'column')

  await page.getByTestId('add-column').click()
  await expect(page.getByTestId('column-editor')).toBeVisible()

  // A Column table's columns ARE the groups — there is no independent variable,
  // so offering X would let a student build something no analysis can read.
  const roleSelect = page.getByTestId('column-role')
  // allTextContents() does not auto-retry, so wait for React to commit the
  // <option> children before reading — an empty read here is a race, not a
  // missing role (a bad table type would throw in tableTypeSpec, not blank out).
  await expect(roleSelect.locator('option')).not.toHaveCount(0)
  const columnRoles = await roleSelect.locator('option').allTextContents()
  expect(columnRoles.some((t) => t.startsWith('X —'))).toBe(false)
  expect(columnRoles.some((t) => t.startsWith('Y —'))).toBe(true)

  // The XY table, by contrast, does offer it. Wait for the added column to save
  // first: leaving with unsaved work now raises a confirm dialog, which would
  // hold this navigation rather than let the test race past it.
  await waitSaved(page)
  await page.getByTestId('dataset-back').click()
  await newDataset(page, 'Curve', 'xy')
  await page.getByTestId('add-column').click()
  // Wait for the editor itself, same as the first check above — without this,
  // the one retrying expect below has to cover BOTH "the editor mounted" and
  // "its options are populated" inside a single timeout window, which is too
  // tight under a cold `next dev` compile and reads as a missing role instead
  // of a slow render.
  await expect(page.getByTestId('column-editor')).toBeVisible()
  await expect(roleSelect.locator('option')).not.toHaveCount(0)
  const xyRoles = await roleSelect.locator('option').allTextContents()
  expect(xyRoles.some((t) => t.startsWith('X —'))).toBe(true)
})

test('AC4: a blank cell stays blank all the way to the database', async ({ page }) => {
  await openDataLane(page)
  await newDataset(page, 'Gappy')

  await page.getByTestId('import-toggle').click()
  // Row 2 has no Mass reading — that is "nobody measured", not "measured zero".
  await page.getByTestId('import-text').fill('Day,Mass\n1,10\n2,\n3,30')
  await page.getByTestId('import-apply').click()

  await expect(page.getByTestId('cell-1-1')).toHaveText('')
  await waitSaved(page)

  const stored = await e2eDb.dataset.findFirst({
    where: { teamId: lab.teamId, name: 'Gappy' },
    select: { rows: true },
  })
  expect(stored).not.toBeNull()
  // The whole of a missing-data policy is that this is null and not 0 — a zero
  // here would silently drag every mean computed from the column downwards.
  expect((stored!.rows as unknown as unknown[][])[1]![1]).toBeNull()
})

test('AC5: datasets are locked before the working phase', async ({ page }) => {
  // The team's REAL phase has to move: `?phase=` is a client-side scene
  // override, while the lock is enforced server-side by `data_terminal` in
  // lib/phase.ts. Testing it any other way would assert the placeholder, not
  // the gate.
  await e2eDb.team.update({
    where: { id: lab.teamId },
    data: { phase: 'literature_review' },
  })
  try {
    await openDataLane(page)
    await expect(page.getByText('unlocks at the Working phase')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('new-dataset')).toHaveCount(0)

    // The reference guides stay open in every phase — that rule is unchanged.
    await page.getByTestId('stats-guide-tab').click()
    await expect(page.getByTestId('data-subtab')).toBeVisible()
  } finally {
    await e2eDb.team.update({ where: { id: lab.teamId }, data: { phase: 'showcase' } })
  }
})

test('Charts Guide: "Start from this recipe" creates a dataset with the recipe columns', async ({
  page,
}) => {
  await openChartsGuide(page)

  // Charts load lazily per field; expand the first chart box, then start it.
  const firstHeader = page
    .locator('[data-testid^="chart-box-"][data-testid$="-header"]')
    .first()
  await expect(firstHeader).toBeVisible({ timeout: 30_000 })
  await firstHeader.click()

  const startRecipe = page.locator('[data-testid$="-start-recipe"]').first()
  await expect(startRecipe).toBeVisible({ timeout: 15_000 })
  await startRecipe.click()

  // The recipe creates a new dataset and drops us straight into its editor,
  // pre-shaped with the recipe's columns (at least the first grid column).
  await expect(page.getByTestId('data-grid')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('dataset-name')).not.toHaveValue('', { timeout: 15_000 })
  await expect(page.getByTestId('grid-header-c1')).toBeVisible({ timeout: 15_000 })
})

test('Showcase attach: a chart figure attaches and appears on the showcase', async ({ page }) => {
  // The figure attaches to the team's showcase, so the team needs one. Minimal
  // required fields only (the rest carry schema defaults). Scoped to this
  // disposable lab and cleaned up in `finally`.
  await e2eDb.showcase.upsert({
    where: { teamId: lab.teamId },
    update: {},
    create: {
      teamId: lab.teamId,
      slug: `e2e-figure-${lab.teamId}`.slice(0, 60),
      title: 'E2E figure project',
      abstract: 'A disposable showcase for the figure-attach spec.',
    },
  })

  try {
    await openDataLane(page)
    await newDataset(page, 'Figure source')

    // Give it numbers so the chart has something to draw.
    await page.getByTestId('import-toggle').click()
    await page.getByTestId('import-text').fill('X,Y\n1,2\n2,4\n3,6')
    await page.getByTestId('import-apply').click()
    await expect(page.getByTestId('cell-0-0')).toHaveText('1')

    // Switch to the Chart view and create a chart to attach.
    await page.getByTestId('view-chart').click()
    await page.getByTestId('chart-add').first().click()
    await expect(page.getByTestId('sheets-chart')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('[data-testid="sheets-chart"] svg').first()).toBeVisible({
      timeout: 15_000,
    })

    // Attach the figure — the button confirms once it reaches the showcase.
    await page.getByTestId('chart-attach-showcase').click()
    await expect(page.getByTestId('chart-attach-showcase')).toContainText('Attached', {
      timeout: 20_000,
    })

    // It is recorded on the showcase as a `figure` asset — end to end.
    const figure = await e2eDb.showcaseAsset.findFirst({
      where: { showcase: { teamId: lab.teamId }, assetType: 'figure' },
    })
    expect(figure).not.toBeNull()
  } finally {
    await e2eDb.showcaseAsset.deleteMany({ where: { showcase: { teamId: lab.teamId } } })
    await e2eDb.showcase.deleteMany({ where: { teamId: lab.teamId } })
  }
})
