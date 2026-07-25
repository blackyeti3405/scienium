import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * REFACTOR2 P1-R3 (budget half), part 1 — model registry, kill switch, accounting.
 *
 * The properties that matter here are all "did money move, and did we notice":
 * a switched-off team must not reach the provider AT ALL (checking after the
 * call is worthless), a cached call must not be billed as if it weren't, and
 * the accounting must never be able to fail a request that already succeeded
 * and was already paid for.
 */

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  stream: vi.fn(),
  teamFindUnique: vi.fn(),
  usageCreate: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/anthropic', () => ({
  anthropic: () => ({ messages: { create: mocks.create, stream: mocks.stream } }),
}))
vi.mock('@/lib/observability/log', () => ({ logEvent: vi.fn() }))
vi.mock('@/lib/db', () => ({
  db: {
    team: { findUnique: mocks.teamFindUnique },
    aiUsage: { create: mocks.usageCreate },
  },
}))

import { aiCreate, AiDisabledError, assertAiSpendAllowed } from '@/lib/ai/spend'
import { withAiScope } from '@/lib/ai/scope'
import { AI_MODELS, AI_RATES, costMicros, modelFor, type AiOperationName } from '@/lib/ai/models'

const TEAM = 'team_1'
const SCOPE = { teamId: TEAM, userId: 'user_1' }

function reply(usage: Record<string, number>) {
  return { content: [{ type: 'text', text: 'ok' }], usage }
}

/** The single row `record()` wrote, if any. */
function recorded() {
  return mocks.usageCreate.mock.calls[0]?.[0]?.data
}

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.AI_KILL_SWITCH
  mocks.teamFindUnique.mockResolvedValue({ aiDisabledAt: null })
  mocks.usageCreate.mockResolvedValue({})
  mocks.create.mockResolvedValue(reply({ input_tokens: 1000, output_tokens: 100 }))
})

