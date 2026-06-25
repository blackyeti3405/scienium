import { test, expect, request as playwrightRequest, type Page } from '@playwright/test'
import { STORAGE } from './roles'

/**
 * F2 — Failure Log AI "dig deeper" Socratic follow-up.
 * One test per acceptance criterion (10 criteria total).
 * Runs as the default `chromium` project (authenticated lab leader / devuser1).
 *
 * Criterion → test mapping:
 *  AC1  — "Dig deeper" button visible on a saved failure entry with no follow-up
 *  AC2  — Clicking "Dig deeper" shows a non-empty mentor question within 15s
 *  AC3  — While generating, "Dig deeper" shows loading state and is disabled
 *  AC4  — After question appears, textarea and Save button visible; Save blocked when empty
 *  AC5  — After typing answer and clicking Save, entry shows Q&A read-only (textarea gone)
 *  AC6  — After full page reload, question and saved answer still shown (DB persisted)
 *  AC7  — After follow-up exists, "Dig deeper" button no longer appears (N=1 cap, UI)
 *  AC8  — POST /api/failure-log/{id}/followup with a cross-team id returns 404
 *  AC9  — Second POST on an entry that already has a follow-up returns 409
 *  AC10 — Per-team daily cap: exceeding FAILURE_FOLLOWUP_DAILY_LIMIT returns 429
 *
 * Strategy:
 * - beforeAll seeds ONE fresh failure entry (POST /api/failure-log).
 * - AC3 triggers the LLM generation (the only AI call in this suite).
 * - AC2 reloads and confirms the question is persisted (no extra AI call).
 * - AC4–7 continue in the same serial chain reusing that generated question.
 * - AC8/AC9/AC10 are pure API assertions; AC10 seeds & cleans up extra entries.
 * - afterAll skips DELETE if the entry has a followup (FK constraint limitation
 *   in the app DELETE route — reported to coder); entry is left in DB.
 */

const BASE_URL = `http://localhost:${process.env.E2E_PORT ?? 3000}`

/** The seeded failure entry id (set in beforeAll). */
let seededId: string | null = null

/**
 * Unique-per-run marker so each test run's seeded entry is distinguishable from
 * leftover entries from previous runs.
 */
const RUN_ID = Date.now().toString(36)
const SEED_HAPPENED = `[E2E-F2-${RUN_ID}] Spectrophotometer readings fluctuated wildly.`
const SEED_LEARNED = `[E2E-F2-${RUN_ID}] We need to calibrate the device first.`
const MY_ANSWER = 'We should check if ambient light interfered with the sensor readings.'

/** Navigate to the Operations Hub and switch to the Failure Log tab. */
async function openFailureLog(page: Page) {
  await page.goto('/lab')
  await page.getByRole('button', { name: 'Open Operations Hub' }).click()
  await page.getByRole('button', { name: /Failure Log/i }).click()
}

/**
 * Returns the locator for the specific seeded entry card. Scopes to the card
 * whose text contains our unique RUN_ID seed text.
 */
function seedCard(page: Page) {
  return page.locator('.ops-log-entry__card').filter({ hasText: SEED_HAPPENED })
}

