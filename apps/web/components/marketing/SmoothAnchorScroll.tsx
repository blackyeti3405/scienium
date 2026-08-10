'use client'

import { useEffect } from 'react'

/**
 * In-page anchor scrolling with a TRAPEZOIDAL velocity profile: speed ramps
 * linearly up, holds at a flat cruise, then ramps linearly down to zero on the
 * target. The browser's own `scroll-behavior: smooth` is a single ease curve
 * that never actually cruises, which is why this is hand-rolled rather than one
 * line of CSS.
 *
 * One delegated listener on the document serves every same-page anchor — header
 * nav, mobile menu, footer, hero CTA, the scroll chevron. Callers stay plain
 * `<Link href="/#id">` and nothing opts in, so a new anchor added anywhere on
 * the page inherits this for free.
 *
 * The header offset is NOT hardcoded here: each target carries its own
 * `scroll-margin-top` (Tailwind `scroll-mt-*` in page.tsx), which is also what
 * the browser honours on a direct `/#id` load. One source of truth, both paths.
 */

/**
 * Fraction of the total duration spent ramping at EACH end. 0.5 would be a pure
 * triangle with no cruise; 0 would be instant-on constant velocity.
 */
const RAMP = 0.3

/** Shortest and longest a jump may take, and how many ms per pixel travelled. */
const MIN_MS = 450
const MAX_MS = 1100
const MS_PER_PX = 0.6

/**
 * Normalized distance covered at normalized time `p`, integrating the
 * trapezoidal velocity curve. `cruise` normalizes the area so s(1) === 1:
 * distance = v_max · T · (1 − RAMP).
 */
function trapezoid(p: number): number {
  const cruise = 1 - RAMP
  if (p < RAMP) return (p * p) / (2 * RAMP * cruise)
  if (p < 1 - RAMP) return (RAMP / 2 + (p - RAMP)) / cruise
  const q = 1 - p
  return 1 - (q * q) / (2 * RAMP * cruise)
}

export function SmoothAnchorScroll() {
  useEffect(() => {
    let frame = 0
    let releaseAbort: (() => void) | null = null

    function stop() {
      cancelAnimationFrame(frame)
      releaseAbort?.()
      releaseAbort = null
    }

    function run(target: HTMLElement, id: string) {
      stop()

      // Measure on the NEXT frame, not this one. A click can change layout above
      // the target before we move — the mobile menu closing collapses the sticky
      // header — and a position measured pre-collapse lands the page short by
      // exactly the height of whatever went away.
      frame = requestAnimationFrame(() => measureAndRun(target, id))
    }

    function measureAndRun(target: HTMLElement, id: string) {
      const from = window.scrollY
      // The page cannot scroll past its own end; without this clamp the last
      // section undershoots and the animation lands somewhere it can't reach.
      const limit = document.documentElement.scrollHeight - window.innerHeight
      const offset = parseFloat(getComputedStyle(target).scrollMarginTop) || 0
      const to = Math.max(0, Math.min(limit, target.getBoundingClientRect().top + from - offset))
      const delta = to - from

      const land = () => {
        history.replaceState(null, '', `#${id}`)
        // Anchor navigation has to move focus too, or a keyboard user is left
        // parked in the nav while the viewport moves without them.
        target.setAttribute('tabindex', '-1')
        target.focus({ preventScroll: true })
      }

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduced || Math.abs(delta) < 2) {
        window.scrollTo(0, to)
        land()
        return
      }

      // Any real scroll input abandons the animation — a page that fights the
      // wheel feels broken.
      const abort = () => stop()
      window.addEventListener('wheel', abort, { passive: true })
      window.addEventListener('touchstart', abort, { passive: true })
      releaseAbort = () => {
        window.removeEventListener('wheel', abort)
        window.removeEventListener('touchstart', abort)
      }

      const duration = Math.min(MAX_MS, Math.max(MIN_MS, Math.abs(delta) * MS_PER_PX))
      const start = performance.now()

      const step = (now: number) => {
        const p = Math.min(1, (now - start) / duration)
        window.scrollTo(0, from + delta * trapezoid(p))
        if (p < 1) {
          frame = requestAnimationFrame(step)
          return
        }
        stop()
        land()
      }
      frame = requestAnimationFrame(step)
    }

    function onClick(e: MouseEvent) {
      // Leave modified clicks (new tab/window) and already-handled ones alone.
      if (e.defaultPrevented || e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

      const link = (e.target as Element | null)?.closest?.('a')
      const href = link?.getAttribute('href')
      if (!href || !href.includes('#')) return

      const [path, id] = href.split('#')
      if (!id) return
      // Same-document only. `/#id` clicked from /privacy must still navigate to
      // the home page the normal way rather than scrolling this one.
      if (path && path !== window.location.pathname) return

      const target = document.getElementById(id)
      if (!target) return

      e.preventDefault()
      run(target, id)
    }

    document.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('click', onClick)
      stop()
    }
  }, [])

  return null
}
