import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VOCAB_MAX_TERMS_PER_PAPER, type ExtractedTerm } from './vocab'

const mocks = vi.hoisted(() => ({
  aiCreate: vi.fn(),
  logEvent: vi.fn(),
}))

vi.mock('@/lib/ai/spend', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/ai/spend')>()),
  aiCreate: mocks.aiCreate,
}))
vi.mock('@/lib/observability/log', () => ({ logEvent: mocks.logEvent }))

import { curateTerms } from './vocab-curate'

const candidate = (
  id: number,
  source: ExtractedTerm['source'] = 'paper_context',
  definition = '',
): ExtractedTerm => ({
  termKey: `term-${id}`,
  term: `Term ${id}`,
  aliases: [],
  definition,
  source,
  sourceEntryId: source.startsWith('paper_') ? null : `source-${id}`,
  quote: `Term ${id} appears here.`,
  score: 10 - id,
})

const reply = (selected: unknown, stopReason = 'end_turn') =>
  ({
    content: [{ type: 'text', text: JSON.stringify({ selected }) }],
    stop_reason: stopReason,
  }) as never

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.E2E_SKIP_LLM
})

afterEach(() => {
  delete process.env.E2E_SKIP_LLM
})

describe('curateTerms', () => {
  it('spends nothing when extraction found no candidates', async () => {
    await expect(
      curateTerms({ paperTitle: 'Paper', excerpt: 'Text', candidates: [] }),
    ).resolves.toEqual([])
    expect(mocks.aiCreate).not.toHaveBeenCalled()
  })

  it('uses a deterministic, capped, grounded E2E path without a model call', async () => {
    process.env.E2E_SKIP_LLM = '1'
    const candidates = Array.from({ length: 15 }, (_, index) =>
      index === 0
        ? candidate(index, 'research_glossary', 'An authored definition.')
        : candidate(index, 'paper_acronym'),
    )

    const curated = await curateTerms({ paperTitle: 'Paper', excerpt: 'Text', candidates })
    expect(curated).toHaveLength(VOCAB_MAX_TERMS_PER_PAPER)
    expect(curated[0]).toMatchObject({
      definition: 'An authored definition.',
      source: 'research_glossary',
      llmDefined: false,
    })
    expect(curated[1]).toMatchObject({ source: 'llm_definition', llmDefined: true })
    expect(mocks.aiCreate).not.toHaveBeenCalled()
  })

  it('allowlists candidate ids, deduplicates keys and preserves authored definitions', async () => {
    const candidates = [
      candidate(0, 'research_glossary', 'Trusted authored text.'),
      candidate(1, 'paper_context'),
      { ...candidate(2, 'paper_context'), termKey: 'term-1' },
      candidate(3, 'paper_acronym'),
    ]
    mocks.aiCreate.mockResolvedValue(
      reply([
        { id: 999, definition: 'Invented' },
        { id: 0, definition: 'Model must not replace this' },
        { id: 1, definition: '  A grounded model definition.  ' },
        { id: 2, definition: 'Duplicate key' },
        { id: 3, definition: '   ' },
      ]),
    )

    await expect(
      curateTerms({ paperTitle: 'Paper', excerpt: 'Text', candidates }),
    ).resolves.toEqual([
      { ...candidates[0], definition: 'Trusted authored text.', source: 'research_glossary', llmDefined: false },
      { ...candidates[1], definition: 'A grounded model definition.', source: 'llm_definition', llmDefined: true },
    ])
  })

  it('caps hostile over-selection even when every returned id is valid', async () => {
    const candidates = Array.from({ length: 20 }, (_, index) => candidate(index))
    mocks.aiCreate.mockResolvedValue(
      reply(candidates.map((_, id) => ({ id, definition: `Definition ${id}` }))),
    )

    const curated = await curateTerms({ paperTitle: 'Paper', excerpt: 'Text', candidates })
    expect(curated).toHaveLength(VOCAB_MAX_TERMS_PER_PAPER)
    expect(curated.at(-1)?.termKey).toBe(`term-${VOCAB_MAX_TERMS_PER_PAPER - 1}`)
  })

  it('rejects malformed or truncated output and logs only parser metadata', async () => {
    mocks.aiCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{"selected":[' }],
      stop_reason: 'max_tokens',
    })

    await expect(
      curateTerms({ paperTitle: 'SECRET TITLE', excerpt: 'SECRET TEXT', candidates: [candidate(0)] }),
    ).resolves.toEqual([])
    expect(mocks.logEvent).toHaveBeenCalledWith({
      event: 'vocab_curate.parse_failed',
      outcome: 'error',
      detail: expect.stringContaining('reason=truncated'),
    })
    expect(JSON.stringify(mocks.logEvent.mock.calls)).not.toContain('SECRET')
  })

  it('caps the paper excerpt and requests strict structured output once', async () => {
    mocks.aiCreate.mockResolvedValue(reply([{ id: 0, definition: 'Definition' }]))

    await curateTerms({
      paperTitle: 'Paper',
      excerpt: 'x'.repeat(7000),
      candidates: [candidate(0)],
    })

    expect(mocks.aiCreate).toHaveBeenCalledOnce()
    const [operation, request] = mocks.aiCreate.mock.calls[0]
    expect(operation).toBe('vocab_curate')
    expect(request.output_config.format.type).toBe('json_schema')
    expect(request.messages[0].content).toContain('x'.repeat(6000))
    expect(request.messages[0].content).not.toContain('x'.repeat(6001))
  })

  it('surfaces provider failure so the route cannot persist an uncurated deck', async () => {
    mocks.aiCreate.mockRejectedValue(new Error('provider unavailable'))

    await expect(
      curateTerms({ paperTitle: 'Paper', excerpt: 'Text', candidates: [candidate(0)] }),
    ).rejects.toThrow('provider unavailable')
  })
})
