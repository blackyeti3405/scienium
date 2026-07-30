import type { Metadata } from 'next'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { Reveal } from '@/components/marketing/Reveal'
import { MarketingNav, MarketingFooter } from '@/components/marketing/MarketingChrome'
import { ContactForm } from '@/components/marketing/ContactForm'
import { FaqAccordion } from '@/components/marketing/FaqAccordion'

/**
 * Org/outreach page (`/about`) — who is building scienium and why. Shares the
 * light marketing system and motion with the homepage (DESIGN.md). Product
 * detail lives on `/`, so this page stays about the team and the mission and
 * points at the product rather than re-listing it.
 */

const ACCENT_INK = '#7d6108'
const CTA_FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f7f4]'
// Same chunky 3D-press shadow as the homepage's GhostCTA (page.tsx) — one
// interaction language for every button-shaped link across the site.
const CTA_PRESS =
  'shadow-[4px_4px_0_0_#0d1b2e] transition-[transform,box-shadow] duration-150 ' +
  'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#0d1b2e] ' +
  'active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_0_#0d1b2e]'

const PAGE_DESCRIPTION =
  'The student team behind scienium: who we are, why we are building it, and how to get in touch.'

export const metadata: Metadata = {
  title: 'About · scienium',
  description: PAGE_DESCRIPTION,
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About · scienium',
    description: PAGE_DESCRIPTION,
    type: 'website',
    images: ['/marketing/lab.png'],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/marketing/lab.png'],
  },
}

const GROUPS = [
  { label: 'Outreach & public-facing', body: 'Promotion, school pilots, and the public brand.' },
  { label: 'Graphic design', body: 'The gateway buildings and every lab-type re-skin, hand-drawn and AI-assisted pixel art.' },
  { label: 'Game & web development', body: 'Mechanics, backend, security, and scale for a classroom of student teams.' },
]

// Six on desktop, four on mobile (the last two hide) so the strip never clips.
const HERO_SPRITES = [
  { s: 'discovery_generic', mobile: true },
  { s: 'literature_review_generic', mobile: true },
  { s: 'operations_hub_generic', mobile: true },
  { s: 'research_plan_generic', mobile: true },
  { s: 'science_fair_generic', mobile: false },
  { s: 'showcase_generic', mobile: false },
]

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-pixel" style={{ color: ACCENT_INK, fontSize: '0.6rem', letterSpacing: '0.1em' }}>
      {children}
    </span>
  )
}