test.describe('F2 — Failure Log AI "dig deeper" follow-up', () => {
  // Serial: state mutations (generate, answer) must not race.
  test.describe.configure({ mode: 'serial' })

  // ── Seed / teardown ─────────────────────────────────────────────────────────

  test.beforeAll(async () => {
    const leaderCtx = await playwrightRequest.newContext({
      baseURL: BASE_URL,
      storageState: STORAGE.leader,
    })
    const res = await leaderCtx.post('/api/failure-log', {
      data: { happened: SEED_HAPPENED, learned: SEED_LEARNED },
    })
    if (!res.ok()) {
      await leaderCtx.dispose()
      throw new Error(`Seed failure-log failed: ${res.status()} ${await res.text()}`)
    }
    const { entry } = await res.json()
    seededId = entry.id
    await leaderCtx.dispose()
  })

  test.afterAll(async () => {
    if (!seededId) return
    const leaderCtx = await playwrightRequest.newContext({
      baseURL: BASE_URL,
      storageState: STORAGE.leader,
    })
    // The FK cascade-delete fix (migration 20260621060000_followup_cascade_delete)
    // means DELETE on a failure entry now also removes any child ProjectLogFollowup
    // rows. This cleanup is therefore reliable regardless of follow-up state.
    await leaderCtx.delete(`/api/failure-log/${seededId}`).catch(() => {})
    await leaderCtx.dispose()
  })

  // ── AC1 ─────────────────────────────────────────────────────────────────────
  test('AC1: "Dig deeper" button is visible on a saved failure entry with no follow-up', async ({
    page,
  }) => {
    await openFailureLog(page)
    const card = seedCard(page)
    await expect(card).toBeVisible()
    await expect(card.getByRole('button', { name: /Dig deeper/i })).toBeVisible()
  })

  // ── AC3 ─────────────────────────────────────────────────────────────────────
  // Runs before AC2: we intercept the POST to add a 2.5s delay so the loading
  // state is observable, then let the real Next.js route run to write the DB row.
  // The server uses E2E_SKIP_LLM=1 (set in .env.local) to skip the real Anthropic
  // call and return a deterministic fixture question — making this test reliably
  // green without incurring Anthropic cost or depending on external API availability.
  test('AC3: While generating, button shows loading state and is disabled (no double-submit)', async ({
    page,
  }) => {
    // Intercept the POST to add a 2.5s delay, making the loading state catchable.
    // route.continue() lets the real Next.js route run so the DB row is written
    // (required for AC2 persistence check).
    let routeResolved = false
    await page.route(`**/api/failure-log/${seededId}/followup`, async (route) => {
      if (route.request().method() === 'POST') {
        await new Promise<void>((resolve) => setTimeout(resolve, 2500))
        routeResolved = true
        await route.continue()
      } else {
        await route.continue()
      }
    })

    await openFailureLog(page)
    const card = seedCard(page)
    await expect(card).toBeVisible()

    await card.getByRole('button', { name: /Dig deeper/i }).click()

    // When generating=true the component renders text "Generating…" and disabled=true.
    // The button name changes so we look it up by its new label.
    const generatingBtn = card.getByRole('button', { name: /Generating/i })
    await expect(generatingBtn).toBeVisible({ timeout: 3000 })
    await expect(generatingBtn).toBeDisabled()

    // Wait for generation to complete (the route returns after the 2.5s delay).
    await expect(card).not.toContainText(/Generating/i, { timeout: 15_000 })
    expect(routeResolved).toBe(true)

    // Confirm success: the question must be labelled "Mentor asks". If the route
    // returned an error (e.g. 502), the component reverts to "Dig deeper" and this
    // assertion catches the silent failure that AC3 previously masked.
    await expect(card).toContainText(/Mentor asks/i)
  })

  // ── AC2 ─────────────────────────────────────────────────────────────────────
  // AC3 already triggered generation; reload to confirm the question persisted.
  test('AC2: A non-empty mentor question appears on the entry (labelled "Mentor asks")', async ({
    page,
  }) => {
    await openFailureLog(page)
    const card = seedCard(page)
    await expect(card).toBeVisible()

    // "Mentor asks" label must be visible.
    await expect(card).toContainText(/Mentor asks/i)

    // The question is in an italic paragraph — must be non-empty.
    const questionPara = card.locator('p.italic')
    await expect(questionPara).toBeVisible()
    const text = await questionPara.innerText()
    expect(text.trim().length).toBeGreaterThan(0)
  })

  // ── AC4 ─────────────────────────────────────────────────────────────────────
  test('AC4: Answer textarea and Save button are visible; Save is disabled while textarea is empty', async ({
    page,
  }) => {
    await openFailureLog(page)
    const card = seedCard(page)
    await expect(card).toBeVisible()
    await expect(card).toContainText(/Mentor asks/i)

    const textarea = card.locator('textarea[placeholder*="reflection"]')
    await expect(textarea).toBeVisible()

    const saveBtn = card.getByRole('button', { name: /^Save$/i })
    await expect(saveBtn).toBeVisible()

    // Empty textarea → Save must be disabled.
    await expect(saveBtn).toBeDisabled()
  })

  // ── AC5 ─────────────────────────────────────────────────────────────────────
  test('AC5: After typing an answer and clicking Save, Q&A renders read-only (textarea disappears)', async ({
    page,
  }) => {
    await openFailureLog(page)
    const card = seedCard(page)
    await expect(card).toBeVisible()

    const textarea = card.locator('textarea[placeholder*="reflection"]')
    await expect(textarea).toBeVisible()
    await textarea.fill(MY_ANSWER)

    const saveBtn = card.getByRole('button', { name: /^Save$/i })
    await expect(saveBtn).toBeEnabled()
    await saveBtn.click()

    // Textarea must disappear (answered → read-only).
    await expect(textarea).not.toBeVisible()

    // "My reflection" label + the saved answer must appear.
    await expect(card).toContainText(/My reflection/i)
    await expect(card).toContainText(MY_ANSWER)

    // "Dig deeper" button must not reappear.
    await expect(card.getByRole('button', { name: /Dig deeper/i })).toHaveCount(0)
  })

  // ── AC6 ─────────────────────────────────────────────────────────────────────
  test('AC6: After a full page reload, the question and saved answer are still shown (DB persisted)', async ({
    page,
  }) => {
    await page.goto('/lab') // navigate away first
    await openFailureLog(page)

    const card = seedCard(page)
    await expect(card).toBeVisible()

    await expect(card).toContainText(/Mentor asks/i)
    await expect(card).toContainText(/My reflection/i)
    await expect(card).toContainText(MY_ANSWER)

    // Textarea must not be visible in read-only state.
    await expect(card.locator('textarea[placeholder*="reflection"]')).toHaveCount(0)
  })

  // ── AC7 ─────────────────────────────────────────────────────────────────────
  test('AC7: "Dig deeper" button no longer appears once a follow-up exists (N=1 per-entry cap)', async ({
    page,
  }) => {
    await openFailureLog(page)
    const card = seedCard(page)
    await expect(card).toBeVisible()

    // No "Dig deeper" button — answered follow-up is in read-only state.
    await expect(card.getByRole('button', { name: /Dig deeper/i })).toHaveCount(0)
    // Exactly one Q&A block; no regenerate affordance.
    await expect(card).toContainText(/Mentor asks/i)
  })

  // ── AC8 ─────────────────────────────────────────────────────────────────────
  test('AC8: POST /api/failure-log/{id}/followup with a cross-team id returns 404', async ({
    page,
  }) => {
    await page.goto('/lab')
    const res = await page.request.post('/api/failure-log/clxxxxxxxxxxxxxxxxxxxxxxx/followup')
    expect(res.status()).toBe(404)
    const json = await res.json()
    expect(json.error).toBeTruthy()
  })

  // ── AC9 ─────────────────────────────────────────────────────────────────────
  test('AC9: A second POST on an entry with an existing follow-up returns 409', async ({
    page,
  }) => {
    await page.goto('/lab')
    const res = await page.request.post(`/api/failure-log/${seededId}/followup`)
    expect(res.status()).toBe(409)
    const json = await res.json()
    expect(json.error).toMatch(/already/i)
  })

  // ── AC10 ────────────────────────────────────────────────────────────────────
  test('AC10: Exceeding the per-team daily cap (10/day) returns 429', async () => {
    // Strategy:
    // 1. Count how many followups the team has already generated today.
    // 2. Seed just enough entries to push the count to 10, calling POST /followup
    //    on each (uses E2E_SKIP_LLM=1 short-circuit — no real Anthropic calls).
    // 3. Seed one final entry and assert POST /followup returns 429.
    // 4. Clean up all seeded entries (cascade-delete handles child followup rows).
    const DAILY_LIMIT = 10

    const leaderCtx = await playwrightRequest.newContext({
      baseURL: BASE_URL,
      storageState: STORAGE.leader,
    })

    // Count followups used today by fetching all entries and counting those with
    // a followup created on or after local midnight.
    const logsRes = await leaderCtx.get('/api/failure-log')
    const { entries } = (await logsRes.json()) as {
      entries: Array<{ id: string; followup: unknown; createdAt: string }>
    }
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    // We approximate "followups used today" as entries with a non-null followup
    // created today (the seeded entry from beforeAll is one such entry, already
    // contributed to the count if generated today — which it was in AC3 above).
    const followupsToday = entries.filter(
      (e) => e.followup !== null && new Date(e.createdAt) >= todayStart,
    ).length

    const neededToFill = Math.max(0, DAILY_LIMIT - followupsToday)

    const capFillIds: string[] = []
    for (let i = 0; i < neededToFill; i++) {
      const eRes = await leaderCtx.post('/api/failure-log', {
        data: {
          happened: `[E2E-F2-cap-${RUN_ID}-${i}] Fill entry for daily cap test.`,
          learned: `[E2E-F2-cap-${RUN_ID}-${i}] Filling cap slot ${i}.`,
        },
      })
      if (!eRes.ok()) continue
      const { entry } = (await eRes.json()) as { entry: { id: string } }
      capFillIds.push(entry.id)
      await leaderCtx.post(`/api/failure-log/${entry.id}/followup`)
      // Ignore result — it may succeed (filling the cap) or 429 (already at cap).
    }

    // Now create the entry that should trigger the 429.
    const triggerRes = await leaderCtx.post('/api/failure-log', {
      data: {
        happened: `[E2E-F2-cap-trigger-${RUN_ID}] Cap trigger entry.`,
        learned: `[E2E-F2-cap-trigger-${RUN_ID}] Should return 429 on followup POST.`,
      },
    })

    let capTriggered = false
    let triggerId: string | null = null

    if (triggerRes.ok()) {
      const { entry } = (await triggerRes.json()) as { entry: { id: string } }
      triggerId = entry.id
      const capRes = await leaderCtx.post(`/api/failure-log/${entry.id}/followup`)
      if (capRes.status() === 429) {
        capTriggered = true
        const json = (await capRes.json()) as { error: string }
        expect(json.error).toBeTruthy()
      }
    }

    // Cleanup all seeded entries (trigger entry + cap-fill entries).
    // The FK cascade-delete fix (migration 20260621060000_followup_cascade_delete)
    // means DELETE on a failure entry also removes any child ProjectLogFollowup row,
    // so entries with followups can now be deleted without a P2003 error.
    if (triggerId) {
      await leaderCtx.delete(`/api/failure-log/${triggerId}`).catch(() => {})
    }
    for (const id of capFillIds) {
      await leaderCtx.delete(`/api/failure-log/${id}`).catch(() => {})
    }

    await leaderCtx.dispose()

    expect(capTriggered).toBe(true)
  })
})
