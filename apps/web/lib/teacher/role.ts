/**
 * Decide the effective teacher/admin role. The DB role is authoritative whenever
 * a `User` row exists — a stale Clerk claim can never override a DB downgrade.
 * The claim only bootstraps a brand-new account with no row yet (a claim-only
 * teacher who has not completed onboarding).
 *
 * Pure and import-free so it can be unit-tested without loading Clerk or Prisma.
 */
export function resolveAuthoritativeRole(
  dbRole: string | null | undefined,
  claimRole: string | undefined,
  userExists: boolean,
): 'teacher' | 'admin' | null {
  if (userExists) {
    return dbRole === 'teacher' || dbRole === 'admin' ? dbRole : null
  }
  return claimRole === 'teacher' || claimRole === 'admin' ? claimRole : null
}
