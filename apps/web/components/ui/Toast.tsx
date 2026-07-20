'use client'

import type { ReactNode } from 'react'

/**
 * Floating pixel-styled notice pill — THE shared primitive for transient
 * feedback (KP awards, save confirmations, request failures). Replaces the
 * hand-rolled floating notices scattered across features; pair with
 * `useAutoDismiss` for the timed-clear idiom.
 *
 *   {notice && (
 *     <Toast tone="kp" nonce={notice.nonce}>
 *       Saved!
 *     </Toast>
 *   )}
 *
 * Renders absolutely positioned against the nearest positioned ancestor (the
 * feature shell), horizontally centered. `nonce` re-mounts the pill so a rapid
 * second notice restarts its entry animation.
 */
export type ToastTone = 'kp' | 'error'

const TONE_CLASSES: Record<ToastTone, string> = {
  kp: 'border-[#F5C518]/50 bg-[#F5C518]/15 text-[#F5C518]',
  error: 'border-red-400/50 bg-red-400/10 text-red-300',
}

export interface ToastProps {
  tone?: ToastTone
  /** Change to re-mount (restart animation) when firing back-to-back notices. */
  nonce?: string | number
  children: ReactNode
}

export function Toast({ tone = 'kp', nonce, children }: ToastProps) {
  return (
    <div
      key={nonce}
      role="status"
      className={`pointer-events-none absolute top-4 left-1/2 z-[60] -translate-x-1/2 rounded-sm border px-4 py-2 font-pixel text-[9px] shadow-lg ${TONE_CLASSES[tone]}`}
    >
      {children}
    </div>
  )
}
