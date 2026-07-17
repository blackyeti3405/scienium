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

// Real upgrade tiers (lib/sprites/manifest.ts buildingStageSuffix): every
// building PNG has base + _t2/_t3/_t4/_t5 art, one per level band. Clicking a
// building steps through its own real sprite files; past the max it wraps
// back to base.
const TIER_SUFFIXES = ['', '_t2', '_t3', '_t4', '_t5']
const TIER_LABELS = ['Lv 1–3', 'Lv 4–6', 'Lv 7–9', 'Lv 10–14', 'Lv 15 · Max']

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
  const [tiers, setTiers] = useState<number[]>(() => ITEMS.map(() => 0))
  const drag = useRef<{ startX: number; startPosition: number; moved: boolean; buildingIndex: number | null } | null>(
    null,
  )

  function cycleTier(i: number) {
    setTiers((prev) => prev.map((tier, j) => (j === i ? (tier + 1) % TIER_SUFFIXES.length : tier)))
  }

  // setPointerCapture below is on the track (for whole-carousel dragging), which
  // redirects pointerup/click resolution away from whatever was actually under
  // the pointer — a native onClick on a building button never fires. So a tap
  // vs. drag is disambiguated here instead: pointerdown records which building
  // (if any) was pressed, pointermove flags real movement, and pointerup only
  // cycles that building's tier if the pointer never actually dragged.
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const pressedBuilding = (e.target as HTMLElement).closest<HTMLElement>('[data-building-index]')
    drag.current = {
      startX: e.clientX,
      startPosition: position,
      moved: false,
      buildingIndex: pressedBuilding ? Number(pressedBuilding.dataset.buildingIndex) : null,
    }
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return
    const dx = e.clientX - drag.current.startX
    if (Math.abs(dx) > 4) drag.current.moved = true
    setPosition(drag.current.startPosition - dx / DRAG_PX_PER_STEP)
  }
  function endDrag() {
    const d = drag.current
    drag.current = null
    setDragging(false)
    setPosition((p) => Math.round(p))
    if (d && !d.moved && d.buildingIndex !== null) {
      cycleTier(d.buildingIndex)
    }
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
          aria-label={`Lab building carousel, showing ${activeLabel} — drag or use the buttons below to look around, or click a building to see its upgrades`}
        >
          {ITEMS.map((it, i) => {
            const delta = wrappedDelta(i, position)
            if (Math.abs(delta) > VISIBLE_CUTOFF) return null
            const tier = tiers[i]
            return (
              <div
                key={it.sprite}
                className="mkt-carousel-item"
                style={{ ...cardStyle(delta), transitionProperty: dragging ? 'none' : undefined }}
              >
                <button
                  type="button"
                  data-building-index={i}
                  onClick={() => cycleTier(i)}
                  aria-label={`${it.label}, ${TIER_LABELS[tier]}. Click to see the next upgrade.`}
                  className="flex flex-col items-center bg-transparent p-0 transition-transform active:scale-95"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/sprites/buildings/${it.sprite}${TIER_SUFFIXES[tier]}.png`}
                    alt={it.label}
                    width={96}
                    height={96}
                    draggable={false}
                    className="mkt-pixel pointer-events-none"
                    style={{ width: 'clamp(56px, 16vw, 96px)', height: 'clamp(56px, 16vw, 96px)' }}
                  />
                  <span
                    className="font-pixel mt-2 inline-block bg-[#f7f7f4] px-1.5 py-0.5 text-[#0d1b2e]"
                    style={{ fontSize: '0.55rem', borderRadius: 3 }}
                  >
                    {it.label}
                  </span>
                  <span
                    className="font-pixel mt-1 inline-block text-[#7d6108]"
                    style={{ fontSize: '0.5rem' }}
                  >
                    {TIER_LABELS[tier]}
                  </span>
                </button>
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
