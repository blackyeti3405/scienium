/**
 * A serialized save queue with a flush barrier, for autosaving client surfaces.
 *
 * ## The two failures this exists to stop
 *
 * **A dropped save.** The naive autosave guard is `if (saving) return`. It looks
 * like debouncing and behaves like data loss: a teacher who types a score, tabs
 * to the notes box (blur → save starts), types notes and clicks away (blur →
 * refused, because the first save is still in flight) has their notes silently
 * not persisted, on screen, with no indication. Queueing instead of refusing
 * costs one promise chain.
 *
 * **A save assumed to have landed.** `fetch(...).catch(() => {})` on a graded
 * surface produced a student who pressed "Save & exit — resume anytime" and lost
 * an exam answer. So the queue holds the unconfirmed snapshot as the RECORD of
 * failure, and clears it only when the server has confirmed *that* snapshot.
 *
 * Extracted from `components/ops/expertiseProgress.ts` (v0.54.0) when the
 * teacher rubric became the second consumer — it was deliberately left local
 * while there was only one.
 *
 * ## Contract
 *
 * - Writes are SERIALIZED, so two overlapping saves cannot commit oldest-last.
 * - Queued writes COALESCE: the queued task reads the newest snapshot at
 *   execution time, so a burst of edits costs one request, not one per edit.
 * - `unsaved` is true from the moment a save is queued until the server confirms.
 * - `flush()` drains, retries once if anything is still unsaved, and reports
 *   whether the server holds the latest. Callers refuse to proceed on `false`.
 */
export interface SaveQueue<T> {
  /** Queue a snapshot. Resolves when the queue drains; never rejects. */
  save(snapshot: T): Promise<void>
  /** Drain, retry once, and report whether the server holds the latest. */
  flush(): Promise<boolean>
  /** True while the server is not known to hold the latest snapshot. */
  readonly unsaved: boolean
}

export function createSaveQueue<T>(write: (snapshot: T) => Promise<void>): SaveQueue<T> {
  let chain: Promise<void> = Promise.resolve()
  let unsaved: T | null = null

  function run(): Promise<void> {
    chain = chain.then(async () => {
      const snapshot = unsaved
      if (snapshot === null) return
      await write(snapshot)
      // A newer snapshot queued while this was in flight is still unsaved; only
      // clear the one the server actually confirmed.
      if (unsaved === snapshot) unsaved = null
    })
    // Swallow here so one failure cannot poison every later save. `unsaved`
    // carries the failure instead — callers read it, and `flush` retries it.
    chain = chain.catch(() => {})
    return chain
  }

  return {
    save(snapshot) {
      unsaved = snapshot
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
