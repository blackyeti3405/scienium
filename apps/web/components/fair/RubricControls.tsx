import { ISEF_RUBRIC, type RubricTrack } from '@/lib/fairs/isef-rubric'

/**
 * Science/Engineering track pill switcher shared by the ISEF rubric views
 * (ScienceFairFeature's read-only rubric, RubricSelfCheck, TeacherRubricScoring).
 * `testAttr` emits `data-track` for the two call sites the e2e specs select on.
 */
export function TrackToggle({
  value,
  onChange,
  testAttr,
}: {
  value: RubricTrack['key']
  onChange: (key: RubricTrack['key']) => void
  testAttr?: boolean
}) {
  return (
    <div className="flex items-center gap-1 border border-white/15 rounded-sm overflow-hidden">
      {ISEF_RUBRIC.map((t) => (
        <button
          key={t.key}
          {...(testAttr ? { 'data-track': t.key } : {})}
          onClick={() => onChange(t.key)}
          className={`font-pixel text-[7px] px-3 py-1.5 transition-colors ${
            value === t.key ? 'bg-[#F5C518] text-[#0d1b2e]' : 'text-white/45 hover:text-white/70'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

/** Checklist sub-items judges score against, each prefixed with a green check. */
export function ChecklistItems({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map((it, i) => (
        <li key={i} className="flex gap-1.5 text-[12px] text-white/55 leading-relaxed">
          <span className="text-green-400/60 shrink-0 mt-[1px]">✓</span>
          {it}
        </li>
      ))}
    </ul>
  )
}
