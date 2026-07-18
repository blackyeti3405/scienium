'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ArticleRenderMode, ArticleSearchResult } from '@/lib/discovery/sources'
import { TIER_META } from '@/lib/discovery/credibility'
import { browseArticles, type ArticleFeedMeta } from '@/components/discovery/api'
import { PixelSpinner } from '@/components/ui/PixelSpinner'

interface Props {
  /** Resolve + add the picked article to the tree (via the store). */
  onPickArticle: (feed: string, externalId: string) => Promise<void>
}

const MODE_COLOR: Record<ArticleRenderMode, string> = { full: '#4ADE80', linkout: '#93C5FD' }

// Articles tab: browse The Conversation (full in-app render) + science-
// journalism (link-out) RSS feeds. Deterministic keyword filter — no LLM.
export function ArticlesBrowse({ onPickArticle }: Props) {
  const [feeds, setFeeds] = useState<ArticleFeedMeta[]>([])
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
    browseArticles()
      .then(({ feeds: list }) => {
        setFeeds(list)
        setActiveFeed((cur) => cur ?? list[0]?.id ?? null)
      })
      .catch(() => {})
      .finally(() => setFeedsLoaded(true))
  }, [])

  const runSearch = useCallback(async (feedId: string, q: string) => {
    setLoading(true)
    try {
      const { results: list } = await browseArticles(feedId, q)
      setResults(list)
      setSearched(true)
    } catch {
      // Browse degrades to empty on any failure — never surfaces an error.
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
  const explainerFeeds = feeds.filter((f) => f.provider === 'explainer')
  const patentFeeds = feeds.filter((f) => f.provider === 'patents')
  const activeProvider = feeds.find((f) => f.id === activeFeed)?.provider
  // Search-driven lanes send the query to a live search API; RSS lanes only
  // keyword-filter their cached feed.
  const activeIsSearchDriven = activeProvider === 'explainer' || activeProvider === 'patents'

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
        {(explainerFeeds.length > 0 || patentFeeds.length > 0) && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-pixel text-[7px] text-white/30 uppercase tracking-widest shrink-0">
              Look it up
            </span>
            <div className="flex items-center rounded-sm border border-white/15 overflow-hidden">
              {[...explainerFeeds, ...patentFeeds].map((f) => (
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
        )}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              activeProvider === 'explainer'
                ? 'Search MedlinePlus health topics…'
                : activeProvider === 'patents'
                  ? 'Search patents for prior art…'
                  : 'Filter this feed by keyword…'
            }
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
                : activeIsSearchDriven && !query.trim()
                  ? activeProvider === 'patents'
                    ? 'Describe your invention idea to search for prior art'
                    : 'Type a topic to search MedlinePlus health explainers'
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
                      {r.provider === 'explainer' && (
                        <span
                          className="font-pixel text-[7px] px-1.5 py-0.5 rounded-sm"
                          style={{
                            color: TIER_META.reference.color,
                            border: `1px solid ${TIER_META.reference.color}55`,
                            background: `${TIER_META.reference.color}12`,
                          }}
                          data-tier="reference"
                          title={TIER_META.reference.caveat}
                        >
                          {TIER_META.reference.label}
                        </span>
                      )}
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
