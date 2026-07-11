import { describe, it, expect } from 'vitest'
import { resolveAuthoritativeRole } from '@/lib/teacher/role'

/**
 * The Phase 1 role invariant: the DB `User.role` is authoritative whenever a row
 * exists, so a stale Clerk claim can never override a DB downgrade. The claim
 * only bootstraps a brand-new account that has no row yet.
 */
describe('resolveAuthoritativeRole', () => {
  it('honors the DB role for an existing user and ignores the claim', () => {
    expect(resolveAuthoritativeRole('teacher', undefined, true)).toBe('teacher')
    expect(resolveAuthoritativeRole('admin', undefined, true)).toBe('admin')
  })

  it('denies a downgraded user even when a stale claim still says teacher', () => {
    // DB downgraded to student; the old token still claims teacher — DB wins.
    expect(resolveAuthoritativeRole('student', 'teacher', true)).toBeNull()
    expect(resolveAuthoritativeRole('student', 'admin', true)).toBeNull()
  })

  it('bootstraps a claim-only teacher who has no DB row yet', () => {
    expect(resolveAuthoritativeRole(undefined, 'teacher', false)).toBe('teacher')
    expect(resolveAuthoritativeRole(null, 'admin', false)).toBe('admin')
  })

  it('denies when neither the DB nor the claim grants a teacher role', () => {
    expect(resolveAuthoritativeRole('student', undefined, true)).toBeNull()
    expect(resolveAuthoritativeRole(undefined, 'student', false)).toBeNull()
    expect(resolveAuthoritativeRole(undefined, undefined, false)).toBeNull()
  })
})
