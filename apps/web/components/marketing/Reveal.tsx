'use client'

import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react'

/**
 * Reveal-on-scroll wrapper (DESIGN.md › Motion). Children start faded + slightly
 * lowered and animate to their resting state the first time they enter the
 * viewport. Purely CSS transitions driven by one IntersectionObserver — the
 * visual is defined by `[data-reveal]` rules in globals.css, which also collapse
 * the whole effect under prefers-reduced-motion. Use `delay` to stagger siblings.
 */
export function Reveal({
  children,
  as: Tag = 'div',
  delay = 0,
  className = '',
  ...rest
}: {
  children: ReactNode
  as?: ElementType
  delay?: number
  className?: string
} & Record<string, unknown>) {
  const ref = useRef<HTMLElement | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || shown) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true)
            io.disconnect()
            break
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.15 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [shown])

  return (
    <Tag
      ref={ref}
      data-reveal={shown ? 'in' : 'out'}
      style={{ '--reveal-delay': `${delay}ms` } as React.CSSProperties}
      className={className}
      {...rest}
    >
      {children}
    </Tag>
  )
}
