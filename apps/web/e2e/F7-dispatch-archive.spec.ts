import { test, expect, request as playwrightRequest, type Page } from '@playwright/test'
import { STORAGE } from './roles'

/**
 * F7 — Field Dispatch history/archive (the "Past Dispatches" collapsible on
 * the Operations Hub → Field Dispatch tab), from .claude/pipeline/plan-F7.md.
 * One test per acceptance criterion (10 criteria total). Runs as the default
 * `chromium` project (authenticated lab leader / devuser1).
 *
 * Criterion → test mapping:
 *  AC1  — "Past Dispatches" control visible whenever ≥1 prior-day answered dispatch exists
 *  AC2  — Count in parens, e.g. "Past Dispatches (3)", equals rendered card count once expanded
 *  AC3  — Section is collapsed on load: no past-dispatch answer text visible before click
 *  AC4  — Clicking expands the section; each card shows body + reflection question + saved answer
 *  AC5  — Each card shows a KP badge "+<n> KP" and n === 10 (FIELD_DISPATCH_KP)
 *  AC6  — Each card shows a human-readable date derived from publishedDate
 *  AC7  — When there are NO prior-day answered dispatches, the control is entirely absent
 *  AC8  — Expand, navigate to /lab and back into Field Dispatch — same cards/answers reappear (DB, not client state)
 *  AC9  — GET /api/field-dispatch: every history item has non-empty response, numeric kpAwarded, ISO publishedDate + createdAt
 *  AC10 — GET /api/field-dispatch: at most 30 history items, every publishedDate < today's UTC dispatch date, ordered most-recent-first
 *
 * Seeding reality (per the plan's own tester note, plan-F7.md line 57):
 * "past dispatches" are prior-day FieldDispatchResponse rows for this user +
 * lab type. The plan does not sanction fabricating one via direct-Prisma
 * writes for this feature (unlike some other specs in this suite that do use
 * that escape hatch when no API exists to create the needed shape) — it
 * directs the tester to read `history` from the real GET payload first and
 * gate the display-oriented criteria with `test.skip` when it's empty, so the
 * suite stays green on a fresh DB while still fully asserting the archive
 * when data exists (e.g. from earlier E2E sessions that answered past-day
 * dispatches, or from real daily play). AC7 is the complementary case (control
 * absent when history IS empty) and is therefore skipped when history is
 * NON-empty — the two skip conditions are opposites so at most one of
 * {AC1-6+8, AC7} exercises a real assertion for a given run, and both report
 * loudly why they were skipped when they are. AC9/AC10 are pure API-contract
 * checks and hold unconditionally regardless of history length (including 0).
 *
 * No Anthropic call: GET reuses today's already-generated dispatch content
 * (or lazily generates it once — a cheap, cached-per-lab-type read, not a
 * per-test LLM call). No POST is issued anywhere in this spec, so nothing here
 * can accidentally create a fresh answered-today row — today's row is
 * excluded from `history` by design regardless.
 */

const BASE_URL = `http://localhost:${process.env.E2E_PORT ?? 3000}`
const FIELD_DISPATCH_KP = 10

interface HistoryItem {
  id: string
  body: string
  reflectionQuestion: string
  response: string
  kpAwarded: number
  publishedDate: string
  createdAt: string
}

interface DispatchPayload {
  available: boolean
  content?: { id: string; body: string; reflectionQuestion: string }
  responded?: boolean
  response?: string | null
  kpReward?: number
  streak?: number
  history?: HistoryItem[]
}

/** Discovered once in beforeAll: the leader's real `history` array, read via the live API. */
let history: HistoryItem[] = []

/** Fetch GET /api/field-dispatch as the leader via a request context (no browser needed). */
async function fetchDispatch(): Promise<DispatchPayload> {
  const ctx = await playwrightRequest.newContext({ baseURL: BASE_URL, storageState: STORAGE.leader })
  try {
    const res = await ctx.get('/api/field-dispatch')
    if (!res.ok()) {
      throw new Error(`GET /api/field-dispatch failed: ${res.status()} ${await res.text()}`)
    }
    return (await res.json()) as DispatchPayload
  } finally {
    await ctx.dispose()
  }
}

