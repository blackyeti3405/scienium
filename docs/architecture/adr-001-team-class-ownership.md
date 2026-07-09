# ADR-001: Team and Classroom Ownership

## Decision

`Team.classId` is the authorization boundary for teacher access. A student's
`User.activeTeamId` is the team used by student routes. Membership order is only
a migration fallback and must not become a new source of truth.

Joining or moving a lead's team into a class moves the whole team. A team may not
straddle classes because that would expose shared papers, plans, and logs to more
than one teacher.

## Consequences

- Teacher queries scope teams by `Team.classId`.
- New memberships must reject a conflicting class.
- User-scoped ledgers that affect a team include `teamId` in their keys and queries.
