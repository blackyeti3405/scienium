import { test, expect, type Page } from '@playwright/test'
import { createLab, type OwnedLab } from './lab'
import { e2eDb } from './db'

/**
 * Data Terminal — Lab mode (Pyodide + scipy/statsmodels), phase D1 of the revamp.
 * See docs/SPEC.md §7.6 (Data Terminal).
 *
 * Runs on a disposable lab so its datasets neither depend on nor damage the
 * shared fixture. The fixture phase is past `working`, so `data_terminal` is
 * unlocked. The first Lab run pulls ~65 MB of wheels (numpy + matplotlib +
 * pandas + scipy + statsmodels) through the same-origin proxy, so every
 * "wait for Run / runtime ready" step gets a generous timeout.
 *
 * Acceptance criteria reachable in D1 (plan §6, phase D):
 *  D-AC1 (the gate) — a Column table's Analyze dialog offers t-test AND ANOVA
 *          but NOT correlation.
 *  D-AC2 — running an unpaired t-test produces a results sheet with a figure,
 *          an assumptions checklist, and the matching Stats Guide entry.
 *  D-AC3 (recalc chain) — after a data edit the cached result is marked stale
 *          and re-runs.
 *
 * D2a acceptance criteria (plan §5, §6 phase D):
 *  D-AC4 (Tukey AC in-browser) — a one-way ANOVA with the Tukey post-hoc produces
 *          a pairwise comparison table in the results sheet.
 *  D-AC5 (nonparametric) — a Mann–Whitney analysis produces a results sheet with
 *          its effect size and a figure.
 *
 * D2b acceptance criteria (plan §2, §6 phase D):
 *  D-AC6 (the pseudoreplication wall) — a Nested table's ANOVA reports the
 *          correct SMALLER n (subjects, not measurements) and links the
 *          pseudoreplication guide entry. This is the anchor of D2b.
 *  D-AC7 (contingency) — a chi-square on a contingency table produces a results
 *          sheet with its statistic.
 *
 * D2c acceptance criteria (plan §2, §6 phase D — completes the analysis library):
 *  D-AC8 (XY offers + regresses) — an XY table's Analyze dialog OFFERS
 *          correlation + linear regression but NOT the group-comparison analyses
 *          (the mirror of the Column-excludes-correlation gate), and a linear
 *          regression produces a results sheet with a fit-line figure.
 *  D-AC9 (parts of whole) — a Parts-of-whole fraction-of-total produces a results
 *          sheet with its cumulative-percent table and a figure.
 *
 * E1 acceptance criteria (plan §5, §6 phase E — nonlinear regression):
 *  E-AC1 (the fit engine) — a nonlinear (Michaelis–Menten) fit on an XY table
 *          picks an equation from the library and produces a best-fit parameter
 *          table (value ± SE, 95% CI) plus a fit + residual figure.
 *  E-AC2 (standard-curve interpolation) — interpolating an unknown response off a
 *          fitted calibration curve returns an interpolated X in the results sheet.
 *  E-AC3 (global fitting, §5.1) — a global fit across ≥3 dose-response Y curves,
 *          sharing Top/Bottom/HillSlope and letting logEC50 vary, converges and
 *          shows a per-parameter table (shared shown once, separate per curve).
 *
 * F1 acceptance criteria (plan §5 "Figure craft", §6 phase F):
 *  F-AC1 (significance brackets) — opting an ANOVA+Tukey figure into stars
 *          brackets on the results sheet re-renders a figure that carries bracket
 *          marks for the significant pairs (the on-figure/table match is proven
 *          exactly in scripts/analysis-smoke.mjs).
 *  F-AC2 (DPI export) — a 300-dpi PNG export of a figure triggers a download.
 *
 * F2 acceptance criteria (plan §5 "Figure craft", §6 phase F — the remaining two):
 *  F-AC3 (poster layout) — a 1×2 layout of two saved analyses exports a 300-dpi
 *          PNG poster (the pixel dims + A/B panel labels are proven exactly in
 *          scripts/analysis-smoke.mjs; here we prove the UI path downloads it).
 *  F-AC4 (Open in Code mode bridge) — "Open in Code mode" on a Sheets chart AND
 *          on a Lab analysis creates a Code-lane script that Runs to a figure.
 */

