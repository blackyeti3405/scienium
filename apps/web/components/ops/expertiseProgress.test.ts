import { describe, it, expect } from 'vitest'
import { createProgressSaver, type ExamProgress } from './expertiseProgress'

/**
 * These pin the three defects that were REPRODUCED against the pre-fix panel
 * (REFACTOR2 §0.7, `components/ops/ExpertisePanel.tsx`), where progress was
 * written with `fetch(...).catch(() => {})` and the exit button never awaited it:
 *
 *  1. a rejected PATCH left the UI clean and the server empty;
 *  2. exit proceeded while the write was in flight;
 *  3. two overlapping saves could commit oldest-last.
 */

function progress(n: number): ExamProgress {
  return { examId: 'exam1', answers: { [`q${n}`]: `answer ${n}` }, progressIndex: n }
}

/** A fake route whose latency and failures are controlled per call. */
function fakeRoute() {
  const committed: ExamProgress[] = []
  const gates: Array<() => void> = []
  let failures = 0
  let paused = false

  return {
    committed,
    failNext(count: number) {
      failures = count
    },
    pause() {
      paused = true
    },
    /** Release every in-flight call, in the order it was made. */
    release() {
      paused = false
      for (const open of gates.splice(0)) open()
    },
    async patch(p: ExamProgress) {
      if (paused) await new Promise<void>((resolve) => gates.push(resolve))
      if (failures > 0) {
        failures -= 1
        throw new Error('save failed')
      }
      committed.push(p)
    },
  }
}

describe('createProgressSaver', () => {
  it('reports the server holds the latest after a successful save', async () => {
    const route = fakeRoute()
    const saver = createProgressSaver(route.patch)

    await saver.save(progress(1))

    expect(saver.unsaved).toBe(false)
    expect(await saver.flush()).toBe(true)
    expect(route.committed).toEqual([progress(1)])
  })

  it('stays dirty when the save fails — the pre-fix code reported nothing', async () => {
    const route = fakeRoute()
    route.failNext(1)
    const saver = createProgressSaver(route.patch)

    await saver.save(progress(1))

    expect(saver.unsaved).toBe(true)
    expect(route.committed).toEqual([])
  })

  it('does not reject, so one failure cannot poison later saves', async () => {
    const route = fakeRoute()
    route.failNext(1)
    const saver = createProgressSaver(route.patch)

    await expect(saver.save(progress(1))).resolves.toBeUndefined()
    await saver.save(progress(2))

    expect(saver.unsaved).toBe(false)
    expect(route.committed).toEqual([progress(2)])
  })

  it('flush retries a failed save and then confirms', async () => {
    const route = fakeRoute()
    route.failNext(1)
    const saver = createProgressSaver(route.patch)
    await saver.save(progress(1))
    expect(saver.unsaved).toBe(true)

    expect(await saver.flush()).toBe(true)
    expect(route.committed).toEqual([progress(1)])
  })

  it('flush reports FALSE when the retry also fails — exit must be refused', async () => {
    const route = fakeRoute()
    route.failNext(2)
    const saver = createProgressSaver(route.patch)
    await saver.save(progress(1))

    expect(await saver.flush()).toBe(false)
    expect(saver.unsaved).toBe(true)
    expect(route.committed).toEqual([])
  })

  it('flush waits for a write that is still in flight (the "save & exit" defect)', async () => {
    const route = fakeRoute()
    const saver = createProgressSaver(route.patch)

    route.pause()
    saver.save(progress(1)) // fired from submitAnswer, not awaited by the caller
    expect(route.committed).toEqual([]) // nothing has landed yet

    const flushed = saver.flush()
    route.release()

    expect(await flushed).toBe(true)
    expect(route.committed).toEqual([progress(1)])
  })

  it('serializes overlapping saves so the newest snapshot is what the server holds', async () => {
    const route = fakeRoute()
    const saver = createProgressSaver(route.patch)

    route.pause()
    const first = saver.save(progress(1))
    const second = saver.save(progress(2))
    route.release()
    await Promise.all([first, second])

    // The queued write reads the newest snapshot at execution time, so the two
    // coalesce — what matters is that q2 is never overwritten by q1.
    expect(route.committed.at(-1)).toEqual(progress(2))
    expect(saver.unsaved).toBe(false)
  })

  it('a snapshot queued during an in-flight save stays dirty until it lands', async () => {
    const route = fakeRoute()
    const saver = createProgressSaver(route.patch)

    route.pause()
    const first = saver.save(progress(1))
    route.release()
    await first
    expect(saver.unsaved).toBe(false)

    route.pause()
    const second = saver.save(progress(2))
    expect(saver.unsaved).toBe(true)
    route.release()
    await second
    expect(saver.unsaved).toBe(false)
    expect(route.committed).toEqual([progress(1), progress(2)])
  })
})
