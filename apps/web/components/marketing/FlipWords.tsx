'use client'

import { useEffect, useState } from 'react'

/**
 * Auto-cycles through `words` in place (DESIGN.md › Motion: relevant, not
 * decorative — it shows the field genuinely varies). Plain interval + CSS
 * transition, no animation library. Reserves width for the longest word so
 * the surrounding sentence doesn't reflow. Stops cycling (shows the first
 * word only) under prefers-reduced-motion.
 */
export function FlipWords({
  words,
  intervalMs = 2200,
  className = '',
}: {
  words: string[]
  intervalMs?: number
  className?: string
}) {
  const [i, setI] = useState(0)

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || words.length < 2) return
    const id = setInterval(() => setI((v) => (v + 1) % words.length), intervalMs)
    return () => clearInterval(id)
  }, [words, intervalMs])

  const longest = words.reduce((max, w) => Math.max(max, w.length), 0)

  return (
    <span
      className={`mkt-flip-words inline-block text-center align-baseline font-semibold text-[#0d1b2e] ${className}`}
      style={{ minWidth: `${longest}ch` }}
    >
      <span key={i} className="mkt-flip-in inline-block">
        {words[i]}
      </span>
    </span>
  )
}
