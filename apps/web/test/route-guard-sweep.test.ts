import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, it, expect } from 'vitest'

/**
 * Static sweep: EVERY API route must carry a recognized auth guard.
 *
 * The 0.28.0 IDOR sweep found the codebase safe by convention — every route
 * happened to call a guard. This test is what keeps that true: a new
 * `app/api/**\/route.ts` that queries Prisma with no `requireTeamContext` /
 * `requireTeacher` / `requireUserContext` / `withTeamRoute` / `assertCron`
 * fails CI instead of shipping a world-readable route.
 *
 * Two deliberate exceptions, each pinned to its compensating control below so
 * the allowlist can't silently rot into a bypass.
 */

const WEB_ROOT = join(__dirname, '..')
const GUARD_MARKERS =
  /requireTeamContext|withTeamRoute|requireUserContext|requireTeacher|assertCron/

/** route (repo-relative) → the compensating-control text that must be present. */
const PUBLIC_ALLOWLIST: Record<string, RegExp> = {
  // Dev-only backfill: refuses to exist in production, authenticates inline.
  'app/api/dev/backfill-me/route.ts': /NODE_ENV\s*===\s*'production'/,
  // Deliberately public gallery asset: privacy enforced by canViewShowcase.
  'app/api/showcase/public/asset/route.ts': /canViewShowcase/,
}

function collectRoutes(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) out.push(...collectRoutes(p))
    else if (entry === 'route.ts') out.push(p)
  }
  return out
}

describe('route guard sweep', () => {
  const routes = collectRoutes(join(WEB_ROOT, 'app', 'api')).map((p) => relative(WEB_ROOT, p))
  const guarded = routes.filter((r) => !(r in PUBLIC_ALLOWLIST))

  it('finds the full route surface (sweep is not vacuous)', () => {
    expect(routes.length).toBeGreaterThan(90)
  })

  it.each(guarded)('%s carries an auth guard', (routeRel) => {
    const src = readFileSync(join(WEB_ROOT, routeRel), 'utf8')
    expect(
      GUARD_MARKERS.test(src),
      'route has no requireTeamContext / requireTeacher / requireUserContext / withTeamRoute / assertCron — add one, or add the route to PUBLIC_ALLOWLIST with its compensating control',
    ).toBe(true)
  })

  it.each(Object.entries(PUBLIC_ALLOWLIST))(
    'allowlisted %s still carries its compensating control',
    (routeRel, control) => {
      const src = readFileSync(join(WEB_ROOT, routeRel), 'utf8')
      expect(src).toMatch(control)
    },
  )

  // A team-scoped guard on a teacher route would pass the generic sweep while
  // silently breaking class scoping — teacher routes must use requireTeacher.
  const teacherRoutes = routes.filter((r) => r.startsWith(join('app', 'api', 'teacher') + '/'))

  it('finds the teacher route surface (sweep is not vacuous)', () => {
    expect(teacherRoutes.length).toBeGreaterThanOrEqual(10)
  })

  it.each(teacherRoutes)('%s uses requireTeacher specifically', (routeRel) => {
    const src = readFileSync(join(WEB_ROOT, routeRel), 'utf8')
    expect(src).toMatch(/requireTeacher\s*\(/)
  })
})
