import type { Metadata } from 'next'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { getLaunchContext } from '@/lib/launch'
import { LaunchPreloader } from '@/components/LaunchPreloader'
import { Reveal } from '@/components/marketing/Reveal'
import { Shot, ShotPlaceholder } from '@/components/marketing/Shot'
import { HeroParallaxBg } from '@/components/marketing/HeroParallaxBg'
import { MarketingNav, MarketingFooter } from '@/components/marketing/MarketingChrome'
import { JourneyRail } from '@/components/marketing/JourneyRail'
import { SmoothAnchorScroll } from '@/components/marketing/SmoothAnchorScroll'

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

/** In-page anchor CTA. Plain <a>, not next/link — see MarketingChrome. */
function GhostCTA({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className={`font-pixel flex min-h-[52px] items-center border border-[#0d1b2e] bg-[#f7f7f4] px-8 text-[#0d1b2e] transition-colors ${CTA_PRESS} ${CTA_FOCUS}`}
      style={{ fontSize: '0.7rem', letterSpacing: '0.04em', borderRadius: 6 }}
    >
      {children}
    </a>
  )
}

/* One idea per step, mirrors the in-game phase order. Real shot or honest slot. */
const NUM = '#63614f' // legible muted numeral (clears AA on the band)

/**
 * The five steps scienium walks a team through. `src: null` means we have no
 * real capture of that surface yet and the row falls back to a labeled slot —
 * never a stock image standing in for a screen we can't show.
 */
/**
 * Each shot carries its OWN aspect ratio, taken from the PNG's real pixel
 * dimensions. Every entry used to be boxed at a hardcoded 16/10 with
 * `object-cover object-top`, but no real capture is 16/10 — they run 1.15 to
 * 1.36 — so every one was silently cropped from the bottom, between 15% and
 * 28%. That is how a shot chosen FOR its footer (the codex checkpoint) would
 * have shipped with the footer cut off. Matching the ratio means the shot shows
 * exactly what its alt text says it shows.
 */