/**
 * Click a building-sprite button by its aria-label using JavaScript's
 * element.click() — bypasses the isometric z-index overlap that prevents
 * Playwright's coordinate-based pointer events from reaching the correct
 * button (same workaround as F2.spec.ts / F3.spec.ts / F6-log-links.spec.ts).
 */
async function clickBuilding(page: Page, ariaLabel: string) {
  await page.evaluate((label) => {
    const btn = document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
    if (!btn) throw new Error(`Building button not found: ${label}`)
    btn.click()
  }, ariaLabel)
}

/** Open the Operations Hub feature panel from /lab and switch to the Field Dispatch tab. */
async function openFieldDispatch(page: Page) {
  await page.goto('/lab')
  await page.getByRole('button', { name: 'Open Operations Hub' }).waitFor({ state: 'attached' })
  await clickBuilding(page, 'Open Operations Hub')
  await expect(page.getByRole('dialog', { name: 'Operations Hub' })).toBeVisible({ timeout: 5000 })
  // Field Dispatch is the default tab, but click it explicitly for robustness
  // (matches the plan's own helper spec, plan-F7.md line 49-54).
  await page.getByRole('button', { name: /Field Dispatch/i }).click()
}

/** The "Past Dispatches (N)" toggle control. */
function pastDispatchesToggle(page: Page) {
  return page.getByRole('button', { name: /Past Dispatches/i })
}

