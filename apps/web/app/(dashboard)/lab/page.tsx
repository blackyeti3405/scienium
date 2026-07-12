import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { pickActiveTeam } from '@/lib/team/context'
import { LabScene } from '@/components/lab/LabScene'
import { loadPlotState, type PlotState } from '@/lib/plot-server'
import { GATEWAYS } from '@/lib/gateways'
import {
  getLiteratureAdvanceProgress,
  SELF_ADVANCE_TRANSITIONS,
  type AdvanceProgress,
} from '@/lib/team/advance'
import { PHASE_ORDER, LAB_TYPES, type Phase, type LabType } from '@/lib/phase'

export const metadata = { title: 'scienium' }

/** Cheap stable numeric seed from the team id, so the tiled ground never reshuffles. */
function seedFrom(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h || 1
}

export default async function LabPage({
  searchParams,
}: {
  searchParams: { phase?: string; lab?: string; panel?: string }
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Resolve the player's team + identity in ONE atomic query, so name/currency/
  // members always come from the same row as phase/labType (never a mix of real
  // team + blank identity). Falls back to discovery defaults for brand-new users.
  let teamId = ''
  let teamName = 'Your Lab'
  let phase: Phase = 'discovery'
  let labType: LabType | null = null
  let currency = { kp: 0, clearanceLevel: 0, lc: 0 }
  let memberCount = 1

  try {
    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
      select: {
        activeTeamId: true,
        teamMemberships: {
          orderBy: { joinedAt: 'desc' },
          select: {
            teamId: true,
            team: {
              select: {
                id: true,
                name: true,
                phase: true,
                labType: true,
                currency: { select: { kp: true, clearanceLevel: true, lc: true } },
                members: { select: { userId: true } },
              },
            },
          },
        },
      },
    })

    const team = user ? pickActiveTeam(user.activeTeamId, user.teamMemberships) : null
    if (team) {
      teamId = team.id
      teamName = team.name
      phase = team.phase as Phase
      labType = (team.labType as LabType | null) ?? null
      if (team.currency) currency = team.currency
      memberCount = team.members.length || 1
    }
  } catch {
    // DB unavailable during build/preview — render the discovery-phase defaults.
  }

  // Dev-only preview override: /lab?phase=working&lab=biocore lets you
  // inspect any phase/skin without a database. Never active in production.
  if (process.env.NODE_ENV !== 'production') {
    if (searchParams.phase && (PHASE_ORDER as readonly string[]).includes(searchParams.phase)) {
      phase = searchParams.phase as Phase
    }
    if (searchParams.lab && (LAB_TYPES as readonly string[]).includes(searchParams.lab)) {
      labType = searchParams.lab as LabType
    }
  }

  // The placed buildings and the literature-phase advance gate (Feature 1e) both
  // depend only on teamId, so fetch them in ONE parallel batch rather than a
  // sequential chain. Each keeps its own fallback, so one failure degrades just that
  // affordance. A brand-new user with no team gets the gateway defaults below.
  let plot: PlotState = {
    economy: [],
    unplaced: [],
    gateways: GATEWAYS.map((g) => ({ key: g.key, gx: g.cell.gx, gy: g.cell.gy })),
  }
  let advance: AdvanceProgress | null = null

  if (teamId) {
    const [loadedPlot, loadedAdvance] = await Promise.all([
      loadPlotState(teamId).catch(() => null),
      // Advance progress is only meaningful during literature_review.
      phase === 'literature_review'
        ? getLiteratureAdvanceProgress(teamId, phase).catch(() => null)
        : Promise.resolve(null),
    ])
    if (loadedPlot) plot = loadedPlot // Non-fatal on failure: keep the gateway defaults.
    advance = loadedAdvance
  }

  // Self-paced transitions (→ working, → showcase): surface a free advance button.
  const selfAdvanceTo = SELF_ADVANCE_TRANSITIONS[phase]
  const selfAdvance = teamId && selfAdvanceTo ? { toPhase: selfAdvanceTo } : null

  return (
    <LabScene
      teamName={teamName}
      phase={phase}
      labType={labType}
      currency={currency}
      memberCount={memberCount}
      advance={advance}
      selfAdvance={selfAdvance}
      seed={teamId ? seedFrom(teamId) : 1}
      initialPanel={searchParams.panel === 'feedback' ? 'feedback' : undefined}
      placedBuildings={plot.economy}
      unplacedKeys={plot.unplaced}
      gatewayPositions={plot.gateways}
    />
  )
}
