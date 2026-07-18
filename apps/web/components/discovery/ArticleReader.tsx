'use client'

import type { ArticleProvider, ArticleRenderMode } from '@/lib/discovery/sources'

interface Props {
  /** The open article node, or null while nothing is selected. */
  node: {
    id: string
    title: string
    provider?: ArticleProvider
    renderMode?: ArticleRenderMode
    sourceName?: string
    articleUrl?: string
    excerpt?: string
    articleHtml?: string
    articleAuthor?: string
    articlePublishedAt?: string
    starred: boolean
  } | null
  onStar: () => void
  /** Return to the Articles browse-results list. */
  onBack?: () => void
}

// The value is already server-validated (resolve route + tree POST both reject
// non-http(s) urls) — this is a defensive re-check at the render sink, same
// spirit as the other discovery readers.
function isHttpUrl(u: string | undefined): u is string {
  if (!u) return false
  try {
    const { protocol } = new URL(u)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

export function ArticleReader({ node, onStar, onBack }: Props) {
  if (!node) {
    return (
      <div className="flex items-center justify-center h-full text-white/40 font-pixel text-[8px] bg-[#0d1b2e]">
        Browse an article to start reading.
      </div>
    )
  }

  const isFull = node.renderMode === 'full'
  const sourceName = node.sourceName ?? 'the source'
  const outboundHref = isHttpUrl(node.articleUrl) ? node.articleUrl : null

  return (
    <div className="flex flex-col h-full bg-[#0d1b2e]">
      {/* ── Header ── */}
      <div className="flex items-start gap-3 px-5 py-2.5 border-b border-white/10 shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            title="Back to article results"
            className="shrink-0 mt-0.5 font-pixel text-[7px] text-white/50 hover:text-[#F5C518] border border-white/15 rounded-sm px-2 py-1.5 transition-colors"
          >
            ← Results
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-pixel text-[7px] uppercase tracking-widest text-[#F5C518]/80">
              📰 {sourceName}
            </span>
            <span
              className="font-pixel text-[7px] px-1.5 py-0.5 rounded-sm"
              style={{
                color: isFull ? '#4ADE80' : '#93C5FD',
                border: `1px solid ${isFull ? '#4ADE80' : '#93C5FD'}55`,
                background: `${isFull ? '#4ADE80' : '#93C5FD'}12`,
              }}
            >
              {isFull ? 'full article' : 'link-out'}
            </span>
            {node.articlePublishedAt && (
              <span className="text-[11px] text-white/35">
                {new Date(node.articlePublishedAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <h2 className="text-base font-bold leading-snug text-white mt-0.5">{node.title}</h2>
          {/* Attribution line — a licensing requirement for The Conversation (CC
              BY-ND): author + source name + the CC BY-ND notice, always visible. */}
          <p className="text-[13px] text-white/50 mt-0.5">
            {node.articleAuthor ? `${node.articleAuthor} — ${sourceName}` : sourceName}
            {/* License notice is PROVIDER-specific: CC BY-ND applies to The
                Conversation; explainer content (MedlinePlus/NIH) is a US-
                government public-domain work and must not carry a CC notice. */}
            {isFull && node.provider === 'explainer' ? (
              <span className="block text-[11px] text-white/35 mt-0.5">
                Source: {sourceName} — content in the public domain
              </span>
            ) : isFull ? (
              <span className="block text-[11px] text-white/35 mt-0.5">
                Republished from {sourceName} under CC BY-ND
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onStar}
            title={node.starred ? 'Unstar this article' : 'Star this article'}
            className={`text-xl transition-colors ${
              node.starred ? 'text-[#F5C518]' : 'text-white/30 hover:text-[#F5C518]/70'
            }`}
          >
            {node.starred ? '★' : '☆'}
          </button>
          {outboundHref && (
            <a
              href={outboundHref}
              target="_blank"
              rel="noopener noreferrer"
              className="font-pixel text-[7px] text-white/40 hover:text-[#F5C518] transition-colors whitespace-nowrap"
            >
              ↗ {sourceName}
            </a>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {isFull ? (
          node.articleHtml ? (
            // Already server-sanitized via ARTICLE_SANITIZE_OPTS (the one trust
            // boundary) — rendered verbatim, no edits (CC BY-ND requires
            // republication without alteration).
            <div
              className="article-content text-[15px] leading-relaxed text-white/85"
              dangerouslySetInnerHTML={{ __html: node.articleHtml }}
            />
          ) : (
            <p className="text-sm text-white/40 italic">Article body unavailable.</p>
          )
        ) : (
          <div className="flex flex-col gap-4">
            {node.excerpt ? (
              <p className="text-[15px] leading-relaxed text-white/85">{node.excerpt}</p>
            ) : (
              <p className="text-sm text-white/40 italic">No excerpt available.</p>
            )}
            {outboundHref && (
              <a
                href={outboundHref}
                target="_blank"
                rel="noopener noreferrer"
                className="self-start rounded-sm border border-[#F5C518]/50 bg-[#F5C518]/10 px-4 py-2.5 font-pixel text-[8px] text-[#F5C518] hover:bg-[#F5C518]/20 transition-colors"
              >
                Read the full article at {sourceName} ↗
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