test.describe('F7 — Field Dispatch history/archive', () => {
  // Serial: AC8 depends on AC4's expand-state; all read the same discovered
  // `history` snapshot from beforeAll rather than racing separate fetches.
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async () => {
    const payload = await fetchDispatch()
    history = payload.history ?? []
    // eslint-disable-next-line no-console
    console.log(
      `F7 beforeAll: discovered ${history.length} prior-day FieldDispatchResponse row(s) for the E2E leader ` +
        `(available=${payload.available}). Display-oriented ACs (1-6, 8) ${
          history.length === 0 ? 'will be SKIPPED (no seeded history)' : 'will run for real'
        }; AC7 (absent-control case) ${
          history.length > 0 ? 'will be SKIPPED (history is non-empty)' : 'will run for real'
        }; AC9/AC10 always run.`,
    )
  })

  // ── AC1 ───────────────────────────────────────────────────────────────────────
  test('AC1: "Past Dispatches" control is visible whenever ≥1 prior-day answered dispatch exists', async ({
    page,
  }) => {
    test.skip(history.length === 0, 'no prior-day dispatches seeded for the E2E leader — see beforeAll log')

    await openFieldDispatch(page)
    await expect(pastDispatchesToggle(page)).toBeVisible()
  })

  // ── AC2 ───────────────────────────────────────────────────────────────────────
  test('AC2: the count in parens equals the number of past-dispatch cards rendered when expanded', async ({
    page,
  }) => {
    test.skip(history.length === 0, 'no prior-day dispatches seeded for the E2E leader — see beforeAll log')

    await openFieldDispatch(page)
    const toggle = pastDispatchesToggle(page)
    await expect(toggle).toHaveText(new RegExp(`Past Dispatches \\(${history.length}\\)`))

    await toggle.click()
    // Each card is the flex-column div directly containing a KP badge sibling
    // of the dispatch date — the same stable container class rendered by
    // FieldDispatchTab.tsx's `history.map(...)` (`border border-white/10
    // bg-white/[0.02] p-4 space-y-3`), scoped to cards that actually contain a
    // KP badge so we count exactly the expanded history cards, not any other
    // element sharing that utility-class combination on the page.
    const cards = page.locator('div.border.border-white\\/10.bg-white\\/\\[0\\.02\\]').filter({
      has: page.getByText(/^\+\d+ KP$/),
    })
    await expect(cards).toHaveCount(history.length)
  })

  // ── AC3 ───────────────────────────────────────────────────────────────────────
  test('AC3: the section is collapsed on load — no past-dispatch answer text visible before clicking', async ({
    page,
  }) => {
    test.skip(history.length === 0, 'no prior-day dispatches seeded for the E2E leader — see beforeAll log')

    await openFieldDispatch(page)
    await expect(pastDispatchesToggle(page)).toBeVisible()

    // The saved answer of the most recent past dispatch must not be visible
    // pre-expand (collapsed by default — `historyOpen` starts `false`).
    const firstAnswer = history[0].response
    await expect(page.getByText(firstAnswer, { exact: true })).not.toBeVisible()
    // "Your Answer" label (only rendered per-card inside the expanded list) is
    // also absent — a second, independent signal the section body isn't mounted.
    await expect(page.getByText('Your Answer')).not.toBeVisible()
  })

  // ── AC4 ───────────────────────────────────────────────────────────────────────
  test('AC4: clicking the control expands the section and reveals prompt + reflection + saved answer per card', async ({
    page,
  }) => {
    test.skip(history.length === 0, 'no prior-day dispatches seeded for the E2E leader — see beforeAll log')

    await openFieldDispatch(page)
    await pastDispatchesToggle(page).click()

    // Check every seeded history item's body/reflection/answer is present
    // somewhere in the now-expanded section (bounded to a small N via
    // HISTORY_LIMIT=30, so a full per-item loop stays fast).
    for (const item of history) {
      await expect(page.getByText(item.body, { exact: true })).toBeVisible()
      await expect(page.getByText(item.reflectionQuestion, { exact: true })).toBeVisible()
      await expect(page.getByText(item.response, { exact: true })).toBeVisible()
    }
    // The "Your Answer" label appears at least once (one per card).
    await expect(page.getByText('Your Answer').first()).toBeVisible()
  })

  // ── AC5 ───────────────────────────────────────────────────────────────────────
  test('AC5: each expanded card shows a KP badge "+<n> KP" and n === 10 (FIELD_DISPATCH_KP)', async ({
    page,
  }) => {
    test.skip(history.length === 0, 'no prior-day dispatches seeded for the E2E leader — see beforeAll log')

    await openFieldDispatch(page)
    await pastDispatchesToggle(page).click()

    const badges = page.getByText(/^\+\d+ KP$/)
    await expect(badges).toHaveCount(history.length)

    const texts = await badges.allTextContents()
    expect(texts.length).toBe(history.length)
    for (const text of texts) {
      const match = text.match(/^\+(\d+) KP$/)
      expect(match).not.toBeNull()
      expect(Number(match![1])).toBe(FIELD_DISPATCH_KP)
    }
    // Cross-check against the actual persisted kpAwarded on every item too —
    // the badge isn't just coincidentally 10, it reflects the real column.
    for (const item of history) {
      expect(item.kpAwarded).toBe(FIELD_DISPATCH_KP)
    }
  })

  // ── AC6 ───────────────────────────────────────────────────────────────────────
  test('AC6: each expanded card shows a human-readable date derived from publishedDate', async ({ page }) => {
    test.skip(history.length === 0, 'no prior-day dispatches seeded for the E2E leader — see beforeAll log')

    await openFieldDispatch(page)
    await pastDispatchesToggle(page).click()

    for (const item of history) {
      const expectedLabel = new Date(item.publishedDate).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      })
      await expect(page.getByText(expectedLabel, { exact: true }).first()).toBeVisible()
    }
  })

  // ── AC7 ───────────────────────────────────────────────────────────────────────
  test('AC7: when there are no prior-day answered dispatches, the control is entirely absent', async ({
    page,
  }) => {
    test.skip(
      history.length > 0,
      `E2E leader already has ${history.length} prior-day dispatch(es) — the empty-state cannot be observed ` +
        'without deleting real history data, which this spec will not do; the plan does not sanction fabricating ' +
        'a zero-history state either. Complementary to AC1-6/8.',
    )

    await openFieldDispatch(page)
    // The Field Dispatch primary card (today's prompt) must still have loaded
    // (guards against a false-pass from the tab still showing its loading
    // spinner, where the toggle would also be legitimately absent).
    await expect(page.getByText('Today’s Field Dispatch')).toBeVisible()
    await expect(pastDispatchesToggle(page)).toHaveCount(0)
  })

  // ── AC8 ───────────────────────────────────────────────────────────────────────
  test('AC8: after expanding, navigating to /lab and back shows the same cards/answers again (DB-backed)', async ({
    page,
  }) => {
    test.skip(history.length === 0, 'no prior-day dispatches seeded for the E2E leader — see beforeAll log')

    await openFieldDispatch(page)
    await pastDispatchesToggle(page).click()
    await expect(page.getByText(history[0].response, { exact: true })).toBeVisible()

    // Navigate away (closes the overlay panel entirely) and back through the
    // full open flow — not page.reload(), since the feature lives inside a
    // dynamically-mounted overlay, matching the F6-log-links.spec.ts convention.
    await page.goto('/lab')
    await openFieldDispatch(page)

    // Re-collapsed by default again (fresh mount) — expand and confirm the
    // exact same cards/answers reappear, proving the data is DB-persisted,
    // not client-only state that happened to survive the first render.
    const toggle = pastDispatchesToggle(page)
    await expect(toggle).toHaveText(new RegExp(`Past Dispatches \\(${history.length}\\)`))
    await toggle.click()
    for (const item of history) {
      await expect(page.getByText(item.response, { exact: true })).toBeVisible()
    }
  })

  // ── AC9 ───────────────────────────────────────────────────────────────────────
  test('AC9: GET /api/field-dispatch history items each have non-empty response, numeric kpAwarded, ISO publishedDate + createdAt', async ({
    page,
  }) => {
    // Navigate first for Clerk JWT freshness before any page.request call.
    await page.goto('/lab')
    const res = await page.request.get('/api/field-dispatch')
    expect(res.status()).toBe(200)
    const payload = (await res.json()) as DispatchPayload
    const items = payload.history ?? []

    for (const item of items) {
      expect(typeof item.response).toBe('string')
      expect(item.response.length).toBeGreaterThan(0)

      expect(typeof item.kpAwarded).toBe('number')
      expect(Number.isFinite(item.kpAwarded)).toBe(true)

      expect(typeof item.publishedDate).toBe('string')
      expect(new Date(item.publishedDate).toISOString()).toBe(item.publishedDate)

      expect(typeof item.createdAt).toBe('string')
      expect(new Date(item.createdAt).toISOString()).toBe(item.createdAt)
    }

    // This AC holds unconditionally — assert it ran against a real array
    // (possibly empty), not that it silently no-op'd on `undefined`.
    expect(Array.isArray(payload.history)).toBe(true)
  })

  // ── AC10 ──────────────────────────────────────────────────────────────────────
  test('AC10: at most 30 history items, every publishedDate < today, ordered most-recent-first', async ({
    page,
  }) => {
    await page.goto('/lab')
    const res = await page.request.get('/api/field-dispatch')
    expect(res.status()).toBe(200)
    const payload = (await res.json()) as DispatchPayload
    const items = payload.history ?? []

    expect(items.length).toBeLessThanOrEqual(30)

    const todayUtcMidnight = new Date(
      Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()),
    ).getTime()

    for (const item of items) {
      expect(new Date(item.publishedDate).getTime()).toBeLessThan(todayUtcMidnight)
    }

    // Most-recent-first: each publishedDate is >= the next one.
    for (let i = 0; i + 1 < items.length; i++) {
      const current = new Date(items[i].publishedDate).getTime()
      const next = new Date(items[i + 1].publishedDate).getTime()
      expect(current).toBeGreaterThanOrEqual(next)
    }
  })
})
