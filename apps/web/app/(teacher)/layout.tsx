import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { resolveTeacherRole } from '@/lib/teacher/auth'

export const metadata = { title: 'Teacher · NOVA Lab' }

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { userId, sessionClaims } = await auth()
  if (!userId) redirect('/sign-in')
  if (!(await resolveTeacherRole(userId, sessionClaims))) redirect('/lab')

  return (
    <div className="min-h-screen bg-[#0d1b2e] text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="font-pixel text-[#F5C518] text-xs">⚗ NOVA Lab · Teacher</span>
          <nav className="flex items-center gap-4 font-pixel text-[9px] uppercase tracking-widest">
            <Link href="/teacher" className="text-white/60 hover:text-white transition-colors">
              Roster
            </Link>
            <Link href="/teacher/validations" className="text-white/60 hover:text-white transition-colors">
              Validations
            </Link>
          </nav>
        </div>
        <UserButton afterSignOutUrl="/" />
      </header>
      <main className="p-6 max-w-5xl mx-auto">{children}</main>
    </div>
  )
}
