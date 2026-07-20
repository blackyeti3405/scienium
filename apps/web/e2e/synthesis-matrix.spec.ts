import { test, expect, type Page } from '@playwright/test'
import { api, withSeedPage, withRateLimitRetry } from './api'

/**
 * Synthesis Matrix (Literature Review) — one test per acceptance criterion
 * (15 criteria total, from .claude/pipeline/plan-lit-synthesis-matrix.md).
 * Runs as the default `chromium` project (authenticated lab leader on the
 * "E2E Test Lab" team). Entry point: `/literature/review` (the `(dashboard)`
 * route that renders `LiteratureFeature` directly — no isometric building
 * click needed).
 *
 * Criterion → test mapping:
 *  AC1  — Synthesis button visible; clicking it renders the panel within 2s.
 *  AC2  — Empty state (no matrices): EmptyState + "New matrix" control, never
 *         a spinner or blank pane.
 *  AC3  — Create with 2-4 papers: 1 selected disables Create, 2 enables it, a
 *         5th is refused; POST 201s and the grid renders one row per paper.
 *  AC4  — Columns adapt to the field: default (labType volt_lab) headers vs.
 *         an explicit `computational-cs` template pick.
 *  AC5  — Columns are student-editable (add/rename/remove), persisted (reload).
 *  AC6  — Cells persist (PATCH on blur; survive reload).
 *  AC7  — Check button gated on >=1 non-empty cell.
 *  AC8  — Vega's E2E-stub verdict names >=1 "You MISSED this" finding.
 *  AC9  — Verdict persists across reload; an unedited re-check replays (cached: true).
 *  AC10 — A suggested column is a one-click "+ Add".
 *  AC11 — KP is server-set: 25 on the first successful check, 0 on a second
 *         (post-edit) check of the same matrix.
 *  AC12 — Team-scoped (IDOR): GET/PATCH/DELETE/check 404 on a foreign matrix
 *         id; POST create 400s on a foreign paperId and creates nothing.
 *  AC13 — Rate cap present (static: requireTeamContext(req, { tier: 'ai' })).
 *  AC14 — Cost shape (static): exactly one `anthropic().messages.create(` call
 *         site + one `cache_control: { type: 'ephemeral' }`; no import of
 *         paperTextBlock/paperTextContext/PAPER_TEXT_SLICE_CHARS.
 *  AC15 — Pixel aesthetic: column headers + check button carry font-pixel +
 *         the gold accent; cell textarea body text does NOT carry font-pixel.
 *
 * Determinism seam: E2E_SKIP_LLM=1 (already set in apps/web/.env.local) makes
 * the check route build a deterministic verdict FROM the matrix's own ids
 * (lib/literature/synthesis.ts `e2eStubVerdict`) — always one "MISSED"
 * contradiction, run through the SAME zod-parse + clamp + persist path as a
 * real call. No Anthropic call is made anywhere in this spec.
 *
 * Seeding: 5 dedicated `status: 'ready'` Paper rows (the sanctioned direct-
 * Prisma escape hatch used by e2e/F11-quiz-retry.spec.ts) — 2 are used for the
 * main synthesis matrix driven through most of this spec, and having 5
 * available in the picker makes AC3's "a 5th is refused" assertion
 * self-contained rather than depending on other specs' leftover papers. A
 * throwaway "foreign" team + matrix (also seeded via Prisma) backs AC12's
 * IDOR checks. Every seeded id is tracked and torn down in `afterAll`.
 */

const TEAM_NAME = 'E2E Test Lab'
const RUN_ID = Date.now()

let teamId: string | null = null
let teamLeadId: string | null = null
let paperIds: string[] = []
let foreignTeamId: string | null = null
let foreignMatrixId: string | null = null
const createdMatrixIds: string[] = []

