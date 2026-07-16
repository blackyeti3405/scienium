'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ArticleProvider, ArticleRenderMode, ArticleSearchResult } from '@/lib/discovery/sources'
import { PixelSpinner } from '@/components/ui/PixelSpinner'

interface FeedMeta {
  id: string
  provider: ArticleProvider
  renderMode: ArticleRenderMode
  sourceName: string
  label: string
}

interface Props {
  /** Resolve + add the picked article to the tree (via the store). */
  onPickArticle: (feed: string, externalId: string) => Promise<void>
}

const MODE_COLOR: Record<ArticleRenderMode, string> = { full: '#4ADE80', linkout: '#93C5FD' }

// Articles tab: browse The Conversation (full in-app render) + science-
// journalism (link-out) RSS feeds. Deterministic keyword filter — no LLM.
export function ArticlesBrowse({ onPickArticle }: Props) {
  const [feeds, setFeeds] = useState<FeedMeta[]>([])
  const [feedsLoaded, setFeedsLoaded] = useState(false)
  const [activeFeed, setActiveFeed] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ArticleSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Load the feed picker's metadata once on mount (no `feed` param → results: []).
  useEffect(() => {
    fetch('/api/discovery/articles/browse')
      .then((r) => r.json())
      .then((data: { feeds?: FeedMeta[] }) => {
        const list = Array.isArray(data.feeds) ? data.feeds : []
        setFeeds(list)
        setActiveFeed((cur) => cur ?? list[0]?.id ?? null)
      })
      .catch(() => {})
      .finally(() => setFeedsLoaded(true))
  }, [])

  const runSearch = useCallback(async (feedId: string, q: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ feed: feedId })
      if (q.trim()) params.set('q', q.trim())
      const res = await fetch(`/api/discovery/articles/browse?${params.toString()}`)
      const data: { results?: ArticleSearchResult[] } = res.ok ? await res.json() : {}
      setResults(Array.isArray(data.results) ? data.results : [])
      setSearched(true)
    } catch {
      setResults([])
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounced re-fetch whenever the active feed or keyword filter changes.
  useEffect(() => {
    if (!activeFeed) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(activeFeed, query), 300)
    return () => clearTimeout(debounceRef.current)
  }, [activeFeed, query, runSearch])

  async function pick(r: ArticleSearchResult) {
    setAdding(r.externalId)
    try {
      await onPickArticle(r.feed, r.externalId)
    } finally {
      setAdding(null)
    }
  }

  const conversationFeeds = feeds.filter((f) => f.provider === 'the_conversation')
  const journalismFeeds = feeds.filter((f) => f.provider === 'journalism')

  return (
    <div className="flex flex-col h-full bg-[#0d1b2e]">
      {/* Feed picker (grouped Conversation vs Journalism) + keyword filter */}
      <div className="px-6 py-4 border-b border-white/10 shrink-0 space-y-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-pixel text-[7px] text-white/30 uppercase tracking-widest shrink-0">
            The Conversation
          </span>
          <div className="flex items-center rounded-sm border border-white/15 overflow-hidden">
            {conversationFeeds.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFeed(f.id)}
                className={`font-pixel text-[7px] px-2.5 py-2 transition-colors ${
                  activeFeed === f.id ? 'bg-[#F5C518] text-[#0d1b2e]' : 'text-white/50 hover:text-white/80'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-pixel text-[7px] text-white/30 uppercase tracking-widest shrink-0">
            Journalism
          </span>
          <div className="flex items-center rounded-sm border border-white/15 overflow-hidden">
            {journalismFeeds.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFeed(f.id)}
                className={`font-pixel text-[7px] px-2.5 py-2 transition-colors ${
                  activeFeed === f.id ? 'bg-[#F5C518] text-[#0d1b2e]' : 'text-white/50 hover:text-white/80'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter this feed by keyword…"
            className="w-full rounded-sm border border-white/20 bg-[#0a1628] px-4 py-2 pl-9 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#F5C518]/60"
            autoComplete="off"
          />
          {loading && <PixelSpinner size="sm" className="absolute right-3 top-1/2 -translate-y-1/2" />}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-8">
            <span className="text-4xl">📰</span>
            <p className="font-pixel text-[8px] text-white/50 leading-loose">
              {!feedsLoaded || loading
                ? 'Loading…'
                : searched
                  ? 'No articles found — try another feed or keyword'
                  : 'Pick a feed to browse'}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {results.map((r) => {
              const color = MODE_COLOR[r.renderMode]
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
                        style={{ color, border: `1px solid ${color}55`, background: `${color}12` }}
                      >
                        {r.sourceName}
                      </span>
                      <span className="font-pixel text-[6px] text-white/30 uppercase">
                        {r.renderMode === 'full' ? 'full article' : 'link-out'}
                      </span>
                      {r.publishedAt && (
                        <span className="text-[10px] text-white/30">
                          {new Date(r.publishedAt).toLocaleDateString()}
                        </span>
                      )}
                      {adding === r.externalId && (
                        <span className="text-[10px] text-[#F5C518] animate-pulse ml-auto">adding…</span>
                      )}
                    </div>
                    <p className="text-sm text-white/85 leading-snug line-clamp-2">{r.title}</p>
                    {r.author && <p className="text-[11px] text-white/40 mt-0.5 truncate">{r.author}</p>}
                    {r.excerpt && <p className="text-[11px] text-white/30 mt-1 line-clamp-2">{r.excerpt}</p>}
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
