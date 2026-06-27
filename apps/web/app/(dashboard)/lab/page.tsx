import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { LabScene } from '@/components/lab/LabScene'
import {
  getLiteratureAdvanceProgress,
  TEACHER_GATED_TRANSITIONS,
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

  // Resolve the player's team + everything the scene needs in one query.
  // Falls back to discovery defaults for brand-new users without a team yet.
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
        teamMemberships: {
          orderBy: { joinedAt: 'desc' },
          take: 1,
          select: {
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

    const team = user?.teamMemberships[0]?.team
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

  // Literature-phase advance gate (Feature 1e): progress toward 25 sources with
  // every member proficient. Only meaningful during literature_review.
  let advance: AdvanceProgress | null = null
  if (teamId && phase === 'literature_review') {
    try {
      advance = await getLiteratureAdvanceProgress(teamId, phase)
    } catch {
      // Non-fatal: the gate affordance simply won't render.
    }
  }

  // Teacher-gated transitions (→ working, → showcase): surface a request/awaiting
  // affordance and reflect any pending request.
  let advanceRequest: { toPhase: Phase; pending: boolean } | null = null
  const gatedTo = TEACHER_GATED_TRANSITIONS[phase]
  if (teamId && gatedTo) {
    try {
      const pending = await db.phaseAdvanceRequest.findFirst({
        where: { teamId, status: 'pending' },
        select: { id: true },
      })
      advanceRequest = { toPhase: gatedTo, pending: !!pending }
    } catch {
      // Non-fatal.
    }
  }

  return (
    <LabScene
      teamName={teamName}
      phase={phase}
      labType={labType}
      currency={currency}
      memberCount={memberCount}
      advance={advance}
      advanceRequest={advanceRequest}
      seed={teamId ? seedFrom(teamId) : 1}
      initialPanel={searchParams.panel === 'feedback' ? 'feedback' : undefined}
    />
  )
}
