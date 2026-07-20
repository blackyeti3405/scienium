import { test, expect } from '@playwright/test'
import { api, withSeedPage, gotoFresh } from './api'
import { e2eDb, e2eTeamId } from './db'

/**
 * Two-phase confirmation for the topic-change paper wipe (security fix).
 *
 * Background: changing the research topic runs an LLM relevance check over the
 * team's papers and deletes the ones judged irrelevant. That verdict is computed
 * from paper title/abstract text the team does not control (papers can be promoted
 * from external sources), and the batch prompt's `ID:`/`Title:` scaffolding is
 * forgeable by that text — so a hostile abstract could vote a SIBLING paper off
 * the island. The delete is a hard `deleteMany` plus permanent R2 removal.
 *
 * The fix makes the model propose and the student dispose:
 *   phase 1 (`confirmWipe: true`)      → 409 { requiresRemovalConfirmation, papers[] }, DELETES NOTHING
 *   phase 2 (`confirmRemoveIds: [...]`) → deletes exactly those ids, NO model call
 *
 * The assertions below are ordered by what actually protects a student's work:
 *  1. phase 1 deletes nothing (the core new safety property);
 *  2. phase 2 deletes only ids the caller approved — an id the model wanted but
 *     the student withheld survives;
 *  3. the removal list reaches the UI as titles, so a student can SEE a paper
 *     that shouldn't be going before approving.
 *
 * Relevance runs through the deterministic `E2E_SKIP_LLM=1` stub in
 * `lib/literature/relevance.ts` (plain token overlap), like every other
 * LLM-backed feature in the suite — so these assertions are stable and cost
 * nothing. Fixture papers are chosen so the judgement is unambiguous under that
 * rule: two reef papers sharing the topic's vocabulary, one about medieval
 * poetry sharing none.
 */

const START_TOPIC = 'Coral reef bleaching in warming oceans'
const NEW_TOPIC = 'Coral reef restoration and symbiont thermal tolerance'

const RELEVANT_A = 'E2E Fixture: Coral Bleaching Thresholds on the Great Barrier Reef'
const RELEVANT_B = 'E2E Fixture: Symbiodinium Thermal Tolerance and Reef Recovery'
const IRRELEVANT = 'E2E Fixture: Medieval English Poetry and the Alliterative Revival'

const FIXTURES = [
  {
    title: RELEVANT_A,
    abstract:
      'We measure sea-surface temperature thresholds at which scleractinian corals on the Great Barrier Reef expel their symbionts, and model bleaching frequency under warming scenarios.',
  },
  {
    title: RELEVANT_B,
    abstract:
      'Thermal tolerance of Symbiodinium clades is assessed across reef sites, and we relate symbiont community composition to post-bleaching coral recovery rates.',
  },
  {
    title: IRRELEVANT,
    abstract:
      'This study traces the alliterative revival in fourteenth-century English verse, examining metrical structure and manuscript transmission of Middle English poetry.',
  },
]

async function seedFixturePapers() {
  const teamId = await e2eTeamId()
  const uploader = await e2eDb.teamMember.findFirst({ where: { teamId }, select: { userId: true } })
  if (!uploader) throw new Error('E2E Test Lab has no members. Run pnpm --filter web seed:e2e.')

  await cleanupFixturePapers()
  await e2eDb.team.update({ where: { id: teamId }, data: { topic: START_TOPIC } })
  await e2eDb.paper.createMany({
    data: FIXTURES.map((f) => ({
      teamId,
      title: f.title,
      abstract: f.abstract,
      authors: ['E2E Fixture'],
      sourceType: 'pdf' as const,
      status: 'ready' as const,
      uploadedByUserId: uploader.userId,
    })),
  })
}

/** Remove only OUR fixture rows — never touch whatever else the lab holds. */
async function cleanupFixturePapers() {
  await e2eDb.paper.deleteMany({
    where: { teamId: await e2eTeamId(), title: { in: FIXTURES.map((f) => f.title) } },
  })
}

async function fixtureTitlesPresent(): Promise<string[]> {
  const rows = await e2eDb.paper.findMany({
    where: { teamId: await e2eTeamId(), title: { in: FIXTURES.map((f) => f.title) } },
    select: { title: true },
  })
  return rows.map((r) => r.title).sort()
}

