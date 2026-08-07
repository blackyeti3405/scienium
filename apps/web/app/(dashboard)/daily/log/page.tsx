import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { OperationsHubFeature } from '@/components/ops/OperationsHubFeature'
import { getTeamContext } from '@/lib/team/context'

export default async function ProjectLogPage() {
  // The hub shows only the tabs this phase unlocks, so it needs the phase even on
  // the standalone route — not just inside the lab gateway.
  const { userId } = await auth()
  const ctx = userId ? await getTeamContext(userId) : null
  if (!ctx) redirect('/onboarding')

  return (
    <div className="min-h-screen">
      <OperationsHubFeature initialTab="log" phase={ctx.phase} />
    </div>
  )
}
