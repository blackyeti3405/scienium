import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { resolveTeacherRole } from '@/lib/teacher/auth'

/**
 * The "door" into the game. Marketing now lives at `/`; this route is the single
 * entry point that drops an authenticated player into the right place:
 *   teachers → /teacher (they have no team, so /lab would bounce them to onboarding)
 *   everyone else → /lab (the spatial lab scene)
 *
 * `/game` is NOT on the public allowlist in middleware.ts, so a signed-out visitor
 * is sent to sign-in (and returned here afterward) before this component runs; the
 * userId guard below is a defensive fallback.
 */
export default async function GamePage() {
  const { userId, sessionClaims } = await auth()
  if (!userId) redirect('/sign-in')
  if (await resolveTeacherRole(userId, sessionClaims)) redirect('/teacher')
  redirect('/lab')
}
