'use client'

import { LAB_TYPES, LAB_TYPE_LABELS, type LabType } from '@/lib/phase'

/**
 * Sprites are 64px sources. Render at an INTEGER multiple (2x = 128px) with
 * `image-rendering: pixelated`, the same rule components/lab/Sprite.tsx follows:
 * a fractional scale like 1.5x leaves some source pixels 2px wide and others 1px,
 * which reads as a blurry, uneven sprite. next/image is deliberately avoided here
 * for the same reason — its resampler softens pixel art.
 */
const SPRITE_PX = 128

/**
 * Student-facing blurbs for the six labs.
 *
 * Deliberately NOT shared with `LAB_TYPE_DESCRIPTIONS` in `lib/lab-type/classify.ts`:
 * those are keyword lists written for a model to match a research idea against,
 * and read like a taxonomy. These are for a 15-year-old choosing on a hunch.
 */
const BLURBS: Record<LabType, string> = {
  volt_lab: 'Building things: circuits, robots, machines, code.',
  biocore: 'Living things: plants, cells, animals, ecosystems.',
  chemworks: 'Reactions and materials: what stuff is made of.',
  terrabase: 'The planet: climate, weather, rocks, oceans.',
  mindframe: 'People: behaviour, psychology, surveys, society.',
  axiom: 'Physics, maths and space: theory and modelling.',
}

/**
 * The signature building of each lab at its TOP tier (`_t5`): what the plot
 * grows into, not what it starts as. Showing the finished article is the whole
 * point. The blurb says what the lab studies, the sprite says what you get.
 */
const HERO_BUILDING: Record<LabType, string> = {
  volt_lab: '/sprites/buildings/volt_lab/robotics-bay_t5.png',
  biocore: '/sprites/buildings/biocore/greenhouse_t5.png',
  chemworks: '/sprites/buildings/chemworks/distillation-tower_t5.png',
  terrabase: '/sprites/buildings/terrabase/weather-monitoring-post_t5.png',
  mindframe: '/sprites/buildings/mindframe/eeg-biofeedback-room_t5.png',
  axiom: '/sprites/buildings/axiom/observatory-dome_t5.png',
}

/**
 * The lab-type step of onboarding.
 *
 * A lab type has to be chosen up front for a practical reason: every building in
 * the shop is lab-type-gated, so a lab without one opens onto an empty shelf and
 * cannot place anything. But a student who has not picked a topic yet has no way
 * to know the right answer — so the copy says plainly that this is a guess, that
 * the game will correct it from their actual topic, and that nothing is lost when
 * it does (`lib/lab-type/transfer.ts` moves every building, level and grid
 * position onto the new lab's equivalent).
 */
export function LabTypePicker({
  value,
  onChange,
}: {
  value: LabType | null
  onChange: (labType: LabType) => void
}) {
  return (
    <div className="space-y-7">
      <div className="space-y-3">
        <h1 className="font-pixel text-white text-lg">Pick your lab</h1>
        <p className="text-white/70 text-[15px] leading-relaxed">
          Choose the one closest to what you think you&rsquo;ll work on. You don&rsquo;t need to be
          right. Once you lock in a final topic, we&rsquo;ll reassign your lab to match it
          automatically.
        </p>
        {/* A footnote, not a banner. In uppercase pixel type with wide tracking
            this line carried as much weight as the heading it sits under. */}
        <p className="text-[#F5C518]/70 text-[13px] leading-relaxed">
          All your progress transfers. Buildings, levels and layout come with you.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2" role="radiogroup" aria-label="Lab type">
        {LAB_TYPES.map((t, i) => {
          const selected = value === t
          // Even indices sit in the left column, odd in the right. The sprite
          // hugs the outer edge of its own column so the two columns mirror
          // and the text stays in the middle gutter.
          const imageOutside = i % 2 === 0 ? 'sm:flex-row' : 'sm:flex-row-reverse'
          return (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(t)}
              data-testid={`lab-type-${t}`}
              className={`flex items-center gap-5 text-left p-5 border transition-colors ${imageOutside} ${
                selected
                  ? 'border-[#F5C518] bg-[#F5C518]/10'
                  : 'border-white/20 hover:border-white/40'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={HERO_BUILDING[t]}
                alt=""
                aria-hidden
                width={SPRITE_PX}
                height={SPRITE_PX}
                draggable={false}
                className="pixel-art shrink-0"
                style={{ width: SPRITE_PX, height: SPRITE_PX }}
              />
              <span className="min-w-0">
                <span
                  className={`block font-pixel text-[11px] uppercase tracking-widest ${
                    selected ? 'text-[#F5C518]' : 'text-white/70'
                  }`}
                >
                  {LAB_TYPE_LABELS[t]}
                </span>
                <span className="block text-white/60 text-[13px] leading-snug mt-2">
                  {BLURBS[t]}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
