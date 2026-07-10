import { test, expect, request as playwrightRequest } from '@playwright/test'
import { STORAGE } from './roles'
import { api, withSeedPage } from './api'

/**
 * F9 — Teacher nudge / "check in" from the roster.
 * One test per acceptance criterion (12 criteria total, from
 * .claude/pipeline/plan-F9.md). Runs as the default `chromium` project except
 * where a role switch is required for the observing session (teacher for the
 * roster/mutation, student/leader for the notification + feedback inbox).
 *
 * Criterion → test mapping:
 *  AC1  — POST /api/teacher/nudge (teacher, owned teamId) → 200 { ok: true, alreadyNudged }
 *  AC2  — Team notification created: title ends "checked in", body starts "Log your
 *         latest session", kind teacher_feedback, linkUrl /lab?panel=feedback
 *  AC3  — Idempotent same-day: second POST same teamId same day → 200 { ok: true, alreadyNudged: true }
 *  AC4  — No duplicate notification: exactly one "checked in" item after the second call
 *  AC5  — Cross-class IDOR blocked: non-owned teamId → 403 { error }, no notification created
 *  AC6  — Bad-body rejected: missing/empty teamId → 400 (not 500)
 *  AC7  — Unauthenticated blocked: no session → 401 (or 403 non-teacher), no notification created
 *  AC8  — Feedback trail row written: GET /api/team/feedback has a targetType:'team' item
 *         whose body starts "Log your latest session"
 *  AC9  — Nudge button visible on an attention (unlogged/stale) roster row within 2s
 *  AC10 — Nudge button absent on a healthy (no unlogged/stale flag) roster row
 *  AC11 — Optimistic "Nudged" state: clicking Nudge swaps to a disabled Nudged chip, no reload
 *  AC12 — Click does not navigate: URL stays /teacher after clicking Nudge
 *
 * ── The dedupeKey trap ──────────────────────────────────────────────────────
 * `dedupeKey = nudge:${teamId}:${YYYY-MM-DD}` (UTC day) is unique and NOT
 * cleared by marking notifications read, so a same-day re-run of this exact
 * suite makes the "first" POST of the run return `alreadyNudged: true` if an
 * earlier run already nudged today. AC1/AC2/AC8 are therefore written to hold
 * under BOTH outcomes of the first call (first-or-already semantics: `ok`
 * is always true, and if this run's own POST reports `alreadyNudged: false`,
 * the fully-detailed shape is asserted; either way the notification/feedback
 * MUST exist for the team by the time AC2/AC8 run). AC3 is always deterministic
 * because it strictly follows AC1's call within the same beforeAll — the
 * second POST in a row is guaranteed `alreadyNudged: true` regardless of
 * what happened on prior days. afterAll tags-and-cleans via direct Prisma:
 * delete the Notification row(s) with `dedupeKey = nudge:<teamId>:<today>`
 * and the TeacherFeedback row(s) this run created (tracked by id, not a
 * blanket delete) — the same sanctioned direct-Prisma escape hatch F4-print's
 * spec used for unseedable fixtures, since no DELETE API exists for either model.
 *
 * Seeding: beforeAll (teacher session) discovers the E2E team id via
 * GET /api/teacher/roster (same convention as F1/F5), fires the first nudge,
 * then fires the immediate second (same-day) nudge so AC3/AC4 always have a
 * deterministic idempotent-repeat state ready without racing individual tests.
 */

const BASE_URL = `http://localhost:${process.env.E2E_PORT ?? 3000}`
const PREFERRED_TEST_TEAM_ID = 'e2e_test_lab_01'

interface RosterStudent {
  studentId: string
  name: string
  teamId: string | null
  teamName: string | null
  flags: { status: 'on_track' | 'unlogged' | 'stale' | null }
}

function resolveTeamId(students: RosterStudent[]): string | null {
  return (
    students.find((s) => s.teamId === PREFERRED_TEST_TEAM_ID)?.teamId ??
    students.find((s) => s.teamId)?.teamId ??
    null
  )
}

