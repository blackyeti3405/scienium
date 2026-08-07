'use client'

import { LAB_TYPES, LAB_TYPE_LABELS, type LabType } from '@/lib/phase'

/**
 * Student-facing blurbs for the six labs.
 *
 * Deliberately NOT shared with `LAB_TYPE_DESCRIPTIONS` in `lib/lab-type/classify.ts`:
 * those are keyword lists written for a model to match a research idea against,
 * and read like a taxonomy. These are for a 15-year-old choosing on a hunch.
 */
const BLURBS: Record<LabType, string> = {
  volt_lab: 'Building things — circuits, robots, machines, code.',
  biocore: 'Living things — plants, cells, animals, ecosystems.',
  chemworks: 'Reactions and materials — what stuff is made of.',
  terrabase: 'The planet — climate, weather, rocks, oceans.',
  mindframe: 'People — behaviour, psychology, surveys, society.',
  axiom: 'Physics, maths and space — theory and modelling.',
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
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="font-pixel text-white text-sm">Pick your lab</h2>
        <p className="text-white/60 text-xs leading-relaxed">
          Choose the one closest to what you think you&rsquo;ll work on. You don&rsquo;t need to be
          right — once you lock in a final topic, we&rsquo;ll reassign your lab to match it
          automatically.
        </p>
        <p className="font-pixel text-[8px] text-[#F5C518]/80 leading-loose uppercase tracking-widest">
          All your progress transfers · buildings, levels and layout come with you
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Lab type">
        {LAB_TYPES.map((t) => {
          const selected = value === t
          return (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(t)}
              data-testid={`lab-type-${t}`}
              className={`text-left p-3 border transition-colors ${
                selected
                  ? 'border-[#F5C518] bg-[#F5C518]/10'
                  : 'border-white/20 hover:border-white/40'
              }`}
            >
              <span
                className={`block font-pixel text-[9px] uppercase tracking-widest ${
                  selected ? 'text-[#F5C518]' : 'text-white/70'
                }`}
              >
                {LAB_TYPE_LABELS[t]}
              </span>
              <span className="block text-white/50 text-[11px] leading-snug mt-1.5">
                {BLURBS[t]}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
