# ADR-001: Team and Classroom Ownership

## Decision

`Team.classId` is the authorization boundary for teacher access. A student's
`User.activeTeamId` is the team used by student routes, but it is honored only after
the resolver (`lib/team/active-team.ts`) confirms a `TeamMember` row still backs it;
membership order is a last-resort fallback, never a source of truth. Teacher authority
is read from `User.role` in the DB (`lib/teacher/role.ts`), not inferred from owning a
class, so a Clerk claim can't override a DB downgrade.

Joining or moving a lead's team into a class moves the whole team. A team may not
straddle classes because that would expose shared papers, plans, and logs to more
than one teacher.

Phase progression is self-paced: teams advance themselves on meeting each phase's
criteria. There is no teacher approval gate (the `PhaseAdvanceRequest` model was
removed).

## Consequences

- Teacher queries scope teams by `Team.classId`; teacher authority comes from the DB
  role, so `teacherOwnsTeam` no longer needs a `teamLead.classId` fallback.
- A request-supplied `activeTeamId` never widens access — an unverified id is ignored.
- New memberships must reject a conflicting class.
- User-scoped ledgers that affect a team include `teamId` in their keys and queries.