let lab: OwnedLab

test.beforeAll(async () => {
  lab = await createLab('lab')
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

async function newDataset(page: Page, name: string, tableType = 'column') {
  await page.getByTestId('new-dataset').click()
  await page.getByTestId('new-dataset-name').fill(name)
  await page.getByTestId(`table-type-${tableType}`).click()
  await page.getByTestId('create-dataset').click()
  await expect(page.getByTestId('dataset-name')).toHaveValue(name, { timeout: 15_000 })
  await expect(page.getByTestId('data-grid')).toBeVisible({ timeout: 15_000 })
}

/** Type one value into a grid cell (double-click to edit, fill, commit). */
async function setCell(page: Page, r: number, c: number, value: number) {
  await page.getByTestId(`cell-${r}-${c}`).dblclick()
  const input = page.locator('.dt-grid__input')
  await input.waitFor({ state: 'visible', timeout: 5_000 })
  await input.fill(String(value))
  await input.press('Enter')
}

/** Fill a whole column top-down. */
async function fillColumn(page: Page, c: number, values: number[]) {
  for (let r = 0; r < values.length; r++) await setCell(page, r, c, values[r]!)
}

/**
 * Seed a dataset straight into the DB — the honest way to stand up a Nested
 * table with 27 rows, which typing cell-by-cell would make a slow, flaky test.
 * The dataset belongs to the disposable lab and is purged by afterEach.
 */
async function seedDataset(
  id: string,
  tableType: 'nested' | 'contingency' | 'xy',
  columns: { id: string; name: string; type: string; role: string }[],
  rows: (string | number | null)[][],
) {
  await e2eDb.dataset.create({
    data: {
      id,
      teamId: lab.teamId,
      name: id,
      tableType,
      columns,
      rows,
      rowCount: rows.length,
      createdByUserId: lab.leaderUserId,
    },
  })
}

/** Open a seeded dataset by id from the datasets list. */
async function openDataset(page: Page, id: string) {
  await page.getByTestId(`dataset-${id}`).click()
  await expect(page.getByTestId('data-grid')).toBeVisible({ timeout: 15_000 })
}

test('D-AC1: a Column table offers t-test + ANOVA but NOT correlation', async ({ page }) => {
  test.setTimeout(120_000)

  await openDataLane(page)
  await newDataset(page, 'Gate check')
  await page.getByTestId('lane-lab').click()
  await page.getByTestId('lab-analyze').click()
  await expect(page.getByTestId('lab-analyze-dialog')).toBeVisible({ timeout: 30_000 })

  // The gate: the two group-comparison analyses are offered…
  await expect(page.getByTestId('lab-analysis-unpaired-t')).toBeVisible()
  await expect(page.getByTestId('lab-analysis-one-way-anova')).toBeVisible()
  await expect(page.getByTestId('lab-analysis-descriptive')).toBeVisible()
  // …and correlation / regression are NOT (they belong to an XY table).
  await expect(page.getByTestId('lab-analysis-correlation')).toHaveCount(0)
  await expect(page.getByTestId('lab-analysis-linear-regression')).toHaveCount(0)
})

test('D-AC2 + D-AC3: t-test results sheet (figure + guide), stale + re-run on edit', async ({
  page,
}) => {
  test.setTimeout(240_000)

  await openDataLane(page)
  await newDataset(page, 'T-test run')
  // Column starter = two Y columns (Group A, Group B). Fill five values each.
  await fillColumn(page, 0, [7, 8, 9, 10, 11])
  await fillColumn(page, 1, [12, 13, 14, 15, 16])

  // ── Run the t-test ────────────────────────────────────────────────────────
  await page.getByTestId('lane-lab').click()
  await page.getByTestId('lab-analyze').click()
  await page.getByTestId('lab-analysis-unpaired-t').click()
  await page.getByTestId('lab-col-c1').locator('input').check()
  await page.getByTestId('lab-col-c2').locator('input').check()
  // Run is disabled until the ~65 MB runtime is ready.
  await expect(page.getByTestId('lab-run')).toBeEnabled({ timeout: 150_000 })
  await page.getByTestId('lab-run').click()

  // ── D-AC2: a results sheet with stats, a figure, and the guide link ───────
  await expect(page.getByTestId('lab-result-a1')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByTestId('lab-figure-a1')).toBeVisible({ timeout: 60_000 })
  expect(await page.getByTestId('lab-figure-a1').getAttribute('src')).toMatch(/^data:image\/svg\+xml/)
  await expect(page.getByTestId('lab-guide-a1')).toBeVisible()
  await expect(page.getByTestId('lab-assumptions')).toBeVisible()
  await expect(page.getByTestId('lab-stats')).toContainText('t')

  // ── D-AC3: edit the data → the cached result goes stale → re-run ──────────
  await page.getByTestId('lane-sheets').click()
  await setCell(page, 0, 0, 42)
  await page.getByTestId('lane-lab').click()

  await expect(page.getByTestId('lab-stale-a1')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('lab-rerun-a1')).toBeEnabled({ timeout: 150_000 })
  await page.getByTestId('lab-rerun-a1').click()
  // Re-run recomputes against the current data → the stale banner clears.
  await expect(page.getByTestId('lab-stale-a1')).toHaveCount(0, { timeout: 60_000 })
  await expect(page.getByTestId('lab-figure-a1')).toBeVisible()
})

test('D-AC4: one-way ANOVA + Tukey post-hoc yields a pairwise comparison table', async ({
  page,
}) => {
  test.setTimeout(240_000)

  await openDataLane(page)
  await newDataset(page, 'ANOVA Tukey')
  // Column starter = two Y columns; add a third so ANOVA (>=3 groups) is valid.
  await page.getByTestId('add-column').click()
  await fillColumn(page, 0, [1, 2, 3, 4])
  await fillColumn(page, 1, [5, 6, 7, 8])
  await fillColumn(page, 2, [9, 10, 11, 12])

  await page.getByTestId('lane-lab').click()
  await page.getByTestId('lab-analyze').click()
  await page.getByTestId('lab-analysis-one-way-anova').click()
  await page.getByTestId('lab-col-c1').locator('input').check()
  await page.getByTestId('lab-col-c2').locator('input').check()
  await page.getByTestId('lab-col-c3').locator('input').check()
  // Choose the multiple-comparisons structure: all pairs → Tukey HSD (the honest
  // "which comparisons + matching correction" mechanism, plan §5).
  await page.getByTestId('lab-opt-posthoc').selectOption('tukey')

  await expect(page.getByTestId('lab-run')).toBeEnabled({ timeout: 150_000 })
  await page.getByTestId('lab-run').click()

  await expect(page.getByTestId('lab-result-a1')).toBeVisible({ timeout: 60_000 })
  // The pairwise Tukey table with adjusted p-values — the D2a acceptance criterion.
  await expect(page.getByTestId('lab-result-a1')).toContainText('Tukey HSD', { timeout: 60_000 })
  await expect(page.getByTestId('lab-result-a1')).toContainText('Adjusted p')
  await expect(page.getByTestId('lab-figure-a1')).toBeVisible()
})

test('D-AC5: a nonparametric analysis (Mann–Whitney) produces a results sheet', async ({
  page,
}) => {
  test.setTimeout(240_000)

  await openDataLane(page)
  await newDataset(page, 'Mann-Whitney run')
  await fillColumn(page, 0, [1, 2, 3, 4, 5])
  await fillColumn(page, 1, [6, 7, 8, 9, 10])

  await page.getByTestId('lane-lab').click()
  await page.getByTestId('lab-analyze').click()
  await page.getByTestId('lab-analysis-mann-whitney').click()
  await page.getByTestId('lab-col-c1').locator('input').check()
  await page.getByTestId('lab-col-c2').locator('input').check()

  await expect(page.getByTestId('lab-run')).toBeEnabled({ timeout: 150_000 })
  await page.getByTestId('lab-run').click()

  await expect(page.getByTestId('lab-result-a1')).toBeVisible({ timeout: 60_000 })
  // The nonparametric effect size proves the rank-based template ran, not a t-test.
  await expect(page.getByTestId('lab-result-a1')).toContainText('rank-biserial', { timeout: 60_000 })
  await expect(page.getByTestId('lab-figure-a1')).toBeVisible()
})

test('D-AC6: a Nested ANOVA reports n = subjects (not measurements) + pseudoreplication guide', async ({
  page,
}) => {
  test.setTimeout(240_000)

  // 3 treatments x 3 subjects x 3 reps = 27 measurements, but only 9 subjects.
  // Subject means G1:[10,20,30] G2:[20,30,40] G3:[30,40,50] — the honest n is 3
  // per group, and the nested analysis must say so rather than claim 9.
  const value = [
    9, 10, 11, 19, 20, 21, 29, 30, 31,
    19, 20, 21, 29, 30, 31, 39, 40, 41,
    29, 30, 31, 39, 40, 41, 49, 50, 51,
  ]
  const rows: (string | number)[][] = []
  const groups = ['G1', 'G2', 'G3']
  const subs = ['S1', 'S2', 'S3']
  let k = 0
  for (let g = 0; g < 3; g++) {
    for (let s = 0; s < 3; s++) {
      for (let r = 0; r < 3; r++) rows.push([groups[g]!, subs[s]!, value[k++]!])
    }
  }
  await seedDataset(
    'nested-ac',
    'nested',
    [
      { id: 'c1', name: 'Treatment', type: 'text', role: 'group' },
      { id: 'c2', name: 'Subject', type: 'text', role: 'label' },
      { id: 'c3', name: 'Value', type: 'number', role: 'y' },
    ],
    rows,
  )

  await openDataLane(page)
  await openDataset(page, 'nested-ac')

  await page.getByTestId('lane-lab').click()
  await page.getByTestId('lab-analyze').click()
  await page.getByTestId('lab-analysis-nested-anova').click()
  // Only the VALUE column is selectable; treatment + subject come from roles.
  await page.getByTestId('lab-col-c3').locator('input').check()

  await expect(page.getByTestId('lab-run')).toBeEnabled({ timeout: 150_000 })
  await page.getByTestId('lab-run').click()

  await expect(page.getByTestId('lab-result-a1')).toBeVisible({ timeout: 60_000 })
  // The honest n is subjects, not measurements — the whole point of the table.
  await expect(page.getByTestId('lab-result-a1')).toContainText('subjects (real n)', {
    timeout: 60_000,
  })
  const stats = page.getByTestId('lab-stats')
  await expect(stats).toContainText('9') // 9 subjects, NOT 27 measurements
  // The per-group table proves the smaller n explicitly: 3 subjects vs 9 readings.
  await expect(page.getByTestId('lab-result-a1')).toContainText('Subjects (real n)')
  // …and it links the pseudoreplication guide entry (D-AC6 anchor).
  await expect(page.getByTestId('lab-guide-a1')).toBeVisible()
  await expect(page.getByTestId('lab-guide-a1')).toContainText('Pseudoreplication')
  await expect(page.getByTestId('lab-figure-a1')).toBeVisible()
})

test('D-AC7: a contingency chi-square produces a results sheet', async ({ page }) => {
  test.setTimeout(240_000)

  await seedDataset(
    'chi-ac',
    'contingency',
    [
      { id: 'c1', name: 'Group', type: 'text', role: 'label' },
      { id: 'c2', name: 'Event', type: 'number', role: 'y' },
      { id: 'c3', name: 'No event', type: 'number', role: 'y' },
    ],
    [
      ['Exposed', 20, 80],
      ['Unexposed', 10, 90],
    ],
  )

  await openDataLane(page)
  await openDataset(page, 'chi-ac')

  await page.getByTestId('lane-lab').click()
  await page.getByTestId('lab-analyze').click()
  await page.getByTestId('lab-analysis-chi-square').click()
  await page.getByTestId('lab-col-c2').locator('input').check()
  await page.getByTestId('lab-col-c3').locator('input').check()

  await expect(page.getByTestId('lab-run')).toBeEnabled({ timeout: 150_000 })
  await page.getByTestId('lab-run').click()

  await expect(page.getByTestId('lab-result-a1')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByTestId('lab-stats')).toContainText('chi-square', { timeout: 60_000 })
  await expect(page.getByTestId('lab-figure-a1')).toBeVisible()
})

test('D-AC8: an XY table offers correlation + regression (not group tests) and regresses', async ({
  page,
}) => {
  test.setTimeout(240_000)

  await openDataLane(page)
  await newDataset(page, 'XY regression', 'xy')
  // XY starter = X (role x) + Y (role y). Fill both: Y = 2,4,5,4,5 vs X = 1..5
  // (slope 0.6, intercept 2.2, R^2 0.6 — the smoke's known-answer line).
  await fillColumn(page, 0, [1, 2, 3, 4, 5])
  await fillColumn(page, 1, [2, 4, 5, 4, 5])

  await page.getByTestId('lane-lab').click()
  await page.getByTestId('lab-analyze').click()
  await expect(page.getByTestId('lab-analyze-dialog')).toBeVisible({ timeout: 30_000 })

  // The mirror of D-AC1: an XY table OFFERS correlation + regression…
  await expect(page.getByTestId('lab-analysis-correlation')).toBeVisible()
  await expect(page.getByTestId('lab-analysis-linear-regression')).toBeVisible()
  // …and does NOT offer the Column group-comparison analyses.
  await expect(page.getByTestId('lab-analysis-unpaired-t')).toHaveCount(0)
  await expect(page.getByTestId('lab-analysis-one-way-anova')).toHaveCount(0)

  await page.getByTestId('lab-analysis-linear-regression').click()
  // Only the Y column is selectable; X is implicit (read from its role).
  await page.getByTestId('lab-col-c2').locator('input').check()
  await expect(page.getByTestId('lab-run')).toBeEnabled({ timeout: 150_000 })
  await page.getByTestId('lab-run').click()

  await expect(page.getByTestId('lab-result-a1')).toBeVisible({ timeout: 60_000 })
  // The fit output (slope) and the scatter + fit-line figure.
  await expect(page.getByTestId('lab-stats')).toContainText('slope', { timeout: 60_000 })
  await expect(page.getByTestId('lab-result-a1')).toContainText('R squared')
  await expect(page.getByTestId('lab-figure-a1').first()).toBeVisible()
  expect(await page.getByTestId('lab-figure-a1').first().getAttribute('src')).toMatch(
    /^data:image\/svg\+xml/,
  )
})

test('D-AC9: a Parts-of-whole fraction-of-total produces a cumulative-percent sheet', async ({
  page,
}) => {
  test.setTimeout(240_000)

  await openDataLane(page)
  await newDataset(page, 'Parts of whole', 'parts_of_whole')
  // Parts starter = Part (label) + Amount (y). Amounts 1,3,6 -> 10/30/60%.
  await fillColumn(page, 1, [1, 3, 6])

  await page.getByTestId('lane-lab').click()
  await page.getByTestId('lab-analyze').click()
  await page.getByTestId('lab-analysis-fraction-of-total').click()
  await page.getByTestId('lab-col-c2').locator('input').check()

  await expect(page.getByTestId('lab-run')).toBeEnabled({ timeout: 150_000 })
  await page.getByTestId('lab-run').click()

  await expect(page.getByTestId('lab-result-a1')).toBeVisible({ timeout: 60_000 })
  // The fraction table (value / percent / cumulative %) and a pie figure.
  await expect(page.getByTestId('lab-result-a1')).toContainText('Cumulative', { timeout: 60_000 })
  await expect(page.getByTestId('lab-stats')).toContainText('total')
  await expect(page.getByTestId('lab-figure-a1')).toBeVisible()
})

test('E-AC1: a nonlinear (Michaelis-Menten) fit yields a best-fit parameter table + figure', async ({
  page,
}) => {
  test.setTimeout(240_000)

  // Michaelis-Menten with Vmax=10, Km=2 — seeded so the 9-point XY curve is
  // stood up in one shot rather than typed cell-by-cell.
  await seedDataset(
    'nlfit-ac',
    'xy',
    [
      { id: 'c1', name: 'Substrate', type: 'number', role: 'x' },
      { id: 'c2', name: 'Rate', type: 'number', role: 'y' },
    ],
    [
      [0.5, 2.0],
      [1, 3.333],
      [2, 5.0],
      [3, 6.0],
      [4, 6.667],
      [6, 7.5],
      [8, 8.0],
      [12, 8.571],
      [16, 8.889],
    ],
  )

  await openDataLane(page)
  await openDataset(page, 'nlfit-ac')

  await page.getByTestId('lane-lab').click()
  await page.getByTestId('lab-analyze').click()
  await page.getByTestId('lab-analysis-nonlinear-regression').click()
  await page.getByTestId('lab-col-c2').locator('input').check()
  // Pick the equation from the domain-organized library (Enzyme kinetics).
  await page.getByTestId('lab-opt-equation').selectOption('michaelis-menten')

  await expect(page.getByTestId('lab-run')).toBeEnabled({ timeout: 150_000 })
  await page.getByTestId('lab-run').click()

  await expect(page.getByTestId('lab-result-a1')).toBeVisible({ timeout: 60_000 })
  // The best-fit parameter table (value ± SE, 95% CI) names the fitted parameters.
  await expect(page.getByTestId('lab-result-a1')).toContainText('Best-fit parameters', {
    timeout: 60_000,
  })
  await expect(page.getByTestId('lab-result-a1')).toContainText('Vmax')
  await expect(page.getByTestId('lab-stats')).toContainText('R squared')
  await expect(page.getByTestId('lab-figure-a1').first()).toBeVisible()
  expect(await page.getByTestId('lab-figure-a1').first().getAttribute('src')).toMatch(
    /^data:image\/svg\+xml/,
  )
})

test('E-AC2: standard-curve interpolation returns an interpolated X off a fitted line', async ({
  page,
}) => {
  test.setTimeout(240_000)

  // Linear calibration y = 2x + 1; read Y0 = 11 off it -> X ~ 5.
  await seedDataset(
    'interp-ac',
    'xy',
    [
      { id: 'c1', name: 'Concentration', type: 'number', role: 'x' },
      { id: 'c2', name: 'Signal', type: 'number', role: 'y' },
    ],
    [
      [1, 3],
      [2, 5],
      [3, 7],
      [4, 9],
      [5, 11],
      [6, 13],
      [7, 15],
      [8, 17],
    ],
  )

  await openDataLane(page)
  await openDataset(page, 'interp-ac')

  await page.getByTestId('lane-lab').click()
  await page.getByTestId('lab-analyze').click()
  await page.getByTestId('lab-analysis-interpolate-standard-curve').click()
  await page.getByTestId('lab-col-c2').locator('input').check()
  await page.getByTestId('lab-opt-equation').selectOption('line')
  await page.getByTestId('lab-opt-interp-y').fill('11')

  await expect(page.getByTestId('lab-run')).toBeEnabled({ timeout: 150_000 })
  await page.getByTestId('lab-run').click()

  await expect(page.getByTestId('lab-result-a1')).toBeVisible({ timeout: 60_000 })
  // The interpolated value read off the standard curve (with its 95% CI).
  await expect(page.getByTestId('lab-stats')).toContainText('interpolated X', { timeout: 60_000 })
  await expect(page.getByTestId('lab-stats')).toContainText('95% CI low')
  await expect(page.getByTestId('lab-figure-a1')).toBeVisible()
})

test('E-AC3 (global fitting): a shared-parameter fit across 3 dose-response curves converges', async ({
  page,
}) => {
  test.setTimeout(240_000)

  // Three 4-parameter-Hill dose-response curves sharing Top=100, Bottom=0,
  // HillSlope=1 but with DIFFERENT logEC50 (-7, -6, -5) — the plan's dose-
  // response-family shape (one X column, MULTIPLE Y curves). Seeded in one shot.
  await seedDataset(
    'gfit-ac',
    'xy',
    [
      { id: 'c1', name: 'log[dose]', type: 'number', role: 'x' },
      { id: 'c2', name: 'Drug A', type: 'number', role: 'y' },
      { id: 'c3', name: 'Drug B', type: 'number', role: 'y' },
      { id: 'c4', name: 'Drug C', type: 'number', role: 'y' },
    ],
    [
      [-9, 0.99, 0.1, 0.01],
      [-8, 9.091, 0.99, 0.1],
      [-7, 50, 9.091, 0.99],
      [-6, 90.909, 50, 9.091],
      [-5, 99.01, 90.909, 50],
      [-4, 99.9, 99.01, 90.909],
      [-3, 99.99, 99.9, 99.01],
    ],
  )

  await openDataLane(page)
  await openDataset(page, 'gfit-ac')

  await page.getByTestId('lane-lab').click()
  await page.getByTestId('lab-analyze').click()
  await page.getByTestId('lab-analysis-global-fit').click()
  // All three Y curves take part in the single simultaneous fit.
  await page.getByTestId('lab-col-c2').locator('input').check()
  await page.getByTestId('lab-col-c3').locator('input').check()
  await page.getByTestId('lab-col-c4').locator('input').check()
  await page.getByTestId('lab-opt-equation').selectOption('dr-4param')
  // The three-way selector: Bottom/Top/HillSlope stay Shared (default); let
  // logEC50 (parameter index 2) vary per curve.
  await page.getByTestId('lab-share-mode-2').selectOption('separate')

  await expect(page.getByTestId('lab-run')).toBeEnabled({ timeout: 150_000 })
  await page.getByTestId('lab-run').click()

  await expect(page.getByTestId('lab-result-a1')).toBeVisible({ timeout: 60_000 })
  // The per-parameter table: shared parameters shown once, logEC50 per curve.
  await expect(page.getByTestId('lab-result-a1')).toContainText('Best-fit parameters', {
    timeout: 60_000,
  })
  await expect(page.getByTestId('lab-result-a1')).toContainText('shared')
  await expect(page.getByTestId('lab-result-a1')).toContainText('logEC50')
  await expect(page.getByTestId('lab-result-a1')).toContainText('HillSlope')
  // It converged across all three curves.
  await expect(page.getByTestId('lab-stats')).toContainText('converged')
  await expect(page.getByTestId('lab-stats')).toContainText('curves (K)')
  // One overlay figure of all K curves with their fits.
  await expect(page.getByTestId('lab-figure-a1')).toBeVisible()
  expect(await page.getByTestId('lab-figure-a1').getAttribute('src')).toMatch(
    /^data:image\/svg\+xml/,
  )
})

/** Stand up a 3-group Column dataset (G1<G2<G3, clearly separated) for the F1 tests. */
async function threeGroupAnova(page: Page, name: string) {
  await openDataLane(page)
  await newDataset(page, name)
  await page.getByTestId('add-column').click()
  await fillColumn(page, 0, [1, 2, 3, 4])
  await fillColumn(page, 1, [5, 6, 7, 8])
  await fillColumn(page, 2, [9, 10, 11, 12])

  await page.getByTestId('lane-lab').click()
  await page.getByTestId('lab-analyze').click()
  await page.getByTestId('lab-analysis-one-way-anova').click()
  await page.getByTestId('lab-col-c1').locator('input').check()
  await page.getByTestId('lab-col-c2').locator('input').check()
  await page.getByTestId('lab-col-c3').locator('input').check()
  await page.getByTestId('lab-opt-posthoc').selectOption('tukey')
  await expect(page.getByTestId('lab-run')).toBeEnabled({ timeout: 150_000 })
  await page.getByTestId('lab-run').click()
  await expect(page.getByTestId('lab-result-a1')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByTestId('lab-result-a1')).toContainText('Tukey HSD', { timeout: 60_000 })
}

/** Count the `dt-bracket-…` marks in a figure `<img>`'s inline SVG data URL. */
async function bracketCount(page: Page): Promise<number> {
  const src = await page.getByTestId('lab-figure-a1').getAttribute('src')
  if (!src?.startsWith('data:image/svg+xml;base64,')) return 0
  const svg = Buffer.from(src.split(',')[1] ?? '', 'base64').toString('utf-8')
  return (svg.match(/dt-bracket-/g) ?? []).length
}

test('F-AC1: opting an ANOVA+Tukey figure into brackets shows the significance brackets', async ({
  page,
}) => {
  test.setTimeout(240_000)

  await threeGroupAnova(page, 'Brackets ANOVA')
  // The default figure has NO brackets (opt-in per figure).
  expect(await bracketCount(page)).toBe(0)

  // Turn on stars brackets in the results-sheet Format panel and re-run.
  await page.getByTestId('lab-format-a1').click() // open the <details>
  await page.getByTestId('lab-fmt-brackets-a1').selectOption('stars')
  await page.getByTestId('lab-format-apply-a1').click()

  // The figure re-renders carrying bracket marks for the significant pairs — the
  // exact count/star match against the Tukey table is proven in analysis-smoke.mjs.
  await expect(page.getByTestId('lab-figure-a1')).toBeVisible({ timeout: 60_000 })
  await expect.poll(() => bracketCount(page), { timeout: 60_000 }).toBeGreaterThan(0)
})

test('F-AC2: a 300-dpi PNG export of a Lab figure triggers a download', async ({ page }) => {
  test.setTimeout(240_000)

  await threeGroupAnova(page, 'Export PNG')
  await expect(page.getByTestId('lab-figure-a1')).toBeVisible({ timeout: 60_000 })

  // Choose PNG @ 300 dpi (the poster resolution) and download.
  await page.getByTestId('lab-export-format-a1').selectOption('png')
  await page.getByTestId('lab-export-dpi-a1').selectOption('300')
  const downloadPromise = page.waitForEvent('download', { timeout: 60_000 })
  await page.getByTestId('lab-export-a1').click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/300dpi\.png$/)
})

test('F-AC3 (poster): a 1x2 layout of two analyses exports a 300-dpi PNG poster', async ({
  page,
}) => {
  test.setTimeout(300_000)

  await threeGroupAnova(page, 'Poster board') // a1 = one-way ANOVA
  // A SECOND saved analysis, so the poster has two panels (A + B).
  await page.getByTestId('lab-analyze').click()
  await page.getByTestId('lab-analysis-descriptive').click()
  await page.getByTestId('lab-col-c1').locator('input').check()
  await page.getByTestId('lab-col-c2').locator('input').check()
  await expect(page.getByTestId('lab-run')).toBeEnabled({ timeout: 150_000 })
  await page.getByTestId('lab-run').click()
  await expect(page.getByTestId('lab-result-a2')).toBeVisible({ timeout: 60_000 })

  // Build a 1×2 poster (auto-seeded with the first two analyses) and export it.
  await expect(page.getByTestId('poster-layouts')).toBeVisible()
  await page.getByTestId('layout-add').click()
  await expect(page.getByTestId('layout-ly1')).toBeVisible()
  await page.getByTestId('layout-dpi-ly1').selectOption('300')
  const downloadPromise = page.waitForEvent('download', { timeout: 120_000 })
  await page.getByTestId('layout-export-ly1').click()
  const download = await downloadPromise
  // The composed board downloads as a 300-dpi PNG poster.
  expect(download.suggestedFilename()).toMatch(/poster-300dpi\.png$/)
})

test('F-AC4 (bridge): Open in Code mode on a Sheets chart runs to a figure', async ({ page }) => {
  test.setTimeout(240_000)

  await openDataLane(page)
  await newDataset(page, 'Chart bridge', 'xy')
  await fillColumn(page, 0, [1, 2, 3, 4, 5])
  await fillColumn(page, 1, [2, 4, 5, 4, 6])

  // Build a chart in Sheets, then bridge it into the Code lane.
  await page.getByTestId('view-chart').click()
  await page.getByTestId('chart-add').click()
  await page.getByTestId('chart-open-code').click()

  // We land in the Code lane with the generated script selected — Run it.
  await expect(page.getByTestId('code-lane')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('code-run')).toBeEnabled({ timeout: 150_000 })
  await page.getByTestId('code-run').click()
  await expect(page.getByTestId('code-figure')).toBeVisible({ timeout: 60_000 })
  expect(await page.getByTestId('code-figure').getAttribute('src')).toMatch(/^data:image\/svg\+xml/)
})

test('F-AC4 (bridge): Open in Code mode on a Lab analysis runs to a figure', async ({ page }) => {
  test.setTimeout(300_000)

  await threeGroupAnova(page, 'Analysis bridge') // a1 = one-way ANOVA, result on screen
  await page.getByTestId('lab-open-code-a1').click()

  // The generated matplotlib opens selected in the Code lane and Runs to a figure
  // (the same plotting on the same data → the figure matches the GUI figure).
  await expect(page.getByTestId('code-lane')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('code-run')).toBeEnabled({ timeout: 150_000 })
  await page.getByTestId('code-run').click()
  await expect(page.getByTestId('code-figure')).toBeVisible({ timeout: 60_000 })
})
