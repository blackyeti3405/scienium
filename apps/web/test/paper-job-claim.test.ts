import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Durable paper-job concurrency (PILOT-2 + REFACTOR2 P1-S5).
 *
 * Two properties, not one:
 *  1. `processPaperJob` claims the job atomically before spending — a caller
 *     that loses the claim (count 0) makes NO Anthropic call.
 *  2. The claim is FENCED. The lease permits a stale takeover after five
 *     minutes, so a slow worker can come back holding a claim it no longer
 *     owns. Every terminal write is conditional on the claim token written at
 *     claim time, and a worker whose token no longer matches writes NOTHING —
 *     not the job row, not the paper, not the citation.
 */

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  jobUpdateMany: vi.fn(),
  jobFindUnique: vi.fn(),
  paperFindUnique: vi.fn(),
  // The interactive-transaction client is a distinct object in Prisma; keeping
  // separate mocks keeps "the claim" and "the terminal write" distinguishable.
  txJobUpdateMany: vi.fn(),
  txPaperUpdate: vi.fn((args: unknown) => args),
  txCitationCreateMany: vi.fn((args: unknown) => args),
}))

vi.mock('@/lib/anthropic', () => ({
  anthropic: () => ({ messages: { create: mocks.create } }),
}))
vi.mock('@/lib/observability/log', () => ({ logEvent: vi.fn() }))
vi.mock('@/lib/db', () => ({
  db: {
    paperProcessingJob: { updateMany: mocks.jobUpdateMany, findUnique: mocks.jobFindUnique },
    paper: { findUnique: mocks.paperFindUnique },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        paperProcessingJob: { updateMany: mocks.txJobUpdateMany },
        paper: { update: mocks.txPaperUpdate },
        citation: { createMany: mocks.txCitationCreateMany },
      }),
  },
}))

import { processPaperJob } from '@/lib/literature/process-paper'

const PAPER = {
  id: 'paper_1',
  teamId: 'team_1',
  title: 'Uploaded title',
  fullText: 'Full text of the paper about basil growth.',
  fileUrl: null,
}

function llmResponse(json: string) {
  return { content: [{ type: 'text', text: json }], usage: { input_tokens: 1, output_tokens: 1 } }
}

const GOOD_METADATA = '{"title":"Real title","authors":["Doe, Jane"],"abstract":"Short."}'

/** The claim token this attempt wrote, as observed on the claiming `updateMany`. */
function claimedToken(): string {
  const args = mocks.jobUpdateMany.mock.calls[0]![0] as { data: { claimToken?: string } }
  return args.data.claimToken!
}

/** The `where` of the terminal write inside the transaction. */
function terminalWhere(): Record<string, unknown> {
  const args = mocks.txJobUpdateMany.mock.calls[0]![0] as { where: Record<string, unknown> }
  return args.where
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.jobFindUnique.mockResolvedValue({ attempts: 1 })
  mocks.paperFindUnique.mockResolvedValue(PAPER)
  mocks.txJobUpdateMany.mockResolvedValue({ count: 1 })
})

describe('processPaperJob claim discipline', () => {
  it('makes no model call when the claim is lost', async () => {
    mocks.jobUpdateMany.mockResolvedValue({ count: 0 })

    await processPaperJob('paper_1')

    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.paperFindUnique).not.toHaveBeenCalled()
  })

  it('two concurrent invocations spend exactly one model call', async () => {
    mocks.jobUpdateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 })
    mocks.create.mockResolvedValue(llmResponse(GOOD_METADATA))

    await Promise.all([processPaperJob('paper_1'), processPaperJob('paper_1')])

    expect(mocks.create).toHaveBeenCalledOnce()
  })

  it('a successful run marks the paper ready and the job completed', async () => {
    mocks.jobUpdateMany.mockResolvedValue({ count: 1 })
    mocks.create.mockResolvedValue(llmResponse(GOOD_METADATA))

    await processPaperJob('paper_1')

    expect(mocks.txPaperUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'ready' }) }),
    )
    expect(mocks.txJobUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'completed' }) }),
    )
  })

  it('a failure with attempts remaining schedules a retry, not a terminal error', async () => {
    mocks.jobUpdateMany.mockResolvedValue({ count: 1 })
    mocks.jobFindUnique.mockResolvedValue({ attempts: 1 })
    mocks.create.mockRejectedValue(new Error('provider down'))

    await processPaperJob('paper_1')

    expect(mocks.txPaperUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'processing' } }),
    )
    const jobData = mocks.txJobUpdateMany.mock.calls[0]![0] as {
      data: { status: string; nextRunAt?: Date; terminalAt?: Date }
    }
    expect(jobData.data.status).toBe('failed')
    expect(jobData.data.nextRunAt).toBeInstanceOf(Date)
    expect(jobData.data.terminalAt).toBeUndefined()
  })

  it('a failure on the final attempt is terminal: paper error, no next run', async () => {
    mocks.jobUpdateMany.mockResolvedValue({ count: 1 })
    mocks.jobFindUnique.mockResolvedValue({ attempts: 3 })
    mocks.create.mockRejectedValue(new Error('provider down'))

    await processPaperJob('paper_1')

    expect(mocks.txPaperUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'error' } }),
    )
    const jobData = mocks.txJobUpdateMany.mock.calls[0]![0] as {
      data: { status: string; nextRunAt?: Date | null; terminalAt?: Date }
    }
    expect(jobData.data.status).toBe('failed')
    expect(jobData.data.terminalAt).toBeInstanceOf(Date)
    expect(jobData.data.nextRunAt).toBeNull()
  })
})

