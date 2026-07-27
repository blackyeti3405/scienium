import { z } from 'zod'
import { requestJson } from '@/lib/api/client'
import { createSaveQueue, type SaveQueue } from '@/lib/save-queue'

/** One PATCH-able snapshot of an in-progress clearance exam. */
export interface ExamProgress {
  examId: string
  answers: Record<string, string>
  progressIndex: number
}

export type ProgressSaver = SaveQueue<ExamProgress>

/**
 * The clearance exam's progress saver.
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
 * The ordering rules live in `lib/save-queue.ts` — DOM-free, so the fix is
 * testable without a browser, which is why it is not four lines inside the panel.
 */
export function createProgressSaver(
  patch: (progress: ExamProgress) => Promise<void>,
): ProgressSaver {
  return createSaveQueue(patch)
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
