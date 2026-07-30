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

  // Started here, awaited at BOTH return points below. `ClassMembershipEvent`
  // had no reader at all (REFACTOR2 P1-R8): the log recorded that an enrolment
  // ended and nothing showed it to the teacher whose access ended with it. It
  // deliberately does not live in the team fan-out — a student with no team
  // returns early, and that is exactly the student whose class history a
  // teacher most needs.
  const classHistoryPromise = loadClassHistory(studentId, principal.classIds)

  /**
   * ONE membership decides both the team and the role/join date shown with it.
   *
   * These used to be picked independently: `teamMemberships[0]` (most recently
   * joined) supplied the role and join date, while `pickActiveTeam` supplied the
   * team whose work is rendered below — so with two live memberships a teacher
   * would read "Lead, joined 20 July" beside a different team's papers, logs and
   * scores. §0.7 filed that as a live defect on 2026-07-23 and **it is not one
   * any more**: v0.48.0 made membership one-team-at-a-time, and `leaveOtherTeams`
   * runs inside the join transaction, so a second live row cannot be created
   * (verified: zero users hold more than one `team_members` row).
   *
   * Kept anyway because it costs two lines and makes the agreement STRUCTURAL
   * rather than inherited from an invariant enforced three files away — the
   * schema still only has `@@id([userId, teamId])`, so nothing at the database
   * level forbids a second row. Passing the membership as `pickActiveTeam`'s
   * payload reuses the existing, unit-tested selection rule instead of
   * restating it.
   */
  const membership = pickActiveTeam(
    student.activeTeamId,
    student.teamMemberships.map((m) => ({ teamId: m.teamId, team: m })),
  )
  const teamId = membership?.teamId ?? null

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
    return {
      ok: true,
      overview: {
        student: studentSection,
        team: null,
        classHistory: await classHistoryPromise,
      },
    }
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
    datasets,
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

    // Datasets (the Data Terminal's working data — replaced Experiments)
    db.dataset.findMany({
      where: { teamId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        tableType: true,
        rowCount: true,
        updatedAt: true,
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
      datasets,
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
      classHistory: await classHistoryPromise,
    },
  }
}

/** One row of the class-membership log, shaped for the teacher's view. */
export interface ClassHistoryRow {
  id: string
  event: string
  reason: string | null
  createdAt: Date
  className: string
  /** Who caused it, at the only granularity the schema can answer honestly. */
  actor: 'student' | 'teacher' | 'system'
}

/**
 * This student's class-membership history, scoped to the CALLER's classes.
 *
 * The scope is the whole security question. A student's history can include
 * classes belonging to other teachers — the name of a class this teacher does
 * not own is not theirs to read, so `classIds` is in the WHERE clause, not
 * applied after the fetch.
 *
 * `actorUserId` has no relation on the model and resolving it to a name would
 * cost a second query to say something the data cannot support anyway: `Class`
 * has a single `teacherId`, so "a teacher" is the class's teacher. The three
 * coarse buckets are what is actually knowable.
 */
async function loadClassHistory(
  studentId: string,
  classIds: string[],
): Promise<ClassHistoryRow[]> {
  if (classIds.length === 0) return []
  const rows = await db.classMembershipEvent.findMany({
    where: { userId: studentId, classId: { in: classIds } },
    orderBy: { createdAt: 'desc' },
    take: 25,
    select: {
      id: true,
      event: true,
      reason: true,
      createdAt: true,
      actorUserId: true,
      class: { select: { name: true } },
    },
  })
  return rows.map((r) => ({
    id: r.id,
    event: r.event,
    reason: r.reason,
    createdAt: r.createdAt,
    className: r.class.name,
    actor: r.actorUserId === null ? 'system' : r.actorUserId === studentId ? 'student' : 'teacher',
  }))
}
