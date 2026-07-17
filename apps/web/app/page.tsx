import type { Metadata } from 'next'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { getLaunchContext } from '@/lib/launch'
import { LaunchPreloader } from '@/components/LaunchPreloader'
import { Reveal } from '@/components/marketing/Reveal'
import { CountUp } from '@/components/marketing/CountUp'
import { Shot, ShotPlaceholder } from '@/components/marketing/Shot'
import { HeroParallaxBg } from '@/components/marketing/HeroParallaxBg'
import { TiltCard } from '@/components/marketing/TiltCard'
import { MarketingNav, MarketingFooter } from '@/components/marketing/MarketingChrome'
import { JourneyRail } from '@/components/marketing/JourneyRail'
import { FlipWords } from '@/components/marketing/FlipWords'
import { SpriteCarousel } from '@/components/marketing/SpriteCarousel'

/**
 * Public marketing home (`/`) — the product front door. Light theme (paper field,
 * navy ink, gold as the single accent), Space Grotesk display + Press Start 2P
 * pixel accents, and REAL captured game screenshots (public/marketing/*.png) as
 * the product shots. Surfaces we can't screenshot yet are honest labeled slots.
 * Design system + motion: DESIGN.md. Signed-in "Launch" buttons resolve their
 * destination via getLaunchContext (skips the old /game redirect hop) and
 * preload the sprites the lab paints with.
 */

// One accent, two stops: gold fill for CTAs, darker gold ink for small labels
// (the fill fails contrast as small text; the ink stop clears WCAG AA).
const ACCENT_INK = '#7d6108'

export const metadata: Metadata = {
  title: 'scienium: the world’s first science-fair video game',
  description:
    'A browser game where student teams pick a real research question, master the methods, run experiments, raid rival labs in the Battle Arena, and present at the science fair.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'scienium: the world’s first science-fair video game',
    description:
      'Turn the science fair into a lab your class runs. Real literature review, in-depth method lessons, experiments, Battle Arena raids, and the official ISEF rubric.',
    type: 'website',
    images: ['/marketing/lab.png'],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/marketing/lab.png'],
  },
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-pixel" style={{ color: ACCENT_INK, fontSize: '0.6rem', letterSpacing: '0.1em' }}>
      {children}
    </span>
  )
}

const CTA_FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f7f4]'

// Chunky "pressed slab" CTA: a hard, non-blurred offset shadow (not a soft
// glow — flat solid color, matching the game UI's own chunky-button language)
// that visually compresses toward the label on hover/press. Pure CSS, no JS.
const CTA_PRESS =
  'shadow-[4px_4px_0_0_#0d1b2e] transition-[transform,box-shadow] duration-150 ' +
  'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#0d1b2e] ' +
  'active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_0_#0d1b2e]'

// Same press effect for CTAs sitting on the dark Battle Arena section — the
// offset shadow flips to the paper color so it still reads against navy.
const DARK_CTA_PRESS =
  'shadow-[4px_4px_0_0_#f7f7f4] transition-[transform,box-shadow] duration-150 ' +
  'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#f7f7f4] ' +
  'active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_0_#f7f7f4]'

// Real rock-paper-scissors type cycle every building/spell belongs to
// (docs/SPEC.md §11.4) — condensed for the homepage; the full reasoning for
// each matchup lives on /pvp.
const PVP_TYPES = [
  { type: 'Empirical', beats: 'Beats Theoretical. Real data can prove a model wrong.' },
  { type: 'Theoretical', beats: "Beats Applied. You can't engineer it right without the theory." },
  { type: 'Applied', beats: "Beats Empirical. The instruments you build make real observation possible." },
]

function PrimaryCTA({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`font-pixel flex min-h-[52px] items-center bg-[#F5C518] px-8 text-[#0d1b2e] ${CTA_PRESS} ${CTA_FOCUS}`}
      style={{ fontSize: '0.7rem', letterSpacing: '0.04em', borderRadius: 6 }}
    >
      {children}
    </Link>
  )
}

