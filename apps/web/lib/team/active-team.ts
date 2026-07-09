/**
 * Choose the authoritative team for a user from their OWN memberships.
 *
 * `activeTeamId` is honored only when a `TeamMember` row backs it, so a forged
 * or stale `activeTeamId` can never surface a team the user does not belong to
 * (the Phase 1 ownership invariant). When it is unset or unbacked, fall back to
 * the most recently joined team — every remaining option is still a team the
 * user is a real member of, so the fallback can only ever pick a team they own.
 *
 * `memberships` must be ordered by `joinedAt` descending (so `[0]` is newest).
 *
 * Pure and import-free so it can be unit-tested without loading Prisma.
 */
export function pickActiveTeam<T>(
  activeTeamId: string | null | undefined,
  memberships: Array<{ teamId: string; team: T }>,
): T | null {
  if (memberships.length === 0) return null
  const backed = activeTeamId ? memberships.find((m) => m.teamId === activeTeamId) : undefined
  return backed ? backed.team : memberships[0].team
}
