'use client'

import { useEffect, useState } from 'react'
import { FileWarning, RotateCw } from 'lucide-react'
import { PixelSkeleton } from '@/components/ui/PixelSkeleton'

/**
 * The in-panel PDF viewer.
 *
 * An <iframe> cannot tell its parent that the document failed to load — a 404 or
 * 502 renders as a blank frame with no signal at all. That is how a source whose
 * file had vanished from storage looked identical to one that was merely slow,
 * and why "the quiz loaded but the PDF didn't" had no explanation on screen.
 *
 * So the status is probed first, and the frame is only mounted once the bytes are
 * known to be there. The probe reads the response headers and then CANCELS the
 * body: the iframe is about to fetch the same URL for real, and downloading a
 * whole PDF twice to learn one status code would be silly.
 */
type State =
  | { kind: 'checking' }
  | { kind: 'ok' }
  | { kind: 'missing'; message: string }
  | { kind: 'error'; message: string }

export function PdfFrame({ src, title }: { src: string; title: string }) {
  const [state, setState] = useState<State>({ kind: 'checking' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let live = true
    const ac = new AbortController()

    async function probe() {
      setState({ kind: 'checking' })
      try {
        const res = await fetch(src, { signal: ac.signal })
        // Headers are all we wanted; drop the body so it is not downloaded twice.
        res.body?.cancel().catch(() => {})
        if (!live) return
        if (res.ok) return setState({ kind: 'ok' })
        const body = await res
          .clone()
          .json()
          .catch(() => ({}) as { error?: string; code?: string })
        const message = body.error ?? 'The file could not be loaded.'
        setState(res.status === 404 ? { kind: 'missing', message } : { kind: 'error', message })
      } catch {
        // An aborted probe is a cleanup, not a failure.
        if (live) setState({ kind: 'error', message: 'The file could not be loaded.' })
      }
    }
    void probe()
    return () => {
      live = false
      ac.abort()
    }
  }, [src, attempt])

  if (state.kind === 'ok') {
    return <iframe src={src} className="flex-1 w-full" title={title} />
  }

  if (state.kind === 'checking') {
    return (
      <div className="flex-1 p-6" data-testid="pdf-frame-loading">
        <PixelSkeleton variant="box" h="h-full" w="w-full" />
      </div>
    )
  }

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center"
      data-testid={state.kind === 'missing' ? 'pdf-frame-missing' : 'pdf-frame-error'}
    >
      <FileWarning size={22} className="text-white/30" aria-hidden />
      <p className="font-pixel text-[8px] leading-loose text-white/60">{state.message}</p>
      {state.kind === 'missing' ? (
        // Nothing to retry — the object is not there. Say what to do instead.
        <p className="font-pixel text-[7px] leading-loose text-white/35 max-w-xs">
          Your quiz results and proficiency for this source are unaffected. Re-upload the file to
          read it here again.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => setAttempt((n) => n + 1)}
          className="font-pixel text-[7px] flex items-center gap-1.5 border border-white/20 text-white/60 px-3 py-2 rounded-sm hover:border-[#F5C518]/50 hover:text-[#F5C518] transition-colors"
        >
          <RotateCw size={10} aria-hidden />
          Try again
        </button>
      )}
    </div>
  )
}
