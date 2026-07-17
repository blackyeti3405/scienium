import type { Metadata } from 'next'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { Reveal } from '@/components/marketing/Reveal'
import { Shot } from '@/components/marketing/Shot'
import { MarketingNav, MarketingFooter } from '@/components/marketing/MarketingChrome'

/**
 * Marketing deep-dive for the teacher dashboard (`/teachers`). Grounded in
 * docs/SPEC.md §15 (the dashboard is live for the pilot core, per that doc's
 * own status line): Class Roster with attention flags, the Validations
 * queue, the teacher Rubric tab, Nudge, and Class Reports. Nothing here is
 * invented — every feature named is implemented, not aspirational.
 */

const PAGE_DESCRIPTION =
  'How the scienium teacher dashboard works: a roster that surfaces who needs attention, one-click phase-advance approval, side-by-side rubric scoring, and a daily nudge for quiet teams.'

export const metadata: Metadata = {
  title: 'For Teachers · scienium',
  description: PAGE_DESCRIPTION,
  alternates: { canonical: '/teachers' },
  openGraph: {
    title: 'For Teachers · scienium',
    description: PAGE_DESCRIPTION,
    type: 'website',
    images: ['/marketing/teacher-reports.png'],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/marketing/teacher-reports.png'],
  },
}

const CTA_FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f7f4]'
const CTA_PRESS =
  'shadow-[4px_4px_0_0_#0d1b2e] transition-[transform,box-shadow] duration-150 ' +
  'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#0d1b2e] ' +
  'active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_0_#0d1b2e]'

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-pixel" style={{ color: '#7d6108', fontSize: '0.6rem', letterSpacing: '0.1em' }}>
      {children}
    </span>
  )
}

const CLASS_STEPS = [
  {
    n: '01',
    title: 'Open the roster.',
    body: 'Every student in the class, one row each, with their phase and last-activity time already visible. No clicking into 30 profiles to find out who stalled.',
  },
  {
    n: '02',
    title: 'Nudge the quiet ones.',
    body: "Rows flagged unlogged or stale get a one-tap nudge, deduped to once per team per day. It creates a real notification on the student's side, with an optional note attached.",
  },
  {
    n: '03',
    title: 'Clear a validation.',
    body: 'Phase-advance requests wait in a queue: moving to data collection needs a logged confirmation, moving to showcase needs the real competition-ready checks. Approve and the team’s phase bumps immediately.',
  },
  {
    n: '04',
    title: 'Score a rubric, side by side.',
    body: "Open a student's Rubric tab and score the same ISEF criteria they self-assessed, guided by curated low/mid/high anchor descriptions. Neither score overwrites the other.",
  },
  {
    n: '05',
    title: 'Check the Class Report.',
    body: 'Phase distribution, per-team proficiency, and knowledge-point trends, aggregated read-only from the same data. No separate spreadsheet to maintain.',
  },
]

