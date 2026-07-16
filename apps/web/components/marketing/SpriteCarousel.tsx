'use client'

import { useRef, useState } from 'react'

// One real building per lab type (DESIGN.md: show the real product, not filler).
const ITEMS = [
  { sprite: 'biocore/greenhouse', label: 'Greenhouse' },
  { sprite: 'chemworks/distillation-tower', label: 'Distillation Tower' },
  { sprite: 'volt_lab/ai-incubator', label: 'AI Incubator' },
  { sprite: 'terrabase/atmospheric-sensor-array', label: 'Atmospheric Sensor Array' },
  { sprite: 'mindframe/behavioral-lab', label: 'Behavioral Lab' },
  { sprite: 'axiom/observatory-dome', label: 'Observatory Dome' },
]

const N = ITEMS.length
const VISIBLE_CUTOFF = 2.6 // hides exactly the one item directly opposite center (N is even)
const DRAG_PX_PER_STEP = 90

/** Shortest signed circular distance from `position` to slot `i`, in item-units. */
function wrappedDelta(i: number, position: number) {
  let d = i - position
  d = ((d + N / 2) % N + N) % N - N / 2
  return d
}

function cardStyle(delta: number): React.CSSProperties {
  const abs = Math.min(Math.abs(delta), VISIBLE_CUTOFF)
  const scale = 1 - abs * 0.28
  const rotate = -delta * 15
  const tx = delta * 26
  const tz = -abs * 50
  const fadeStart = VISIBLE_CUTOFF - 0.5
  const opacity = abs > fadeStart ? Math.max(0, 1 - (abs - fadeStart) / (VISIBLE_CUTOFF - fadeStart)) : 1
  return {
    transform: `translateX(${tx}%) translateZ(${tz}px) rotateY(${rotate}deg) scale(${scale})`,
    opacity,
    zIndex: Math.round(100 - abs * 10),
  }
}

/**
 * CSS-only "coverflow" 3D carousel (perspective + per-item translateX/Z,
 * rotateY, scale) — center building full-size and facing forward, one on
 * each side smaller and turned inward, one more past that smaller still;
 * the item directly opposite is hidden (5 of 6 visible at once). No
 * animation library — one continuous `position` float drives every
 * item's transform; drag tracks the pointer 1:1, release snaps to the
 * nearest whole slot. Fills the width of its container (translateX uses
 * %, which resolves against each item's own box — same width as the
 * scene since items are absolutely positioned with inset-0).
 */
export function SpriteCarousel() {
  const [position, setPosition] = useState(0)
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ startX: number; startPosition: number } | null>(null)

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    drag.current = { startX: e.clientX, startPosition: position }
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return
    const dx = e.clientX - drag.current.startX
    setPosition(drag.current.startPosition - dx / DRAG_PX_PER_STEP)
  }
  function endDrag() {
    drag.current = null
    setDragging(false)
    setPosition((p) => Math.round(p))
  }
  function step(dir: 1 | -1) {
    setPosition((p) => Math.round(p) + dir)
  }

  const activeLabel = ITEMS[((Math.round(position) % N) + N) % N].label

  return (
    <div className="flex flex-col items-center">
      <div className="mkt-carousel-scene w-full">
        <div
          className="mkt-carousel-track"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          role="group"
          aria-label={`Lab building carousel, showing ${activeLabel} — drag or use the buttons below to look around`}
        >
          {ITEMS.map((it, i) => {
            const delta = wrappedDelta(i, position)
            if (Math.abs(delta) > VISIBLE_CUTOFF) return null
            return (
              <div
                key={it.sprite}
                className="mkt-carousel-item"
                style={{ ...cardStyle(delta), transitionProperty: dragging ? 'none' : undefined }}
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
            )
          })}
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