test.describe('Synthesis Matrix (Literature Review)', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async () => {
    const { PrismaClient } = await import('@prisma/client')
    const db = new PrismaClient()
    try {
      const team = await db.team.findFirst({ where: { name: TEAM_NAME }, select: { id: true, teamLeadId: true } })
      if (!team) {
        throw new Error(`E2E team '${TEAM_NAME}' not found — run pnpm --filter web seed:e2e first.`)
      }
      teamId = team.id
      teamLeadId = team.teamLeadId
      const currentTeamId = team.id
      const currentTeamLeadId = team.teamLeadId

      // Clean slate: this team is shared across E2E runs, and the empty-state
      // assertion (AC2) needs a genuinely empty matrix list.
      await db.synthesisMatrix.deleteMany({ where: { teamId: currentTeamId } })

      const papers = await Promise.all(
        Array.from({ length: 5 }).map((_, i) =>
          db.paper.create({
            data: {
              teamId: currentTeamId,
              title: `[E2E Synthesis] Fixture paper ${RUN_ID}-${i}`,
              authors: [`Author${i}, E2E`],
              abstract: `Deterministic E2E fixture abstract ${i} for the synthesis-matrix spec — reports a measured outcome for fixture condition ${i}.`,
              sourceType: 'pdf',
              status: 'ready',
              fullText: `Deterministic E2E fixture full text ${i} for the synthesis-matrix spec.`,
              contentHash: `e2e-synthesis-${RUN_ID}-${i}`,
              uploadedByUserId: currentTeamLeadId,
            },
            select: { id: true },
          }),
        ),
      )
      paperIds = papers.map((p) => p.id)

      // Foreign team + matrix for AC12's IDOR checks.
      const foreignTeam = await db.team.create({
        data: { name: `[E2E Synthesis foreign] ${RUN_ID}`, teamLeadId: currentTeamLeadId },
        select: { id: true },
      })
      foreignTeamId = foreignTeam.id
      const foreignMatrix = await db.synthesisMatrix.create({
        data: {
          teamId: foreignTeam.id,
          templateId: 'general',
          columnsJson: [{ id: 'x', label: 'X' }],
          paperIds: [],
          createdByUserId: currentTeamLeadId,
        },
        select: { id: true },
      })
      foreignMatrixId = foreignMatrix.id
    } finally {
      await db.$disconnect()
    }
  })

  test.afterAll(async ({ browser }) => {
    await withSeedPage(browser, 'leader', async (page) => {
      for (const id of createdMatrixIds) {
        const res = await api.delete(page, `/api/literature/synthesis/${id}`)
        if (!res.ok()) console.warn(`synthesis-matrix afterAll: cleanup DELETE matrix ${id} returned ${res.status()}`)
      }
      for (const id of paperIds) {
        const res = await api.delete(page, `/api/papers/${id}`)
        if (!res.ok()) console.warn(`synthesis-matrix afterAll: cleanup DELETE paper ${id} returned ${res.status()}`)
      }
    })

    const { PrismaClient } = await import('@prisma/client')
    const db = new PrismaClient()
    try {
      if (foreignTeamId) {
        await db.synthesisMatrix.deleteMany({ where: { teamId: foreignTeamId } })
        await db.team.delete({ where: { id: foreignTeamId } }).catch(() => {})
      }
      if (teamId) {
        // Defensive: any matrix a mid-run failure left behind.
        await db.synthesisMatrix.deleteMany({ where: { teamId } })
      }
    } finally {
      await db.$disconnect()
    }
  })

  // ── Helpers ──────────────────────────────────────────────────────────────

  async function openSynthesisPanel(page: Page) {
    await page.goto('/literature/review')
    await page.getByTestId('synthesis-open').click()
  }

  // ── AC1 ──────────────────────────────────────────────────────────────────
  test('AC1: the Synthesis button opens the panel within 2s', async ({ page }) => {
    await page.goto('/literature/review')
    const btn = page.getByTestId('synthesis-open')
    await expect(btn).toBeVisible()
    const start = Date.now()
    await btn.click()
    await expect(page.getByText('Synthesis Matrix')).toBeVisible({ timeout: 2000 })
    expect(Date.now() - start).toBeLessThan(2500)
  })

  // ── AC2 ──────────────────────────────────────────────────────────────────
  test('AC2: with no matrices, the panel shows an EmptyState + "New matrix" control', async ({ page }) => {
    await openSynthesisPanel(page)
    await expect(page.getByTestId('synthesis-empty')).toBeVisible()
    await expect(page.getByText('No synthesis matrices yet')).toBeVisible()
    await expect(page.getByTestId('synthesis-new')).toBeVisible()
  })

  // ── AC3 ──────────────────────────────────────────────────────────────────
  let matrixId: string
  test('AC3: creating with 2-4 papers renders one grid row per paper; a 5th selection is refused', async ({ page }) => {
    await openSynthesisPanel(page)
    await page.getByTestId('synthesis-new').click()
    await expect(page.getByTestId('synthesis-create-form')).toBeVisible()

    const submit = page.getByTestId('synthesis-create-submit')

    await page.getByTestId(`synthesis-pick-${paperIds[0]}`).waitFor({ state: 'visible' })
    await page.getByTestId(`synthesis-pick-${paperIds[0]}`).check()
    await expect(submit).toBeDisabled()

    await page.getByTestId(`synthesis-pick-${paperIds[1]}`).check()
    await expect(submit).toBeEnabled()

    // 3rd and 4th bring it to MAX_PAPERS; the 5th checkbox must refuse (disabled).
    await page.getByTestId(`synthesis-pick-${paperIds[2]}`).check()
    await page.getByTestId(`synthesis-pick-${paperIds[3]}`).check()
    const fifth = page.getByTestId(`synthesis-pick-${paperIds[4]}`)
    await expect(fifth).toBeDisabled()
    await expect(fifth).not.toBeChecked()

    // Drop back to exactly 2 (paperIds[0], paperIds[1]) for the matrix this
    // spec drives through the rest of its lifecycle.
    await page.getByTestId(`synthesis-pick-${paperIds[2]}`).uncheck()
    await page.getByTestId(`synthesis-pick-${paperIds[3]}`).uncheck()

    const [response] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/literature/synthesis') && r.request().method() === 'POST',
      ),
      submit.click(),
    ])
    expect(response.status()).toBe(201)
    const body = await response.json()
    matrixId = body.id as string
    createdMatrixIds.push(matrixId)

    await expect(page.getByTestId('synthesis-grid')).toBeVisible()
    await expect(page.locator('[data-testid="synthesis-grid"] tbody tr')).toHaveCount(2)
  })

  // ── AC4 ──────────────────────────────────────────────────────────────────
  test('AC4: columns adapt to the field (labType default vs. an explicit template pick)', async ({ page }) => {
    // The matrix created in AC3 used no explicit templateId, so it should
    // have been seeded from the team's labType (volt_lab) default.
    await openSynthesisPanel(page)
    await page.getByTestId(`synthesis-matrix-${matrixId}`).click()
    await expect(page.getByTestId('synthesis-grid')).toBeVisible()
    const headers = page.locator('[data-testid="synthesis-column-header"]')
    await expect(headers).toHaveText([
      'Device / system',
      'Design approach',
      'Test setup',
      'Performance metric',
      'Reported value',
      'Limitation',
    ])
    await page.getByText('← All matrices').click()

    // Re-create explicitly picking the computational-cs template.
    await page.getByTestId('synthesis-new').click()
    await page.getByTestId(`synthesis-pick-${paperIds[0]}`).check()
    await page.getByTestId(`synthesis-pick-${paperIds[1]}`).check()
    await page.getByTestId('synthesis-template-select').selectOption('computational-cs')

    const [response] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/literature/synthesis') && r.request().method() === 'POST',
      ),
      page.getByTestId('synthesis-create-submit').click(),
    ])
    const body = await response.json()
    createdMatrixIds.push(body.id)

    await expect(page.getByTestId('synthesis-grid')).toBeVisible()
    const csHeaders = page.locator('[data-testid="synthesis-column-header"]')
    await expect(csHeaders).toHaveText([
      'Dataset',
      'Model / method',
      'Baseline compared',
      'Metric',
      'Reported score',
      'Limitation',
    ])

    // Delete this second matrix immediately — the rest of the spec only
    // drives the AC3 matrix, and MAX_MATRICES_PER_TEAM is a hard cap of 5.
    await api.delete(page, `/api/literature/synthesis/${body.id}`)
    createdMatrixIds.splice(createdMatrixIds.indexOf(body.id), 1)
  })

  // ── AC5 ──────────────────────────────────────────────────────────────────
  test('AC5: columns are student-editable (add/rename/remove) and persist across reload', async ({ page }) => {
    await openSynthesisPanel(page)
    await page.getByTestId(`synthesis-matrix-${matrixId}`).click()
    await expect(page.getByTestId('synthesis-grid')).toBeVisible()

    // Add.
    await page.getByTestId('synthesis-add-column').click()
    await page.getByPlaceholder('Custom column…').fill('Sample size (n)')
    await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/literature/synthesis/${matrixId}`) && r.request().method() === 'PATCH'),
      page.getByRole('button', { name: 'Add' }).click(),
    ])
    await expect(page.locator('[data-testid="synthesis-column-header"]', { hasText: 'Sample size (n)' })).toBeVisible()

    // Rename.
    const renameTarget = page.locator('[data-testid="synthesis-column-header"]', { hasText: 'Limitation' })
    await renameTarget.click()
    const renameInput = page.locator('[data-testid="synthesis-column-rename-input"]')
    await renameInput.fill('Limitation (renamed)')
    await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/literature/synthesis/${matrixId}`) && r.request().method() === 'PATCH'),
      renameInput.blur(),
    ])
    await expect(page.locator('[data-testid="synthesis-column-header"]', { hasText: 'Limitation (renamed)' })).toBeVisible()

    // Remove.
    const removeHeader = page.locator('[data-testid="synthesis-grid"] thead th', { hasText: 'Sample size (n)' })
    await removeHeader.hover()
    await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/literature/synthesis/${matrixId}`) && r.request().method() === 'PATCH'),
      removeHeader.getByRole('button', { name: 'Remove column' }).click(),
    ])
    await expect(page.locator('[data-testid="synthesis-column-header"]', { hasText: 'Sample size (n)' })).toHaveCount(0)

    // Persist across reload.
    await page.reload()
    await page.getByTestId('synthesis-open').click()
    await page.getByTestId(`synthesis-matrix-${matrixId}`).click()
    await expect(page.getByTestId('synthesis-grid')).toBeVisible()
    await expect(page.locator('[data-testid="synthesis-column-header"]', { hasText: 'Limitation (renamed)' })).toBeVisible()
    await expect(page.locator('[data-testid="synthesis-column-header"]', { hasText: 'Sample size (n)' })).toHaveCount(0)
  })

  // ── AC6 ──────────────────────────────────────────────────────────────────
  test('AC6: cells persist (PATCH on blur; survive reload)', async ({ page }) => {
    await openSynthesisPanel(page)
    await page.getByTestId(`synthesis-matrix-${matrixId}`).click()
    await expect(page.getByTestId('synthesis-grid')).toBeVisible()

    const cell = page.getByTestId(`synthesis-cell-${paperIds[0]}-device`)
    await cell.fill('A wearable strain-gauge prototype')
    await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/literature/synthesis/${matrixId}`) && r.request().method() === 'PATCH'),
      cell.blur(),
    ])

    await page.reload()
    await page.getByTestId('synthesis-open').click()
    await page.getByTestId(`synthesis-matrix-${matrixId}`).click()
    await expect(page.getByTestId(`synthesis-cell-${paperIds[0]}-device`)).toHaveValue(
      'A wearable strain-gauge prototype',
    )
  })

  // ── AC7 ──────────────────────────────────────────────────────────────────
  test('AC7: the check button is gated on >=1 non-empty cell', async ({ page }) => {
    await openSynthesisPanel(page)
    await page.getByTestId(`synthesis-matrix-${matrixId}`).click()
    await expect(page.getByTestId('synthesis-grid')).toBeVisible()
    // AC6 already left one cell filled, so the button should already be enabled.
    await expect(page.getByTestId('synthesis-check')).toBeEnabled()
  })

  // ── AC8 ──────────────────────────────────────────────────────────────────
  test('AC8: Vega\'s verdict names what was MISSED (>=1 "You MISSED this")', async ({ page }) => {
    await openSynthesisPanel(page)
    await page.getByTestId(`synthesis-matrix-${matrixId}`).click()
    await expect(page.getByTestId('synthesis-grid')).toBeVisible()

    const checkBtn = page.getByTestId('synthesis-check')
    await withRateLimitRetry(async () => {
      const [response] = await Promise.all([
        page.waitForResponse((r) => r.url().includes(`/api/literature/synthesis/${matrixId}/check`)),
        checkBtn.click(),
      ])
      return { status: response.status(), retryAfterSeconds: Number(response.headers()['retry-after'] ?? 60), result: response }
    }, 'synthesis-matrix spec')

    await expect(page.getByTestId('synthesis-verdict')).toBeVisible({ timeout: 10_000 })
    const missedCount = await page.getByTestId('synthesis-missed').count()
    expect(missedCount).toBeGreaterThanOrEqual(1)
  })

  // ── AC9 ──────────────────────────────────────────────────────────────────
  test('AC9: the verdict persists across reload, and a re-check of the unedited grid replays (cached: true)', async ({ page }) => {
    await openSynthesisPanel(page)
    await page.getByTestId(`synthesis-matrix-${matrixId}`).click()
    await expect(page.getByTestId('synthesis-grid')).toBeVisible()
    await expect(page.getByTestId('synthesis-verdict')).toBeVisible()

    await page.reload()
    await page.getByTestId('synthesis-open').click()
    await page.getByTestId(`synthesis-matrix-${matrixId}`).click()
    await expect(page.getByTestId('synthesis-verdict')).toBeVisible()

    const responseBody = await withRateLimitRetry(async () => {
      const [response] = await Promise.all([
        page.waitForResponse((r) => r.url().includes(`/api/literature/synthesis/${matrixId}/check`)),
        page.getByTestId('synthesis-check').click(),
      ])
      const status = response.status()
      const body = status === 200 ? await response.json() : null
      return { status, retryAfterSeconds: Number(response.headers()['retry-after'] ?? 60), result: body }
    }, 'synthesis-matrix spec')
    expect(responseBody).not.toBeNull()
    expect(responseBody.cached).toBe(true)
    expect(responseBody.kpEarned).toBe(0)
  })

  // ── AC10 ─────────────────────────────────────────────────────────────────
  test('AC10: a suggested column is a one-click "+ Add"', async ({ page }) => {
    await openSynthesisPanel(page)
    await page.getByTestId(`synthesis-matrix-${matrixId}`).click()
    await expect(page.getByTestId('synthesis-verdict')).toBeVisible()

    const chip = page.getByTestId('synthesis-suggested-column').first()
    await expect(chip).toBeVisible()
    const label = (await chip.textContent())?.replace(/^\+\s*/, '').trim() ?? ''
    expect(label.length).toBeGreaterThan(0)

    await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/literature/synthesis/${matrixId}`) && r.request().method() === 'PATCH'),
      chip.click(),
    ])
    await expect(page.locator('[data-testid="synthesis-column-header"]', { hasText: label })).toBeVisible()
  })

  // ── AC11 ─────────────────────────────────────────────────────────────────
  test('AC11: KP is server-set — 25 on the first successful check, 0 on a second (post-edit) check', async ({ page }) => {
    await openSynthesisPanel(page)
    await page.getByTestId(`synthesis-matrix-${matrixId}`).click()
    await expect(page.getByTestId('synthesis-grid')).toBeVisible()

    // AC8 already ran the first-ever check on this matrix; assert its KP was
    // recorded server-side (matrix.kpAwarded reflects the flat award).
    const matrixRes = await api.get(page, `/api/literature/synthesis/${matrixId}`)
    const matrixBody = await matrixRes.json()
    expect(matrixBody.kpAwarded).toBe(25)

    // Edit a cell to bust the replay cache, then check again — must earn 0.
    const cell = page.getByTestId(`synthesis-cell-${paperIds[0]}-device`)
    await cell.fill('A wearable strain-gauge prototype, v2')
    await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/literature/synthesis/${matrixId}`) && r.request().method() === 'PATCH'),
      cell.blur(),
    ])

    const second = await withRateLimitRetry(async () => {
      const [response] = await Promise.all([
        page.waitForResponse((r) => r.url().includes(`/api/literature/synthesis/${matrixId}/check`)),
        page.getByTestId('synthesis-check').click(),
      ])
      const status = response.status()
      const body = status === 200 ? await response.json() : null
      return { status, retryAfterSeconds: Number(response.headers()['retry-after'] ?? 60), result: body }
    }, 'synthesis-matrix spec')
    expect(second.cached).toBe(false)
    expect(second.kpEarned).toBe(0)
  })

  // ── AC12 ─────────────────────────────────────────────────────────────────
  test('AC12: team-scoped (IDOR) — foreign matrix id 404s; a foreign paperId on create 400s and creates nothing', async ({ page }) => {
    await page.goto('/literature/review')

    const getRes = await api.get(page, `/api/literature/synthesis/${foreignMatrixId}`)
    expect(getRes.status()).toBe(404)
    const getBody = await getRes.json()
    expect(getBody).not.toHaveProperty('columns')
    expect(getBody).not.toHaveProperty('cells')

    const patchRes = await api.patch(page, `/api/literature/synthesis/${foreignMatrixId}`, {
      data: { title: 'hijacked' },
    })
    expect(patchRes.status()).toBe(404)

    const checkRes = await withRateLimitRetry(async () => {
      const res = await api.post(page, `/api/literature/synthesis/${foreignMatrixId}/check`)
      return { status: res.status(), retryAfterSeconds: Number(res.headers()['retry-after'] ?? 60), result: res }
    }, 'synthesis-matrix spec')
    expect(checkRes.status()).toBe(404)

    const deleteRes = await api.delete(page, `/api/literature/synthesis/${foreignMatrixId}`)
    expect(deleteRes.status()).toBe(404)

    // A fabricated/foreign paperId (not owned by this team) fails the
    // team-scoped ownership count check identically to a genuinely foreign one.
    const beforeCount = (await (await api.get(page, '/api/literature/synthesis')).json()).matrices.length
    const createRes = await api.post(page, '/api/literature/synthesis', {
      data: { paperIds: [paperIds[0], 'clhnotarealpaperidxxxxxx'] },
    })
    expect(createRes.status()).toBe(400)
    const afterCount = (await (await api.get(page, '/api/literature/synthesis')).json()).matrices.length
    expect(afterCount).toBe(beforeCount)
  })

  // ── AC13 ─────────────────────────────────────────────────────────────────
  test('AC13 (static): the check route enforces the "ai" rate-limit tier', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const routePath = path.join(__dirname, '..', 'app', 'api', 'literature', 'synthesis', '[id]', 'check', 'route.ts')
    const source = fs.readFileSync(routePath, 'utf8')
    expect(source).toMatch(/requireTeamContext\(req,\s*\{\s*tier:\s*'ai'\s*\}\)/)
  })

  // ── AC14 ─────────────────────────────────────────────────────────────────
  test('AC14 (static): cost shape — one Anthropic call site, one cache_control block, no paperTextBlock/paperTextContext import', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const routePath = path.join(__dirname, '..', 'app', 'api', 'literature', 'synthesis', '[id]', 'check', 'route.ts')
    const source = fs.readFileSync(routePath, 'utf8')
    // Strip comments before matching: the route's own JSDoc block quotes both
    // patterns verbatim as documentation of this exact invariant, which would
    // otherwise double-count as a second "call site" / "cache block".
    const codeOnly = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

    const callSites = codeOnly.match(/anthropic\(\)\.messages\.create\(/g) ?? []
    expect(callSites).toHaveLength(1)

    const cacheBlocks = codeOnly.match(/cache_control:\s*\{\s*type:\s*'ephemeral'\s*\}/g) ?? []
    expect(cacheBlocks).toHaveLength(1)

    expect(codeOnly).not.toMatch(/paperTextBlock/)
    expect(codeOnly).not.toMatch(/paperTextContext/)
    expect(codeOnly).not.toMatch(/PAPER_TEXT_SLICE_CHARS/)
  })

  // ── AC15 ─────────────────────────────────────────────────────────────────
  test('AC15: pixel aesthetic — headers/check button carry font-pixel + gold accent; cell text does not', async ({ page }) => {
    await openSynthesisPanel(page)
    await page.getByTestId(`synthesis-matrix-${matrixId}`).click()
    await expect(page.getByTestId('synthesis-grid')).toBeVisible()

    const header = page.locator('[data-testid="synthesis-column-header"]').first()
    await expect(header).toHaveClass(/font-pixel/)

    const checkBtn = page.getByTestId('synthesis-check')
    await expect(checkBtn).toHaveClass(/font-pixel/)
    await expect(checkBtn).toHaveClass(/bg-\[#F5C518\]/)

    const cell = page.getByTestId(`synthesis-cell-${paperIds[0]}-device`)
    const cellClass = (await cell.getAttribute('class')) ?? ''
    expect(cellClass).not.toMatch(/font-pixel/)
  })

  // ── XSS (extra, from the tester playbook's core-assertion list) ───────────
  // Note: this covers cell text and column labels — both direct student
  // input rendered through the same plain-JSX-child path used for verdict
  // findings (`{finding.claim}`, `{g.text}`, `{c.note}`, `{s.label}` in
  // SynthesisMatrixEditor.tsx — no `dangerouslySetInnerHTML` anywhere in that
  // component, confirmed by source inspection). The verdict text itself
  // isn't independently exercisable here: under E2E_SKIP_LLM=1 it's a fixed
  // server-authored fixture string (`e2eStubVerdict`), not derived from any
  // student-controlled input, so there's no UI path to inject a payload into
  // it — its escaping relies on the identical React rendering mechanism
  // validated below for cells/columns.
  test('XSS: cell text and column labels with an <img onerror> payload render as literal text, not executable markup', async ({ page }) => {
    await openSynthesisPanel(page)
    await page.getByTestId(`synthesis-matrix-${matrixId}`).click()
    await expect(page.getByTestId('synthesis-grid')).toBeVisible()

    let dialogFired = false
    page.on('dialog', (d) => {
      dialogFired = true
      void d.dismiss()
    })

    const payload = '<img src=x onerror=alert(1)>'

    // Cell text.
    const cell = page.getByTestId(`synthesis-cell-${paperIds[1]}-design-approach`)
    await cell.fill(payload)
    await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/literature/synthesis/${matrixId}`) && r.request().method() === 'PATCH'),
      cell.blur(),
    ])
    await expect(cell).toHaveValue(payload)
    expect(await page.locator('img[src="x"]').count()).toBe(0)

    // Column label (rename).
    const header = page.locator('[data-testid="synthesis-column-header"]').first()
    await header.click()
    const renameInput = page.locator('[data-testid="synthesis-column-rename-input"]')
    await renameInput.fill(payload)
    await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/literature/synthesis/${matrixId}`) && r.request().method() === 'PATCH'),
      renameInput.blur(),
    ])
    await expect(page.locator('[data-testid="synthesis-column-header"]').first()).toHaveText(payload)
    expect(await page.locator('img[src="x"]').count()).toBe(0)

    expect(dialogFired).toBe(false)
    expect(await page.evaluate(() => (window as unknown as { __xssFired?: boolean }).__xssFired)).toBeUndefined()
  })
})