const ORG_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'scienium',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  logo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/scienium-logo.png`,
  description: PAGE_DESCRIPTION,
}

export default async function AboutPage() {
  const { userId } = await auth()

  return (
    <main id="main-content" className="min-h-screen bg-[#f7f7f4] text-[#0d1b2e]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSON_LD) }} />
      <MarketingNav userId={userId} />

      {/* ── Hero (instant) ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-6 pb-14 pt-20 text-center md:px-10 md:pb-16 md:pt-24">
        <h1
          className="mx-auto max-w-[20ch] font-display text-[2.5rem] font-bold leading-[1.04] tracking-tight sm:text-5xl md:text-[3.3rem]"
          style={{ textWrap: 'balance' } as React.CSSProperties}
        >
          A student team building the tool we wished we had.
        </h1>
        <p className="mx-auto mt-6 max-w-[52ch] font-display text-lg leading-relaxed text-[#46566b]">
          We competed in science fair and kept hitting the same wall: the research was real, but
          nobody warned us how brutal the competition was.
        </p>

        {/* decorative gateway strip; last two sprites hide on mobile so none clip */}
        <Reveal
          className="mkt-iso-plate mt-14 flex items-end justify-center gap-4 overflow-hidden border border-[#e6e5dd] px-4 py-6 sm:gap-6"
          style={{ borderRadius: 8 }}
        >
          {HERO_SPRITES.map((g, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={g.s}
              src={`/sprites/gateways/${g.s}.png`}
              alt=""
              aria-hidden
              width={58}
              height={58}
              className={`mkt-pixel mkt-float drop-shadow-[0_6px_0_rgba(13,27,46,0.2)] ${g.mobile ? '' : 'hidden sm:block'}`}
              style={{ width: 'clamp(44px, 12vw, 58px)', height: 'clamp(44px, 12vw, 58px)', ['--float-dur' as string]: `${6 + (i % 3)}s`, ['--float-delay' as string]: `${i * 0.35}s` }}
            />
          ))}
        </Reveal>
      </section>

      {/* ── Who is building it ───────────────────────────────────────────── */}
      <section className="border-t border-[#e6e5dd]">
        <div className="mx-auto max-w-5xl px-6 py-24 md:px-10 md:py-32">
          <div className="grid gap-12 md:grid-cols-2 md:gap-16">
            <div>
              <Eyebrow>WHO IS BUILDING IT</Eyebrow>
              <h2 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                No adults on this team. Just students who&apos;ve done this before.
              </h2>
              <div
                className="mt-6 flex h-28 w-28 flex-col items-center justify-center border border-dashed border-[#c6c5ba] bg-[#eeede6] text-center"
                style={{ borderRadius: 8 }}
              >
                <span className="font-pixel text-[#5a6b80]" style={{ fontSize: '0.5rem' }}>PHOTO</span>
                <span className="mt-1 font-display text-[11px] leading-snug text-[#5a6b80]">Rig</span>
              </div>
              <div className="mt-5 space-y-4 font-display text-[17px] leading-relaxed text-[#3c4657]">
                <p>
                  scienium is led by <strong className="text-[#0d1b2e]">Rig Saini</strong>, who has
                  competed in science fair for five years at every level, school to international, and
                  placed second in Biomedical Engineering at ISEF 2026, the largest pre-college
                  research competition in the world.
                </p>
                <p>
                  Around him, a small student team splits the work across three groups. Everyone here
                  is building this alongside their own coursework and, in several cases, their own
                  science-fair projects.
                </p>
              </div>
            </div>

            {/* labeled rows, not cards (full-width dividers, no side stripes) */}
            <Reveal>
              <ul className="font-display">
                {GROUPS.map((g, i) => (
                  <li key={g.label} className={`py-5 ${i > 0 ? 'border-t border-[#e4e3db]' : ''}`}>
                    <p className="text-lg font-semibold text-[#0d1b2e]">{g.label}</p>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-[#5a6b80]">{g.body}</p>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Why + what we're making (merged; CTA lives here) ─────────────── */}
      <section className="border-t border-[#e6e5dd]">
        <div className="mx-auto max-w-4xl px-6 py-24 md:px-10 md:py-32">
          <Eyebrow>WHY WE ARE BUILDING IT</Eyebrow>
          <h2 className="mt-5 font-display text-2xl font-semibold leading-snug tracking-tight sm:text-3xl md:text-[2.15rem]">
            Research culture and mentorship stay locked inside well-resourced schools. So does a
            real sense of how competitive science fair is. A video game can carry all of it
            everywhere a browser reaches.
          </h2>
          <p className="mt-6 max-w-[62ch] font-display text-lg leading-relaxed text-[#46566b]">
            scienium keeps the rigor of real research and supplies what is usually missing:
            structure, continuous feedback, and a reason to keep going. Progress requires
            demonstrated understanding, and every team publishes a public showcase at the end. One
            video game walks a team from a question all the way to the fair, judging rigor
            included, with rival teams raiding each other&apos;s labs in the Battle Arena along the
            way.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link
              href="/#journey"
              className={`font-pixel inline-flex min-h-[52px] items-center border border-[#0d1b2e] bg-[#f7f7f4] px-8 text-[#0d1b2e] ${CTA_PRESS} ${CTA_FOCUS}`}
              style={{ fontSize: '0.7rem', letterSpacing: '0.04em', borderRadius: 6 }}
            >
              SEE THE JOURNEY
            </Link>
            <Link
              href="/pvp"
              className={`font-pixel inline-flex min-h-[52px] items-center bg-[#F5C518] px-8 text-[#0d1b2e] ${CTA_PRESS} ${CTA_FOCUS}`}
              style={{ fontSize: '0.7rem', letterSpacing: '0.04em', borderRadius: 6 }}
            >
              SEE HOW PVP WORKS
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="border-t border-[#e6e5dd] bg-[#f2f1ea]">
        <div className="mx-auto max-w-3xl px-6 py-24 md:px-10 md:py-28">
          <Eyebrow>QUESTIONS</Eyebrow>
          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Before you get in touch.
          </h2>
          <Reveal className="mt-10">
            <FaqAccordion />
          </Reveal>
        </div>
      </section>

      {/* ── Contact ──────────────────────────────────────────────────────── */}
      <section id="contact" className="border-t border-[#e6e5dd]">
        <div className="mx-auto grid max-w-4xl items-start gap-12 px-6 py-24 md:grid-cols-2 md:gap-16 md:px-10 md:py-32">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Get in touch.</h2>
            <p className="mt-5 max-w-sm font-display text-lg leading-relaxed text-[#46566b]">
              Teacher interested in a classroom pilot? Student with feedback? A real person on the
              team reads every message.
            </p>
          </div>
          <Reveal>
            <ContactForm />
          </Reveal>
        </div>
      </section>

      <MarketingFooter userId={userId} />
    </main>
  )
}
