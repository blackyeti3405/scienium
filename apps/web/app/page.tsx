import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'

/**
 * Public marketing home (the front door at `/`). Unlike the in-game pages it does NOT
 * redirect signed-in users into the app — it shows the marketing site to everyone and
 * adapts its calls-to-action: signed-in players get "Launch your lab" (→ /game, the
 * door that routes them on); signed-out visitors get "Get started" (→ /sign-up). The
 * game itself keeps its existing routes (/lab, /dashboard, …).
 */

const FEATURES = [
  { title: 'Read & quiz', body: 'Teams read real research papers and take quizzes to ground their project in the literature.' },
  { title: 'Discover sources', body: 'Hunt down credible sources and build the evidence base behind your hypothesis.' },
  { title: 'Run experiments', body: 'Design and run experiments in a living lab that grows as your research advances.' },
  { title: 'Present at the fair', body: 'Build toward a science-fair showcase and present your findings to the judges.' },
  { title: 'Teacher tools', body: 'Validate work, moderate showcases, and follow every student team from one dashboard.' },
  { title: 'Head-to-head PvP', body: 'A quick competitive minigame to test what your lab has learned against other teams.' },
]

const GOLD = '#F5C518'

export default async function HomePage() {
  const { userId } = await auth()

  return (
    <main className="min-h-screen bg-[#0d1b2e] text-white">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/scienium-logo.png" alt="scienium" width={36} height={36} className="pixel-art" />
          <span className="font-pixel text-sm md:text-base">scienium</span>
        </div>
        <nav className="flex items-center gap-4 font-pixel" style={{ fontSize: '0.6rem' }}>
          {userId ? (
            <Link href="/game" className="text-[#F5C518] hover:brightness-110">Launch →</Link>
          ) : (
            <>
              <Link href="/sign-in" className="text-[#8899aa] hover:text-white">Sign in</Link>
              <Link href="/sign-up" className="bg-[#F5C518] text-[#0d1b2e] px-4 py-2 hover:brightness-110 transition-all">
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="flex flex-col items-center text-center px-6 pt-16 pb-20 md:pt-24">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/scienium-logo.png" alt="" width={96} height={96} className="pixel-art mb-8" />
        <h1 className="font-pixel leading-snug" style={{ fontSize: 'clamp(1.6rem, 5vw, 3rem)' }}>
          scienium
        </h1>
        <p className="font-pixel text-[#8899aa] mt-6 leading-loose" style={{ fontSize: 'clamp(0.5rem, 1.6vw, 0.8rem)' }}>
          Build a virtual research lab.<br />Advance real science.
        </p>
        <p className="font-sans text-[#aab7c6] max-w-xl mt-8 text-base md:text-lg leading-relaxed">
          A browser game where student teams run a science-fair research lab — read papers,
          discover sources, run experiments, and present at the fair. Plus teacher tools and a
          head-to-head minigame.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
          {userId ? (
            <Link
              href="/game"
              className="font-pixel bg-[#F5C518] text-[#0d1b2e] px-10 py-4 hover:brightness-110 active:scale-95 transition-all"
              style={{ fontSize: 'clamp(0.55rem, 1.4vw, 0.75rem)', letterSpacing: '0.05em' }}
            >
              ↑ LAUNCH YOUR LAB
            </Link>
          ) : (
            <>
              <Link
                href="/sign-up"
                className="font-pixel bg-[#F5C518] text-[#0d1b2e] px-10 py-4 hover:brightness-110 active:scale-95 transition-all"
                style={{ fontSize: 'clamp(0.55rem, 1.4vw, 0.75rem)', letterSpacing: '0.05em' }}
              >
                GET STARTED
              </Link>
              <Link
                href="/sign-in"
                className="font-pixel border border-[#2b3f5a] text-white px-10 py-4 hover:border-[#F5C518] active:scale-95 transition-all"
                style={{ fontSize: 'clamp(0.55rem, 1.4vw, 0.75rem)', letterSpacing: '0.05em' }}
              >
                SIGN IN
              </Link>
            </>
          )}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section className="px-6 md:px-10 pb-24 max-w-5xl mx-auto">
        <h2 className="font-pixel text-center mb-12" style={{ color: GOLD, fontSize: 'clamp(0.7rem, 2vw, 1rem)' }}>
          What you build
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="border border-[#1e3148] bg-[#0f2138] p-6 transition-colors hover:border-[#F5C518]/50"
            >
              <h3 className="font-pixel text-white mb-3" style={{ fontSize: '0.7rem' }}>{f.title}</h3>
              <p className="font-sans text-[#aab7c6] text-sm leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Closing CTA ─────────────────────────────────────────── */}
      <section className="text-center px-6 pb-24">
        <p className="font-pixel text-[#8899aa] mb-8" style={{ fontSize: 'clamp(0.55rem, 1.5vw, 0.8rem)' }}>
          Ready to run your lab?
        </p>
        <Link
          href={userId ? '/game' : '/sign-up'}
          className="font-pixel bg-[#F5C518] text-[#0d1b2e] px-10 py-4 hover:brightness-110 active:scale-95 transition-all"
          style={{ fontSize: 'clamp(0.55rem, 1.4vw, 0.75rem)', letterSpacing: '0.05em' }}
        >
          {userId ? '↑ LAUNCH YOUR LAB' : 'GET STARTED'}
        </Link>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-[#1e3148] px-6 md:px-10 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="font-pixel text-[#5d6b7d]" style={{ fontSize: '0.5rem' }}>© scienium</span>
        <nav className="flex gap-5 font-sans text-sm text-[#8899aa]">
          <Link href="/showcase/gallery" className="hover:text-white">Showcase</Link>
          {userId ? (
            <Link href="/game" className="hover:text-white">Play</Link>
          ) : (
            <Link href="/sign-in" className="hover:text-white">Sign in</Link>
          )}
        </nav>
      </footer>
    </main>
  )
}
