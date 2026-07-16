'use client'

import { useEffect, useState } from 'react'

const STEPS = ['01', '02', '03', '04', '05', '06']

/**
 * Sticky-left progress rail for the Journey section (DESIGN.md › Motion). Pure
 * augmentation — the six phase content blocks in page.tsx are untouched, they
 * just carry a `data-journey-step="N"` marker this component watches with one
 * IntersectionObserver. A single gold fill line (.mkt-rail-fill, already in
 * globals.css) grows step-wise via the --rail custom property as each phase
 * scrolls into view; the active phase's numeral picks out in ink.
 */
export function JourneyRail() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-journey-step]'))
    if (!els.length) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute('data-journey-step')) - 1
            if (!Number.isNaN(idx)) setActive(idx)
          }
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <div
      aria-hidden
      className="relative hidden shrink-0 self-stretch md:sticky md:top-24 md:block md:h-fit"
      style={{ width: 28, ['--rail' as string]: String((active + 1) / STEPS.length) }}
    >
      <div className="absolute left-1/2 top-1 h-[calc(100%-8px)] w-px -translate-x-1/2 bg-[#e4e3db]" />
      <div
        className="mkt-rail-fill absolute left-1/2 top-1 h-[calc(100%-8px)] w-px -translate-x-1/2 bg-[#F5C518]"
      />
      <ol className="relative flex h-full min-h-[420px] flex-col justify-between py-1">
        {STEPS.map((n, i) => (
          <li key={n} className="flex justify-center">
            <span
              className="font-pixel bg-[#f2f1ea] px-1 transition-colors duration-300"
              style={{ fontSize: '0.6rem', color: i === active ? '#0d1b2e' : '#63614f' }}
            >
              {n}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
