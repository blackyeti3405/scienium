# ADR-004: Per-Student Class Membership (supersedes ADR-001)

## Status

Accepted 2026-07-17. Supersedes [ADR-001](adr-001-team-class-ownership.md), whose
`Team.classId`-as-boundary model was replaced in v0.23.8 (`e6ef81b`, "per-student
class membership — labs can span classes/schools").

## Context

ADR-001 made `Team.classId` the teacher authorization boundary and forbade a team
from straddling classes. v0.23.8 deliberately changed the product rule: class
membership is **per-student** (`User.classId`), and a lab may hold members from
different classes and schools. The live code (`lib/teacher/auth.ts`,
`app/api/team/join/route.ts`, `lib/teacher/analytics.ts`, ARCHITECTURE.md §6)
already implements this; ADR-001 was left contradicting it. This ADR records the
implemented model as the authoritative one so there is exactly one written policy.

## Decision

- **Class membership is per-student.** `User.classId` is the only class
  attachment that matters. Joining a lab never moves a student between classes;
  class enrollment goes through the teacher-approval gate (`ClassJoinRequest`).
- **Teacher access to team-shared artifacts is membership-based.**
  `teacherOwnsTeam(classIds, teamId)` grants a teacher access to a team's shared
  data (papers, plans, rubric, feedback, nudges, showcase) iff at least one team
  member's `User.classId` is a class the teacher owns. An empty class scope is
  never in-scope.
- **A student's individual pages stay gated on that student's own class.** The
  per-student teacher routes (`teacher/student/[id]/…`) require the target
  student's `classId ∈ ctx.classIds`, so a teammate's teacher cannot open
  another class's student detail.
- **`Team.classId` is vestigial.** It is retained only for historical rows; no
  authorization or analytics reads it. New teams leave it null. It may be
  dropped in a future cleanup migration once nothing references it.

## Consequences

- Cross-class teams intentionally expose team-SHARED artifacts to every teacher
  who owns at least one member. This is the accepted trade-off for cross-class /
  cross-school collaboration; individual student data remains single-teacher.
- Any new teacher route must scope through the same two policies:
  `teacherOwnsTeam` for team-shared data, `student.classId ∈ ctx.classIds` for
  per-student data. Never derive ownership from `Team.classId`.
- If finer-grained sharing is ever needed (e.g. limiting a co-teacher to
  read-only), introduce explicit grant records rather than inferring more from
  membership.
