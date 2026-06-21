import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getTeamContext } from '@/lib/phase'
import { resolveTeacherRole } from '@/lib/teacher/auth'

/**
 * Authenticated shell. There is intentionally NO navigation chrome here — the
 * lab scene (/lab) is the only navigation surface, and features open as overlays
 * over it (spec §1). Standalone feature routes still render full-bleed for
 * deep-linking and back-compat.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId, sessionClaims } = await auth()
  if (!userId) redirect('/sign-in')

  const ctx = await getTeamContext(userId)
  if (!ctx) {
    // A team-less account is either a teacher (send to their dashboard) or a new
    // user who still needs onboarding.
    if (await resolveTeacherRole(userId, sessionClaims)) redirect('/teacher')
    redirect('/onboarding')
  }

  return <main className="min-h-screen">{children}</main>
}
