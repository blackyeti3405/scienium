import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { resolveTeacherRole } from '@/lib/teacher/auth'

export default async function HomePage() {
  const { userId, sessionClaims } = await auth()
  if (userId) {
    // Teachers have no team — send them to their dashboard, not /lab (which would
    // bounce a team-less account on to onboarding).
    if (await resolveTeacherRole(userId, sessionClaims)) redirect('/teacher')
    redirect('/lab')
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0d1b2e]">
      <div className="flex flex-col items-center gap-8">
        {/* Logo + title */}
        <div className="flex items-center gap-5">
          {/* Pixel-art scienium logo (laurel wreath + atom). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/scienium-logo.png"
            alt="scienium logo"
            width={72}
            height={72}
            className="pixel-art"
          />

          <h1 className="font-pixel text-white leading-snug text-center" style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2.2rem)' }}>
            scienium
          </h1>
        </div>

        {/* Tagline */}
        <p className="font-pixel text-[#8899aa] text-center leading-loose" style={{ fontSize: 'clamp(0.45rem, 1.2vw, 0.65rem)' }}>
          Build a virtual research lab.<br />
          Advance real science.
        </p>

        {/* CTA */}
        <Link
          href="/sign-in"
          className="font-pixel bg-[#F5C518] text-[#0d1b2e] px-10 py-4 hover:brightness-110 active:scale-95 transition-all"
          style={{ fontSize: 'clamp(0.55rem, 1.4vw, 0.75rem)', letterSpacing: '0.05em' }}
        >
          ↑ ENTER YOUR LAB
        </Link>

      </div>
    </main>
  )
}
