import { RubricSelfCheck } from '@/components/fair/RubricSelfCheck'

/**
 * Standalone deep-link for the rubric self-check (Feature F1). The dashboard
 * layout intentionally supplies no nav chrome for standalone routes — they
 * render full-bleed — so this page owns its own dark pixel shell, matching
 * the same surface reachable from the Fair Hub's "Self-check" tab
 * (components/fair/ScienceFairFeature.tsx). One component, two mounts.
 */
export default function RubricPage() {
  return (
    <div className="min-h-screen bg-[#0d1b2e] text-white">
      <div className="px-6 py-4 border-b border-white/10">
        <h1 className="font-pixel text-[10px] text-white">ISEF Rubric</h1>
        <p className="font-pixel text-[7px] text-white/35 mt-1">
          Score your project against the judging criteria before the fair
        </p>
      </div>
      <div className="max-w-3xl mx-auto">
        <RubricSelfCheck />
      </div>
    </div>
  )
}
