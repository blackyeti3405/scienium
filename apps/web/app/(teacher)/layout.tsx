import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { resolveTeacherRole } from '@/lib/teacher/auth'
import { BugReportButton } from '@/components/ui/BugReportButton'

export const metadata = { title: 'Teacher · scienium' }

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { userId, sessionClaims } = await auth()
  if (!userId) redirect('/sign-in')
  if (!(await resolveTeacherRole(userId, sessionClaims))) redirect('/lab')

  return (
    <div className="min-h-screen bg-[#0d1b2e] text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="font-pixel text-[#F5C518] text-xs">⚗ scienium · Teacher</span>
          <nav className="flex items-center gap-4 font-pixel text-[9px] uppercase tracking-widest">
            <Link href="/teacher" className="text-white/60 hover:text-white transition-colors">
              Roster
            </Link>
            <Link href="/teacher/showcase-moderation" className="text-white/60 hover:text-white transition-colors">
              Showcases
            </Link>
            <Link href="/teacher/reports" className="text-white/60 hover:text-white transition-colors">
              Reports
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <BugReportButton />
          <UserButton />
        </div>
      </header>
      <main className="p-6 max-w-5xl mx-auto">{children}</main>
    </div>
  )
}
