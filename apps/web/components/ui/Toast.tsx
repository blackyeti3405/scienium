'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

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
 * Inside a FeaturePanel overlay the pill renders INTO the panel's title bar —
 * the panel body clips its own overflow, so anything positioned at the top of
 * the feature lands on the feature's own toolbar instead. On a standalone route
 * (no panel bar) it falls back to the top of the nearest positioned ancestor.
 * Horizontally centered either way; `nonce` re-mounts the pill so a rapid second
 * notice restarts its entry animation.
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
  const [bar, setBar] = useState<Element | null>(null)
  useEffect(() => setBar(document.querySelector('.feature-panel__bar')), [])

  const pill = (
    <div
      key={nonce}
      role="status"
      className={`pointer-events-none absolute left-1/2 z-[60] -translate-x-1/2 rounded-sm border px-4 py-1.5 font-pixel text-[9px] shadow-lg ${
        bar ? 'top-1/2 -translate-y-1/2' : 'top-4'
      } ${TONE_CLASSES[tone]}`}
    >
      {children}
    </div>
  )

  return bar ? createPortal(pill, bar) : pill
}
