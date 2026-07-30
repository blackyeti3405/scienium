'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

/**
 * Frames a REAL captured game screenshot (public/marketing/*.png). The window
 * chrome is the scienium mark + the surface's own route, not generic macOS
 * traffic-lights, so the frame reads "this is a scienium screen". The game UI
 * is dark, the page is light, so framed dark shots pop against the paper field.
 * On mobile the shot is letterboxed (object-contain) so its UI stays legible
 * instead of being cropped to a sliver; on desktop it fills (object-cover).
 * Captured via scripts/capture-marketing-shots.mjs.
 *
 * Click (or Enter/Space) opens a full-size lightbox — these are real product
 * screens, worth letting a visitor actually read. A subtle cursor-driven tilt
 * (desktop hover only — never fires on touch, which is fine, it's a cosmetic
 * enhancement, not information) adds depth without distorting the screenshot.
 */
const MAX_TILT_DEG = 5

export function Shot({
  src,
  title,
  alt,
  ratio = '16 / 10',
  position = 'top',
  priority = false,
  className = '',
}: {
  src: string
  title: string
  alt: string
  ratio?: string
  position?: 'top' | 'center'
  priority?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const figureRef = useRef<HTMLElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  function handleMouseMove(e: React.MouseEvent<HTMLElement>) {
    const el = figureRef.current
    if (!el) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    setTilt({ x: (py - 0.5) * -2 * MAX_TILT_DEG, y: (px - 0.5) * 2 * MAX_TILT_DEG })
  }
  function handleMouseLeave() {
    setTilt({ x: 0, y: 0 })
  }

  useEffect(() => {
    if (!open) return
    const trigger = triggerRef.current
    closeRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKeyDown)
      trigger?.focus()
    }
  }, [open])

  return (
    <>
      <div style={{ perspective: '1400px' }}>
      <figure
        ref={figureRef as React.RefObject<HTMLElement>}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`overflow-hidden border border-[#e4e3db] bg-white shadow-[0_36px_70px_-40px_rgba(13,27,46,0.45)] ${className}`}
        style={{
          borderRadius: 8,
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transformStyle: 'preserve-3d',
          transition: tilt.x === 0 && tilt.y === 0 ? 'transform 0.35s ease' : 'none',
        }}
      >
        <figcaption className="flex items-center gap-2.5 border-b border-[#ecebe3] bg-[#f4f3ee] px-4 py-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/scienium-logo.png" alt="" aria-hidden width={16} height={16} className="mkt-pixel" />
          <span className="font-pixel text-[#5a6b80]" style={{ fontSize: '0.6rem', letterSpacing: '0.02em' }}>
            {title}
          </span>
        </figcaption>
        <button
          type="button"
          ref={triggerRef}
          onClick={() => setOpen(true)}
          aria-label={`Zoom in on ${title}`}
          className="group relative block w-full bg-[#0d1b2e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518] focus-visible:ring-inset"
          style={{ aspectRatio: ratio }}
        >
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 768px) 100vw, 720px"
            priority={priority}
            className={`object-contain object-top md:object-cover ${position === 'center' ? 'md:object-center' : 'md:object-top'}`}
          />
          <span className="mkt-zoom-affordance absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center border border-white/30 bg-[#0d1b2e]/70 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" style={{ borderRadius: 4 }} aria-hidden>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M7 5.2V8.8M5.2 7H8.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </span>
        </button>
      </figure>
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="mkt-lightbox fixed inset-0 z-[200] flex items-center justify-center bg-[#0d1b2e]/90 p-4 md:p-10"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            ref={closeRef}
            onClick={() => setOpen(false)}
            aria-label="Close zoomed image"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518] md:right-8 md:top-8"
            style={{ borderRadius: 4 }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <div
            className="relative w-full max-w-5xl"
            style={{ aspectRatio: ratio }}
            onClick={(e) => e.stopPropagation()}
          >
            <Image src={src} alt={alt} fill sizes="90vw" className="object-contain" />
          </div>
        </div>
      )}
    </>
  )
}

/**
 * Labeled placeholder for a surface we can't screenshot yet (not built, or needs
 * seeded data). Reads as an intentional slot in product voice, never as an
 * authoring note. No image to zoom, so no lightbox here.
 */
export function ShotPlaceholder({
  title,
  note,
  ratio = '16 / 10',
  badge = 'Coming soon',
}: {
  title: string
  note: string
  ratio?: string
  badge?: string
}) {
  return (
    <figure
      className="flex flex-col items-center justify-center border border-dashed border-[#c6c5ba] bg-[#eeede6] px-8 text-center"
      style={{ borderRadius: 8, aspectRatio: ratio }}
    >
      <span className="font-pixel text-[#5a6b80]" style={{ fontSize: '0.6rem', letterSpacing: '0.02em' }}>{title}</span>
      <p className="mt-3 max-w-xs font-display text-sm leading-relaxed text-[#5a6b80]">{note}</p>
      <span
        className="mt-5 font-pixel text-[#0d1b2e]"
        style={{ fontSize: '0.55rem', background: '#F5C518', padding: '6px 9px', borderRadius: 4 }}
      >
        {badge}
      </span>
    </figure>
  )
}
