'use client'

import { useEffect } from 'react'

/**
 * Shared body for the route-group `error.tsx` boundaries (BLK-8). Without
 * these, one component throw (usually a `.map` over an unexpected JSON
 * payload) bubbles to Next's blank "Application error" screen — and when the
 * bad data is deterministic, reload re-crashes, a dead-end for a student
 * mid-class. This surfaces a pixel-styled reset UI instead.
 */
export function RouteError({
  error,
  reset,
  label = 'Something broke on this screen.',
}: {
  error: Error & { digest?: string }
  reset: () => void
  label?: string
}) {
  useEffect(() => {
    console.error('[route-error]', error)
  }, [error])

  return (
    <div className="flex h-full min-h-[60vh] w-full flex-col items-center justify-center gap-4 bg-[#0d1b2e] px-6 text-center">
      <span className="text-2xl">⚠️</span>
      <p className="font-pixel text-[10px] text-white">{label}</p>
      <p className="max-w-sm text-[13px] leading-relaxed text-white/50">
        Your work is saved on the server — this is just a display problem. Try again, and if it
        keeps happening tell your teacher.
      </p>
      <div className="flex gap-2 pt-1">
        <button
          onClick={reset}
          className="font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] px-4 py-2.5 rounded-sm hover:brightness-110 transition-all"
        >
          Try again
        </button>
        <button
          onClick={() => (window.location.href = '/lab')}
          className="font-pixel text-[8px] border border-white/20 text-white/60 px-4 py-2.5 rounded-sm hover:border-white/40 hover:text-white/80 transition-colors"
        >
          Back to the lab
        </button>
      </div>
    </div>
  )
}