function GhostCTA({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`font-pixel flex min-h-[52px] items-center border border-[#0d1b2e] bg-[#f7f7f4] px-8 text-[#0d1b2e] transition-colors ${CTA_PRESS} ${CTA_FOCUS}`}
      style={{ fontSize: '0.7rem', letterSpacing: '0.04em', borderRadius: 6 }}
    >
      {children}
    </Link>
  )
}

/* One idea per phase, mirrors the in-game phase order. Real shot or honest slot. */
const NUM = '#63614f' // legible muted numeral (clears AA on the band)

// The six lab types — reused by the game-layer FlipWords headline and CategoryList.
const LAB_TYPES = ['BioCore', 'ChemWorks', 'Volt Lab', 'TerraBase', 'MindFrame', 'Axiom']

export default async function HomePage() {
  const { userId, sessionClaims } = await auth()
  // Resolve where "Launch" points (skipping the /game hop) and what to pre-warm.
  const launch = userId ? await getLaunchContext(userId, sessionClaims) : null
  const launchHref = launch?.href ?? '/game'
  const primaryHref = userId ? launchHref : '/sign-up'
  const primaryLabel = userId ? 'LAUNCH YOUR LAB' : 'GET STARTED'

  return (
    <main id="main-content" className="min-h-screen bg-[#f7f7f4] text-[#0d1b2e]">
      {launch && launch.preloadSprites.length > 0 && (
        <LaunchPreloader href={launch.href} sprites={launch.preloadSprites} />
      )}
      <MarketingNav userId={userId} launchHref={launchHref} />

      {/* ── Hero: real lab shot as an atmospheric backdrop, fading into the paper field. ── */}
      <section className="relative flex min-h-[86vh] items-end overflow-hidden">
        <HeroParallaxBg src="/marketing/lab.png" />
        <div className="relative z-[2] mx-auto w-full max-w-6xl px-6 pb-16 md:px-10">
          <div className="max-w-[40ch]">
            <p className="font-display text-base font-bold" style={{ color: ACCENT_INK }}>
              The world&apos;s first science-fair video game.
            </p>
            <h1
              className="mt-4 font-display font-bold leading-[0.98] tracking-tight"
              style={{ fontSize: 'clamp(2.6rem, 7vw, 5rem)', textWrap: 'balance' } as React.CSSProperties}
            >
              Run the science fair as a real lab.
            </h1>
            <p className="mt-6 max-w-[48ch] font-display text-lg leading-relaxed text-[#33465e]">
              scienium is a browser game where student teams pick a real question, master the
              methods, run real experiments, and raid rival labs head-to-head in the Battle Arena
              on the way to the fair.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <PrimaryCTA href={primaryHref}>{primaryLabel}</PrimaryCTA>
              <GhostCTA href="#journey">SEE THE JOURNEY</GhostCTA>
            </div>
          </div>
        </div>
      </section>

      {/* ── Proof: two numbers, in context (not a stat wall). Instant. ─────── */}
      <section className="border-y border-[#e6e5dd] bg-[#f2f1ea]">
        <div className="mx-auto grid max-w-5xl gap-10 px-6 py-16 sm:grid-cols-2 md:px-10">
          <div className="flex items-baseline gap-4">
            <span className="font-pixel text-[#0d1b2e]" style={{ fontSize: '1.6rem' }}><CountUp value={832} /></span>
            <span className="font-display text-[15px] leading-snug text-[#46566b]">
              authored lessons that teach the research method in real depth
            </span>
          </div>
          <div className="flex items-baseline gap-4">
            <span className="font-pixel text-[#0d1b2e]" style={{ fontSize: '1.6rem' }}>70</span>
            <span className="font-display text-[15px] leading-snug text-[#46566b]">
              methodology terms, defined and always one tap away
            </span>
          </div>
        </div>
      </section>

      {/* ── The gap (one statement, instant). ────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-6 py-24 md:px-10 md:py-32">
        <p className="font-display text-2xl font-semibold leading-snug tracking-tight sm:text-3xl md:text-[2.4rem]">
          The science fair is one of the only times school asks for real research. It almost never
          teaches students how competitive that research really is.
        </p>
        <p className="mt-6 max-w-[62ch] font-display text-lg leading-relaxed text-[#46566b]">
          scienium keeps the rigor and adds what is missing: the real judging criteria, and a lab
          full of rivals chasing the same spot at the fair. You advance by proving you understand,
          not by clicking.
        </p>
      </section>

      {/* ── The journey (headings instant; only the shots reveal). ────────── */}
      <section id="journey" className="border-t border-[#e6e5dd] bg-[#f2f1ea]">
        <div className="mx-auto max-w-6xl px-6 py-24 md:px-10 md:py-28">
          <div className="max-w-2xl">
            <Eyebrow>THE JOURNEY</Eyebrow>
            <h2 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-[2.7rem]">
              Six phases, from a blank page to the fair floor.
            </h2>
            <p className="mt-5 font-display text-lg leading-relaxed text-[#46566b]">
              Every team walks the same path a real researcher does. Each phase unlocks a building on
              your plot, and the lab grows as you advance.
            </p>
          </div>

          <div className="md:flex md:items-stretch md:gap-10">
          <JourneyRail />
          <div className="min-w-0 md:flex-1">
          {/* 01 Discovery */}
          <div className="mt-20 grid items-center gap-10 md:mt-24 md:grid-cols-2 md:gap-14" data-journey-step={1}>
            <div>
              <span className="font-pixel" style={{ color: NUM, fontSize: '1.4rem' }}>01</span>
              <h3 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-[1.8rem]">
                Find a question worth chasing.
              </h3>
              <p className="mt-4 max-w-[48ch] font-display text-[17px] leading-relaxed text-[#46566b]">
                Explore across Wikipedia, YouTube, and academic papers. Let curiosity branch until a
                real, testable topic clicks, then commit it and break ground.
              </p>
            </div>
            <Reveal>
              <Shot src="/marketing/discovery.png" title="Discovery · /discovery" alt="The Discovery screen: a topic-exploration panel prompting the team to seed interests and branch out through Wikipedia, YouTube and papers, with a Start Exploring button." ratio="16 / 10" />
            </Reveal>
          </div>

          {/* 02 Literature Review (placeholder, product voice) */}
          <div className="mt-24 grid items-center gap-10 md:grid-cols-2 md:gap-14" data-journey-step={2}>
            <div className="md:order-2">
              <span className="font-pixel" style={{ color: NUM, fontSize: '1.4rem' }}>02</span>
              <h3 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-[1.8rem]">
                Ground it in the literature, and prove you get it.
              </h3>
              <p className="mt-4 max-w-[48ch] font-display text-[17px] leading-relaxed text-[#46566b]">
                Upload 25 real sources. Vega checks each one is relevant, then quizzes every teammate
                to proficiency. A 70-term methodology glossary stays open the whole time.
              </p>
            </div>
            <Reveal className="md:order-1">
              <ShotPlaceholder
                title="Literature Review"
                note="The review library with 25 vetted sources and a passed comprehension quiz."
                badge="Preview soon"
              />
            </Reveal>
          </div>

          {/* 03 Field Codex — full-width feature */}
          <div className="mt-28" data-journey-step={3}>
            <div className="mx-auto max-w-2xl text-center">
              <span className="font-pixel" style={{ color: NUM, fontSize: '1.4rem' }}>03</span>
              <h3 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-[2rem]">
                Learn the methods, in real depth.
              </h3>
              <p className="mt-4 font-display text-[17px] leading-relaxed text-[#46566b]">
                832 authored lessons, sequentially unlocked, each with a worked example, a note on
                why judges ask about it, and a checkpoint quiz. A daily plan surfaces the three your
                project needs next.
              </p>
            </div>
            <Reveal className="mx-auto mt-12 max-w-4xl">
              <Shot
                src="/marketing/codex-lesson.png"
                title="Field Codex · /daily/codex"
                alt="A real Field Codex lesson, Sound as a Longitudinal Pressure Wave, showing several sections of explanatory physics prose and a gold Worked Example block."
                ratio="16 / 10"
              />
            </Reveal>
          </div>

          {/* 04 Research Plan */}
          <div className="mt-24 grid items-center gap-10 md:grid-cols-2 md:gap-14" data-journey-step={4}>
            <div>
              <span className="font-pixel" style={{ color: NUM, fontSize: '1.4rem' }}>04</span>
              <h3 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-[1.8rem]">
                Design a study that holds up.
              </h3>
              <p className="mt-4 max-w-[48ch] font-display text-[17px] leading-relaxed text-[#46566b]">
                Pick your ISEF category, then write your hypothesis, methodology, and study design.
                Vega reviews it by project type and web searches your idea for novelty before you
                advance.
              </p>
            </div>
            <Reveal>
              <Shot src="/marketing/research-plan.png" title="Research Plan · /research-plan" alt="The Research Plan screen: project-type selector (Engineering or Science) with category cards, a connected Google-Doc plan source, and Review my plan and originality-check actions." ratio="16 / 10" />
            </Reveal>
          </div>

          {/* 05 Experiment & Data */}
          <div className="mt-24 grid items-center gap-10 md:grid-cols-2 md:gap-14" data-journey-step={5}>
            <div className="md:order-2">
              <span className="font-pixel" style={{ color: NUM, fontSize: '1.4rem' }}>05</span>
              <h3 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-[1.8rem]">
                Run it. Log it. Chart it.
              </h3>
              <p className="mt-4 max-w-[48ch] font-display text-[17px] leading-relaxed text-[#46566b]">
                Keep a Project Log and a Failure Log, then turn measurements into figures in the Data
                Terminal, with built-in Stats, Charts, and Plot guides.
              </p>
            </div>
            <Reveal className="md:order-1">
              <ShotPlaceholder
                title="Experiment & Data"
                note="Experiment runs, Project and Failure logs, and the Data Terminal turning raw numbers into real charts."
                ratio="16 / 11"
                badge="Preview soon"
              />
            </Reveal>
          </div>

          {/* 06 Fair & Showcase */}
          <div className="mt-24 grid items-center gap-10 md:grid-cols-2 md:gap-14" data-journey-step={6}>
            <div>
              <span className="font-pixel" style={{ color: NUM, fontSize: '1.4rem' }}>06</span>
              <h3 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-[1.8rem]">
                Present like it counts.
              </h3>
              <p className="mt-4 max-w-[48ch] font-display text-[17px] leading-relaxed text-[#46566b]">
                Score your project against the same five weighted sections real ISEF judges use for
                a judge-readiness score out of 100, then publish it to a public showcase anyone can
                see. Every team ships, win or lose.
              </p>
            </div>
            <Reveal>
              <Shot src="/marketing/rubric.png" title="Science Fair · /fair-hub/rubric" alt="The official ISEF rubric self-check: a Science and Engineering toggle, a judge-readiness score out of 100, and weighted criteria rows (Research Question, Design and Methodology, Execution) each with a score input." ratio="16 / 10" />
            </Reveal>
          </div>
          </div>
          </div>
        </div>
      </section>

      {/* ── Battle Arena (the gamified hook, heavily featured). ───────────── */}
      <section id="pvp" className="bg-[#0d1b2e] text-white">
        <div className="mx-auto max-w-5xl px-6 py-24 md:px-10 md:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <span className="font-pixel text-[#F5C518]" style={{ fontSize: '0.6rem', letterSpacing: '0.1em' }}>BATTLE ARENA</span>
            <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-[2.7rem]">
              Every building you own is a weapon.
            </h2>
            <p className="mt-5 font-display text-lg leading-relaxed text-[#b7c2d0]">
              Once a day, raid another team&apos;s lab. You&apos;re matched at random against a
              snapshot of their base, so their real progress stays untouched, and you get 15
              seconds to bring it down with spells your own buildings earned you. Destroy the whole
              base and you take the maximum 10 trophies on the class leaderboard. Raid carelessly
              and you lose trophies instead. Every raid is a real bet, not a free click.
            </p>
          </div>

          <Reveal className="mt-16 grid gap-5 sm:grid-cols-3">
            {PVP_TYPES.map((t) => (
              <TiltCard key={t.type} className="h-full rounded-lg border border-white/15 px-6 py-7 text-center">
                <span className="font-pixel text-[#F5C518]" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                  {t.type.toUpperCase()}
                </span>
                <p className="mt-3 font-display text-[15px] leading-relaxed text-[#b7c2d0]">{t.beats}</p>
              </TiltCard>
            ))}
          </Reveal>

          <div className="mt-12 flex justify-center">
            <Link
              href="/pvp"
              className={`font-pixel flex min-h-[52px] items-center border border-[#F5C518] bg-[#0d1b2e] px-8 text-[#F5C518] ${DARK_CTA_PRESS} ${CTA_FOCUS}`}
              style={{ fontSize: '0.7rem', letterSpacing: '0.04em', borderRadius: 6 }}
            >
              SEE HOW PVP WORKS
            </Link>
          </div>
        </div>
      </section>

      {/* ── The game layer. Full-width, centered (breaks the split run). ──── */}
      <section className="mx-auto max-w-5xl px-6 py-24 text-center md:px-10 md:py-28">
        <h2 className="mx-auto max-w-[20ch] font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Your lab is the progress bar.
        </h2>
        <p className="mx-auto mt-5 max-w-[60ch] font-display text-lg leading-relaxed text-[#46566b]">
          As you advance, new buildings appear on your plot and the whole lab reskins to your{' '}
          <FlipWords words={LAB_TYPES} /> field, one of six lab types chosen from your research idea.
          Each building levels up 15 times as your team grows.
        </p>
        <ul
          className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 font-pixel text-[#5a6b80]"
          style={{ fontSize: '0.6rem', letterSpacing: '0.04em' }}
        >
          {LAB_TYPES.map((t, i) => (
            <li key={t} className="flex items-center gap-3">
              {t}
              {i < LAB_TYPES.length - 1 && (
                <span aria-hidden className="text-[#c9c8bd]">
                  /
                </span>
              )}
            </li>
          ))}
        </ul>
        <Reveal className="mkt-iso-plate mt-12 border border-[#e6e5dd] p-6 md:p-10" style={{ borderRadius: 8 }}>
          <SpriteCarousel />
        </Reveal>
      </section>

      {/* ── For teachers. Split, image-LEFT (varies orientation). ─────────── */}
      <section id="teachers" className="border-y border-[#e6e5dd] bg-[#f2f1ea]">
        <div className="mx-auto max-w-6xl px-6 py-24 md:px-10 md:py-28">
          <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
            <Reveal>
              <Shot src="/marketing/teacher-reports.png" title="Teacher · /teacher/reports" alt="The teacher Class Reports dashboard: a phase-distribution bar chart, a per-team proficiency table, and a knowledge-point distribution chart summarizing class-wide progress." ratio="16 / 10" />
            </Reveal>
            <div>
              <Eyebrow>FOR TEACHERS</Eyebrow>
              <h2 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">One dashboard for the whole class.</h2>
              <p className="mt-5 max-w-[48ch] font-display text-lg leading-relaxed text-[#46566b]">
                Track every student&apos;s phase and last activity, catch the ones going quiet, clear
                validation and advance requests, and read class-wide engagement at a glance. Built
                for a real classroom.
              </p>
              <div className="mt-7">
                <GhostCTA href="/teachers">SEE HOW TEACHERS USE IT</GhostCTA>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Closing CTA ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 py-28 text-center md:py-36">
        <h2 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Ready to run your lab?</h2>
        <p className="mx-auto mt-5 max-w-[44ch] font-display text-lg text-[#46566b]">
          Pick a question, break ground, and take a real project all the way to the fair.
        </p>
        <div className="mt-10 flex justify-center">
          <PrimaryCTA href={primaryHref}>{primaryLabel}</PrimaryCTA>
        </div>
      </section>

      <MarketingFooter userId={userId} launchHref={launchHref} />
    </main>
  )
}
