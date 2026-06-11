'use client'

import { useEffect, useRef, useState } from 'react'

interface ArticleData {
  title: string
  normalizedTitle: string
  description?: string
  html: string
}

interface Props {
  title: string
  pendingLinks: string[]
  starred: boolean
  onLinkToggle: (title: string) => void
  onStar: () => void
}

export function WikiReader({ title, pendingLinks, starred, onLinkToggle, onStar }: Props) {
  const [article, setArticle] = useState<ArticleData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Fetch article whenever title changes
  useEffect(() => {
    if (!title) return
    setLoading(true)
    setError(null)
    setArticle(null)

    fetch(`/api/discovery/article?title=${encodeURIComponent(title)}`)
      .then((r) => r.json())
      .then((data: ArticleData & { error?: string }) => {
        if (data.error) throw new Error(data.error)
        setArticle(data)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [title])

  // Intercept wiki link clicks via event delegation.
  // `article` is in deps so this effect re-runs once the HTML renders into the DOM.
  useEffect(() => {
    const container = contentRef.current
    if (!container) return

    const handler = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-wiki-title]')
      if (!target) return
      e.preventDefault()
      const wikiTitle = target.getAttribute('data-wiki-title')
      if (wikiTitle) onLinkToggle(wikiTitle)
    }

    container.addEventListener('click', handler)
    return () => container.removeEventListener('click', handler)
  }, [onLinkToggle, article])

  // Sync highlight classes whenever pending selection changes
  useEffect(() => {
    const container = contentRef.current
    if (!container) return
    container.querySelectorAll<HTMLElement>('[data-wiki-title]').forEach((el) => {
      const t = el.getAttribute('data-wiki-title') ?? ''
      el.classList.toggle('wiki-link-selected', pendingLinks.includes(t))
    })
  }, [pendingLinks, article])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-3 text-muted-foreground">
        <span className="animate-spin">⟳</span> Loading article…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-destructive">
        <span className="text-2xl">⚠️</span>
        <p className="font-medium">Could not load article</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a topic to start reading.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Article header */}
      <div className="flex items-start gap-4 px-6 py-4 border-b shrink-0">
        <div className="flex-1 min-w-0">
          <h2
            className="text-xl font-bold leading-tight"
            dangerouslySetInnerHTML={{ __html: article.title }}
          />
          {article.description && (
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{article.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onStar}
            title={starred ? 'Unstar this article' : 'Star this article'}
            className={`text-xl transition-colors ${
              starred ? 'text-yellow-500' : 'text-muted-foreground hover:text-yellow-400'
            }`}
          >
            {starred ? '★' : '☆'}
          </button>
          <a
            href={`https://en.wikipedia.org/wiki/${encodeURIComponent(article.normalizedTitle.replace(/ /g, '_'))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            ↗ Wikipedia
          </a>
        </div>
      </div>

      {/* Article body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <p className="text-xs text-muted-foreground mb-4 p-2.5 rounded-md bg-muted/50 border">
          💡 Click any blue link to select it as a branch (up to 2). Selected links are highlighted.
        </p>
        <div
          ref={contentRef}
          className="wiki-content"
          dangerouslySetInnerHTML={{ __html: article.html }}
        />
      </div>
    </div>
  )
}
