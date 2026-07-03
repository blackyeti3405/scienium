'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { TIER_META } from '@/lib/discovery/credibility'
import type { SourcePlatform, SourceSearchResult } from '@/lib/discovery/sources'

interface Props {
  /** Default query seeded from the team topic / current node title. */
  defaultQuery?: string
  /** Resolve + add the picked result to the tree (via the store). */
  onPick: (platform: SourcePlatform, externalId: string) => Promise<void>
}

// Papers search box: deterministic arXiv / PubMed keyword search (no LLM).
export function PapersSearch({ defaultQuery = '', onPick }: Props) {
  const [platform, setPlatform] = useState<SourcePlatform>('arxiv')
  const [query, setQuery] = useState(defaultQuery)
  const [results, setResults] = useState<SourceSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const runSearch = useCallback(
    async (q: string, plat: SourcePlatform) => {
      if (q.trim().length < 2) {
        setResults([])
        setSearched(false)
        return
      }
      setLoading(true)
      try {
        const res = await fetch(
          `/api/discovery/sources/search?q=${encodeURIComponent(q)}&platform=${plat}`,
        )
        const data: SourceSearchResult[] = res.ok ? await res.json() : []
        setResults(Array.isArray(data) ? data : [])
        setSearched(true)
      } catch {
        setResults([])
        setSearched(true)
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  // Debounced auto-search as the user types / switches platform.
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(query, platform), 350)
    return () => clearTimeout(debounceRef.current)
  }, [query, platform, runSearch])

  async function pick(r: SourceSearchResult) {
    setAdding(r.externalId)
    try {
      await onPick(r.platform, r.externalId)
    } finally {
      setAdding(null)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#0d1b2e]">
      {/* Search bar + platform filter */}
      <div className="px-6 py-4 border-b border-white/10 shrink-0 space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-sm border border-white/15 overflow-hidden shrink-0">
            {(['arxiv', 'pubmed'] as SourcePlatform[]).map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`font-pixel text-[7px] px-2.5 py-2 transition-colors ${
                  platform === p ? 'bg-[#F5C518] text-[#0d1b2e]' : 'text-white/50 hover:text-white/80'
                }`}
              >
                {p === 'arxiv' ? 'arXiv' : 'PubMed'}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">🔍</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch(query, platform)}
              placeholder={`Search ${platform === 'arxiv' ? 'arXiv' : 'PubMed'} papers…`}
              className="w-full rounded-sm border border-white/20 bg-[#0a1628] px-4 py-2 pl-9 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#F5C518]/60"
              autoComplete="off"
            />
            {loading && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 animate-spin text-xs">⟳</span>
            )}
          </div>
        </div>
        <p className="font-pixel text-[7px] text-white/30 leading-loose">
          Pick a paper to open its abstract, then follow its citations to branch.
        </p>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-8">
            <span className="text-4xl">📄</span>
            <p className="font-pixel text-[8px] text-white/50 leading-loose">
              {loading ? 'Searching…' : searched ? 'No papers found — try different keywords' : 'Search for papers to begin'}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {results.map((r) => {
              const meta = TIER_META[r.tier]
              return (
                <li key={r.externalId}>
                  <button
                    onClick={() => pick(r)}
                    disabled={adding === r.externalId}
                    className="w-full text-left rounded-sm border border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04] px-3 py-2.5 transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="font-pixel text-[7px] px-1.5 py-0.5 rounded-sm"
                        style={{ color: meta.color, border: `1px solid ${meta.color}55`, background: `${meta.color}12` }}
                        data-tier={r.tier}
                      >
                        {meta.label}
                      </span>
                      {r.published && <span className="text-[10px] text-white/30">{r.published}</span>}
                      {adding === r.externalId && <span className="text-[10px] text-[#F5C518] animate-pulse ml-auto">adding…</span>}
                    </div>
                    <p className="text-sm text-white/85 leading-snug line-clamp-2">{r.title}</p>
                    {r.authors.length > 0 && (
                      <p className="text-[11px] text-white/40 mt-0.5 truncate">
                        {r.authors.slice(0, 4).join(', ')}
                        {r.authors.length > 4 ? ' et al.' : ''}
                      </p>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
