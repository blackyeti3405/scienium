import 'server-only'

import { db } from '@/lib/db'
import { pickActiveTeam } from '@/lib/team/context'
import { loadPlotState, type PlotState } from '@/lib/plot-server'
import { GATEWAYS } from '@/lib/gateways'
import {
  getLiteratureAdvanceProgress,
  SELF_ADVANCE_TRANSITIONS,
  type AdvanceProgress,
} from '@/lib/team/advance'
import { PHASE_ORDER, LAB_TYPES, type Phase, type LabType } from '@/lib/phase'

/**
 * Everything `/lab` needs from the database, resolved in two round trips.
 *
 * Split out of `page.tsx` so it can be unit-tested: the page is a `.tsx` and
 * this repo's vitest has no JSX transform, so the only way to pin the
 * failure-vs-empty behaviour below is for the logic to live in a `.ts`.
 * There is no other reason for the seam — the page still owns all rendering.
 */

export interface LabPageData {
  teamName: string
  phase: Phase
  labType: LabType | null
  currency: { kp: number; clearanceLevel: number; lc: number }
  memberCount: number
  advance: AdvanceProgress | null
  selfAdvance: { toPhase: Phase } | null
  seed: number
  placedBuildings: PlotState['economy']
  unplacedKeys: string[]
  gatewayPositions: PlotState['gateways']
}

/** Cheap stable numeric seed from the team id, so the tiled ground never reshuffles. */
function seedFrom(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h || 1
}

export async function loadLabPageData(
  userId: string,
  searchParams: { phase?: string; lab?: string },
): Promise<LabPageData> {
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
  } catch (err) {
    // A load failure must NOT render as a brand-new lab (§0.9 Row C2). This
    // catch used to swallow everything, so one flaky query showed a student
    // "Your Lab", discovery phase, 0 KP, 0 LC — their whole project, gone, with
    // no error anywhere on screen. Rethrow and let `(dashboard)/error.tsx`
    // offer a retry.
    //
    // The one case the swallow was written for is real and stays: `next build`
    // prerenders this route with no database reachable.
    if (process.env.NEXT_PHASE !== 'phase-production-build') throw err
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
  // sequential chain. A brand-new user with no team gets the gateway defaults.
  let plot: PlotState = {
    economy: [],
    unplaced: [],
    gateways: GATEWAYS.map((g) => ({ key: g.key, gx: g.cell.gx, gy: g.cell.gy })),
  }
  let advance: AdvanceProgress | null = null

  if (teamId) {
    const [loadedPlot, loadedAdvance] = await Promise.all([
      // NOT caught (§0.9 Row C2): the fallback above is the DEFAULT plot, so
      // swallowing a failure here renders a team's purchased and placed
      // buildings as if they had never been bought. The error boundary's retry
      // is the honest surface; only the brand-new-team path may use defaults.
      loadPlotState(teamId),
      // Advance progress genuinely is optional — it is a hint on a gate button,
      // and losing it degrades nothing the student owns.
      phase === 'literature_review'
        ? getLiteratureAdvanceProgress(teamId, phase).catch(() => null)
        : Promise.resolve(null),
    ])
    plot = loadedPlot
    advance = loadedAdvance
  }

  // Self-paced transitions (→ working, → showcase): surface a free advance button.
  const selfAdvanceTo = SELF_ADVANCE_TRANSITIONS[phase]

  return {
    teamName,
    phase,
    labType,
    currency,
    memberCount,
    advance,
    selfAdvance: teamId && selfAdvanceTo ? { toPhase: selfAdvanceTo } : null,
    seed: teamId ? seedFrom(teamId) : 1,
    placedBuildings: plot.economy,
    unplacedKeys: plot.unplaced,
    gatewayPositions: plot.gateways,
  }
}
