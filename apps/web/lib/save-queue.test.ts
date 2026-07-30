import { describe, it, expect } from 'vitest'
import { createSaveQueue } from './save-queue'
import type { ExamProgress } from '@/components/ops/expertiseProgress'

/**
 * These pin defects REPRODUCED against two different pre-fix surfaces
 * (REFACTOR2 §0.7). The snapshot type is the clearance exam's, because that is
 * where the queue started, but every rule here is why the teacher rubric now
 * uses it too:
 *
 *  1. a rejected write left the UI clean and the server empty
 *     (`components/ops/ExpertisePanel.tsx` — `fetch(...).catch(() => {})`);
 *  2. exit proceeded while the write was in flight (same file);
 *  3. two overlapping saves could commit oldest-last;
 *  4. a save requested while one was in flight was DROPPED, not queued
 *     (`components/teacher/TeacherRubricScoring.tsx` — `if (saving) return`),
 *     which is the "coalesces, never refuses" case below.
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

describe('createSaveQueue', () => {
  it('reports the server holds the latest after a successful save', async () => {
    const route = fakeRoute()
    const saver = createSaveQueue(route.patch)

    await saver.save(progress(1))

    expect(saver.unsaved).toBe(false)
    expect(await saver.flush()).toBe(true)
    expect(route.committed).toEqual([progress(1)])
  })

  it('stays dirty when the save fails — the pre-fix code reported nothing', async () => {
    const route = fakeRoute()
    route.failNext(1)
    const saver = createSaveQueue(route.patch)

    await saver.save(progress(1))

    expect(saver.unsaved).toBe(true)
    expect(route.committed).toEqual([])
  })

  it('does not reject, so one failure cannot poison later saves', async () => {
    const route = fakeRoute()
    route.failNext(1)
    const saver = createSaveQueue(route.patch)

    await expect(saver.save(progress(1))).resolves.toBeUndefined()
    await saver.save(progress(2))

    expect(saver.unsaved).toBe(false)
    expect(route.committed).toEqual([progress(2)])
  })

  it('flush retries a failed save and then confirms', async () => {
    const route = fakeRoute()
    route.failNext(1)
    const saver = createSaveQueue(route.patch)
    await saver.save(progress(1))
    expect(saver.unsaved).toBe(true)

    expect(await saver.flush()).toBe(true)
    expect(route.committed).toEqual([progress(1)])
  })

  it('flush reports FALSE when the retry also fails — exit must be refused', async () => {
    const route = fakeRoute()
    route.failNext(2)
    const saver = createSaveQueue(route.patch)
    await saver.save(progress(1))

    expect(await saver.flush()).toBe(false)
    expect(saver.unsaved).toBe(true)
    expect(route.committed).toEqual([])
  })

  it('flush waits for a write that is still in flight (the "save & exit" defect)', async () => {
    const route = fakeRoute()
    const saver = createSaveQueue(route.patch)

    route.pause()
    saver.save(progress(1)) // fired from submitAnswer, not awaited by the caller
    expect(route.committed).toEqual([]) // nothing has landed yet

    const flushed = saver.flush()
    route.release()

    expect(await flushed).toBe(true)
    expect(route.committed).toEqual([progress(1)])
  })

  it('QUEUES a save requested mid-flight — `if (saving) return` dropped it', async () => {
    // Reproduced against the pre-fix teacher rubric card: a teacher types a
    // score, tabs to the notes box (blur → save starts), types notes, clicks
    // away (blur → refused because a save was in flight). Two blurs, ONE PUT,
    // and the one that went out carried the EMPTY notes.
    const route = fakeRoute()
    const saver = createSaveQueue(route.patch)

    route.pause()
    const first = saver.save(progress(1)) // score only
    const second = saver.save(progress(2)) // score + notes
    route.release()
    await Promise.all([first, second])

    expect(route.committed).not.toEqual([progress(1)]) // the pre-fix outcome
    expect(route.committed.at(-1)).toEqual(progress(2))
  })

  it('serializes overlapping saves so the newest snapshot is what the server holds', async () => {
    const route = fakeRoute()
    const saver = createSaveQueue(route.patch)

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

  it('coalescing is per QUEUE — two entities need two queues', async () => {
    // `SourceReader` reuses one component across sources. A single shared queue
    // would let a reflection queued for the source the student just left be
    // replaced by one for the source they opened, and it would never be written.
    // The reader builds a fresh queue per node; this pins why.
    const route = fakeRoute()
    const shared = createSaveQueue(route.patch)

    route.pause()
    const a = shared.save({ examId: 'A', answers: { q1: 'left behind' }, progressIndex: 1 })
    const b = shared.save({ examId: 'B', answers: { q1: 'opened next' }, progressIndex: 1 })
    route.release()
    await Promise.all([a, b])

    expect(route.committed.map((c) => c.examId)).toEqual(['B']) // A never went out
  })

  it('a snapshot queued during an in-flight save stays dirty until it lands', async () => {
    const route = fakeRoute()
    const saver = createSaveQueue(route.patch)

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
