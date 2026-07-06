'use client'

import { useTransition, type MouseEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, ImageOff } from 'lucide-react'
import { LAB_TYPES, LAB_TYPE_LABELS, type LabType } from '@/lib/phase'

interface ShowcaseCard {
  id: string
  slug: string
  shortTitle: string
  title: string
  teamName: string
  labType: LabType | null
  views: number
  thumbId: string | null
}

interface Props {
  labFilter: LabType | null
  showcases: ShowcaseCard[]
}

/**
 * Reveals the shimmer-covered thumbnail. Runs from both the callback ref and
 * onLoad: a cached image can finish loading BEFORE React hydrates and attaches
 * the synthetic onLoad (React doesn't replay early load events), which would
 * otherwise leave the card at opacity 0 forever — so the ref checks
 * `img.complete` on mount, and onLoad covers the still-loading case.
 */
function revealThumb(img: HTMLImageElement | null) {
  if (img && img.complete && img.naturalWidth > 0) {
    img.classList.add('sc-gcard__thumb-img--loaded')
  }
}

function FilterLink({
  href,
  active,
  onNavigate,
  children,
}: {
  href: string
  active: boolean
  onNavigate: (href: string) => void
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      onClick={(e: MouseEvent) => {
        // Let the browser handle new-tab/window intents natively.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
        e.preventDefault()
        onNavigate(href)
      }}
      className={`sc-filter font-pixel ${active ? 'sc-filter--on' : ''}`}
      aria-current={active ? 'true' : undefined}
    >
      {children}
    </Link>
  )
}

/**
 * Client wrapper for the gallery's filter tabs + grid. The filter click is the
 * jarring part per the plan (§1.4): a plain `<Link>` re-fetches the whole SSR
 * page with no feedback until the new HTML lands. `useTransition` lets the
 * clicked tab highlight *instantly* while the grid beneath dims for the
 * (seconds-class) server round trip — the actual `showcases` data stays
 * server-fetched (`page.tsx` passes it in as props on every navigation).
 */
export function GalleryBrowser({ labFilter, showcases }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function go(href: string) {
    startTransition(() => {
      router.push(href)
    })
  }

  return (
    <>
      <nav className="sc-gallery-filters">
        <FilterLink href="/showcase/gallery" active={!labFilter} onNavigate={go}>
          All labs
        </FilterLink>
        {LAB_TYPES.map((lt) => (
          <FilterLink key={lt} href={`/showcase/gallery?lab=${lt}`} active={labFilter === lt} onNavigate={go}>
            {LAB_TYPE_LABELS[lt]}
          </FilterLink>
        ))}
      </nav>

      <div
        className={`transition-opacity duration-150 ${isPending ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}
        aria-busy={isPending}
      >
        {showcases.length === 0 ? (
          <div className="sc-gallery-empty">
            <ImageOff size={28} className="opacity-30" />
            <p className="font-pixel text-[9px] opacity-50">
              No public projects {labFilter ? `in ${LAB_TYPE_LABELS[labFilter]} ` : ''}yet — check back soon.
            </p>
          </div>
        ) : (
          <div className="sc-gallery-grid">
            {showcases.map((sc) => (
              <Link key={sc.id} href={`/showcase/${sc.slug}`} className="sc-gcard">
                <div className="sc-gcard__thumb sc-gcard__thumb--shimmer">
                  {sc.thumbId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/showcase/public/asset?id=${sc.thumbId}`}
                      alt={sc.shortTitle || sc.title}
                      loading="lazy"
                      ref={revealThumb}
                      onLoad={(e) => e.currentTarget.classList.add('sc-gcard__thumb-img--loaded')}
                      className="sc-gcard__thumb-img"
                    />
                  ) : (
                    <div className="sc-gcard__noimg">
                      <ImageOff size={22} className="opacity-25" />
                    </div>
                  )}
                  {sc.labType && <span className="sc-gcard__lab font-pixel">{LAB_TYPE_LABELS[sc.labType]}</span>}
                </div>
                <div className="sc-gcard__body">
                  <h3 className="sc-gcard__title">{sc.shortTitle || sc.title}</h3>
                  <div className="sc-gcard__meta">
                    <span className="truncate">{sc.teamName}</span>
                    <span className="inline-flex items-center gap-1 shrink-0">
                      <Eye size={12} /> {sc.views.toLocaleString()}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
