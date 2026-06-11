import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getTeamContext, PHASE_INFO } from '@/lib/phase'
import { LabCanvas } from '@/components/lab/LabCanvas'

export const metadata = { title: 'Lab Home' }

export default async function LabPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const ctx = await getTeamContext(userId).catch(() => null)
  const phase = ctx?.phase ?? 'discovery'
  const labType = ctx?.labType ?? null
  const phaseInfo = PHASE_INFO[phase]

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page header — regular (non-pixel) font for readability */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Lab Home</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {phaseInfo.description} — {phaseInfo.label} phase
        </p>
      </div>

      {/* Lab canvas — the spatial navigation hub */}
      <LabCanvas phase={phase} labType={labType} />

      {/* Contextual help based on phase */}
      <PhaseHint phase={phase} />
    </div>
  )
}

function PhaseHint({ phase }: { phase: string }) {
  const hints: Record<string, string> = {
    discovery:
      'Start in Discovery to explore topics. Once you commit to a research direction, you\'ll select a lab type and watch your lab grow.',
    lab_selection:
      'Choose a lab type that best matches your research topic. This is a one-time decision — your lab will grow and reskin when you confirm.',
    literature_review:
      'Review 25 research papers to unlock full lab advancement. Your Citation Graph grows with each paper you process.',
    research_planning:
      'Design your study — define your hypothesis, methodology, and variables. This unlocks the Working phase.',
    working:
      'Full lab access. Buy buildings, play mini-games, earn KP and LC, and battle other labs in PvP.',
    showcase:
      'Your Showcase Wing is now available. Publish your completed research for the world to see.',
  }

  const hint = hints[phase]
  if (!hint) return null

  return (
    <p className="text-sm text-muted-foreground border-l-2 border-muted pl-3 italic">
      {hint}
    </p>
  )
}
