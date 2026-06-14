import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

/**
 * Authenticated shell. There is intentionally NO navigation chrome here — the
 * lab scene (/lab) is the only navigation surface, and features open as overlays
 * over it (spec §1). Standalone feature routes still render full-bleed for
 * deep-linking and back-compat.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  return <main className="min-h-screen">{children}</main>
}
