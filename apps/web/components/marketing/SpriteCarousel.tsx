'use client'

import { useRef, useState } from 'react'

// Same real building sprites the old static floating row used — just re-staged
// in 3D instead of a flat strip.
const ITEMS = [
  { sprite: 'volt_lab/ai-incubator', label: 'AI Incubator' },
  { sprite: 'biocore/greenhouse', label: 'Greenhouse' },
  { sprite: 'axiom/observatory-dome', label: 'Observatory Dome' },
  { sprite: 'chemworks/distillation-tower', label: 'Distillation Tower' },
]

const STEP = 360 / ITEMS.length
const RADIUS = 170 // px — tuned to sprite size so faces don't overlap

/**
 * CSS-only 3D carousel (perspective + rotateY translateZ) for the four lab
 * buildings, dragged or stepped through. No animation library — one React
 * number (`rotation`) drives the transform; .mkt-carousel-* in globals.css
 * holds the 3D staging and the reduced-motion override.
 */
export function SpriteCarousel() {
  const [rotation, setRotation] = useState(0)
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ startX: number; startRotation: number } | null>(null)

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    drag.current = { startX: e.clientX, startRotation: rotation }
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return
    const dx = e.clientX - drag.current.startX
    setRotation(drag.current.startRotation + dx * 0.4)
  }
  function endDrag() {
    drag.current = null
    setDragging(false)
  }
  function step(dir: 1 | -1) {
    setRotation((r) => r + dir * STEP)
  }

  return (
    <div className="flex flex-col items-center">
      <div className="mkt-carousel-scene">
        <div
          className="mkt-carousel-track"
          style={{ transform: `rotateY(${-rotation}deg)`, transition: dragging ? 'none' : undefined }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          role="group"
          aria-label="Lab building carousel — drag or use the buttons below to look around"
        >
          {ITEMS.map((it, i) => (
            <div
              key={it.sprite}
              className="mkt-carousel-item"
              style={{ transform: `rotateY(${i * STEP}deg) translateZ(${RADIUS}px)` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/sprites/buildings/${it.sprite}.png`}
                alt={it.label}
                width={96}
                height={96}
                draggable={false}
                className="mkt-pixel pointer-events-none"
                style={{ width: 'clamp(56px, 16vw, 96px)', height: 'clamp(56px, 16vw, 96px)' }}
              />
              <span className="font-pixel mt-2 block text-[#5a6b80]" style={{ fontSize: '0.55rem' }}>
                {it.label}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Rotate to the previous building"
          className="font-pixel flex h-11 w-11 items-center justify-center border border-[#d9d8cd] bg-white text-[#0d1b2e] transition-colors hover:border-[#0d1b2e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518]"
          style={{ borderRadius: 4 }}
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Rotate to the next building"
          className="font-pixel flex h-11 w-11 items-center justify-center border border-[#d9d8cd] bg-white text-[#0d1b2e] transition-colors hover:border-[#0d1b2e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518]"
          style={{ borderRadius: 4 }}
        >
          ›
        </button>
      </div>
    </div>
  )
}
