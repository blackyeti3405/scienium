'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface LaunchPreloaderProps {
  /** The lab route to warm (already resolved for this user). */
  href: string
  /** Sprite URLs to pull into the browser cache ahead of launch. */
  sprites: string[]
}

/**
 * Optimistic pre-loading for the lab. A signed-in player sitting on the home page
 * is very likely to click "Launch", so while they read we quietly (1) prefetch the
 * lab route bundle and (2) warm the HTTP cache for the sprites the lab paints with.
 *
 * All work runs in browser idle time so it never competes with the home page's own
 * critical resources, and nothing here changes what renders — it only moves fetches
 * earlier. Because home → lab is a soft (client-side) navigation, these warmed
 * assets are reused straight from cache, so the scene appears at once on launch.
 */
export function LaunchPreloader({ href, sprites }: LaunchPreloaderProps) {
  const router = useRouter()
  // Join to a stable primitive so the effect doesn't re-run on array identity churn.
  const spriteKey = sprites.join('|')

  useEffect(() => {
    // Warm the route's JS bundle so the click doesn't pay for the download.
    router.prefetch(href)

    const warm = () => {
      for (const src of spriteKey ? spriteKey.split('|') : []) {
        const img = new Image()
        img.decoding = 'async'
        img.src = src
      }
    }

    const w = window as typeof window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }
    let idleId: number | undefined
    let timeoutId: number | undefined
    if (w.requestIdleCallback) idleId = w.requestIdleCallback(warm, { timeout: 2000 })
    else timeoutId = window.setTimeout(warm, 300)

    return () => {
      if (idleId !== undefined && w.cancelIdleCallback) w.cancelIdleCallback(idleId)
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    }
  }, [href, spriteKey, router])

  return null
}
