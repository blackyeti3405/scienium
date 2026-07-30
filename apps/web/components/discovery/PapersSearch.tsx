'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { TIER_META } from '@/lib/discovery/credibility'
import type { SourcePlatform, SourceSearchResult } from '@/lib/discovery/sources'
import { searchSources } from '@/components/discovery/api'
import { PixelSpinner } from '@/components/ui/PixelSpinner'
import { useLatest } from '@/lib/hooks/useLatest'

interface Props {
  /** Default query seeded from the team topic / current node title. */
  defaultQuery?: string
  /** Resolve + add the picked result to the tree (via the store). */
  onPick: (platform: SourcePlatform, externalId: string) => Promise<void>
}

// Papers search box: deterministic merged arXiv + PubMed keyword search (no
// LLM). One list, relevance-interleaved server-side; each row's credibility
// tier badge says whether it's a preprint or peer-reviewed, and the preprints
// toggle filters the list client-side (no refetch).
export function PapersSearch({ defaultQuery = '', onPick }: Props) {
  const [query, setQuery] = useState(defaultQuery)
  const [results, setResults] = useState<SourceSearchResult[]>([])
  const [includePreprints, setIncludePreprints] = useState(true)
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  // A failure is not "no papers found" (§0.9 Row C2) — saying "no papers found"
  // sends the student off to invent different keywords for a search that never
  // ran.
  const [searchError, setSearchError] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const begin = useLatest()

  const runSearch = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) {
        setResults([])
        setSearched(false)
        setSearchError(false)
        return
      }
      const stale = begin()
      setLoading(true)
      setSearchError(false)
      try {
        const list = await searchSources(q)
        if (stale()) return
        setResults(list)
        setSearched(true)
      } catch {
        if (stale()) return
        setResults([])
        setSearched(true)
        setSearchError(true)
      } finally {
        if (!stale()) setLoading(false)
      }
    },
    [begin],
  )

  // Debounced auto-search as the user types.
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(query), 350)
    return () => clearTimeout(debounceRef.current)
  }, [query, runSearch])

  // The toggle only ever hides preprints — the merged fetch always includes
  // them, so flipping it back on is instant.
  const visible = includePreprints ? results : results.filter((r) => r.tier !== 'preprint')

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
      {/* Search bar + preprint filter */}
      <div className="px-6 py-4 border-b border-white/10 shrink-0 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">🔍</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch(query)}
              placeholder="Search arXiv + PubMed papers…"
              className="w-full rounded-sm border border-white/20 bg-[#0a1628] px-4 py-2 pl-9 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#F5C518]/60"
              autoComplete="off"
            />
            {loading && (
              <PixelSpinner size="sm" className="absolute right-3 top-1/2 -translate-y-1/2" />
            )}
          </div>
          <button
            onClick={() => setIncludePreprints((v) => !v)}
            aria-pressed={includePreprints}
            title={
              includePreprints
                ? 'Preprints are shown — click to hide them'
                : 'Preprints are hidden — click to show them'
            }
            className={`font-pixel text-[7px] px-2.5 py-2 rounded-sm border transition-colors shrink-0 ${
              includePreprints
                ? 'bg-[#F5C518] text-[#0d1b2e] border-[#F5C518]'
                : 'text-white/50 border-white/15 hover:text-white/80'
            }`}
            data-testid="preprint-toggle"
          >
            Preprints {includePreprints ? '✓' : '✗'}
          </button>
        </div>
        <p className="font-pixel text-[7px] text-white/40 leading-loose">
          One search across arXiv + PubMed — the badge on each result says preprint or
          peer-reviewed. Pick a paper to open its abstract, then follow its citations to branch.
        </p>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-8">
            <span className="text-4xl">📄</span>
            <p
              className={`font-pixel text-[8px] leading-loose ${searchError && !loading ? 'text-red-300' : 'text-white/50'}`}
              role={searchError && !loading ? 'alert' : undefined}
            >
              {loading
                ? 'Searching…'
                : searchError
                  ? 'Couldn’t reach the paper search — check your connection and try again.'
                  : results.length > 0
                    ? 'Only preprints matched — toggle preprints back on to see them'
                    : searched
                      ? 'No papers found — try different keywords'
                      : 'Search for papers to begin'}
            </p>
            {searchError && !loading && (
              <button
                type="button"
                onClick={() => runSearch(query)}
                className="font-pixel text-[8px] border border-white/20 text-white/60 px-4 py-2 rounded-sm hover:border-[#F5C518]/50 hover:text-[#F5C518] transition-colors"
              >
                Try again
              </button>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {visible.map((r) => {
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
                      {r.isReview && (
                        <span
                          className="font-pixel text-[7px] px-1.5 py-0.5 rounded-sm text-[#9d8cff] border border-[#9d8cff]/40 bg-[#9d8cff]/10"
                          data-review="true"
                          title="A review article surveys a whole field — a great first read."
                        >
                          Review
                        </span>
                      )}
                      {r.published && <span className="text-[10px] text-white/40">{r.published}</span>}
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
