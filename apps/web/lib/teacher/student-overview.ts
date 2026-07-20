import 'server-only'
import { db } from '@/lib/db'
import { teacherOwnsTeam } from '@/lib/teacher/auth'
import { pickActiveTeam } from '@/lib/team/context'
import { getLiteratureAdvanceProgress } from '@/lib/team/advance'
import { describeActivity } from '@/lib/activity/log'
import {
  buildMemberNameMap,
  enrichShopBuildings,
  enrichTeamBuildings,
  enrichCodexRecent,
} from '@/lib/teacher/analytics'

/**
 * Teacher student-overview application service (Track B P1-2, §3.2 E).
 *
 * The comprehensive drill-down behind `GET /api/teacher/student/[id]/overview`
 * — previously 347 route lines with 18 inline Prisma calls, the largest
 * domain-logic-in-route site in the app. The route is now a thin adapter:
 * resolve the teacher principal, call this one operation, map the typed
 * result to HTTP (the `lib/papers/service.ts` seam).
 *
 * Authorization lives HERE with the workflow: the student must belong to one
 * of the caller's classes, and the resolved team must be membership-owned
 * (`teacherOwnsTeam`) — both misses are indistinguishable 404s.
 */

export interface TeacherPrincipal {
  classIds: string[]
}

export type StudentOverviewResult =
  | { ok: true; overview: Record<string, unknown> }
  | { ok: false; error: string; status: number }

const NOT_FOUND: StudentOverviewResult = {
  ok: false,
  error: 'Student not found in your classes',
  status: 404,
}

export async function loadStudentOverview(
  studentId: string,
  principal: TeacherPrincipal,
): Promise<StudentOverviewResult> {
  // IDOR guard: student must be in one of the teacher's classes.
  const student = await db.user.findFirst({
    where: { id: studentId, classId: { in: principal.classIds } },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      class: { select: { id: true, name: true } },
      activeTeamId: true,
      teamMemberships: {
        orderBy: { joinedAt: 'desc' },
        select: {
          teamId: true,
          role: true,
          joinedAt: true,
          team: { select: { id: true } },
        },
      },
    },
  })

  if (!student) return NOT_FOUND

  const membership = student.teamMemberships[0] ?? null
  // Resolve through membership (never a bare activeTeam), matching
  // teacher/student/[id]/route.ts — a stale activeTeamId must not pick a team
  // the student has since left.
  const teamId = pickActiveTeam(student.activeTeamId, student.teamMemberships)?.id ?? null

  const studentSection = {
    id: student.id,
    name: student.name,
    email: student.email,
    createdAt: student.createdAt,
    class: student.class,
    memberRole: membership?.role ?? null,
    joinedAt: membership?.joinedAt ?? null,
  }

  if (!teamId) {
    return { ok: true, overview: { student: studentSection, team: null } }
  }

  // Belt-and-suspenders: verify team ownership before returning data.
  const owned = await teacherOwnsTeam(principal.classIds, teamId)
  if (!owned) return NOT_FOUND

  // Fan out parallel queries for all sections.
  const [
    team,
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

    // This student's KP from literature
    db.paperProficiency.aggregate({
      where: { userId: studentId, paper: { teamId } },
      _sum: { kpAwarded: true },
    }),

    // This student's KP from Codex lessons
    db.codexLessonProgress.aggregate({
      where: { userId: studentId, teamId, kpAwarded: { gt: 0 } },
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
      where: { userId: studentId, paper: { teamId } },
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
      where: { userId: studentId, teamId, completed: true },
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
      where: { userId: studentId, teamId, completed: true },
    }),

    // Science fair associations for this student
    db.fairUserAssociation.findMany({
      where: { userId: studentId },
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
  const memberNameMap = buildMemberNameMap(team?.members ?? [])

  // Compute student KP contribution
  const studentKp = (kpPapers._sum.kpAwarded ?? 0) + (kpCodex._sum.kpAwarded ?? 0)

  const shopBuildingsEnriched = enrichShopBuildings(shopBuildings, memberNameMap)
  const teamBuildingsEnriched = enrichTeamBuildings(teamBuildings, memberNameMap)
  const codexRecentEnriched = await enrichCodexRecent(codexRecent)

  // Compute server-side activity descriptions
  const activityWithDescriptions = activityFeed.map((a) => ({
    description: describeActivity(a.actionType, a.payloadJson as Record<string, unknown>),
    userName: a.user.name,
    createdAt: a.createdAt,
  }))

  return {
    ok: true,
    overview: {
      student: studentSection,
      team,
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
    },
  }
}
