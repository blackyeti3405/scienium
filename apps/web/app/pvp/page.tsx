import type { Metadata } from 'next'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { Reveal } from '@/components/marketing/Reveal'
import { MarketingNav, MarketingFooter } from '@/components/marketing/MarketingChrome'
import { TiltCard } from '@/components/marketing/TiltCard'

/**
 * Marketing deep-dive for the Battle Arena (`/pvp`, distinct from the authed
 * `(dashboard)/pvp/*` routes — this is the exact-match public explainer, those
 * stay behind auth). Every mechanic here is drawn straight from the real
 * design: docs/SPEC.md §11 (raid flow, type cycle, trophy math) and the real
 * Prisma/contract shapes (Spell, PvpRaid, PvpTrophies, PvpRaidQuota in
 * schema.prisma; Spell/RaidCastEvent/RaidResult in packages/shared-types).
 * Nothing on this page is invented.
 */

const PAGE_DESCRIPTION =
  'How the scienium Battle Arena works: every building grants a spell, raids run on a 15-second clock against a snapshot of a rival lab, and the Empirical/Theoretical/Applied type cycle decides who wins.'

export const metadata: Metadata = {
  title: 'Battle Arena · scienium',
  description: PAGE_DESCRIPTION,
  alternates: { canonical: '/pvp' },
  openGraph: {
    title: 'Battle Arena · scienium',
    description: PAGE_DESCRIPTION,
    type: 'website',
    images: ['/marketing/lab.png'],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/marketing/lab.png'],
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

// The rock-paper-scissors type cycle every building — and every spell it
// grants — belongs to. Real design (SPEC.md §11.4), not invented flavor text.
const TYPE_CYCLE = [
  {
    type: 'Empirical',
    theme: 'Observation-based science — measuring, sampling, testing the real world.',
    beats: 'Strong against Theoretical.',
    why: 'Real data can prove a model wrong.',
  },
  {
    type: 'Theoretical',
    theme: 'Reasoning-based science — models, predictions, derivations.',
    beats: 'Strong against Applied.',
    why: "You can't build it right if you don't understand why it works.",
  },
  {
    type: 'Applied',
    theme: 'Building-based science — engineering, instruments, systems.',
    beats: 'Strong against Empirical.',
    why: "You can't run the experiment without the equipment.",
  },
]

const RAID_STEPS = [
  {
    n: '01',
    title: 'Press Raid.',
    body: "You're matched at random against a snapshot of another team's base, same class, same rules. No manual opponent picking.",
  },
  {
    n: '02',
    title: 'The clock starts.',
    body: "Fifteen seconds. That's the entire raid, start to results.",
  },
  {
    n: '03',
    title: 'Cast where it counts.',
    body: 'Click a spell, then click a target on their base. Every spell is an area attack, on a short cooldown between casts.',
  },
  {
    n: '04',
    title: 'Health, not hit points.',
    body: "Every building in their base has health scaled to its level. Partial damage still counts toward the total.",
  },
  {
    n: '05',
    title: "Time's up.",
    body: 'A results screen shows the percentage of the base destroyed and exactly how your trophy count moved.',
  },
]

export default async function PvpPage() {
  const { userId } = await auth()

  return (
    <main id="main-content" className="min-h-screen bg-[#f7f7f4] text-[#0d1b2e]">
      <MarketingNav userId={userId} />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-6 pb-14 pt-20 text-center md:px-10 md:pb-16 md:pt-24">
        <Eyebrow>BATTLE ARENA</Eyebrow>
        <h1
          className="mx-auto mt-5 max-w-[20ch] font-display text-[2.5rem] font-bold leading-[1.04] tracking-tight sm:text-5xl md:text-[3.3rem]"
          style={{ textWrap: 'balance' } as React.CSSProperties}
        >
          Your lab is also your army.
        </h1>
        <p className="mx-auto mt-6 max-w-[56ch] font-display text-lg leading-relaxed text-[#46566b]">
          Every building you buy or upgrade in the game layer grants a spell. Its level, its
          damage, its type all trace back to a building you earned. Raiding tests that investment
          against another team, head-to-head, on a 15-second clock.
        </p>
      </section>

      {/* ── Every building is a spell ────────────────────────────────────── */}
      <section className="border-t border-[#e6e5dd] bg-[#f2f1ea]">
        <div className="mx-auto max-w-4xl px-6 py-20 md:px-10 md:py-24">
          <Eyebrow>THE ARSENAL</Eyebrow>
          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            No separate battle currency. Just your lab.
          </h2>
          <p className="mt-5 max-w-[62ch] font-display text-lg leading-relaxed text-[#46566b]">
            Each economy building grants one spell, 1:1, the moment you own it. Level the building
            up and the spell levels with it, 1 through 15, for stronger damage on the same
            building. Bigger, better labs go into a raid with a bigger, better spell loadout.
            There&apos;s nothing to grind that isn&apos;t already part of running your lab.
          </p>
        </div>
      </section>

      {/* ── Type cycle ───────────────────────────────────────────────────── */}
      <section className="border-t border-[#e6e5dd]">
        <div className="mx-auto max-w-5xl px-6 py-20 md:px-10 md:py-24">
          <Eyebrow>THE TYPE CYCLE</Eyebrow>
          <h2 className="mt-5 max-w-[24ch] font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Three research types. One of them always has the edge.
          </h2>
          <p className="mt-5 max-w-[62ch] font-display text-lg leading-relaxed text-[#46566b]">
            Every building, and the spell it grants, is Empirical, Theoretical, or Applied. The
            three beat each other in a fixed cycle. The reasoning comes straight from real science.
          </p>
          <Reveal className="mt-10 grid gap-5 sm:grid-cols-3">
            {TYPE_CYCLE.map((t) => (
              <TiltCard key={t.type} className="h-full rounded-lg border border-[#e4e3db] bg-white px-6 py-7">
                <span className="font-pixel text-[#0d1b2e]" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                  {t.type.toUpperCase()}
                </span>
                <p className="mt-3 font-display text-[15px] leading-relaxed text-[#5a6b80]">{t.theme}</p>
                <p className="mt-4 font-display text-sm font-semibold text-[#0d1b2e]">{t.beats}</p>
                <p className="mt-1 font-display text-sm leading-relaxed text-[#5a6b80]">&ldquo;{t.why}&rdquo;</p>
              </TiltCard>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ── Raid flow ─────────────────────────────────────────────────────── */}
      <section className="border-t border-[#e6e5dd] bg-[#f2f1ea]">
        <div className="mx-auto max-w-3xl px-6 py-20 md:px-10 md:py-24">
          <Eyebrow>HOW A RAID PLAYS OUT</Eyebrow>
          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Fifteen seconds, start to results.
          </h2>
          <ol className="mt-12 space-y-10">
            {RAID_STEPS.map((s) => (
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

      {/* ── Trophies + the daily cap ─────────────────────────────────────── */}
      <section className="border-t border-[#e6e5dd]">
        <div className="mx-auto max-w-4xl px-6 py-20 md:px-10 md:py-24">
          <Eyebrow>TROPHIES</Eyebrow>
          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            A good raid pays off. A weak one costs you.
          </h2>
          <div className="mt-6 space-y-4 max-w-[62ch] font-display text-lg leading-relaxed text-[#46566b]">
            <p>
              Trophy change tracks the percentage of the defender&apos;s base you destroy, not a
              flat win or lose. Take down 100% of a base and you earn the maximum 10 trophies on
              the class leaderboard; anything less scales down from there. A ten-building base
              with one building knocked to half health counts as 5% destroyed. That&apos;s the
              exact math, computed the same way every time.
            </p>
            <p>
              Raid carelessly and destroy too little and you lose trophies instead of gaining them.
              That keeps a raid a real decision. You can&apos;t spam it for free.
            </p>
            <p>
              You also can&apos;t raid unlimited times. A daily cap keeps the arena a side game, so
              it never crowds out the real research work that earns you the buildings in the first
              place. Raids never touch the defender&apos;s actual lab either. You&apos;re attacking
              a snapshot, so getting raided back costs you nothing.
            </p>
          </div>
        </div>
      </section>

      {/* ── Closing CTA ──────────────────────────────────────────────────── */}
      <section className="border-t border-[#e6e5dd] bg-[#0d1b2e] text-white">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center md:py-28">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Build the lab. Earn the arsenal.
          </h2>
          <p className="mx-auto mt-5 max-w-[46ch] font-display text-lg leading-relaxed text-[#b7c2d0]">
            Every spell in the arena starts as a building on your plot.
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
