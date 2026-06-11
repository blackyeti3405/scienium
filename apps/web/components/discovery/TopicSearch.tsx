'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

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
  const [highlighted, setHighlighted] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const containerRef = useRef<HTMLDivElement>(null)

  const search = useCallback((q: string) => {
    clearTimeout(debounceRef.current)
    if (q.length < 2) { setResults([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/discovery/search?q=${encodeURIComponent(q)}`)
        const data: string[] = await res.json()
        setResults(data)
        setOpen(data.length > 0)
        setHighlighted(-1)
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
        <span className="absolute left-3 text-muted-foreground text-sm">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-lg border bg-background px-4 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          autoComplete="off"
        />
        {loading && (
          <span className="absolute right-3 text-muted-foreground animate-spin text-xs">⟳</span>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full rounded-lg border bg-card shadow-lg overflow-hidden">
          {results.map((r, i) => (
            <li key={r}>
              <button
                className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                  i === highlighted ? 'bg-accent' : 'hover:bg-accent'
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
