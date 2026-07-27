import { z } from 'zod'
import { requestJson } from '@/lib/api/client'

/** One PATCH-able snapshot of an in-progress clearance exam. */
export interface ExamProgress {
  examId: string
  answers: Record<string, string>
  progressIndex: number
}

/**
 * Serialized progress saver with a flush barrier, for the clearance exam.
 *
 * ## Why this is a module and not four lines inside the panel
 *
 * The panel used to write progress with `fetch(...).catch(() => {})` — the
 * response status was never read and every failure was swallowed. On a GRADED
 * surface that means a student answers a question, sees it in the chat, presses
 * a button labelled "Save & exit — resume anytime", and resumes to find the
 * answer gone, with no message at any point. That button also fired the status
 * GET in the same tick as the still-in-flight PATCH, so the GET could read the
 * pre-save row and hand the student back a *shorter* exam even when the write
 * did land.
 *
 * Both are ordinary-timing bugs, not races you have to engineer — so the fix has
 * to be testable without a browser, which is why the logic lives here and the
 * panel only renders what it reports.
 *
 * ## Contract
 *
 * - Writes are SERIALIZED. Two overlapping saves cannot commit out of order and
 *   leave the server holding the older answer set.
 * - `unsaved` is the record of failure. It is set the moment a save is queued
 *   and cleared only when the server has confirmed *that* snapshot, so a save
 *   that threw stays visibly dirty instead of being lost.
 * - `flush()` awaits the queue, retries once if anything is still unsaved, and
 *   answers whether the server holds the latest. Exit is refused when it does
 *   not — the same "don't proceed past an unlanded write" rule the synthesis
 *   matrix uses before it spends (`useSynthesisMatrix.flushBeforeCheck`).
 */
export interface ProgressSaver {
  /** Queue a snapshot. Resolves when the queue drains; never rejects. */
  save(progress: ExamProgress): Promise<void>
  /** Drain, retry once, and report whether the server holds the latest. */
  flush(): Promise<boolean>
  /** True while the server is not known to hold the latest snapshot. */
  readonly unsaved: boolean
}

export function createProgressSaver(
  patch: (progress: ExamProgress) => Promise<void>,
): ProgressSaver {
  let chain: Promise<void> = Promise.resolve()
  let unsaved: ExamProgress | null = null

  function run(): Promise<void> {
    chain = chain.then(async () => {
      const snapshot = unsaved
      if (!snapshot) return
      await patch(snapshot)
      // A newer snapshot queued while this was in flight is still unsaved; only
      // clear the one the server actually confirmed.
      if (unsaved === snapshot) unsaved = null
    })
    // Swallow here so one failure cannot poison every later save. `unsaved`
    // carries the failure instead — the panel reads it, and `flush` retries it.
    chain = chain.catch(() => {})
    return chain
  }

  return {
    save(progress) {
      unsaved = progress
      return run()
    },
    async flush() {
      // One queued no-op does both jobs: it lands behind any write already in
      // flight, and it retries whatever that write failed to deliver.
      await run()
      return unsaved === null
    },
    get unsaved() {
      return unsaved !== null
    },
  }
}

const PatchAck = z.object({ ok: z.boolean() })

/** The real transport: PATCH /api/expertise, throwing `ApiError` on non-2xx. */
export async function patchExamProgress(progress: ExamProgress): Promise<void> {
  await requestJson('/api/expertise', PatchAck, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(progress),
  })
}
