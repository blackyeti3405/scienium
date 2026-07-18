import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Durable paper-job concurrency (PILOT-2): `processPaperJob` must claim the
 * job atomically before spending — a caller that loses the claim (count 0)
 * makes NO Anthropic call, so concurrent upload + cron + retry invocations
 * can never double-bill one paper. Failures back off while attempts remain
 * and only become a terminal paper `error` once attempts are exhausted.
 */

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  jobUpdateMany: vi.fn(),
  jobFindUnique: vi.fn(),
  jobUpdate: vi.fn((args: unknown) => args),
  paperFindUnique: vi.fn(),
  paperUpdate: vi.fn((args: unknown) => args),
  citationCreateMany: vi.fn((args: unknown) => args),
  transaction: vi.fn(() => Promise.resolve([])),
}))

vi.mock('@/lib/anthropic', () => ({
  anthropic: () => ({ messages: { create: mocks.create } }),
}))
vi.mock('@/lib/observability/log', () => ({ logEvent: vi.fn() }))
vi.mock('@/lib/db', () => ({
  db: {
    paperProcessingJob: {
      updateMany: mocks.jobUpdateMany,
      findUnique: mocks.jobFindUnique,
      update: mocks.jobUpdate,
    },
    paper: { findUnique: mocks.paperFindUnique, update: mocks.paperUpdate },
    citation: { createMany: mocks.citationCreateMany },
    $transaction: mocks.transaction,
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

beforeEach(() => {
  vi.clearAllMocks()
  mocks.jobFindUnique.mockResolvedValue({ attempts: 1 })
  mocks.paperFindUnique.mockResolvedValue(PAPER)
})

describe('processPaperJob claim discipline', () => {
  it('makes no model call when the claim is lost', async () => {
    mocks.jobUpdateMany.mockResolvedValue({ count: 0 })

    await processPaperJob('paper_1')

    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.paperFindUnique).not.toHaveBeenCalled()
  })

  it('two concurrent invocations spend exactly one model call', async () => {
    mocks.jobUpdateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 })
    mocks.create.mockResolvedValue(
      llmResponse('{"title":"Real title","authors":["Doe, Jane"],"abstract":"Short."}'),
    )

    await Promise.all([processPaperJob('paper_1'), processPaperJob('paper_1')])

    expect(mocks.create).toHaveBeenCalledOnce()
  })

  it('a successful run marks the paper ready and the job completed', async () => {
    mocks.jobUpdateMany.mockResolvedValue({ count: 1 })
    mocks.create.mockResolvedValue(
      llmResponse('{"title":"Real title","authors":["Doe, Jane"],"abstract":"Short."}'),
    )

    await processPaperJob('paper_1')

    expect(mocks.paperUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'ready' }) }),
    )
    expect(mocks.jobUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'completed' }) }),
    )
  })

  it('a failure with attempts remaining schedules a retry, not a terminal error', async () => {
    mocks.jobUpdateMany.mockResolvedValue({ count: 1 })
    mocks.jobFindUnique.mockResolvedValue({ attempts: 1 })
    mocks.create.mockRejectedValue(new Error('provider down'))

    await processPaperJob('paper_1')

    expect(mocks.paperUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'processing' } }),
    )
    const jobData = mocks.jobUpdate.mock.calls[0]![0] as {
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

    expect(mocks.paperUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'error' } }),
    )
    const jobData = mocks.jobUpdate.mock.calls[0]![0] as {
      data: { status: string; nextRunAt?: Date | null; terminalAt?: Date }
    }
    expect(jobData.data.status).toBe('failed')
    expect(jobData.data.terminalAt).toBeInstanceOf(Date)
    expect(jobData.data.nextRunAt).toBeNull()
  })
})
