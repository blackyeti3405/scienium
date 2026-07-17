'use client'

import { useEffect, useRef } from 'react'

/**
 * Atmospheric hero backdrop: a real screenshot (public/marketing/lab-hero-crop.png,
 * a straight crop of the real lab.png tight around the building cluster — not a
 * fabricated image) faded into the paper field on the left, where the hero copy
 * sits, and legible on the right, with a subtle scroll-linked parallax drift.
 * Purely decorative at this size and fade level — the hero paragraph already
 * describes the product in full, so this stays aria-hidden rather than
 * duplicating that description.
 */
export function HeroParallaxBg({ src }: { src: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let ticking = false
    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const el = ref.current
        if (el) {
          const y = Math.min(window.scrollY, 800)
          el.style.transform = `translateY(${y * 0.15}px)`
        }
        ticking = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div ref={ref} aria-hidden className="absolute inset-x-0 -top-16 -bottom-16 will-change-transform">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover"
        style={{ objectPosition: 'center 42%' }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(90deg, #f7f7f4 0%, #f7f7f4 44%, rgba(247,247,244,0.72) 58%, rgba(247,247,244,0) 74%), ' +
            'linear-gradient(180deg, rgba(13,27,46,0.06) 0%, rgba(13,27,46,0.24) 58%, #f7f7f4 96%)',
        }}
      />
    </div>
  )
}
