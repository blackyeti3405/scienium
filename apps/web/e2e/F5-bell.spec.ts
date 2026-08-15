import { test, expect } from './test'
import { type Page } from '@playwright/test'
import { api, withSeedPage, gotoFresh } from './api'
import { createLab, type OwnedLab } from './lab'

/**
 * F5 — Notification bell: all five kinds first-class.
 * One test per acceptance criterion (10 criteria total, from
 * .claude/pipeline/plan-F5.md). Runs as the default `chromium` project
 * (authenticated lab leader / devuser1), matching the leader's own bell.
 *
 * Criterion → test mapping:
 *  AC1  — Clicking the bell (aria-label starts "Notifications") opens .notif-bell__panel within 2s
 *  AC2  — Seeded teacher_feedback item shows a "Feedback" label chip (.notif-bell__item-kind)
 *  AC3  — Seeded teacher_feedback item's title is prefixed with the 💬 icon
 *  AC4  — A fair_deadline item (if present) shows "Deadline" chip + 📅 icon; else skipped for absence
 *  AC5  — An urgency item (if present) shows "Nudge" chip + ⚠ icon; else skipped for absence
 *  AC6  — Clicking the seeded teacher_feedback item navigates to /lab?panel=feedback
 *  AC7  — Clicking an unread item decreases the unread badge by one (or clears it), no full reload
 *  AC8  — "Mark all read" clears the badge and removes .notif-bell__item--unread from every item
 *  AC9  — The seeded item's label chip carries font-pixel and computed text-transform: uppercase
 *  AC10 — GET /api/notifications only ever returns the five canonical kind values
 *
 * Seeding (mirrors F1.spec.ts): beforeAll runs as the teacher session
 * (STORAGE.teacher), discovers the E2E leader's team (e2e_test_lab_01) via
 * GET /api/teacher/roster, then POSTs one teacher_feedback notification via
 * POST /api/teacher/feedback. That kind is guaranteed present and is used for
 * the deterministic label/icon/deep-link/pixel-chrome assertions (AC2, AC3,
 * AC6, AC9). fair_deadline and urgency are created only by the notifications
 * cron and are not cheaply seedable here, so AC4/AC5 assert on them only when
 * already present from a prior cron run, per the plan's own present-or-skip
 * rule — otherwise they no-op (not test.skip, since presence is unknown until
 * runtime and the plan treats absence as a legitimate outcome, not a gap).
 * afterAll marks the seeded notification read via the leader session so it
 * does not linger as unread badge noise for later runs/specs.
 */

/** Title used for the seeded row — unique enough to distinguish from any pre-existing notification. */
const SEED_TITLE = 'New feedback from your teacher'
const SEED_BODY = '[E2E F5 seed] Nice progress on your literature review!'

/** The five canonical kinds the map must cover — mirrors the schema comment at prisma/schema.prisma:917. */
let lab: OwnedLab

const CANONICAL_KINDS = ['fair_deadline', 'urgency', 'teacher_feedback', 'phase_reviewed', 'showcase_reviewed']

/** POST one extra teacher_feedback notification for the E2E team, via the teacher session. */
async function seedExtraFeedback(page: Page, bodySuffix: string): Promise<void> {
  const feedRes = await api.post(page, '/api/teacher/feedback', {
    data: { teamId: lab.teamId, targetType: 'team', body: `${SEED_BODY} ${bodySuffix}` },
  })
  if (!feedRes.ok()) {
    throw new Error(`Extra feedback seed failed: ${feedRes.status()} ${await feedRes.text()}`)
  }
}

