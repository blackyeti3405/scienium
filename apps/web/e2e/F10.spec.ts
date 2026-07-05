import { test, expect, request as playwrightRequest } from '@playwright/test'

/**
 * F10 — "Momentum" weekly recap card on the lab.
 * One test per acceptance criterion (11 criteria total, from
 * .claude/pipeline/plan-F10.md). Runs as the default `chromium` project
 * (authenticated lab leader / devuser1) — momentum is team-scoped and the
 * card is student-facing only (no teacher/role variant to cover).
 *
 * Criterion → test mapping:
 *  AC1  — Fresh-ISO-week load of /lab shows a card headed "THIS WEEK"/"LAST 7 DAYS"
 *         inside the lab viewport (team has activity)
 *  AC2  — Card shows a "KP EARNED" row with a non-negative numeric value
 *  AC3  — Card shows "SOURCES", "LOGS", "EXPERIMENTS", "DATA POINTS" rows, each numeric
 *  AC4  — "NEXT FAIR" row present with a day count + fair name iff daysToNextFair != null
 *  AC5  — Card never overlaps the plot / SHOP / ARRANGE / LOG FAB / FEEDBACK FAB —
 *         all four remain visible and clickable while the card is shown
 *  AC6  — Clicking the card's ✕ (data-testid="momentum-card-dismiss") removes it
 *  AC7  — After dismiss + reload (same ISO week, same context), the card stays gone
 *  AC8  — GET /api/team/momentum (signed in) → 200, full shape, windowDays: 7
 *  AC9  — GET /api/team/momentum (signed out) → 401, no team stats
 *  AC10 — Card renders with font-pixel + dark/gold lab chrome (StatusStrip/
 *         FeedbackPanel palette), not browser-default text
 *  AC11 — No Anthropic/LLM call as part of rendering the card — SKIPPED: the
 *         momentum route's server-side LLM-freedom is a static/code property
 *         (Anthropic calls, when they occur elsewhere in the app, are made
 *         server-to-server from Next.js API routes and are never visible on
 *         the browser's network tab regardless of outcome), so it cannot be
 *         proven or disproven by driving a browser session — same precedent
 *         as papers-tab.spec.ts's AC10.
 *
 * ── localStorage control (load-bearing for AC1/AC6/AC7) ─────────────────────
 * The card self-fetches on mount; dismissal is remembered in
 * `localStorage['scienium.momentum.dismissed']`, keyed to the current ISO
 * week (per plan-F10.md). Every test that needs the card to be ABLE to show
 * clears that key first (via a real navigation to establish the origin, then
 * `page.evaluate` + reload) rather than guessing whether a previous run left
 * it dismissed. AC7 deliberately does NOT clear the key mid-test — the persisted
 * dismissal across a same-context reload IS the behavior under test. A final
 * cleanup removes the key again so later runs/specs start from a clean slate.
 */

const BASE_URL = `http://localhost:${process.env.E2E_PORT ?? 3000}`
const DISMISS_KEY = 'scienium.momentum.dismissed'

interface MomentumResponse {
  windowDays: number
  kpEarned: number
  sourcesReviewed: number
  logsWritten: number
  experimentsAdded: number
  pointsAdded: number
  daysToNextFair: number | null
  nextFairName: string | null
}

/** Clear the dismiss key for the current origin, then reload so /lab re-mounts fresh. */
async function clearDismissAndReload(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/lab')
  await page.evaluate((key) => window.localStorage.removeItem(key), DISMISS_KEY)
  await page.reload()
}

/** The card locator — presence/visibility is the primary observable per changes-F10.md. */
function momentumCard(page: import('@playwright/test').Page) {
  return page.locator('[data-testid="momentum-card"]')
}

/**
 * Each stat row renders its label and value as two separate lines in
 * `innerText` (a flex row of label-span/value-span, not inline prose), so a
 * row's numeric value is the line immediately AFTER the line that IS the
 * label (exact match, not substring — "SOURCES" must not match inside some
 * other line). Returns the raw next-line text so callers can format-check it
 * themselves (plain digits, or "0d"/"today"/"tomorrow · Name" for NEXT FAIR).
 */
function valueAfterLabel(cardText: string, label: string): string | null {
  const lines = cardText.split('\n')
  const idx = lines.findIndex((l) => l.trim() === label)
  if (idx === -1 || idx + 1 >= lines.length) return null
  return lines[idx + 1].trim()
}