describe('P1-S5 — the claim is fenced against a stale takeover', () => {
  it('claims with a fresh token and predicates the terminal write on it', async () => {
    mocks.jobUpdateMany.mockResolvedValue({ count: 1 })
    mocks.create.mockResolvedValue(llmResponse(GOOD_METADATA))

    await processPaperJob('paper_1')

    const token = claimedToken()
    expect(token).toMatch(/^[0-9a-f-]{36}$/)
    // Status AND token: a takeover rewrites the token, so the old owner's write
    // matches nothing even though the row is `running` again.
    expect(terminalWhere()).toEqual({ paperId: 'paper_1', status: 'running', claimToken: token })
  })

  it('a fresh token is minted per attempt, so a retry does not inherit the old fence', async () => {
    mocks.jobUpdateMany.mockResolvedValue({ count: 1 })
    mocks.create.mockResolvedValue(llmResponse(GOOD_METADATA))

    await processPaperJob('paper_1')
    const first = claimedToken()
    vi.clearAllMocks()
    mocks.jobFindUnique.mockResolvedValue({ attempts: 2 })
    mocks.paperFindUnique.mockResolvedValue(PAPER)
    mocks.txJobUpdateMany.mockResolvedValue({ count: 1 })
    mocks.jobUpdateMany.mockResolvedValue({ count: 1 })
    mocks.create.mockResolvedValue(llmResponse(GOOD_METADATA))

    await processPaperJob('paper_1')

    expect(claimedToken()).not.toBe(first)
  })

  it('a taken-over worker cannot overwrite the new owner with a SUCCESS', async () => {
    mocks.jobUpdateMany.mockResolvedValue({ count: 1 })
    mocks.create.mockResolvedValue(llmResponse(GOOD_METADATA))
    // The lease elapsed during the model call and another worker re-claimed the
    // row, rewriting `claim_token`. This worker's conditional write matches nothing.
    mocks.txJobUpdateMany.mockResolvedValue({ count: 0 })

    await processPaperJob('paper_1')

    // The whole transaction rolls back: no `ready`, no citation, no second write.
    expect(mocks.txPaperUpdate).not.toHaveBeenCalled()
    expect(mocks.txCitationCreateMany).not.toHaveBeenCalled()
    expect(mocks.txJobUpdateMany).toHaveBeenCalledOnce()
  })

  it('a taken-over worker cannot overwrite the new owner with a FAILURE', async () => {
    mocks.jobUpdateMany.mockResolvedValue({ count: 1 })
    mocks.create.mockRejectedValue(new Error('provider down'))
    mocks.txJobUpdateMany.mockResolvedValue({ count: 0 })

    await processPaperJob('paper_1')

    expect(mocks.txPaperUpdate).not.toHaveBeenCalled()
    expect(mocks.txJobUpdateMany).toHaveBeenCalledOnce()
  })

  it('a lost SUCCESS claim does not fall through and record a failure instead', async () => {
    mocks.jobUpdateMany.mockResolvedValue({ count: 1 })
    mocks.create.mockResolvedValue(llmResponse(GOOD_METADATA))
    mocks.txJobUpdateMany.mockResolvedValue({ count: 0 })

    await processPaperJob('paper_1')

    // Exactly one attempted terminal write, and it was the `completed` one. The
    // rollback must not be re-entered by the catch block as a `failed` write.
    const statuses = mocks.txJobUpdateMany.mock.calls.map(
      (c) => (c[0] as { data: { status: string } }).data.status,
    )
    expect(statuses).toEqual(['completed'])
  })
})
