'use client'

import { useRef, useState } from 'react'

const MAX_TILT_DEG = 6

/**
 * Cursor-driven tilt for a flat card (same technique as Shot's screenshot
 * tilt, extracted so non-screenshot content — e.g. the PvP type cards — can
 * share it). Desktop hover only; never fires on touch, and respects
 * prefers-reduced-motion.
 */
export function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLDivElement>(null)

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current
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

  return (
    <div style={{ perspective: '1000px' }}>
      <div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={className}
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transformStyle: 'preserve-3d',
          transition: tilt.x === 0 && tilt.y === 0 ? 'transform 0.35s ease' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  )
}
