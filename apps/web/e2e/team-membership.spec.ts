import { test, expect } from '@playwright/test'
import { api, withSeedPage } from './api'
import { e2eDb, e2eTeamId } from './db'

/**
 * Team membership lifecycle UI (REFACTOR2 P1-R8).
 *
 * The service logic is covered by unit tests; what those cannot show is whether
 * a student can actually REACH any of it. This spec exists because the first
 * cut of this feature shipped three working endpoints and no way to call them —
 * which, for a finding whose text was "there is no leave command", fixed
 * nothing a student could observe.
 *
 * DELIBERATELY NON-DESTRUCTIVE. The fixture team is shared by every other spec,
 * so this asserts that the controls render, that they are gated to the lead, and
 * that the endpoints reject what they should. It never actually leaves a lab or
 * moves the lead role — an E2E run must not leave the fixture graph rearranged
 * for whatever runs next.
 */

async function openTeamPanel(page: import('@playwright/test').Page) {
  await page.goto('/lab')
  // The status strip's team-name button is the only way in.
  await page.locator('button.status-strip__team--button').click()
  await expect(page.getByText('Your Lab')).toBeVisible()
  // The roster loads async; wait for it rather than racing the skeleton.
  await expect(page.getByTestId('team-panel-skeleton')).toHaveCount(0)
}

test.describe('team membership controls', () => {
  test('the lead sees per-member hand-over and remove actions', async ({ browser }) => {
    // The fixture lab is solo, so there is nobody to act ON. Skipping is honest;
    // seeding a second member would rearrange a graph every other spec shares.
    const teamId = await e2eTeamId()
    const count = await e2eDb.teamMember.count({ where: { teamId } })
    test.skip(count < 2, 'fixture lab has one researcher — no other member to act on')

    await withSeedPage(browser, 'leader', async (page) => {
      await openTeamPanel(page)

      await expect(page.getByRole('button', { name: /make lead/i }).first()).toBeVisible()
      await expect(page.getByRole('button', { name: /remove/i }).first()).toBeVisible()

      // …and never against yourself: removing yourself is leaving, and leaving
      // has different consequences that must be chosen deliberately.
      const you = page.locator('li', { hasText: /you/i }).first()
      await expect(you.getByRole('button', { name: /remove/i })).toHaveCount(0)
    })
  })

  test('a solo lead sees no self-directed member actions', async ({ browser }) => {
    const teamId = await e2eTeamId()
    const count = await e2eDb.teamMember.count({ where: { teamId } })
    test.skip(count !== 1, 'this case is about the solo lab specifically')

    await withSeedPage(browser, 'leader', async (page) => {
      await openTeamPanel(page)
      // Your own row shows your ROLE, never a control aimed at yourself.
      await expect(page.getByRole('button', { name: /make lead/i })).toHaveCount(0)
      await expect(page.getByRole('button', { name: /^remove$/i })).toHaveCount(0)
      await expect(page.getByText(/lead/i).first()).toBeVisible()
    })
  })

  test('anyone can reach the leave control, and it states its consequence first', async ({
    browser,
  }) => {
    await withSeedPage(browser, 'leader', async (page) => {
      await openTeamPanel(page)

      const leave = page.getByRole('button', { name: /^leave lab$/i })
      await expect(leave).toBeVisible()

      // First click reveals the consequence and a confirm — it must not leave.
      await leave.click()
      await expect(page.getByRole('button', { name: /yes, leave the lab|leave and archive/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible()

      // Still a member: the confirm step is a real gate, not decoration.
      await page.getByRole('button', { name: /cancel/i }).click()
      const stillThere = await e2eDb.teamMember.count({ where: { teamId: await e2eTeamId() } })
      expect(stillThere).toBeGreaterThan(0)
    })
  })

  test('the roster API exposes member ids so the lead actions can target someone', async ({
    browser,
  }) => {
    await withSeedPage(browser, 'leader', async (page) => {
      const res = await api.get(page, '/api/team')
      expect(res.ok()).toBeTruthy()
      const body = await res.json()
      expect(body.members.length).toBeGreaterThan(0)
      for (const m of body.members) {
        expect(typeof m.userId).toBe('string')
        expect(m.userId.length).toBeGreaterThan(0)
      }
    })
  })
})

test.describe('membership endpoints reject what they should', () => {
  test('handing the lead to someone outside the lab is a 404', async ({ browser }) => {
    await withSeedPage(browser, 'leader', async (page) => {
      const res = await api.post(page, '/api/team/lead', {
        data: { toUserId: 'definitely-not-a-member' },
      })
      expect(res.status()).toBe(404)
    })
  })

  test('a non-lead cannot remove anyone', async ({ browser }) => {
    const teamId = await e2eTeamId()
    const lead = await e2eDb.team.findUnique({ where: { id: teamId }, select: { teamLeadId: true } })
    const other = await e2eDb.teamMember.findFirst({
      where: { teamId, userId: { not: lead?.teamLeadId ?? '' } },
      select: { userId: true },
    })
    test.skip(!other, 'fixture team has only one member')

    await withSeedPage(browser, 'student', async (page) => {
      const res = await api.delete(page, `/api/team/members/${other!.userId}`)
      // 403 when the student is on this team, 404 when they are on another —
      // either way the removal does not happen.
      expect([403, 404]).toContain(res.status())
    })
  })

  test('the lead cannot remove themselves through the remove route', async ({ browser }) => {
    const teamId = await e2eTeamId()
    const team = await e2eDb.team.findUnique({ where: { id: teamId }, select: { teamLeadId: true } })
    await withSeedPage(browser, 'leader', async (page) => {
      const res = await api.delete(page, `/api/team/members/${team!.teamLeadId}`)
      expect(res.status()).toBe(400)
      expect((await res.json()).error).toMatch(/use leave/i)
    })
  })
})

test.afterAll(async () => {
  await e2eDb.$disconnect()
})
