import { describe, expect, it } from 'vitest'
import { mapWithConcurrency } from './concurrency'

/**
 * `mapWithConcurrency` had zero tests (audit §3). It is the only thing between
 * `cron/papers`'s batch of 30 and thirty simultaneous Anthropic calls on a
 * database URL configured with `connection_limit=1`.
 *
 * The failure modes are arithmetic, silent and expensive:
 *  - a shared-cursor off-by-one skips or double-processes a paper job;
 *  - `new Array(n)` + index writes are what preserve order, so a `push` would
 *    return results in COMPLETION order and mis-pair them with their inputs;
 *  - `Math.max(1, …)` is what stops `limit: 0` from spawning zero workers and
 *    resolving instantly having done nothing at all.
 */

/** Runs `fn`, recording peak simultaneous in-flight calls. */
function tracker<T, R>(fn: (item: T) => Promise<R>) {
  let inFlight = 0
  let peak = 0
  return {
    peak: () => peak,
    wrapped: async (item: T) => {
      inFlight++
      peak = Math.max(peak, inFlight)
      try {
        return await fn(item)
      } finally {
        inFlight--
      }
    },
  }
}

/** Resolves after `ms` of real time — enough to force genuine interleaving. */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('mapWithConcurrency', () => {
  it('preserves INPUT order even when later items finish first', async () => {
    // Item 0 is the slowest, so completion order is the exact reverse of input
    // order. A `push`-based implementation returns [d, c, b, a] here.
    const items = ['a', 'b', 'c', 'd']
    const out = await mapWithConcurrency(items, 4, async (x) => {
      await sleep(({ a: 20, b: 15, c: 10, d: 1 } as Record<string, number>)[x]!)
      return x.toUpperCase()
    })

    expect(out).toEqual(['A', 'B', 'C', 'D'])
  })

  it('runs every item exactly once — no skips, no doubles', async () => {
    const items = Array.from({ length: 37 }, (_, i) => i)
    const seen: number[] = []

    const out = await mapWithConcurrency(items, 4, async (i) => {
      await sleep(i % 3)
      seen.push(i)
      return i * 2
    })

    expect(seen.sort((a, b) => a - b)).toEqual(items)
    expect(out).toEqual(items.map((i) => i * 2))
  })

  it('never exceeds the limit', async () => {
    const t = tracker(async (i: number) => {
      await sleep(5)
      return i
    })

    await mapWithConcurrency(Array.from({ length: 30 }, (_, i) => i), 4, t.wrapped)

    expect(t.peak()).toBe(4)
  })

  // NOT tested, deliberately: `Math.min(limit, items.length)`. Removing it
  // spawns `limit` workers instead of `items.length`, but the surplus ones find
  // the cursor exhausted on their first read and return without calling `fn`.
  // Nothing observable from outside changes — verified by reverting it to
  // `Math.max(1, limit)` and watching all 8 tests below stay green. It is a
  // no-op-closure optimisation, not a guard, so there is nothing here to pin.

  it('spawns at most one worker per item — no work is done by the surplus', async () => {
    const t = tracker(async (i: number) => {
      await sleep(5)
      return i
    })

    await mapWithConcurrency([1, 2], 30, t.wrapped)

    expect(t.peak()).toBe(2)
  })

  it('still runs everything when limit is 0 or negative', async () => {
    // `Math.max(1, …)`. Without it `Array.from({ length: 0 })` spawns no
    // workers, `Promise.all([])` resolves at once, and the caller gets a
    // full-length array of `undefined` having processed nothing — a whole
    // batch of paper jobs silently dropped with a 200 response.
    expect(await mapWithConcurrency([1, 2, 3], 0, async (i) => i * 10)).toEqual([10, 20, 30])
    expect(await mapWithConcurrency([1, 2, 3], -5, async (i) => i * 10)).toEqual([10, 20, 30])
  })

  it('is serial at limit 1', async () => {
    const order: string[] = []
    await mapWithConcurrency([30, 1, 1], 1, async (ms) => {
      order.push(`start:${ms}`)
      await sleep(ms)
      order.push(`end:${ms}`)
    })

    expect(order).toEqual(['start:30', 'end:30', 'start:1', 'end:1', 'start:1', 'end:1'])
  })

  it('returns an empty array for no items, without calling fn', async () => {
    let calls = 0
    const out = await mapWithConcurrency([], 4, async () => {
      calls++
      return 1
    })

    expect(out).toEqual([])
    expect(calls).toBe(0)
  })

  it('a rejecting item rejects the whole map', async () => {
    // Documented behaviour, not an accident: `cron/papers` passes
    // `processPaperJob`, which handles its own failures. If that ever stopped
    // being true, this is where the change becomes visible.
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async (i) => {
        if (i === 2) throw new Error('job blew up')
        return i
      }),
    ).rejects.toThrow('job blew up')
  })

  it('a rejection does not strand the pool', async () => {
    // The rejecting worker exits its loop; the OTHER workers keep draining the
    // shared cursor. That matters because the reject propagates immediately,
    // while the survivors are still running — an implementation that parked the
    // cursor on the first throw would leave the tail of the batch unattempted
    // AND unrejected (a cron that reports one failure and silently skips ten).
    const attempted: number[] = []
    let inFlight = 0
    let peak = 0

    const run = mapWithConcurrency(Array.from({ length: 12 }, (_, i) => i), 3, async (i) => {
      attempted.push(i)
      inFlight++
      peak = Math.max(peak, inFlight)
      try {
        await sleep(2)
        if (i === 3) throw new Error('job 3 blew up')
        return i
      } finally {
        inFlight--
      }
    })

    await expect(run).rejects.toThrow('job 3 blew up')

    await sleep(60)
    expect(attempted.sort((a, b) => a - b)).toEqual(Array.from({ length: 12 }, (_, i) => i))
    expect(inFlight).toBe(0) // nothing left holding a slot
    expect(peak).toBe(3) // and the cap held while it happened
  })
})
