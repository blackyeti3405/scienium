import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  reads: [] as Array<{ model: string; args: unknown }>,
}))

vi.mock('@/lib/db', () => ({
  db: new Proxy(
    {},
    {
      get: (_target, model: string) => ({
        findMany: async (args: unknown) => {
          mocks.reads.push({ model, args })
          return [`row:${model}`]
        },
      }),
    },
  ),
}))

import { PER_STUDENT_INVENTORY, collectSubjectRows, deleteSubjectRows } from './inventory'

beforeEach(() => {
  mocks.reads.length = 0
})

describe('per-student inventory execution', () => {
  it('collects every entry through its declared model and subject column, in order', async () => {
    const rows = await collectSubjectRows('user_1')

    expect(Object.keys(rows)).toEqual(PER_STUDENT_INVENTORY.map((entry) => entry.key))
    expect(mocks.reads).toEqual(
      PER_STUDENT_INVENTORY.map((entry) => ({
        model: entry.model,
        args: { where: { [entry.column]: 'user_1' } },
      })),
    )
    for (const entry of PER_STUDENT_INVENTORY) {
      expect(rows[entry.key]).toEqual([`row:${entry.model}`])
    }
  })

  it('deletes every entry child-first and reports the database counts', async () => {
    const calls: Array<{ model: string; args: unknown }> = []
    const tx = new Proxy(
      {},
      {
        get: (_target, model: string) => ({
          findMany: vi.fn(),
          deleteMany: async (args: unknown) => {
            calls.push({ model, args })
            return { count: calls.length }
          },
        }),
      },
    )

    const counts = await deleteSubjectRows(tx as never, 'user_1')

    expect(calls).toEqual(
      PER_STUDENT_INVENTORY.map((entry) => ({
        model: entry.model,
        args: { where: { [entry.column]: 'user_1' } },
      })),
    )
    expect(counts).toEqual(
      Object.fromEntries(PER_STUDENT_INVENTORY.map((entry, index) => [entry.key, index + 1])),
    )
  })

  it('fails loudly instead of silently skipping an inventory model absent from the client', async () => {
    const tx = {}

    await expect(deleteSubjectRows(tx as never, 'user_1')).rejects.toThrow(
      'Unknown model in the data inventory: paperQuizAttempt',
    )
  })
})
