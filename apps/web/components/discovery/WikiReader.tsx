'use client'

import { useEffect, useRef, useState } from 'react'
import { PixelSpinner } from '@/components/ui/PixelSpinner'

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
  // Reading level: English or Simple English (simple.wikipedia.org — shorter
  // sentences, plainer vocabulary; great for younger or ELL readers). Sticky
  // across articles within the session; a Simple edition that lacks the
  // article surfaces the API's not-found message with the toggle still visible.
  const [lang, setLang] = useState<'en' | 'simple'>('en')
  const contentRef = useRef<HTMLDivElement>(null)

  // Fetch article whenever the title or reading level changes
  useEffect(() => {
    if (!title) return
    setLoading(true)
    setError(null)
    setArticle(null)

    fetch(`/api/discovery/article?title=${encodeURIComponent(title)}&lang=${lang}`)
      .then((r) => r.json())
      .then((data: ArticleData & { error?: string }) => {
        if (data.error) throw new Error(data.error)
        setArticle(data)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [title, lang])

  const langToggle = (
    <button
      onClick={() => setLang((l) => (l === 'en' ? 'simple' : 'en'))}
      aria-pressed={lang === 'simple'}
      title={
        lang === 'simple'
          ? 'Reading Simple English Wikipedia — click for the full English article'
          : 'Switch to Simple English Wikipedia (plainer language, shorter articles)'
      }
      data-testid="wiki-lang-toggle"
      className={`font-pixel text-[7px] px-2 py-1.5 rounded-sm border transition-colors shrink-0 ${
        lang === 'simple'
          ? 'bg-[#F5C518] text-[#0d1b2e] border-[#F5C518]'
          : 'text-white/50 border-white/15 hover:text-white/80'
      }`}
    >
      Simple English {lang === 'simple' ? '✓' : ''}
    </button>
  )

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
      <div className="flex items-center justify-center h-full gap-3 text-white/40 font-pixel text-[8px]">
        <PixelSpinner size="sm" /> Loading article…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-red-400">
        <span className="text-2xl">⚠️</span>
        <p className="font-pixel text-[9px]">Could not load article</p>
        <p className="text-sm text-white/40">{error}</p>
        {/* Simple English has far fewer articles — leave the way back visible. */}
        <div className="mt-2">{langToggle}</div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="flex items-center justify-center h-full text-white/40 font-pixel text-[8px]">
        Select a topic to start reading.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Article header */}
      <div className="flex items-start gap-4 px-6 py-4 border-b border-white/10 shrink-0">
        <div className="flex-1 min-w-0">
          <h2
            className="text-xl font-bold leading-tight text-white"
            dangerouslySetInnerHTML={{ __html: article.title }}
          />
          {article.description && (
            <p className="text-sm text-white/40 mt-0.5 truncate">{article.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {langToggle}
          <button
            onClick={onStar}
            title={starred ? 'Unstar this article' : 'Star this article'}
            className={`text-xl transition-colors ${
              starred ? 'text-[#F5C518]' : 'text-white/40 hover:text-[#F5C518]/70'
            }`}
          >
            {starred ? '★' : '☆'}
          </button>
          <a
            href={`https://${lang}.wikipedia.org/wiki/${encodeURIComponent(article.normalizedTitle.replace(/ /g, '_'))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-pixel text-[7px] text-white/40 hover:text-[#F5C518] transition-colors"
          >
            ↗ Wikipedia
          </a>
        </div>
      </div>

      {/* Article body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <p className="font-pixel text-[7px] text-white/50 mb-4 p-2.5 rounded-sm bg-[#F5C518]/[0.06] border border-[#F5C518]/20 leading-loose">
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
