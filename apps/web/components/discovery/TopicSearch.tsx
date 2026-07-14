'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { PixelSpinner } from '@/components/ui/PixelSpinner'

interface Props {
  onSelect: (title: string) => void
  placeholder?: string
  className?: string
}

export function TopicSearch({ onSelect, placeholder = 'Search a Wikipedia topic…', className = '' }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  // A network failure must not look like "no results" (UX-1) — surface an
  // inline hint under the box so the student knows to retry.
  const [searchError, setSearchError] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const containerRef = useRef<HTMLDivElement>(null)

  const search = useCallback((q: string) => {
    clearTimeout(debounceRef.current)
    if (q.length < 2) { setResults([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setSearchError(false)
      try {
        const res = await fetch(`/api/discovery/search?q=${encodeURIComponent(q)}`)
        const raw: unknown = await res.json()
        // A 429/error body is an object, not the expected array — rendering it
        // would throw in the results .map (BLK-8). Degrade to "no results".
        const data = Array.isArray(raw) ? (raw as string[]) : []
        setResults(data)
        setOpen(data.length > 0)
        setHighlighted(-1)
      } catch {
        setResults([])
        setOpen(false)
        setSearchError(true)
      } finally {
        setLoading(false)
      }
    }, 280)
  }, [])

  useEffect(() => {
    search(query)
    return () => clearTimeout(debounceRef.current)
  }, [query, search])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (title: string) => {
    setQuery(title)
    setOpen(false)
    onSelect(title)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)) }
    if (e.key === 'Enter' && highlighted >= 0) select(results[highlighted])
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative flex items-center">
        <span className="absolute left-3 text-white/40 text-sm">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-sm border border-white/20 bg-[#0a1628] px-4 py-2 pl-9 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#F5C518]/60"
          autoComplete="off"
        />
        {loading && <PixelSpinner size="sm" className="absolute right-3" />}
      </div>

      {searchError && (
        <p className="mt-1 font-pixel text-[7px] text-red-400" role="alert">
          Couldn&apos;t search — check your connection and keep typing to retry.
        </p>
      )}

      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full rounded-sm border border-white/15 bg-[#0f1320] shadow-lg overflow-hidden">
          {results.map((r, i) => (
            <li key={r}>
              <button
                className={`w-full px-4 py-2.5 text-left text-sm text-white/80 transition-colors ${
                  i === highlighted ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
                onMouseEnter={() => setHighlighted(i)}
                onMouseDown={(e) => { e.preventDefault(); select(r) }}
              >
                {r}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
