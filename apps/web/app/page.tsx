import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const { userId } = await auth()
  if (userId) redirect('/lab')

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0d1b2e]">
      <div className="flex flex-col items-center gap-8">
        {/* Logo + title */}
        <div className="flex items-center gap-5">
          {/* SVG recreation of the nova-lab mascot: figure hunched over a table */}
          <svg width="72" height="72" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Head */}
            <circle cx="68" cy="22" r="16" fill="#F5C518"/>
            {/* Curved back/neck arc */}
            <path d="M20 48 Q20 18 52 18" stroke="#F5C518" strokeWidth="12" strokeLinecap="round" fill="none"/>
            {/* Table top */}
            <rect x="14" y="52" width="72" height="10" rx="2" fill="#F5C518"/>
            {/* Left leg */}
            <rect x="20" y="62" width="10" height="28" rx="2" fill="#F5C518"/>
            {/* Right leg */}
            <rect x="70" y="62" width="10" height="28" rx="2" fill="#F5C518"/>
          </svg>

          <h1 className="font-pixel text-white leading-snug text-center" style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2.2rem)' }}>
            NOVA<br />Lab
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
