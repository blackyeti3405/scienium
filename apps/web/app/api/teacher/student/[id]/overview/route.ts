import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher, teacherOwnsTeam } from '@/lib/teacher/auth'
import { db } from '@/lib/db'
import { getLiteratureAdvanceProgress } from '@/lib/team/advance'
import { describeActivity } from '@/lib/activity/log'
import { CODEX_TRACKS, loadTrack } from '@/lib/ops/codex'
import { shopBuilding } from '@/lib/shop'

/**
 * GET /api/teacher/student/[id]/overview — comprehensive student drill-down.
 *
 * Returns a single JSON object with all sections the teacher drill-down needs,
 * aggregated from parallel Prisma queries for efficiency. Strictly class-scoped:
 * the student must be in one of the teacher's classes, else 404.
 *
 * Read-only — no POST/PUT/DELETE handler.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireTeacher(req, { tier: 'read' })
  if (error) return error

  // IDOR guard: student must be in one of the teacher's classes.
  const student = await db.user.findFirst({
    where: { id: params.id, classId: { in: ctx.classIds } },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      class: { select: { id: true, name: true } },
      teamMemberships: {
        orderBy: { joinedAt: 'desc' },
        take: 1,
        select: {
          role: true,
          joinedAt: true,
          team: { select: { id: true } },
        },
      },
    },
  })

  if (!student) {
    return NextResponse.json(
      { error: 'Student not found in your classes' },
      { status: 404 },
    )
  }

  const membership = student.teamMemberships[0] ?? null
  const teamId = membership?.team.id ?? null

  if (!teamId) {
    return NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        createdAt: student.createdAt,
        class: student.class,
        memberRole: null,
        joinedAt: null,
      },
      team: null,
    })
  }

  // Belt-and-suspenders: verify team ownership before returning data.
  const owned = await teacherOwnsTeam(ctx.classIds, teamId)
  if (!owned) {
    return NextResponse.json(
      { error: 'Student not found in your classes' },
      { status: 404 },
    )
  }

  // Fan out parallel queries for all sections.
  const [
    team,
    pendingAdvance,
    kpPapers,
    kpCodex,
    teamBuildings,
    shopBuildings,
    litProgress,
    studentProficiencies,
    papers,
    researchPlan,
    logs,
    experiments,
    showcase,
    codexRecent,
    codexLessonsCompleted,
    fairAssociations,
    formStatuses,
    activityFeed,
    feedback,
  ] = await Promise.all([
    // Team core
    db.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        name: true,
        phase: true,
        labType: true,
        topic: true,
        researchIdea: true,
        currency: { select: { kp: true, clearanceLevel: true, lc: true } },
        members: {
          select: {
            user: { select: { id: true, name: true } },
            role: true,
          },
        },
      },
    }),

    // Pending phase advance request
    db.phaseAdvanceRequest.findFirst({
      where: { teamId, status: 'pending' },
      select: {
        fromPhase: true,
        toPhase: true,
        note: true,
        requestedBy: { select: { name: true } },
        createdAt: true,
      },
    }),

    // This student's KP from literature
    db.paperProficiency.aggregate({
      where: { userId: params.id, paper: { teamId } },
      _sum: { kpAwarded: true },
    }),

    // This student's KP from Codex lessons
    db.codexLessonProgress.aggregate({
      where: { userId: params.id, kpAwarded: { gt: 0 } },
      _sum: { kpAwarded: true },
    }),

    // Gateway/seeded buildings
    db.teamBuilding.findMany({
      where: { teamId },
      select: {
        currentLevel: true,
        lastUpgradedAt: true,
        lastUpgradedByUserId: true,
        building: { select: { name: true } },
      },
    }),

    // Shop buildings
    db.teamShopBuilding.findMany({
      where: { teamId },
      select: {
        buildingKey: true,
        purchasedByUserId: true,
        purchasedAt: true,
      },
    }),

    // Literature advance progress (25-source gate)
    getLiteratureAdvanceProgress(teamId, 'literature_review'),

    // This student's proficiency rows
    db.paperProficiency.findMany({
      where: { userId: params.id, paper: { teamId } },
      select: {
        demonstrated: true,
        bestScore: true,
        paper: { select: { id: true, title: true } },
      },
    }),

    // All team papers
    db.paper.findMany({
      where: { teamId },
      select: { id: true, title: true, status: true, authors: true },
    }),

    // Research plan
    db.researchPlan.findUnique({
      where: { teamId },
      select: {
        googleDocUrl: true,
        projectType: true,
        projectSubtype: true,
        lastReviewJson: true,
        lastReviewedAt: true,
        lastIdeaCheckJson: true,
        lastIdeaCheckAt: true,
      },
    }),

    // Recent project logs with follow-ups
    db.projectLog.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
      take: 15,
      select: {
        id: true,
        entryType: true,
        stage: true,
        body: true,
        createdAt: true,
        createdBy: { select: { name: true } },
        followups: {
          select: { question: true, response: true, answeredAt: true },
        },
      },
    }),

    // Experiments
    db.experiment.findMany({
      where: { teamId },
      select: {
        id: true,
        title: true,
        _count: { select: { measurements: true } },
      },
    }),

    // Showcase
    db.showcase.findUnique({
      where: { teamId },
      select: {
        slug: true,
        privacyLevel: true,
        moderationStatus: true,
        _count: { select: { assets: true, views: true } },
      },
    }),

    // Codex — this student's most recent lesson completions
    db.codexLessonProgress.findMany({
      where: { userId: params.id, completed: true },
      orderBy: { completedAt: 'desc' },
      take: 10,
      select: {
        trackSlug: true,
        lessonId: true,
        bestScore: true,
        kpAwarded: true,
        completedAt: true,
      },
    }),

    db.codexLessonProgress.count({
      where: { userId: params.id, completed: true },
    }),

    // Science fair associations for this student
    db.fairUserAssociation.findMany({
      where: { userId: params.id },
      select: {
        isPrimary: true,
        fair: { select: { id: true, name: true, level: true } },
      },
    }),

    // Team form statuses
    db.teamFormStatus.findMany({
      where: { teamId },
      select: {
        status: true,
        form: { select: { name: true } },
      },
    }),

    // Activity feed
    db.activityFeed.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
      take: 15,
      select: {
        actionType: true,
        payloadJson: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    }),

    // Teacher feedback
    db.teacherFeedback.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        targetType: true,
        body: true,
        resolved: true,
        createdAt: true,
      },
    }),
  ])

  // Build a member name lookup map from already-fetched team data.
  const memberNameMap = new Map<string, string>(
    (team?.members ?? []).map((m) => [m.user.id, m.user.name]),
  )

  // Compute student KP contribution
  const studentKp =
    (kpPapers._sum.kpAwarded ?? 0) +
    (kpCodex._sum.kpAwarded ?? 0)

  // Enrich shop buildings with display name/description and purchaser name
  const shopBuildingsEnriched = shopBuildings.map((sb) => {
    const catalog = shopBuilding(sb.buildingKey)
    return {
      buildingKey: sb.buildingKey,
      name: catalog?.name ?? sb.buildingKey,
      description: catalog?.description ?? '',
      purchasedByName: memberNameMap.get(sb.purchasedByUserId) ?? null,
      purchasedAt: sb.purchasedAt,
    }
  })

  // Enrich gateway buildings with upgrader name
  const teamBuildingsEnriched = teamBuildings.map((tb) => ({
    name: tb.building.name,
    currentLevel: tb.currentLevel,
    lastUpgradedAt: tb.lastUpgradedAt,
    lastUpgradedByName: tb.lastUpgradedByUserId
      ? (memberNameMap.get(tb.lastUpgradedByUserId) ?? null)
      : null,
  }))

  // Resolve lesson/track labels for the recent Codex completions. Track
  // modules are code-split; loading here only touches the (≤3) tracks in the
  // student's recent rows, and Node's module cache makes repeats free.
  const trackLabelBySlug = new Map(CODEX_TRACKS.map((t) => [t.slug, t.label]))
  const recentTrackSlugs = [...new Set(codexRecent.map((r) => r.trackSlug))]
  const lessonLabelById = new Map<string, string>()
  await Promise.all(
    recentTrackSlugs.map(async (slug) => {
      try {
        const track = await loadTrack(slug)
        for (const segment of [track.core, ...track.branches]) {
          for (const unit of segment.units) {
            for (const lesson of unit.lessons) lessonLabelById.set(lesson.id, lesson.label)
          }
        }
      } catch {
        // Unknown/retired slug — fall back to the raw lesson id below.
      }
    }),
  )
  const codexRecentEnriched = codexRecent.map((r) => ({
    trackLabel: trackLabelBySlug.get(r.trackSlug) ?? r.trackSlug,
    lessonLabel: lessonLabelById.get(r.lessonId) ?? r.lessonId,
    bestScore: r.bestScore,
    kpAwarded: r.kpAwarded,
    completedAt: r.completedAt,
  }))

  // Compute server-side activity descriptions
  const activityWithDescriptions = activityFeed.map((a) => ({
    description: describeActivity(a.actionType, a.payloadJson as Record<string, unknown>),
    userName: a.user.name,
    createdAt: a.createdAt,
  }))

  return NextResponse.json({
    student: {
      id: student.id,
      name: student.name,
      email: student.email,
      createdAt: student.createdAt,
      class: student.class,
      memberRole: membership?.role ?? null,
      joinedAt: membership?.joinedAt ?? null,
    },
    team,
    pendingAdvance,
    studentKp,
    teamBuildings: teamBuildingsEnriched,
    shopBuildings: shopBuildingsEnriched,
    litProgress,
    studentProficiencies,
    papers,
    researchPlan,
    logs,
    experiments,
    showcase,
    codex: {
      lessonsCompleted: codexLessonsCompleted,
      kp: kpCodex._sum.kpAwarded ?? 0,
      recent: codexRecentEnriched,
    },
    fairAssociations,
    formStatuses,
    activity: activityWithDescriptions,
    feedback,
  })
}
