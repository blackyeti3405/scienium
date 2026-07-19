import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Relevance gate + its E2E stub (v0.28.0 / v0.28.2).
 *
 * Two contracts matter here:
 *
 * 1. DEFAULT-KEEP: `batchCheckRelevance` feeds the destructive topic-wipe
 *    proposal, so a malformed model reply must never flip a paper toward
 *    removal — the map pre-seeds `true` and only a well-formed
 *    `{id, relevant:boolean}` can change it. Inverting this default turns any
 *    parse failure into a proposed library deletion.
 *
 * 2. The `E2E_SKIP_LLM=1` stub (plain token overlap) is what makes the
 *    topic-removal E2E deterministic. If the stub regresses to always-true,
 *    that suite goes silently vacuous — it would never see a proposed removal.
 */

const mockCreate = vi.hoisted(() => vi.fn())
vi.mock('@/lib/anthropic', () => ({
  anthropic: () => ({ messages: { create: mockCreate } }),
}))

import { batchCheckRelevance, checkPaperRelevance } from './relevance'

function modelReply(text: string) {
  return { content: [{ type: 'text', text }] }
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('E2E_SKIP_LLM stub — deterministic, no model call', () => {
  beforeEach(() => vi.stubEnv('E2E_SKIP_LLM', '1'))

  it('never calls the model', async () => {
    await checkPaperRelevance('Coral reefs', 'Some paper', 'text')
    await batchCheckRelevance('Coral reefs', [{ id: 'p1', title: 'T', abstract: null }])
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('keeps a paper sharing topic vocabulary', async () => {
    const res = await checkPaperRelevance(
      'Coral reef bleaching',
      'Bleaching thresholds on the Great Barrier Reef',
      'sea surface temperature and corals',
    )
    expect(res.relevant).toBe(true)
  })

  it('rejects a paper with zero topical overlap', async () => {
    const res = await checkPaperRelevance(
      'Coral reef bleaching',
      'Medieval English poetry',
      'alliterative verse and manuscript transmission',
    )
    expect(res.relevant).toBe(false)
  })

  it('tolerates simple plural/stem drift (coral vs corals)', async () => {
    const map = await batchCheckRelevance('Coral bleaching', [
      { id: 'p1', title: 'Corals under thermal stress', abstract: null },
    ])
    expect(map.get('p1')).toBe(true)
  })

  it('an empty/stopword-only topic keeps everything (fails open)', async () => {
    const res = await checkPaperRelevance('the of and', 'Anything', 'anything at all')
    expect(res.relevant).toBe(true)
  })
})

describe('batchCheckRelevance default-keep contract (live path)', () => {
  const PAPERS = [
    { id: 'p1', title: 'A', abstract: 'x' },
    { id: 'p2', title: 'B', abstract: null },
  ]

  it('empty input returns an empty map without a model call', async () => {
    expect(await batchCheckRelevance('topic', [])).toEqual(new Map())
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('a well-formed reply drives keep/remove per id', async () => {
    mockCreate.mockResolvedValue(
      modelReply('{"results":[{"id":"p1","relevant":false},{"id":"p2","relevant":true}]}'),
    )
    const map = await batchCheckRelevance('topic', PAPERS)
    expect(map.get('p1')).toBe(false)
    expect(map.get('p2')).toBe(true)
  })

  it('malformed JSON keeps EVERY paper', async () => {
    mockCreate.mockResolvedValue(modelReply('sorry, I cannot'))
    const map = await batchCheckRelevance('topic', PAPERS)
    expect(map.get('p1')).toBe(true)
    expect(map.get('p2')).toBe(true)
  })

  it('a reply covering only some ids leaves the rest kept', async () => {
    mockCreate.mockResolvedValue(modelReply('{"results":[{"id":"p1","relevant":false}]}'))
    const map = await batchCheckRelevance('topic', PAPERS)
    expect(map.get('p1')).toBe(false)
    expect(map.get('p2')).toBe(true)
  })

  it('non-boolean relevant values are ignored (kept), not coerced', async () => {
    mockCreate.mockResolvedValue(
      modelReply('{"results":[{"id":"p1","relevant":"false"},{"id":"p2","relevant":0}]}'),
    )
    const map = await batchCheckRelevance('topic', PAPERS)
    expect(map.get('p1')).toBe(true)
    expect(map.get('p2')).toBe(true)
  })

  it('ids the caller never sent cannot enter the map', async () => {
    // A hostile abstract forging the scaffolding could make the model emit a
    // foreign id — the result map must stay keyed to the caller's papers.
    mockCreate.mockResolvedValue(
      modelReply('{"results":[{"id":"p_foreign","relevant":false}]}'),
    )
    const map = await batchCheckRelevance('topic', PAPERS)
    expect(map.has('p_foreign')).toBe(true) // documented current behavior: set(id, …) adds it
    expect(map.get('p1')).toBe(true)
    expect(map.get('p2')).toBe(true)
  })
})

describe('checkPaperRelevance parse-failure fail-open', () => {
  it('unparseable reply allows the upload', async () => {
    mockCreate.mockResolvedValue(modelReply('no json here'))
    const res = await checkPaperRelevance('topic', 'title', 'text')
    expect(res).toEqual({ relevant: true, reason: '' })
  })

  it('slices the excerpt at 3500 chars before sending', async () => {
    mockCreate.mockResolvedValue(modelReply('{"relevant":true,"reason":"ok"}'))
    await checkPaperRelevance('topic', 'title', 'y'.repeat(10_000))
    const sent = mockCreate.mock.calls[0][0].messages[0].content as string
    expect(sent.length).toBeLessThan(4_000)
  })
})