test.describe('F10 — Momentum weekly recap card', () => {
  // Serial: several tests share the same localStorage dismiss key on the same
  // team/context; running them out of order or concurrently would let one
  // test's dismiss action bleed into another's "card should be visible" assertion.
  test.describe.configure({ mode: 'serial' })

  test.afterAll(async ({ browser }) => {
    // Best-effort: leave the dismiss key cleared so a later run/spec always
    // starts from "card eligible to show" rather than inheriting this run's
    // dismissal state. Non-fatal — every AC1-dependent test above already
    // clears the key itself before asserting, so this is convenience only.
    const context = await browser.newContext({ baseURL: BASE_URL })
    try {
      const page = await context.newPage()
      await page.goto('/lab')
      await page.evaluate((key) => window.localStorage.removeItem(key), DISMISS_KEY)
    } catch {
      // Non-fatal cleanup — a leftover key only affects a future run's AC1
      // convenience, not correctness.
    } finally {
      await context.close()
    }
  })

  // ── AC1 ──────────────────────────────────────────────────────────────────────
  test('AC1: fresh-week load of /lab shows a "THIS WEEK" / "LAST 7 DAYS" recap card', async ({ page }) => {
    await clearDismissAndReload(page)

    const card = momentumCard(page)
    await expect(card).toBeVisible({ timeout: 10_000 })
    await expect(card).toContainText(/THIS WEEK|LAST 7 DAYS/)

    // Anchored inside the lab viewport per the plan's placement decision.
    const viewport = page.locator('.lab-scene__viewport')
    await expect(viewport).toBeVisible()
    const cardBox = await card.boundingBox()
    const viewportBox = await viewport.boundingBox()
    expect(cardBox).not.toBeNull()
    expect(viewportBox).not.toBeNull()
    // The card's top-left corner falls within the viewport's bounds.
    expect(cardBox!.x).toBeGreaterThanOrEqual(viewportBox!.x - 1)
    expect(cardBox!.y).toBeGreaterThanOrEqual(viewportBox!.y - 1)
  })

  // ── AC2 ──────────────────────────────────────────────────────────────────────
  test('AC2: card shows a "KP EARNED" row with a non-negative numeric value', async ({ page }) => {
    await clearDismissAndReload(page)
    const card = momentumCard(page)
    await expect(card).toBeVisible({ timeout: 10_000 })

    await expect(card).toContainText('KP EARNED')
    const text = await card.innerText()
    const value = valueAfterLabel(text, 'KP EARNED')
    expect(value, `expected a value line right after "KP EARNED", got card text: ${JSON.stringify(text)}`).not.toBeNull()
    // toLocaleString() may add thousands separators (e.g. "1,234") — strip
    // non-digits before parsing, but require at least one digit present.
    const digits = value!.replace(/[^0-9]/g, '')
    expect(digits.length, `expected a numeric "KP EARNED" value, got "${value}"`).toBeGreaterThan(0)
    expect(Number(digits)).toBeGreaterThanOrEqual(0)
  })

  // ── AC3 ──────────────────────────────────────────────────────────────────────
  test('AC3: card shows SOURCES, LOGS, EXPERIMENTS, DATA POINTS rows, each numeric', async ({ page }) => {
    await clearDismissAndReload(page)
    const card = momentumCard(page)
    await expect(card).toBeVisible({ timeout: 10_000 })

    const text = await card.innerText()
    for (const label of ['SOURCES', 'LOGS', 'EXPERIMENTS', 'DATA POINTS']) {
      await expect(card).toContainText(label)
      const value = valueAfterLabel(text, label)
      expect(value, `expected a value line right after "${label}", got card text: ${JSON.stringify(text)}`).not.toBeNull()
      const digits = value!.replace(/[^0-9]/g, '')
      expect(digits.length, `expected a numeric value for "${label}", got "${value}"`).toBeGreaterThan(0)
      expect(Number(digits)).toBeGreaterThanOrEqual(0)
    }
  })

  // ── AC4 ──────────────────────────────────────────────────────────────────────
  test('AC4: "NEXT FAIR" row is present with day count + name iff daysToNextFair is not null', async ({
    page,
  }) => {
    // Read the live truth straight from the page's own authenticated fetch (team-
    // scoped, same session) so the branch taken matches this team's real data.
    await clearDismissAndReload(page)
    const card = momentumCard(page)
    await expect(card).toBeVisible({ timeout: 10_000 })

    const momentum = (await page.evaluate(async () => {
      const res = await fetch('/api/team/momentum')
      return res.json()
    })) as MomentumResponse

    if (momentum.daysToNextFair == null) {
      await expect(card).not.toContainText('NEXT FAIR')
    } else {
      await expect(card).toContainText('NEXT FAIR')
      const text = await card.innerText()
      const value = valueAfterLabel(text, 'NEXT FAIR')
      expect(value, `expected a value line right after "NEXT FAIR", got card text: ${JSON.stringify(text)}`).not.toBeNull()
      // Day count present as a number, or the today/tomorrow phrasing, per the plan.
      expect(/[0-9]/.test(value!) || /today|tomorrow/i.test(value!)).toBe(true)
      // ...and the fair's name is present when the API returned one.
      if (momentum.nextFairName) {
        expect(value).toContain(momentum.nextFairName)
      }
    }
  })

  // ── AC5 ──────────────────────────────────────────────────────────────────────
  test('AC5: card never overlaps the plot / SHOP / ARRANGE / LOG FAB / FEEDBACK FAB, all stay clickable', async ({
    page,
  }) => {
    await clearDismissAndReload(page)
    const card = momentumCard(page)
    await expect(card).toBeVisible({ timeout: 10_000 })
    const cardBox = (await card.boundingBox())!
    expect(cardBox).not.toBeNull()

    const shop = page.getByRole('button', { name: 'Open buildings shop' })
    const arrange = page.getByRole('button', { name: 'Arrange buildings' })
    const feedbackFab = page.getByRole('button', { name: 'Open teacher feedback' })
    const logFab = page.locator('.activity-fab')

    for (const locator of [shop, arrange, feedbackFab, logFab]) {
      await expect(locator).toBeVisible()
      await expect(locator).toBeEnabled()
      const box = (await locator.boundingBox())!
      expect(box, 'expected a bounding box for the control').not.toBeNull()
      const overlaps =
        cardBox.x < box.x + box.width &&
        cardBox.x + cardBox.width > box.x &&
        cardBox.y < box.y + box.height &&
        cardBox.y + cardBox.height > box.y
      expect(overlaps, `momentum card overlaps a control at (${box.x}, ${box.y})`).toBe(false)
    }

    // The central plot area remains visible (not covered) alongside the card.
    const viewport = page.locator('.lab-scene__viewport')
    await expect(viewport).toBeVisible()
  })

  // ── AC6 ──────────────────────────────────────────────────────────────────────
  test('AC6: clicking the ✕ dismiss button removes the recap card', async ({ page }) => {
    await clearDismissAndReload(page)
    const card = momentumCard(page)
    await expect(card).toBeVisible({ timeout: 10_000 })

    const dismissBtn = page.locator('[data-testid="momentum-card-dismiss"]')
    await expect(dismissBtn).toBeVisible()
    await expect(dismissBtn).toHaveAttribute('aria-label', 'Dismiss')

    await dismissBtn.click()
    await expect(card).toBeHidden()
  })

  // ── AC7 ──────────────────────────────────────────────────────────────────────
  test('AC7: after dismissing and reloading /lab (same week), the card does not reappear', async ({ page }) => {
    // Start from a clean, guaranteed-visible state, then dismiss ourselves so
    // this test owns the full dismiss → reload → still-gone chain end-to-end
    // (it does not rely on AC6's click having happened first in a shared page).
    await clearDismissAndReload(page)
    const card = momentumCard(page)
    await expect(card).toBeVisible({ timeout: 10_000 })

    await page.locator('[data-testid="momentum-card-dismiss"]').click()
    await expect(card).toBeHidden()

    // Same context/origin — localStorage persists across this reload.
    await page.reload()
    await expect(card).toBeHidden({ timeout: 10_000 })
    // Give any self-fetch a moment to resolve and confirm it still renders nothing.
    await page.waitForLoadState('networkidle')
    await expect(card).toHaveCount(0)

    // Clean up so this test's dismissal doesn't leak into a later test/run.
    await page.evaluate((key) => window.localStorage.removeItem(key), DISMISS_KEY)
  })

  // ── AC8 ──────────────────────────────────────────────────────────────────────
  test('AC8: GET /api/team/momentum (signed in) returns 200 with the full shape, windowDays 7', async ({
    page,
  }) => {
    await page.goto('/lab')
    const momentum = (await page.evaluate(async () => {
      const res = await fetch('/api/team/momentum')
      return { status: res.status, body: await res.json() }
    })) as { status: number; body: MomentumResponse }

    expect(momentum.status).toBe(200)
    const body = momentum.body
    expect(body.windowDays).toBe(7)
    for (const key of ['kpEarned', 'sourcesReviewed', 'logsWritten', 'experimentsAdded', 'pointsAdded'] as const) {
      expect(typeof body[key], `expected "${key}" to be a number, got ${typeof body[key]}`).toBe('number')
      expect(body[key]).toBeGreaterThanOrEqual(0)
    }
    expect(body.daysToNextFair === null || typeof body.daysToNextFair === 'number').toBe(true)
    expect(body.nextFairName === null || typeof body.nextFairName === 'string').toBe(true)

    // Re-fetch gives the same shape (numbers may legitimately tick up between
    // calls under live team activity — shape/type consistency is what's asserted,
    // not identical values).
    const second = (await page.evaluate(async () => {
      const res = await fetch('/api/team/momentum')
      return { status: res.status, body: await res.json() }
    })) as { status: number; body: MomentumResponse }
    expect(second.status).toBe(200)
    expect(Object.keys(second.body).sort()).toEqual(Object.keys(body).sort())
    for (const key of ['kpEarned', 'sourcesReviewed', 'logsWritten', 'experimentsAdded', 'pointsAdded'] as const) {
      expect(typeof second.body[key]).toBe('number')
      expect(second.body[key]).toBeGreaterThanOrEqual(0)
    }
  })

  // ── AC9 ──────────────────────────────────────────────────────────────────────
  test('AC9: GET /api/team/momentum (signed out) is blocked pre-route (307 sign-in redirect) or 401, never team stats', async () => {
    const anonCtx = await playwrightRequest.newContext({ baseURL: BASE_URL })
    try {
      // Do not follow redirects — the real contract here is `clerkMiddleware`
      // redirecting ALL non-public routes (including /api/team/*) to sign-in
      // BEFORE the route's own `requireTeamContext` 401 ever runs (that 401 is
      // defense-in-depth behind the middleware, not the first line of defense).
      // Tolerate 401 too, in case the middleware later changes to JSON-first
      // for API routes.
      const res = await anonCtx.get('/api/team/momentum', { maxRedirects: 0 })
      expect([307, 401]).toContain(res.status())

      if (res.status() === 307) {
        expect(res.headers()['location']).toContain('/sign-in')
      }

      // The actual leak check, regardless of which status came back: no
      // team-stat fields anywhere in the response body.
      const text = await res.text()
      for (const key of ['kpEarned', 'sourcesReviewed', 'logsWritten', 'experimentsAdded', 'pointsAdded']) {
        expect(text).not.toContain(key)
      }
    } finally {
      await anonCtx.dispose()
    }
  })

  // ── AC10 ─────────────────────────────────────────────────────────────────────
  test('AC10: card renders with font-pixel + dark/gold lab chrome, not plain browser text', async ({ page }) => {
    await clearDismissAndReload(page)
    const card = momentumCard(page)
    await expect(card).toBeVisible({ timeout: 10_000 })

    // The card (or a descendant carrying the header/labels) uses the pixel font
    // family, matching StatusStrip/FeedbackPanel chrome, not a default sans font.
    const pixelEl = card.locator('.font-pixel').first()
    await expect(pixelEl).toBeVisible()
    const fontFamily = await pixelEl.evaluate((el) => getComputedStyle(el).fontFamily)
    expect(fontFamily.toLowerCase()).not.toMatch(/^(-apple-system|arial|helvetica|times)/)

    // Dark panel background (matches FeedbackPanel's bg-[#0d1b2e] / border palette).
    const bg = await card.evaluate((el) => getComputedStyle(el).backgroundColor)
    // rgb(13, 27, 46) == #0d1b2e — assert the dark navy panel, not a plain white/transparent card.
    expect(bg).not.toBe('rgba(0, 0, 0, 0)')
    expect(bg).not.toBe('rgb(255, 255, 255)')

    // Gold accent (#F5C518 == rgb(245, 197, 24)) present somewhere in the card
    // (e.g. the title or KP figure), per the plan's palette spec.
    const goldPresent = await card.evaluate((el) => {
      const GOLD = 'rgb(245, 197, 24)'
      const walk = (node: Element): boolean => {
        if (getComputedStyle(node).color === GOLD) return true
        for (const child of Array.from(node.children)) {
          if (walk(child)) return true
        }
        return false
      }
      return walk(el)
    })
    expect(goldPresent, 'expected the gold accent color (#F5C518) somewhere in the card').toBe(true)
  })
})
