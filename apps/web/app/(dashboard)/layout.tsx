import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { DashboardNav } from '@/components/shared/DashboardNav'
import { getTeamContext } from '@/lib/phase'
import type { Phase, LabType } from '@/lib/phase'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Resolve the user's current team phase for nav gating.
  // Falls back to 'discovery' if the user has no team yet (new/onboarding user).
  let phase: Phase = 'discovery'
  let labType: LabType | null = null

  try {
    const ctx = await getTeamContext(userId)
    if (ctx) {
      phase = ctx.phase
      labType = ctx.labType
    }
  } catch {
    // DB unavailable during build/preview — default to discovery
  }

  return (
    <div className="flex min-h-screen">
      <DashboardNav phase={phase} labType={labType} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
