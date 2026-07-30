import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routeHarness, type RoutePolicyHarness } from './harness/route-policy'

/**
 * REFACTOR2 P2-S1 / P2-S4 — the DETERMINISTIC half.
 *
 * The races themselves (two concurrent calls at cap-1) are proven against real
 * PostgreSQL in `test/pg/invariants.pg.test.ts`; an in-memory single-threaded
 * harness cannot interleave two handlers, and a "the cap refuses at the cap"
 * assertion here would pass on the broken code too.
 *
 * What lives here is everything that is a decision rather than an interleaving:
 * the project-log reference cap that must not refuse an idempotent re-post, the
 * deck scope that ignored `teamId`, and the curation marker that used to be
 * written for terms that were never stored.
 */

// Vocabulary build: the paid curation call and the (pure but content-driven)
// candidate extraction are replaced so the test drives the ROUTE's decisions —
// scope, capacity clamp, marker eligibility — and nothing else.
const curated = vi.hoisted(() => ({ terms: [] as unknown[] }))
const extracted = vi.hoisted(() => ({ terms: [] as unknown[] }))

vi.mock('@/lib/literature/vocab-curate', () => ({
  curateTerms: async () => curated.terms,
}))
vi.mock('@/lib/literature/vocab', () => ({
  extractCandidates: () => extracted.terms,
  VOCAB_TEXT_SLICE_CHARS: 60_000,
}))

import { POST as referencesPOST } from '@/app/api/project-log/[id]/references/route'
import { POST as vocabBuildPOST } from '@/app/api/literature/vocab/build/route'

let h: RoutePolicyHarness

beforeEach(() => {
  h = routeHarness()
  curated.terms = []
  extracted.terms = []
})

// ─── P2-S1: the reference cap no longer refuses an idempotent re-post ────────

describe('P2-S1 — a project-log link that already exists consumes no slot', () => {
  const FROM = 'log_from'

  beforeEach(() => {
    for (let i = 0; i < 12; i++) {
      h.seed('projectLog', {
        id: i === 0 ? FROM : `log_${i}`,
        teamId: h.ids.teamA,
        entryType: 'progress',
        stage: 'build',
        createdAt: new Date(i),
        createdBy: { name: 'Student A' },
      })
    }
    // Ten outgoing links — the cap, exactly.
    for (let i = 1; i <= 10; i++) {
      h.seed('projectLogReference', { projectLogId: FROM, referencesLogId: `log_${i}` })
    }
  })

  // Counting ALL references (the pre-fix shape) refuses this with a 400: the
  // link already exists, so it consumes no new slot. That the re-post stores
  // no SECOND row is the composite PK's job and is asserted against real
  // Postgres in test/pg/invariants.pg.test.ts — the in-memory harness has no
  // unique indexes and therefore cannot honour `skipDuplicates`.
  it('re-posting an EXISTING link at the cap is still accepted', () =>
    h.asStudentA().post(referencesPOST, FROM, { body: { targetId: 'log_3' } }).expect(201))

  it('a NEW link at the cap is refused', async () => {
    await h.asStudentA().post(referencesPOST, FROM, { body: { targetId: 'log_11' } }).expect(400)
    expect(h.rows('projectLogReference')).toHaveLength(10)
  })
})

// ─── P2-S4: the deck is per (student, LAB) ───────────────────────────────────

describe('P2-S4 — the vocabulary deck is scoped to the acting lab', () => {
  const term = (termKey: string) => ({
    termKey,
    term: termKey,
    aliases: [],
    definition: 'a definition',
    source: 'llm_definition',
    sourceEntryId: null,
    quote: null,
    llmDefined: true,
  })

  function seedPaper(id: string, teamId: string) {
    h.seed('paper', { id, teamId, status: 'ready', title: `Source ${id}`, abstract: 'a', fullText: 'f' })
  }

  it("builds a term the student already holds in ANOTHER lab's deck", async () => {
    seedPaper('paper_a', h.ids.teamA)
    // The same student's card, in a lab they are not acting as.
    h.seed('vocabCard', {
      id: 'card_elsewhere',
      userId: h.ids.studentA,
      teamId: 'some_other_lab',
      termKey: 'photosynthesis',
      term: 'photosynthesis',
    })
    extracted.terms = [term('photosynthesis')]
    curated.terms = [term('photosynthesis')]

    const body = await h.asStudentA().post(vocabBuildPOST, {}, { body: {} }).expect(200)
    expect(body.created).toBe(1)
    expect(
      h.rows('vocabCard').filter((c) => c.teamId === h.ids.teamA).map((c) => c.termKey),
    ).toEqual(['photosynthesis'])
  })

  it('still skips a term already in THIS lab’s deck', async () => {
    seedPaper('paper_a', h.ids.teamA)
    h.seed('vocabCard', {
      id: 'card_here',
      userId: h.ids.studentA,
      teamId: h.ids.teamA,
      termKey: 'photosynthesis',
      term: 'photosynthesis',
    })
    extracted.terms = [term('photosynthesis')]
    curated.terms = [term('photosynthesis')]

    const body = await h.asStudentA().post(vocabBuildPOST, {}, { body: {} }).expect(200)
    expect(body.created).toBe(0)
    expect(h.rows('vocabCard')).toHaveLength(1)
  })

  it('does not mark a paper curated when capacity dropped one of its terms', async () => {
    seedPaper('paper_a', h.ids.teamA)
    // 199 cards held → room for exactly one of the two curated terms.
    for (let i = 0; i < 199; i++) {
      h.seed('vocabCard', {
        id: `held_${i}`,
        userId: h.ids.studentA,
        teamId: h.ids.teamA,
        termKey: `held_${i}`,
        term: `held ${i}`,
      })
    }
    extracted.terms = [term('alpha'), term('beta')]
    curated.terms = [term('alpha'), term('beta')]

    const body = await h.asStudentA().post(vocabBuildPOST, {}, { body: {} }).expect(200)
    expect(body.created).toBe(1)
    expect(body.skipped).toBe(1)
    // The marker makes curation once-ever. Writing it here would bury `beta`
    // forever — the next build would skip the paper even after the student
    // deletes cards to make room.
    expect(h.rows('vocabPaperCuration')).toHaveLength(0)
  })

  it('marks the paper when every curated term was stored', async () => {
    seedPaper('paper_a', h.ids.teamA)
    extracted.terms = [term('alpha'), term('beta')]
    curated.terms = [term('alpha'), term('beta')]

    const body = await h.asStudentA().post(vocabBuildPOST, {}, { body: {} }).expect(200)
    expect(body.created).toBe(2)
    expect(h.rows('vocabPaperCuration').map((m) => m.paperId)).toEqual(['paper_a'])
  })
})