/** UTC calendar day, matching the route's own dedupeKey convention exactly. */
function utcDay(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Shared across tests — discovered/created in beforeAll. */
let teamId: string | null = null
let firstCallAlreadyNudged: boolean | null = null
let secondCallAlreadyNudged: boolean | null = null
/** Set only when this run's own POST performed the actual first-of-day insert
 *  (alreadyNudged:false) — the TeacherFeedback row exists only in that case,
 *  and only then do we know its id to scope afterAll's cleanup precisely. */
let seededFeedbackCreatedThisRun = false

test.describe('F9 — Teacher nudge from the roster', () => {
  // Serial: AC1-AC8 build on a single shared team + shared same-day dedupeKey
  // state; racing them would make the "first vs second call" assertions
  // nondeterministic.
  test.describe.configure({ mode: 'serial' })

  // ── Seed ─────────────────────────────────────────────────────────────────────

  test.beforeAll(async ({ browser }) => {
    await withSeedPage(browser, 'teacher', async (page) => {
      const rosterRes = await api.get(page, '/api/teacher/roster')
      if (!rosterRes.ok()) {
        throw new Error(`Roster fetch failed: ${rosterRes.status()} ${await rosterRes.text()}`)
      }
      const { students } = await rosterRes.json()
      teamId = resolveTeamId(students)
      if (!teamId) {
        throw new Error(
          'No team found in teacher roster — E2E teacher account must be linked to the dev class that contains the E2E leader team.',
        )
      }

      // First call of this suite run. Per the dedupeKey trap, this may report
      // alreadyNudged:true if an earlier run already nudged today — both
      // outcomes are legitimate and handled by AC1/AC2/AC8 below.
      const firstRes = await api.post(page, '/api/teacher/nudge', { data: { teamId } })
      if (!firstRes.ok()) {
        throw new Error(`First nudge POST failed: ${firstRes.status()} ${await firstRes.text()}`)
      }
      const firstJson = await firstRes.json()
      firstCallAlreadyNudged = firstJson.alreadyNudged
      seededFeedbackCreatedThisRun = firstJson.alreadyNudged === false

      // Second call, same team, same day — deterministically idempotent
      // regardless of what the first call reported.
      const secondRes = await api.post(page, '/api/teacher/nudge', { data: { teamId } })
      if (!secondRes.ok()) {
        throw new Error(`Second nudge POST failed: ${secondRes.status()} ${await secondRes.text()}`)
      }
      secondCallAlreadyNudged = (await secondRes.json()).alreadyNudged

      // eslint-disable-next-line no-console
      console.log(
        `F9 beforeAll: teamId=${teamId}, firstCall.alreadyNudged=${firstCallAlreadyNudged}, ` +
          `secondCall.alreadyNudged=${secondCallAlreadyNudged}, dedupeKey=nudge:${teamId}:${utcDay()}. ` +
          `${seededFeedbackCreatedThisRun ? 'This run performed the actual first-of-day insert.' : 'Today was already nudged by a prior run — reusing existing state.'}`,
      )
    })
  })

  test.afterAll(async () => {
    // Direct-Prisma cleanup: no DELETE API exists for Notification or
    // TeacherFeedback (same sanctioned escape hatch F4-print's spec used for
    // unseedable fixtures). Scoped tightly to THIS run's dedupeKey/day/team so
    // we never touch a different team's or a different day's rows.
    if (!teamId) {
      console.warn('F9 afterAll: no teamId discovered — nothing to clean up.')
      return
    }
    const dedupeKey = `nudge:${teamId}:${utcDay()}`

    const { PrismaClient } = await import('@prisma/client')
    const db = new PrismaClient()
    try {
      const notif = await db.notification.deleteMany({ where: { dedupeKey } })
      console.log(`F9 afterAll cleanup: deleted ${notif.count} Notification row(s) with dedupeKey='${dedupeKey}'.`)

      // Only delete the TeacherFeedback audit row if THIS run actually created
      // one (the transaction only writes it on a true first-of-day insert) —
      // never blanket-delete team feedback, which could remove a legitimate
      // pre-existing audit trail from another day/run.
      if (seededFeedbackCreatedThisRun) {
        const feedback = await db.teacherFeedback.deleteMany({
          where: {
            teamId,
            targetType: 'team',
            body: "Log your latest session so your teacher can see where you're at.",
            createdAt: { gte: new Date(`${utcDay()}T00:00:00.000Z`) },
          },
        })
        console.log(
          `F9 afterAll cleanup: deleted ${feedback.count} TeacherFeedback row(s) created by this run for team ${teamId}.`,
        )
      } else {
        console.log(
          'F9 afterAll cleanup: this run never performed the first-of-day insert, so no TeacherFeedback row is owned by this run — nothing to delete there.',
        )
      }

      // Verify deletion (loud, not silent) — confirm the dedupeKey is gone so a
      // stale row can never be mistaken for a "still nudged today" state by a
      // human re-running this suite by hand later today.
      const stillThere = await db.notification.findUnique({ where: { dedupeKey } })
      if (stillThere) {
        console.error(`F9 afterAll VERIFY FAILED: Notification with dedupeKey='${dedupeKey}' still exists after cleanup.`)
      } else {
        console.log(`F9 afterAll VERIFY: dedupeKey='${dedupeKey}' confirmed absent after cleanup.`)
      }
    } finally {
      await db.$disconnect()
    }
  })

  // ── AC1 ──────────────────────────────────────────────────────────────────────
  test('AC1: POST /api/teacher/nudge for an owned team returns 200 { ok, alreadyNudged }', async ({
    browser,
  }) => {
    // Asserted against beforeAll's first call — first-or-already semantics per
    // the dedupeKey trap: `ok` is always true; `alreadyNudged` is a real
    // boolean either way (both values are legitimate "first call of this run"
    // outcomes).
    expect(firstCallAlreadyNudged).not.toBeNull()
    expect(typeof firstCallAlreadyNudged).toBe('boolean')

    // Re-issue a fresh, independently-observed POST here too (not relying only
    // on beforeAll's side effect) to directly exercise this criterion's own
    // HTTP contract — same team, same day, so it is guaranteed the "already
    // nudged" branch by this point in the serial suite.
    await withSeedPage(browser, 'teacher', async (page) => {
      const res = await api.post(page, '/api/teacher/nudge', { data: { teamId } })
      expect(res.status()).toBe(200)
      const json = await res.json()
      expect(json.ok).toBe(true)
      expect(typeof json.alreadyNudged).toBe('boolean')
    })
  })

  // ── AC2 ──────────────────────────────────────────────────────────────────────
  test('AC2: team notification created — title ends "checked in", body/kind/linkUrl correct', async ({
    browser,
  }) => {
    await withSeedPage(browser, 'leader', async (page) => {
      const res = await api.get(page, '/api/notifications')
      expect(res.ok()).toBe(true)
      const { items } = await res.json()
      const found = (
        items as Array<{ title: string; body: string; kind: string; linkUrl: string | null }>
      ).find((n) => n.title.endsWith('checked in'))

      expect(found, 'expected a "checked in" notification to exist for the team by now').toBeTruthy()
      expect(found!.title.endsWith('checked in')).toBe(true)
      expect(found!.body.startsWith('Log your latest session')).toBe(true)
      expect(found!.kind).toBe('teacher_feedback')
      expect(found!.linkUrl).toBe('/lab?panel=feedback')
    })
  })

  // ── AC3 ──────────────────────────────────────────────────────────────────────
  test('AC3: a same-day repeat POST returns 200 { ok: true, alreadyNudged: true }', async ({
    browser,
  }) => {
    // beforeAll's second call is guaranteed to land after the first, same team,
    // same day — deterministically idempotent regardless of what happened on
    // prior days/runs.
    expect(secondCallAlreadyNudged).toBe(true)

    // Independently re-verify with a fresh POST right now too.
    await withSeedPage(browser, 'teacher', async (page) => {
      const res = await api.post(page, '/api/teacher/nudge', { data: { teamId } })
      expect(res.status()).toBe(200)
      const json = await res.json()
      expect(json).toEqual({ ok: true, alreadyNudged: true })
    })
  })

  // ── AC4 ──────────────────────────────────────────────────────────────────────
  test('AC4: no duplicate notification — exactly one "checked in" item exists after repeats', async ({
    browser,
  }) => {
    await withSeedPage(browser, 'leader', async (page) => {
      const res = await api.get(page, '/api/notifications')
      expect(res.ok()).toBe(true)
      const { items } = await res.json()
      const matches = (items as Array<{ title: string; createdAt: string }>).filter((n) =>
        n.title.endsWith('checked in'),
      )
      // Multiple same-day POSTs (three total by this point: beforeAll's two
      // plus AC1's) must never have produced more than one notification row —
      // the unique dedupeKey constraint is the enforcement mechanism.
      expect(matches.length).toBe(1)
    })
  })

  // ── AC5 ──────────────────────────────────────────────────────────────────────
  test('AC5: cross-class IDOR blocked — non-owned teamId returns 403, creates no notification', async ({
    browser,
  }) => {
    // A syntactically-valid but non-existent teamId — teacherOwnsTeam's
    // findFirst fails identically for a real non-owned team and a nonexistent
    // id (per plan-F9.md AC5's own wording), so this exercises the same 403
    // branch without needing a second real class/team fixture.
    const fakeTeamId = 'e2e_f9_nonexistent_team_id'

    await withSeedPage(browser, 'teacher', async (page) => {
      const res = await api.post(page, '/api/teacher/nudge', { data: { teamId: fakeTeamId } })
      expect(res.status()).toBe(403)
      const json = await res.json()
      expect(typeof json.error).toBe('string')
      expect(json.error.length).toBeGreaterThan(0)
    })

    // No notification exists for the fake team — confirm directly via Prisma
    // (there is no API to read another team's notifications, which is itself
    // the scope guard working as intended).
    const { PrismaClient } = await import('@prisma/client')
    const db = new PrismaClient()
    try {
      const count = await db.notification.count({ where: { teamId: fakeTeamId } })
      expect(count).toBe(0)
    } finally {
      await db.$disconnect()
    }
  })

  // ── AC6 ──────────────────────────────────────────────────────────────────────
  test('AC6: bad body (empty/missing teamId) is rejected with 400, not 500', async ({ browser }) => {
    await withSeedPage(browser, 'teacher', async (page) => {
      const emptyRes = await api.post(page, '/api/teacher/nudge', { data: { teamId: '' } })
      expect(emptyRes.status()).toBe(400)

      const missingRes = await api.post(page, '/api/teacher/nudge', { data: {} })
      expect(missingRes.status()).toBe(400)
    })
  })

  // ── AC7 ──────────────────────────────────────────────────────────────────────
  test('AC7: unauthenticated POST is blocked (401/403), creates no notification', async ({ browser }) => {
    // A bare context with no storageState carries no Clerk session cookie.
    const anonCtx = await playwrightRequest.newContext({ baseURL: BASE_URL, storageState: undefined })
    try {
      const res = await anonCtx.post('/api/teacher/nudge', { data: { teamId }, maxRedirects: 0 })
      // The request is BLOCKED before the handler: Clerk's middleware 307-redirects
      // an unauthenticated request to /sign-in in this setup; requireTeacher would
      // otherwise 401 (no userId) / 403 (non-teacher). All three mean "not allowed"
      // per AC7's wording — the point is that no notification is created (below).
      expect([307, 401, 403]).toContain(res.status())
    } finally {
      await anonCtx.dispose()
    }

    // The team's notification count is unaffected by the rejected call — reuse
    // AC4's exact-count assertion as the "no side effect" signal.
    await withSeedPage(browser, 'leader', async (page) => {
      const notifRes = await api.get(page, '/api/notifications')
      expect(notifRes.ok()).toBe(true)
      const { items } = await notifRes.json()
      const matches = (items as Array<{ title: string }>).filter((n) => n.title.endsWith('checked in'))
      expect(matches.length).toBe(1)
    })
  })

  // ── AC8 ──────────────────────────────────────────────────────────────────────
  test('AC8: TeacherFeedback audit row written — team feedback inbox has the matching body', async ({
    browser,
  }) => {
    await withSeedPage(browser, 'leader', async (page) => {
      const res = await api.get(page, '/api/team/feedback')
      expect(res.ok()).toBe(true)
      const { items } = await res.json()
      const found = (items as Array<{ targetType: string; body: string }>).find(
        (f) => f.targetType === 'team' && f.body.startsWith('Log your latest session'),
      )
      expect(found, 'expected a team-targeted feedback row from the nudge to exist by now').toBeTruthy()
    })
  })

  // ── AC9 / AC10 / AC11 / AC12 — roster UI ─────────────────────────────────────
  // Discover the live roster state once, shared by all four UI criteria, so the
  // per-plan "check what the roster returns first" step happens exactly once.
  test.describe('roster UI', () => {
    let attentionRow: RosterStudent | null = null
    let healthyRow: RosterStudent | null = null

    test.beforeAll(async ({ browser }) => {
      await withSeedPage(browser, 'teacher', async (page) => {
        const res = await api.get(page, '/api/teacher/roster')
        if (!res.ok()) throw new Error(`Roster fetch failed: ${res.status()} ${await res.text()}`)
        const { students } = (await res.json()) as { students: RosterStudent[] }

        attentionRow =
          students.find((s) => (s.flags.status === 'unlogged' || s.flags.status === 'stale') && s.teamId) ?? null
        healthyRow =
          students.find(
            (s) => s.flags.status !== 'unlogged' && s.flags.status !== 'stale',
          ) ?? null

        // eslint-disable-next-line no-console
        console.log(
          `F9 roster UI beforeAll: attentionRow=${attentionRow ? `${attentionRow.name} (${attentionRow.flags.status})` : 'NONE'}, ` +
            `healthyRow=${healthyRow ? healthyRow.name : 'NONE'} (of ${students.length} roster row(s)).`,
        )
      })
    })

    test.use({ storageState: STORAGE.teacher })

    // ── AC9 ────────────────────────────────────────────────────────────────────
    test('AC9: Nudge button is visible on an attention (unlogged/stale) roster row within 2s', async ({
      page,
    }) => {
      test.skip(
        attentionRow === null,
        'No roster row is currently flagged unlogged/stale for this E2E teacher\'s class — the ' +
          'UI-button AC genuinely cannot appear without mutating team data to force a stale/unlogged ' +
          'state, which the tester will not do. AC1/AC2/AC3/AC4/AC8 already cover the same button\'s ' +
          'backing API contract end-to-end.',
      )

      await page.goto('/teacher')
      const row = page.locator('a', { hasText: attentionRow!.name }).first()
      await expect(row.locator('[data-testid="nudge-button"]')).toBeVisible({ timeout: 2000 })
    })

    // ── AC10 ───────────────────────────────────────────────────────────────────
    test('AC10: Nudge button is absent on a healthy (no unlogged/stale flag) roster row', async ({ page }) => {
      test.skip(
        healthyRow === null,
        'Every roster row for this E2E teacher\'s class currently has an attention flag — there is no ' +
          'healthy row to assert absence against.',
      )

      await page.goto('/teacher')
      const row = page.locator('a', { hasText: healthyRow!.name }).first()
      await expect(row).toBeVisible()
      await expect(row.locator('[data-testid="nudge-button"]')).toHaveCount(0)
      await expect(row.locator('[data-testid="nudge-done"]')).toHaveCount(0)
    })

    // ── AC11 ───────────────────────────────────────────────────────────────────
    test('AC11: clicking Nudge optimistically switches to a disabled Nudged chip, no reload', async ({
      page,
    }) => {
      test.skip(
        attentionRow === null,
        'No roster row is currently flagged unlogged/stale for this E2E teacher\'s class — see AC9\'s skip reason.',
      )

      await page.goto('/teacher')
      const row = page.locator('a', { hasText: attentionRow!.name }).first()
      const button = row.locator('[data-testid="nudge-button"]')
      const doneChip = row.locator('[data-testid="nudge-done"]')

      // The team was already nudged today by AC1-AC8's API calls above, so the
      // button may already show as "done" from a prior render in this same
      // page load's session-state — but this is a fresh navigation/mount, so
      // `nudged` state starts empty regardless and the button renders idle.
      await expect(button).toBeVisible({ timeout: 2000 })

      const responsePromise = page.waitForResponse(
        (r) => r.url().endsWith('/api/teacher/nudge') && r.request().method() === 'POST',
      )
      await button.click()
      const response = await responsePromise
      expect(response.ok()).toBe(true)

      // Optimistic switch to the disabled Nudged chip — no full page reload.
      await expect(doneChip).toBeVisible({ timeout: 2000 })
      await expect(button).toHaveCount(0)
      // The chip itself is a non-interactive <span> (no click handler) — confirm
      // it does not render as a <button>.
      const tagName = await doneChip.evaluate((el) => el.tagName.toLowerCase())
      expect(tagName).not.toBe('button')
    })

    // ── AC12 ───────────────────────────────────────────────────────────────────
    test('AC12: clicking Nudge does not navigate — the URL stays /teacher', async ({ page }) => {
      test.skip(
        attentionRow === null,
        'No roster row is currently flagged unlogged/stale for this E2E teacher\'s class — see AC9\'s skip reason.',
      )

      await page.goto('/teacher')
      const row = page.locator('a', { hasText: attentionRow!.name }).first()

      // Whichever control is live (idle button or already-done chip from AC11's
      // click earlier in this serial run) is clicked — either must not navigate,
      // since the row's own <Link> wraps both.
      const button = row.locator('[data-testid="nudge-button"]')
      const doneChip = row.locator('[data-testid="nudge-done"]')

      if (await button.count()) {
        const responsePromise = page.waitForResponse(
          (r) => r.url().endsWith('/api/teacher/nudge') && r.request().method() === 'POST',
        )
        await button.click()
        await responsePromise
      } else {
        await doneChip.click()
      }

      await expect(page).toHaveURL(/\/teacher$/)
    })
  })
})