export default async function TeachersPage() {
  const { userId } = await auth()

  return (
    <main id="main-content" className="min-h-screen bg-[#f7f7f4] text-[#0d1b2e]">
      <MarketingNav userId={userId} />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-6 pb-14 pt-20 text-center md:px-10 md:pb-16 md:pt-24">
        <Eyebrow>FOR TEACHERS</Eyebrow>
        <h1
          className="mx-auto mt-5 max-w-[22ch] font-display text-[2.5rem] font-bold leading-[1.04] tracking-tight sm:text-5xl md:text-[3.3rem]"
          style={{ textWrap: 'balance' } as React.CSSProperties}
        >
          Built for the ten minutes between classes.
        </h1>
        <p className="mx-auto mt-6 max-w-[58ch] font-display text-lg leading-relaxed text-[#46566b]">
          Most teachers don&apos;t have two free hours after school. The dashboard surfaces the
          students who need you right now instead of asking you to browse a whole roster to find
          them, and it reuses the exact views your students already see, so there&apos;s no second
          interface to learn.
        </p>
      </section>

      {/* ── Roster + attention flags ─────────────────────────────────────── */}
      <section className="border-t border-[#e6e5dd] bg-[#f2f1ea]">
        <div className="mx-auto max-w-4xl px-6 py-20 md:px-10 md:py-24">
          <Eyebrow>THE ROSTER</Eyebrow>
          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            See who needs you first.
          </h2>
          <p className="mt-5 max-w-[62ch] font-display text-lg leading-relaxed text-[#46566b]">
            Each student gets one row, even on a team, with phase and last activity already
            showing. Rows flagged <em>unlogged</em> or <em>stale</em> stand out immediately, and a
            one-tap nudge sends a real notification straight to that team, deduped to once per day
            so it never feels like spam.
          </p>
        </div>
      </section>

      {/* ── Validations ──────────────────────────────────────────────────── */}
      <section className="border-t border-[#e6e5dd]">
        <div className="mx-auto max-w-4xl px-6 py-20 md:px-10 md:py-24">
          <Eyebrow>VALIDATIONS</Eyebrow>
          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Approve without a meeting.
          </h2>
          <p className="mt-5 max-w-[62ch] font-display text-lg leading-relaxed text-[#46566b]">
            Two moments actually need your sign-off: starting data collection, and advancing to
            the showcase. A student requests the move, you review what they logged, and approving
            bumps their phase immediately and notifies the team. Everything else, like the
            literature-review gate, clears itself on a mechanical 25-source check.
          </p>
        </div>
      </section>

      {/* ── Rubric ───────────────────────────────────────────────────────── */}
      <section className="border-t border-[#e6e5dd] bg-[#f2f1ea]">
        <div className="mx-auto max-w-4xl px-6 py-20 md:px-10 md:py-24">
          <Eyebrow>THE RUBRIC</Eyebrow>
          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Score against the same rubric your students do.
          </h2>
          <p className="mt-5 max-w-[62ch] font-display text-lg leading-relaxed text-[#46566b]">
            Every student runs a self-check against the real ISEF rubric before the fair. You score
            the same criteria independently, guided by curated anchor descriptions for what a low,
            mid, or high answer actually looks like. Your score and theirs sit side by side; neither
            one gets overwritten.
          </p>
        </div>
      </section>

      {/* ── A typical class period ───────────────────────────────────────── */}
      <section className="border-t border-[#e6e5dd]">
        <div className="mx-auto max-w-3xl px-6 py-20 md:px-10 md:py-24">
          <Eyebrow>A TYPICAL CLASS PERIOD</Eyebrow>
          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Five things, ten minutes.
          </h2>
          <ol className="mt-12 space-y-10">
            {CLASS_STEPS.map((s) => (
              <li key={s.n} className="flex gap-6">
                <span className="font-pixel shrink-0 text-[#63614f]" style={{ fontSize: '1.4rem' }}>{s.n}</span>
                <div>
                  <p className="font-display text-xl font-bold tracking-tight">{s.title}</p>
                  <p className="mt-2 max-w-[52ch] font-display text-[17px] leading-relaxed text-[#46566b]">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Reports + moderation ─────────────────────────────────────────── */}
      <section className="border-t border-[#e6e5dd] bg-[#f2f1ea]">
        <div className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-24">
          <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
            <Reveal>
              <Shot
                src="/marketing/teacher-reports.png"
                title="Teacher · /teacher/reports"
                alt="The teacher Class Reports dashboard: a phase-distribution bar chart, a per-team proficiency table, and a knowledge-point distribution chart summarizing class-wide progress."
                ratio="16 / 10"
              />
            </Reveal>
            <div>
              <Eyebrow>REPORTS &amp; MODERATION</Eyebrow>
              <h2 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Class-wide, without a spreadsheet.
              </h2>
              <p className="mt-5 max-w-[48ch] font-display text-lg leading-relaxed text-[#46566b]">
                Phase distribution, per-team proficiency, and knowledge-point trends, aggregated
                read-only from data that already exists. Showcase submissions route through you
                too: approve for school-public, request changes, or reject with a reason the team
                can see.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Closing CTA ──────────────────────────────────────────────────── */}
      <section className="border-t border-[#e6e5dd] bg-[#0d1b2e] text-white">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center md:py-28">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Bring your class in.
          </h2>
          <p className="mx-auto mt-5 max-w-[46ch] font-display text-lg leading-relaxed text-[#b7c2d0]">
            One dashboard, the same views your students use, built around the ten minutes you
            actually have.
          </p>
          <div className="mt-9 flex justify-center">
            <Link
              href="/sign-up"
              className={`font-pixel flex min-h-[52px] items-center bg-[#F5C518] px-8 text-[#0d1b2e] ${CTA_PRESS} ${CTA_FOCUS}`}
              style={{ fontSize: '0.7rem', letterSpacing: '0.04em', borderRadius: 6 }}
            >
              GET STARTED
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter userId={userId} />
    </main>
  )
}