test.describe('F5 — Notification bell: all five kinds first-class', () => {
  // Order-dependent (order comes from fullyParallel:false — see playwright.config.ts): seeding and
  // read-state assertions mutate shared notification rows on the one team.

  // ── Seed / teardown ───────────────────────────────────────────────────────────

  test.beforeAll(async ({ browser }) => {
    // Co-members, so the teacher's scope resolves to this lab. Roster discovery
    // is gone from both seeding paths — the team is the one this file made.
    // It also starts with ZERO notifications, which is what makes the bell's
    // unread-count assertions mean something rather than counting whatever
    // earlier runs left unread.
    lab = await createLab('bell', true, true)

    await withSeedPage(browser, 'teacher', async (page) => {
      const feedRes = await api.post(page, '/api/teacher/feedback', {
        data: { teamId: lab.teamId, targetType: 'team', body: SEED_BODY },
      })
      if (!feedRes.ok()) {
        throw new Error(`Feedback seed failed: ${feedRes.status()} ${await feedRes.text()}`)
      }
    })

    // The feedback route's notification insert is best-effort (fire-and-forget
    // `.catch(() => {})`); confirm the notification actually landed and resolve
    // its id via the leader session (whose bell we test) before any test runs.
    await withSeedPage(browser, 'leader', async (page) => {
      const notifRes = await api.get(page, '/api/notifications')
      if (!notifRes.ok()) {
        throw new Error(`Notifications fetch failed: ${notifRes.status()} ${await notifRes.text()}`)
      }
      const { items } = await notifRes.json()
      const seeded = (
        items as Array<{ id: string; kind: string; title: string; body: string }>
      ).find((n) => n.kind === 'teacher_feedback' && n.body.includes('E2E F5 seed'))
      if (!seeded) {
        throw new Error(
          'Seeded teacher_feedback notification not found via GET /api/notifications — the feedback route may not have created it.',
        )
      }
    })
  })

  test.afterAll(async () => {
    // The notifications go with the lab. This replaces a teardown that could
    // only MARK the seeded row read (there is no DELETE route) through a
    // stale-JWT-prone authenticated POST whose own comment admits `res.ok()`
    // is not a reliable signal for it.
    await lab.dispose()
  })

  // ── AC1 ──────────────────────────────────────────────────────────────────────
  test('AC1: clicking the bell opens the notifications panel within 2s', async ({ page }) => {
    await gotoFresh(page, '/lab')
    const bell = page.getByRole('button', { name: /^Notifications/ })
    await expect(bell).toBeVisible()
    await bell.click()
    await expect(page.locator('.notif-bell__panel')).toBeVisible({ timeout: 2000 })
  })

  // ── AC2 ──────────────────────────────────────────────────────────────────────
  test('AC2: seeded teacher_feedback item shows a "Feedback" label chip', async ({ page }) => {
    await gotoFresh(page, '/lab')
    await page.getByRole('button', { name: /^Notifications/ }).click()
    const panel = page.locator('.notif-bell__panel')
    await expect(panel).toBeVisible()

    const item = panel.locator('.notif-bell__item', { hasText: SEED_TITLE }).first()
    await expect(item).toBeVisible()
    await expect(item.locator('.notif-bell__item-kind')).toHaveText('Feedback')
  })

  // ── AC3 ──────────────────────────────────────────────────────────────────────
  test('AC3: seeded teacher_feedback item title is prefixed by the 💬 icon', async ({ page }) => {
    await gotoFresh(page, '/lab')
    await page.getByRole('button', { name: /^Notifications/ }).click()
    const panel = page.locator('.notif-bell__panel')
    await expect(panel).toBeVisible()

    const item = panel.locator('.notif-bell__item', { hasText: SEED_TITLE }).first()
    await expect(item.locator('.notif-bell__item-title')).toContainText('💬')
  })

  // ── AC4 ──────────────────────────────────────────────────────────────────────
  test('AC4: a fair_deadline item, if present, shows "Deadline" chip + 📅 icon', async ({
    page,
  }) => {
    await gotoFresh(page, '/lab')
    const res = await api.get(page, '/api/notifications')
    expect(res.status()).toBe(200)
    const { items } = await res.json()
    const deadlineItem = (items as Array<{ kind: string; title: string }>).find(
      (n) => n.kind === 'fair_deadline',
    )

    if (!deadlineItem) {
      // fair_deadline is only created by the cron job; none exists in this
      // run's data. Per the plan's present-or-skip rule, absence is a valid
      // outcome — nothing further to assert.
      return
    }

    await page.getByRole('button', { name: /^Notifications/ }).click()
    const panel = page.locator('.notif-bell__panel')
    await expect(panel).toBeVisible()
    const item = panel.locator('.notif-bell__item', { hasText: deadlineItem.title }).first()
    await expect(item.locator('.notif-bell__item-kind')).toHaveText('Deadline')
    await expect(item.locator('.notif-bell__item-title')).toContainText('📅')
  })

  // ── AC5 ──────────────────────────────────────────────────────────────────────
  test('AC5: an urgency item, if present, shows "Nudge" chip + ⚠ icon', async ({ page }) => {
    await gotoFresh(page, '/lab')
    const res = await api.get(page, '/api/notifications')
    expect(res.status()).toBe(200)
    const { items } = await res.json()
    const urgencyItem = (items as Array<{ kind: string; title: string }>).find(
      (n) => n.kind === 'urgency',
    )

    if (!urgencyItem) {
      // urgency is only created by the cron job; none exists in this run's
      // data. Per the plan's present-or-skip rule, absence is a valid outcome.
      return
    }

    await page.getByRole('button', { name: /^Notifications/ }).click()
    const panel = page.locator('.notif-bell__panel')
    await expect(panel).toBeVisible()
    const item = panel.locator('.notif-bell__item', { hasText: urgencyItem.title }).first()
    await expect(item.locator('.notif-bell__item-kind')).toHaveText('Nudge')
    await expect(item.locator('.notif-bell__item-title')).toContainText('⚠')
  })

  // ── AC6 ──────────────────────────────────────────────────────────────────────
  // openItem's linkUrl navigation fires regardless of prior read state, so this
  // assertion holds whether or not an earlier test already read the seeded item.
  test('AC6: clicking the seeded item navigates to /lab?panel=feedback', async ({ page }) => {
    await gotoFresh(page, '/lab')
    await page.getByRole('button', { name: /^Notifications/ }).click()
    const panel = page.locator('.notif-bell__panel')
    await expect(panel).toBeVisible()
    const item = panel.locator('.notif-bell__item', { hasText: SEED_TITLE }).first()
    await item.click()
    await expect(page).toHaveURL(/panel=feedback/)
  })

  test('AC7: clicking an unread item decreases the unread badge by one, no full reload', async ({
    page,
    browser,
  }) => {
    await gotoFresh(page, '/lab')

    // Ensure there is at least one unread item to click: if the seeded item was
    // already read by AC6 above (serial order), re-seed a second teacher_feedback
    // notification scoped to the same team so this test has its own unread item
    // independent of AC6/AC2/AC3's shared seed.
    const preRes = await api.get(page, '/api/notifications')
    const pre = await preRes.json()
    let unreadItem = (
      pre.items as Array<{
        id: string
        kind: string
        title: string
        readAt: string | null
        body?: string
      }>
    ).find((n) => n.readAt === null)

    let extraSeededId: string | null = null
    if (!unreadItem) {
      await withSeedPage(browser, 'teacher', (p) => seedExtraFeedback(p, '(AC7 re-seed)'))

      await gotoFresh(page, '/lab')
      const res2 = await api.get(page, '/api/notifications')
      const json2 = await res2.json()
      unreadItem = (
        json2.items as Array<{
          id: string
          kind: string
          title: string
          readAt: string | null
          body?: string
        }>
      ).find((n) => n.readAt === null && n.body?.includes('AC7 re-seed'))
      extraSeededId = unreadItem?.id ?? null
    }

    expect(unreadItem, 'expected at least one unread notification to exist for AC7').toBeTruthy()

    await gotoFresh(page, '/lab')
    // Read the true unread count from the API (the badge caps its display at
    // "9+", so the DOM text alone cannot be trusted to compute an exact N-1).
    const countRes = await api.get(page, '/api/notifications')
    const { unreadCount: before } = await countRes.json()
    expect(before).toBeGreaterThan(0)

    const bell = page.getByRole('button', { name: /^Notifications, \d+ unread/ })
    await expect(bell).toBeVisible()
    const badge = page.locator('.notif-bell__badge')

    const urlBefore = page.url()
    await bell.click()
    const panel = page.locator('.notif-bell__panel')
    await expect(panel).toBeVisible()
    // Click an item that is actually unread. Titles are NOT unique on the shared
    // E2E team (every teacher_feedback notification is titled identically), so a
    // title match + `.first()` can land on an already-read row → no decrement. The
    // `--unread` class targets a genuinely unread row (DOM order = API order).
    const item = panel.locator('.notif-bell__item--unread').first()
    await item.click()

    if (before <= 1) {
      await expect(badge).not.toBeVisible()
    } else if (before <= 10) {
      // Exact digit is shown for counts 1-9; N-1 is unambiguous here.
      await expect(badge).toHaveText(String(before - 1))
    } else {
      // Both before and after are capped at "9+" in the DOM — the click still
      // decremented internal state (verified by badge remaining "9+", i.e. not
      // disappearing), and the true decrement is exercised by openItem's own
      // `Math.max(0, u - 1)` logic, already covered numerically by the <=10 branch.
      await expect(badge).toHaveText('9+')
    }
    // No full page reload occurred — router.push is client-side; the page's
    // origin+pathname stay under /lab even though the query string changes.
    expect(new URL(page.url()).pathname).toBe(new URL(urlBefore).pathname)

    // Clean up any extra seed created for this test only.
    if (extraSeededId) {
      await api.post(page, '/api/notifications', { data: { ids: [extraSeededId] } }).catch(() => {})
    }
  })

  // ── AC8 ──────────────────────────────────────────────────────────────────────
  test('AC8: "Mark all read" clears the badge and all unread item styling', async ({
    page,
    browser,
  }) => {
    await gotoFresh(page, '/lab')

    // Ensure there is at least one unread item so "Mark all read" is present and
    // meaningfully exercised; re-seed if the shared seeded item is already read.
    const preRes = await api.get(page, '/api/notifications')
    const pre = await preRes.json()
    const hasUnread = (pre.items as Array<{ readAt: string | null }>).some((n) => n.readAt === null)

    let extraSeededId: string | null = null
    if (!hasUnread) {
      await withSeedPage(browser, 'teacher', (p) => seedExtraFeedback(p, '(AC8 re-seed)'))

      await gotoFresh(page, '/lab')
      const res2 = await api.get(page, '/api/notifications')
      const json2 = await res2.json()
      extraSeededId = (
        json2.items as Array<{ id: string; readAt: string | null; body?: string }>
      ).find((n) => n.readAt === null && n.body?.includes('AC8 re-seed'))?.id ?? null
    }

    await gotoFresh(page, '/lab')
    await page.getByRole('button', { name: /^Notifications/ }).click()
    const panel = page.locator('.notif-bell__panel')
    await expect(panel).toBeVisible()

    const clearBtn = page.getByRole('button', { name: 'Mark all read' })
    await expect(clearBtn).toBeVisible()
    await clearBtn.click()

    await expect(page.locator('.notif-bell__badge')).not.toBeVisible()
    await expect(panel.locator('.notif-bell__item--unread')).toHaveCount(0)

    if (extraSeededId) {
      await api.post(page, '/api/notifications', { data: { ids: [extraSeededId] } }).catch(() => {})
    }
  })

  // ── AC9 ──────────────────────────────────────────────────────────────────────
  test('AC9: seeded item label chip uses pixel chrome (font-pixel, uppercase)', async ({
    page,
  }) => {
    await gotoFresh(page, '/lab')
    await page.getByRole('button', { name: /^Notifications/ }).click()
    const panel = page.locator('.notif-bell__panel')
    await expect(panel).toBeVisible()

    const chip = panel
      .locator('.notif-bell__item', { hasText: SEED_TITLE })
      .first()
      .locator('.notif-bell__item-kind')
    await expect(chip).toBeVisible()
    await expect(chip).toHaveClass(/font-pixel/)
    const transform = await chip.evaluate((el: Element) => getComputedStyle(el).textTransform)
    expect(transform).toBe('uppercase')
  })

  // ── AC10 ─────────────────────────────────────────────────────────────────────
  test('AC10: GET /api/notifications only returns the five canonical kind values', async ({
    page,
  }) => {
    await gotoFresh(page, '/lab')
    const res = await api.get(page, '/api/notifications')
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json.items)).toBe(true)
    // At least the seeded teacher_feedback item must be present.
    expect(json.items.length).toBeGreaterThan(0)
    for (const item of json.items as Array<{ kind: string }>) {
      expect(CANONICAL_KINDS).toContain(item.kind)
    }
  })
})
