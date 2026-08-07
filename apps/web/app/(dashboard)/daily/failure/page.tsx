import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { OperationsHubFeature } from '@/components/ops/OperationsHubFeature'
import { getTeamContext } from '@/lib/team/context'

export default async function FailureLogPage() {
  // Same as the Project Log route: the hub needs the phase to know which tabs
  // are open.
  const { userId } = await auth()
  const ctx = userId ? await getTeamContext(userId) : null
  if (!ctx) redirect('/onboarding')

  return (
    <div className="min-h-screen">
      <OperationsHubFeature initialTab="failure" phase={ctx.phase} />
    </div>
  )
}