describe('model registry', () => {
  it('every operation resolves to a model with a published rate', () => {
    for (const op of Object.keys(AI_MODELS) as AiOperationName[]) {
      const model = modelFor(op)
      expect(AI_RATES[model], `${op} → ${model} has no rate`).toBeDefined()
    }
  })

  it('no call site carries a hardcoded model string any more', async () => {
    const { readFileSync, readdirSync, statSync } = await import('node:fs')
    const { join } = await import('node:path')
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((e) => {
        const p = join(dir, e)
        return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : []
      })
    const root = join(__dirname, '..')
    const offenders = [...walk(join(root, 'app')), ...walk(join(root, 'lib'))]
      .filter((p) => !p.endsWith('lib/ai/models.ts') && !p.includes('/content/'))
      .filter((p) => /model:\s*'claude-/.test(readFileSync(p, 'utf8')))
      .map((p) => p.slice(root.length + 1))
    expect(offenders).toEqual([])
  })
})

describe('cost', () => {
  it('prices the three input buckets separately — a cache read is not full price', () => {
    // 1000 cached-read input tokens on Sonnet 5 ($2/MTok base): 1000 x 2µ x 0.1.
    const cachedOnly = costMicros('claude-sonnet-5', {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadInputTokens: 1000,
      cacheCreationInputTokens: 0,
    })
    const uncachedOnly = costMicros('claude-sonnet-5', {
      inputTokens: 1000,
      outputTokens: 0,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
    })
    expect(uncachedOnly).toBe(2_000)
    expect(cachedOnly).toBe(200)
    // Ten of the app's paid sites lead with a cached block. Billing those reads
    // at the full input rate would overstate exactly the optimised calls.
    expect(cachedOnly).toBeLessThan(uncachedOnly)
  })

  it('charges a cache WRITE at a premium, not a discount', () => {
    const write = costMicros('claude-sonnet-5', {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 1000,
    })
    expect(write).toBe(2_500)
  })

  it('is always an integer number of micro-dollars', () => {
    const c = costMicros('claude-haiku-4-5-20251001', {
      inputTokens: 333,
      outputTokens: 777,
      cacheReadInputTokens: 91,
      cacheCreationInputTokens: 17,
    })
    expect(Number.isInteger(c)).toBe(true)
  })

  it('an unknown model costs 0 rather than throwing', () => {
    expect(
      costMicros('some-future-model', {
        inputTokens: 10_000,
        outputTokens: 10_000,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
      }),
    ).toBe(0)
  })
})

describe('kill switch', () => {
  it('the global switch stops the call BEFORE it reaches the provider', async () => {
    process.env.AI_KILL_SWITCH = '1'

    await expect(withAiScope(SCOPE, () => aiCreate('quiz_generate', { max_tokens: 10, messages: [] })))
      .rejects.toBeInstanceOf(AiDisabledError)

    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.usageCreate).not.toHaveBeenCalled()
  })

  it('reads `0` and `false` as off, so a stray value cannot wedge the app', async () => {
    for (const value of ['0', 'false', '']) {
      vi.clearAllMocks()
      mocks.teamFindUnique.mockResolvedValue({ aiDisabledAt: null })
      mocks.create.mockResolvedValue(reply({ input_tokens: 1, output_tokens: 1 }))
      process.env.AI_KILL_SWITCH = value
      await withAiScope(SCOPE, () => aiCreate('quiz_generate', { max_tokens: 10, messages: [] }))
      expect(mocks.create, `AI_KILL_SWITCH="${value}" should not block`).toHaveBeenCalled()
    }
  })

  it('a switched-off team is stopped; other teams are not', async () => {
    mocks.teamFindUnique.mockResolvedValue({ aiDisabledAt: new Date() })

    await expect(withAiScope(SCOPE, () => aiCreate('quiz_generate', { max_tokens: 10, messages: [] })))
      .rejects.toBeInstanceOf(AiDisabledError)
    expect(mocks.create).not.toHaveBeenCalled()

    mocks.teamFindUnique.mockResolvedValue({ aiDisabledAt: null })
    await withAiScope(SCOPE, () => aiCreate('quiz_generate', { max_tokens: 10, messages: [] }))
    expect(mocks.create).toHaveBeenCalledOnce()
  })

  it('FAILS CLOSED when the flag cannot be read', async () => {
    mocks.teamFindUnique.mockRejectedValue(new Error('db down'))

    await expect(withAiScope(SCOPE, () => aiCreate('quiz_generate', { max_tokens: 10, messages: [] })))
      .rejects.toBeInstanceOf(AiDisabledError)
    // "Don't know whether spending is allowed" resolves to no, like the limiter.
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('gates the streaming preflight too, where there is no status code left later', async () => {
    process.env.AI_KILL_SWITCH = 'on'
    await expect(withAiScope(SCOPE, () => assertAiSpendAllowed())).rejects.toBeInstanceOf(
      AiDisabledError,
    )
  })
})

describe('accounting', () => {
  it('records operation, model, cost, and the rate version that produced it', async () => {
    mocks.create.mockResolvedValue(
      reply({
        input_tokens: 500,
        output_tokens: 200,
        cache_read_input_tokens: 4000,
        cache_creation_input_tokens: 0,
      }),
    )

    await withAiScope(SCOPE, () => aiCreate('quiz_generate', { max_tokens: 10, messages: [] }))

    const row = recorded()
    expect(row).toMatchObject({
      operation: 'quiz_generate',
      model: 'claude-sonnet-5',
      teamId: TEAM,
      userId: 'user_1',
      inputTokens: 500,
      outputTokens: 200,
      cacheReadInputTokens: 4000,
      outcome: 'ok',
    })
    // 500 input @ $2/MTok = $0.0010
    // 4,000 cache reads @ $0.20/MTok = $0.0008
    // 200 output @ $10/MTok = $0.0020
    //                        total = $0.0038 = 3,800 µ$
    expect(row.costMicros).toBe(3_800)
    expect(row.rateVersion).toBeTruthy()
  })

  it('attributes to the team from the request scope, not the call site', async () => {
    await withAiScope({ teamId: 'team_other', userId: 'user_9' }, () =>
      aiCreate('paper_chat', { max_tokens: 10, messages: [] }),
    )
    expect(recorded()).toMatchObject({ teamId: 'team_other', userId: 'user_9' })
  })

  it('records unattributed rather than nothing when there is no scope (cron)', async () => {
    await aiCreate('paper_metadata', { max_tokens: 10, messages: [] })
    expect(recorded()).toMatchObject({ teamId: null, operation: 'paper_metadata' })
  })

  it('a failed provider call still leaves a row', async () => {
    mocks.create.mockRejectedValue(new Error('provider down'))

    await expect(
      withAiScope(SCOPE, () => aiCreate('quiz_generate', { max_tokens: 10, messages: [] })),
    ).rejects.toThrow('provider down')

    expect(recorded()).toMatchObject({ operation: 'quiz_generate', outcome: 'error' })
  })

  it('a broken accounting write NEVER fails the request that already paid', async () => {
    mocks.usageCreate.mockRejectedValue(new Error('usage table gone'))
    await expect(
      withAiScope(SCOPE, () => aiCreate('quiz_generate', { max_tokens: 10, messages: [] })),
    ).resolves.toBeDefined()
  })

  it('survives a SYNCHRONOUS accounting failure too — the case a .catch() misses', async () => {
    mocks.usageCreate.mockImplementation(() => {
      throw new Error('client not generated')
    })
    await expect(
      withAiScope(SCOPE, () => aiCreate('quiz_generate', { max_tokens: 10, messages: [] })),
    ).resolves.toBeDefined()
  })
})

describe('what this deliberately does NOT do yet', () => {
  it('does not refuse a call for being over any budget', async () => {
    // Enforcement is not here. Caps set before a week of real classroom data
    // would be a guess, and one that fires mid-lesson costs more than it saves.
    // If this test starts failing, enforcement landed — update docs/TODO.md.
    for (let i = 0; i < 50; i++) {
      await withAiScope(SCOPE, () => aiCreate('quiz_generate', { max_tokens: 10, messages: [] }))
    }
    expect(mocks.create).toHaveBeenCalledTimes(50)
  })
})
