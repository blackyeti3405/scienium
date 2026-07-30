'use client'

import { useEffect, useRef } from 'react'

/**
 * Mutation identity for uploads that own a piece of form state (REFACTOR2
 * P2-2).
 *
 * An upload is a mutation whose result lands seconds after the click, into a
 * form the student keeps using in the meantime. Without an identity, the
 * completion writes into whatever the slot holds *now*: a completion that
 * lands after the attachment was removed re-adds it, and one that lands after
 * the form unmounted (or was saved and reset) attaches a photo to the next
 * entry. Every upload attempt therefore takes a token; only the attempt that
 * still owns the slot may apply its result.
 *
 * `cancel()` is the other half — the barrier. Abandoning the slot (unmount,
 * discard) aborts the bytes still going out *and* bumps the token, so a
 * completion that races the abort is ignored too. The `temporary` reservation
 * the server may have written is reclaimed by the upload sweep
 * (`reclaimAbandonedAssets`); that is the release path, so nothing here needs
 * to call back to the server.
 *
 * Pure (no React) so the state machine is unit-testable in node vitest —
 * `useUploadSlot` below is the six-line React binding.
 */
export interface UploadAttempt {
  /** Identity of this attempt — pass it back to `owns`/`settle`. */
  token: number
  /** Aborted when the attempt is superseded or the slot is cancelled. */
  signal: AbortSignal
}

export interface UploadSlot {
  /** Start an attempt, superseding (and aborting) any attempt still in flight. */
  begin(): UploadAttempt
  /** True while `token` is the unsettled attempt that owns the slot. */
  owns(token: number): boolean
  /** Mark `token` finished. A superseded attempt settling is a no-op. */
  settle(token: number): void
  /** True while an attempt is in flight — the save barrier reads this. */
  pending(): boolean
  /** Abandon the slot: abort the bytes, and disown any completion still coming. */
  cancel(): void
}

export function createUploadSlot(): UploadSlot {
  let token = 0
  let inflight: AbortController | null = null

  return {
    begin() {
      inflight?.abort()
      token += 1
      inflight = new AbortController()
      return { token, signal: inflight.signal }
    },
    owns(t) {
      return t === token && inflight !== null
    },
    settle(t) {
      if (t === token) inflight = null
    },
    pending() {
      return inflight !== null
    },
    cancel() {
      inflight?.abort()
      inflight = null
      token += 1
    },
  }
}

/** One slot per component instance, cancelled when the component unmounts. */
export function useUploadSlot(): UploadSlot {
  const ref = useRef<UploadSlot | null>(null)
  ref.current ??= createUploadSlot()
  const slot = ref.current
  useEffect(() => () => slot.cancel(), [slot])
  return slot
}
