'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Counts a real figure up from 0 the first time it scrolls into view
 * (DESIGN.md › Motion). Under prefers-reduced-motion it renders the final
 * value immediately. `value` must be the true number — these are real stats.
 *
 * The whole number also does a single 3D flip-in (like a flap dropping into
 * place) right as the count-up starts — not a per-digit odometer simulating
 * every intermediate value, which at 60fps would be chaotic, not tasteful.
 * Uses the same [data-flip] progressive-enhancement pattern as Reveal's
 * [data-reveal]: the folded state only applies once JS is confirmed, so
 * no-JS/SSR clients see the real stat immediately, never hidden edge-on.
 */
export function CountUp({
  value,
  durationMs = 1100,
  prefix = '',
  suffix = '',
  className = '',
}: {
  value: number
  durationMs?: number
  prefix?: string
  suffix?: string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement | null>(null)
  // SSR / no-JS / reduced-motion render the true value immediately; the count-up
  // only replaces it on the client once the element scrolls into view.
  const [display, setDisplay] = useState(value)
  const [flipped, setFlipped] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    if (reduce) {
      setDisplay(value)
      setFlipped(true)
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || started.current) return
        started.current = true
        io.disconnect()
        setFlipped(true)

        const start = performance.now()
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / durationMs)
          // easeOutCubic
          const eased = 1 - Math.pow(1 - t, 3)
          setDisplay(Math.round(eased * value))
          if (t < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      },
      { threshold: 0.5 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [value, durationMs])

  return (
    <span className="mkt-flip-scene">
      <span ref={ref} data-flip={flipped ? 'in' : 'out'} className={className}>
        {prefix}
        {display.toLocaleString()}
        {suffix}
      </span>
    </span>
  )
}