test.describe('topic change — two-phase removal confirmation', () => {
  test.afterAll(async () => {
    await cleanupFixturePapers()
    await e2eDb.team.update({ where: { id: await e2eTeamId() }, data: { topic: null } })
    await e2eDb.$disconnect()
  })

  test('phase 1 proposes without deleting; phase 2 deletes only what was approved', async ({
    browser,
  }) => {
    test.setTimeout(120_000) // a real batch relevance call

    await seedFixturePapers()

    await withSeedPage(browser, 'leader', async (page) => {
      // ── Phase 0: topic is changing and papers exist → generic confirmation.
      const first = await api.post(page, '/api/discovery/topic', {
        data: { topic: NEW_TOPIC },
      })
      expect(first.status()).toBe(409)
      expect((await first.json()).requiresConfirmation).toBe(true)

      // ── Phase 1: confirmWipe runs the model and PROPOSES. Nothing may be deleted.
      const proposal = await api.post(page, '/api/discovery/topic', {
        data: { topic: NEW_TOPIC, confirmWipe: true },
      })
      expect(proposal.status()).toBe(409)
      const proposed = await proposal.json()
      expect(proposed.requiresRemovalConfirmation).toBe(true)

      // AC-1 — the whole point: proposing is not deleting.
      expect(await fixtureTitlesPresent()).toEqual([RELEVANT_A, RELEVANT_B, IRRELEVANT].sort())

      // The off-topic paper should be the one proposed; the reef papers should not.
      const proposedTitles: string[] = proposed.papers.map((p: { title: string }) => p.title)
      expect(proposedTitles).toContain(IRRELEVANT)
      expect(proposedTitles).not.toContain(RELEVANT_A)
      expect(proposedTitles).not.toContain(RELEVANT_B)

      // ── Phase 2: approve ONLY the off-topic paper, even though we echo back a
      // list the server never proposed. Approving a subset must delete a subset.
      const irrelevantId = proposed.papers.find(
        (p: { title: string }) => p.title === IRRELEVANT,
      )?.id
      expect(irrelevantId).toBeTruthy()

      const applied = await api.post(page, '/api/discovery/topic', {
        data: { topic: NEW_TOPIC, confirmWipe: true, confirmRemoveIds: [irrelevantId] },
      })
      expect(applied.ok()).toBeTruthy()
      const result = await applied.json()
      expect(result.removedCount).toBe(1)

      // AC-2 — exactly the approved paper is gone; the reef papers survive.
      expect(await fixtureTitlesPresent()).toEqual([RELEVANT_A, RELEVANT_B].sort())
    })
  })

  test('an id the student withheld is never deleted, even if the model wanted it', async ({
    browser,
  }) => {
    test.setTimeout(120_000)

    await seedFixturePapers()

    await withSeedPage(browser, 'leader', async (page) => {
      const proposal = await api.post(page, '/api/discovery/topic', {
        data: { topic: NEW_TOPIC, confirmWipe: true },
      })
      expect(proposal.status()).toBe(409)

      // Approve an EMPTY-but-present set: a single reef paper the model did not
      // propose. The route must honour the caller's list, not the model's verdict.
      const reefPaper = await e2eDb.paper.findFirst({
        where: { teamId: await e2eTeamId(), title: RELEVANT_A },
        select: { id: true },
      })
      expect(reefPaper).toBeTruthy()

      const applied = await api.post(page, '/api/discovery/topic', {
        data: { topic: NEW_TOPIC, confirmWipe: true, confirmRemoveIds: [reefPaper!.id] },
      })
      expect(applied.ok()).toBeTruthy()
      expect((await applied.json()).removedCount).toBe(1)

      // The off-topic paper the MODEL wanted removed is still here, because the
      // student never approved it.
      expect(await fixtureTitlesPresent()).toEqual([RELEVANT_B, IRRELEVANT].sort())
    })
  })

  test('the proposed removals reach the student as visible TITLES in the real modal', async ({
    browser,
  }) => {
    test.setTimeout(120_000)

    await seedFixturePapers()

    await withSeedPage(browser, 'leader', async (page) => {
      // AC-3, driven through the ACTUAL UI: a student cannot veto what they
      // cannot read, so the removal-confirmation modal must render the paper
      // TITLES (an API check alone would pass even if the modal showed ids —
      // or never opened).
      await gotoFresh(page, '/discovery')

      // /discovery lands on the Discovery HOME screen (not the explorer), whose
      // inline editor drives the same saveTopic flow. Edit and save the topic.
      await page.getByRole('button', { name: 'Edit research topic' }).click()
      const input = page.getByPlaceholder('Type your research topic…')
      await input.fill(NEW_TOPIC)
      await input.press('Enter')

      // Phase 0: the generic wipe warning — proceed.
      await expect(page.getByText('Change research topic?')).toBeVisible({ timeout: 10_000 })
      await page.getByRole('button', { name: 'Change topic' }).click()

      // Phase 1 ran (stubbed relevance): the SPECIFIC removal list must render
      // the off-topic paper's title, and not propose the on-topic ones.
      await expect(page.getByText('Remove these sources?')).toBeVisible({ timeout: 30_000 })
      await expect(page.getByText(IRRELEVANT)).toBeVisible()
      await expect(page.getByText(RELEVANT_A)).toHaveCount(0)
      await expect(page.getByText(RELEVANT_B)).toHaveCount(0)

      // Cancel — nothing may be deleted by a look at the list. Scoped to the
      // modal: the topic editor now stays open behind it (same as the explorer
      // surface), so an unscoped 'Cancel' would match its inline cancel too.
      await page
        .getByTestId('topic-removal-modal')
        .getByRole('button', { name: 'Cancel' })
        .click()
      await expect(page.getByText('Remove these sources?')).toHaveCount(0)
      expect(await fixtureTitlesPresent()).toEqual([RELEVANT_A, RELEVANT_B, IRRELEVANT].sort())
    })
  })
})