const JOURNEY = [
  {
    title: 'Topic Discovery',
    blurb: 'Branch through Wikipedia, YouTube, and real papers until a testable question clicks.',
    // The EXPLORER, not the empty landing state: this is the mechanic itself —
    // a Wikipedia article with its links live, branching into the tree beside it.
    src: '/marketing/discovery-explorer.png',
    ratio: '2134 / 1572',
    shotTitle: 'Discovery · /discovery',
    shotNote:
      'The Discovery explorer: a Wikipedia article with selectable links, branching into a live discovery tree of chosen topics alongside it.',
  },
  {
    title: 'Literature Review',
    blurb: 'Upload real sources, get each one checked for relevance, and prove you understood them.',
    src: '/marketing/literature-review.png',
    ratio: '2278 / 1736',
    shotTitle: 'Literature Review · /literature',
    shotNote:
      'The Literature Review screen: a peer-reviewed paper open in the reader beside its graded comprehension quiz, showing a passed proficiency score and per-question feedback on the student’s own answers.',
  },
  {
    title: 'Creating Research Plans',
    blurb: 'Write your hypothesis, methodology, and study design, then have it reviewed before you commit.',
    // The capture whose Google Doc URL was replaced with a placeholder — the
    // other framings of this screen show a live "anyone with the link" doc,
    // which must never go on a public, indexed page.
    src: '/marketing/research-plan4.png',
    ratio: '2248 / 1700',
    shotTitle: 'Research Plan · /research-plan',
    shotNote:
      'The Research Plan screen: a plan connected from a Google Doc with its synced preview, review and originality-check actions, and the resulting review — an overall STRONG verdict scored 83 above a per-section rubric with specific written criticism.',
  },
  {
    title: 'Field-Specific Knowledge',
    blurb: 'Lessons that teach the methods your own field actually uses, each with a checkpoint.',
    // Ends on the CHECKPOINT block, which is the half of the blurb the previous
    // capture never showed — "each with a checkpoint" was a claim with no
    // picture behind it. The Ops Hub tab bar at the top also places the lesson
    // somewhere instead of floating as anonymous prose.
    src: '/marketing/codex-lesson1.png',
    ratio: '1842 / 1600',
    shotTitle: 'Field Codex · /daily/codex',
    shotNote:
      'A real Field Codex lesson inside the Operations Hub: a gold Worked Example dissecting a flawed gait experiment, a Why Judges Ask This note, and a checkpoint worth 8 knowledge points that requires all four questions correct to pass.',
  },
  {
    title: 'Analyzing Data',
    blurb: 'Turn raw measurements into real figures, with stats and charts built in.',
    src: '/marketing/data-terminal.png',
    ratio: '2254 / 1708',
    shotTitle: 'Data Terminal · Ops Hub',
    shotNote:
      'A real two-way ANOVA in the Data Terminal: an effects table with F, p, and partial eta-squared for both factors and their interaction, automatic normality and equal-variance assumption checks, and a matplotlib grouped bar chart with error bars.',
  },
]


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
      <SmoothAnchorScroll />
      <MarketingNav userId={userId} launchHref={launchHref} />

      {/* ── Hero: real lab shot as an atmospheric backdrop, fading into the paper field. ── */}
      <section className="relative flex min-h-[86vh] items-end overflow-hidden">
        <HeroParallaxBg src="/marketing/lab-hero-crop-maxed.png" />
        <div className="relative z-[2] mx-auto w-full max-w-6xl px-6 pb-16 md:px-10">
          <div className="max-w-[680px]">
            <h1
              className="font-display font-bold leading-[0.98] tracking-tight"
              style={{ fontSize: 'clamp(2.6rem, 7vw, 5rem)', textWrap: 'balance' } as React.CSSProperties}
            >
              The world&apos;s first science-fair video game.
            </h1>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <PrimaryCTA href={primaryHref}>{primaryLabel}</PrimaryCTA>
              <GhostCTA href="#journey">SEE THE JOURNEY</GhostCTA>
            </div>
          </div>
        </div>
        <a
          href="#journey"
          aria-label="Scroll to see the journey"
          className={`absolute bottom-6 left-1/2 z-[2] hidden -translate-x-1/2 flex-col items-center gap-2 sm:flex ${CTA_FOCUS}`}
        >
          <span className="font-pixel text-[#5a6b80]" style={{ fontSize: '0.55rem', letterSpacing: '0.1em' }}>
            SCROLL
          </span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="mkt-float" aria-hidden>
            <path d="M2 5L7 10L12 5" stroke="#5a6b80" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </section>

      {/* ── By the author — the credibility beat. ────────────────────────── */}
      <section id="author" className="scroll-mt-[84px] border-y border-[#e6e5dd] bg-[#f2f1ea]">
        <div className="mx-auto max-w-5xl px-6 py-24 md:px-10 md:py-28">
          <div className="grid items-center gap-10 md:grid-cols-[280px_1fr] md:gap-16">
            <Reveal>
              <Shot
                src="/marketing/author-image.jpg"
                title="Rig Saini"
                alt="Rig Saini standing beside his ISEF project board for ATLAS, a multi-axis ankle-foot prosthetic, with the prosthetic prototype on the table in front of it."
                ratio="1148 / 1401"
              />
            </Reveal>
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Meet the author
              </h2>
              <p className="mt-5 max-w-[52ch] font-display text-lg leading-relaxed text-[#33465e]">
                Rig Saini is the founder of scienium. He has competed in science fair for 5 years
                and has numerous awards at the regional, state, and international level, placing
                2nd in Biomedical Engineering at ISEF last year.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── The journey (headings instant; only the shots reveal). ────────── */}
      <section id="journey" className="scroll-mt-[84px] border-t border-[#e6e5dd] bg-[#f2f1ea]">
        <div className="mx-auto max-w-6xl px-6 py-24 md:px-10 md:py-28">
          <div className="max-w-3xl">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-[2.7rem]">
              Scienium helps you at every step of the process.
            </h2>
          </div>

          <div className="mt-16 md:mt-20 md:flex md:items-stretch md:gap-10">
            <JourneyRail />
            <div className="min-w-0 md:flex-1">
              {JOURNEY.map((step, i) => {
                // The shots are the point of this run, so the text column is
                // pinned narrow and the shot takes the rest. Alternating rows
                // swap BOTH the visual order and the template, so the narrow
                // column always lands under the text — never under the image.
                const flipped = i % 2 === 1
                const cols = flipped
                  ? 'md:grid-cols-[minmax(0,1fr)_minmax(0,300px)]'
                  : 'md:grid-cols-[minmax(0,300px)_minmax(0,1fr)]'
                return (
                  <div
                    key={step.title}
                    className={`grid items-center gap-10 md:gap-12 ${cols} ${i === 0 ? '' : 'mt-24'}`}
                    data-journey-step={i + 1}
                  >
                    <div className={flipped ? 'md:order-2' : undefined}>
                      <span className="font-pixel" style={{ color: NUM, fontSize: '1.4rem' }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <h3 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-[1.8rem]">
                        {step.title}
                      </h3>
                      <p className="mt-4 font-display text-[17px] leading-relaxed text-[#46566b]">
                        {step.blurb}
                      </p>
                    </div>
                    <Reveal className={flipped ? 'md:order-1' : undefined}>
                      {step.src ? (
                        <Shot src={step.src} title={step.shotTitle} alt={step.shotNote} ratio={step.ratio} />
                      ) : (
                        <ShotPlaceholder title={step.shotTitle} note={step.shotNote} badge="Preview soon" />
                      )}
                    </Reveal>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Battle Arena (the gamified hook, heavily featured). ───────────── */}
      <section id="pvp" className="scroll-mt-[84px] bg-[#0d1b2e] text-white">
        <div className="mx-auto max-w-5xl px-6 py-24 md:px-10 md:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-[2.7rem]">
              Battle against your friends.
            </h2>
            <p className="mt-5 font-display text-lg leading-relaxed text-[#b7c2d0]">
              Put your labs head to head in timed, raid-style battles.
            </p>
          </div>

          <Reveal className="mx-auto mt-14 max-w-3xl">
            {/* Captured live by e2e/pvp-shot.capture.ts — a real raid, real
                casts, effects held at their peak frame. Re-shoot with:
                pnpm --filter web exec playwright test --project=capture */}
            <Shot
              src="/marketing/pvp.png"
              title="Battle Arena · /pvp/battle"
              alt="A live raid in the Battle Arena: three spells detonating over a rival lab's base of maxed buildings and gateways, each with a health bar, above the spell bar showing damage values, types and cooldowns, with 10.4 seconds left on the raid clock."
              ratio="1440 / 900"
            />
          </Reveal>
        </div>
      </section>

      {/* ── For teachers. Split, image-LEFT (varies orientation). ─────────── */}
      <section id="teachers" className="scroll-mt-[84px] border-y border-[#e6e5dd] bg-[#f2f1ea]">
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
