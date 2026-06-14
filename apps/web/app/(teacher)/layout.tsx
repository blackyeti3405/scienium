import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { userId, sessionClaims } = await auth()
  if (!userId) redirect('/sign-in')

  const role = (sessionClaims?.metadata as { role?: string })?.role
  if (role !== 'teacher' && role !== 'admin') redirect('/lab')

  return (
    <div className="flex min-h-screen">
      {/* TODO: TeacherNav */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
