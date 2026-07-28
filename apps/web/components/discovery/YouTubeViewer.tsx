'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  /** video id of the currently-selected node, if it's a YouTube node */
  videoId?: string
  title?: string
  /** resolve a pasted URL → add it to the tree; returns an error string or null */
  onAddUrl: (url: string) => Promise<string | null>
}

const looksLikeYouTube = (s: string) =>
  /(?:youtube\.com\/(?:watch\?|shorts\/|live\/|embed\/)|youtu\.be\/)/.test(s) ||
  /^[\w-]{11}$/.test(s.trim())

export function YouTubeViewer({ videoId, title, onAddUrl }: Props) {
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [captured, setCaptured] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function add(url: string) {
    const trimmed = url.trim()
    if (!trimmed || busy) return
    setBusy(true)
    setError(null)
    const err = await onAddUrl(trimmed)
    setBusy(false)
    if (err) {
      setError(err)
    } else {
      setInput('')
      setCaptured(trimmed)
      setTimeout(() => setCaptured(null), 1800)
    }
  }

  // Auto-capture: pasting a YouTube link anywhere in this view adds it, even when
  // the input isn't focused. Paste is a user gesture, so no clipboard permission.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text') ?? ''
      // Bail on ANY editable target, not just this view's own input (§0.9 Row
      // B). The handler is on `document` and lives as long as the Discovery
      // YouTube view is mounted, so guarding only `inputRef` meant a link
      // pasted into the tree-reflection box, the topic bar or the papers
      // search was swallowed — preventDefault ate the paste and the URL was
      // silently added to the tree instead.
      const el = document.activeElement as HTMLElement | null
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el?.isContentEditable
      ) {
        return
      }
      if (looksLikeYouTube(text)) {
        e.preventDefault()
        add(text)
      }
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy])

  return (
    <div className="flex flex-col h-full">
      {/* Paste bar */}
      <div className="px-6 py-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-base shrink-0">▶</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add(input)}
            placeholder="Paste a YouTube link to add it to your tree…"
            className="flex-1 bg-[#0a1628] border border-white/20 rounded-sm px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-[#F5C518]/60"
          />
          <button
            onClick={() => add(input)}
            disabled={!input.trim() || busy}
            className="font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] rounded-sm px-3 py-2 hover:brightness-110 disabled:opacity-40 transition-all"
          >
            {busy ? 'Adding…' : 'Add'}
          </button>
        </div>
        <p className="font-pixel text-[7px] text-white/40 mt-2 leading-loose">
          {error ? (
            <span className="text-red-400">{error}</span>
          ) : captured ? (
            <span className="text-green-400">✓ Added to your tree</span>
          ) : (
            <>Tip: copy a link on YouTube, come back, and press ⌘V / Ctrl+V — it’s captured automatically.</>
          )}
        </p>
      </div>

      {/* Player */}
      {videoId ? (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-4 pb-2 shrink-0">
            <p className="text-sm text-white/85 truncate">{title}</p>
            <a
              href={`https://www.youtube.com/watch?v=${videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-pixel text-[7px] text-white/40 hover:text-[#F5C518] transition-colors"
            >
              ↗ open on YouTube
            </a>
          </div>
          <div className="flex-1 min-h-0 px-6 pb-6">
            <div className="relative w-full h-full bg-black/40 rounded-sm overflow-hidden">
              <iframe
                key={videoId}
                src={`https://www.youtube.com/embed/${videoId}`}
                title={title ?? 'YouTube video'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
          <span className="text-5xl">▶</span>
          <p className="font-pixel text-[9px] text-white/60 leading-loose">Start a video rabbit hole</p>
          <p className="font-pixel text-[7px] text-white/40 leading-loose max-w-xs">
            Paste a YouTube link above. Each video you add branches off the one you’re on — building a
            tree of your rabbit hole.
          </p>
        </div>
      )}
    </div>
  )
}
