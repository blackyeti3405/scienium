import { NextRequest } from 'next/server'
import { expect, vi } from 'vitest'

/**
 * Route-policy harness — calls API route handlers directly and asserts their
 * ACCESS behavior (who is allowed, who gets 401/404/429), not their feature
 * behavior.
 *
 * The mocking boundary is deliberately minimal:
 *   - Clerk's `auth()`/`currentUser()` are mocked (identity is the input under
 *     test);
 *   - `@/lib/db` is an in-memory Prisma stand-in whose queries REALLY filter
 *     rows by their `where` clause — so `findUnique({ id })` returns another
 *     team's row where `findFirst({ id, teamId })` does not;
 *   - a small set of pure-side-effect modules (activity log, storage, upload
 *     ledger) are no-op stubbed.
 * Everything else — `requireTeamContext`, `requireUserContext`,
 * `requireTeacher`, the rate limiter, the phase gate, zod validation — runs
 * for real. A route that drops the guard's error return, or forgets `teamId`
 * in a WHERE clause, fails the matrix; the guard-mocking style of test cannot
 * catch either.
 *
 * Usage (one fresh harness per test keeps rate-limit buckets isolated):
 *
 *   let h: RoutePolicyHarness
 *   beforeEach(() => { h = routeHarness() })
 *
 *   h.seed('paper', { id: 'p_a', teamId: h.ids.teamA, status: 'ready' })
 *   h.seed('paper', { id: 'p_b', teamId: h.ids.teamB, status: 'ready' })
 *
 *   await h.asStudentA().get(GET, 'p_a').expect(200)   // own row
 *   await h.asStudentA().get(GET, 'p_b').expect(404)   // ANOTHER team's real row
 *   await h.anonymous().get(GET, 'p_a').expect(401)    // signed out
 *   await h.asStudentA().overLimit().get(GET, 'p_a').expect(429)
 */

// ─── Mutable state the module mocks close over ────────────────────────────────
// vi.mock factories are lazy (they run when the mocked module is first
// imported), so they can safely reference this state even though vitest hoists
// the registrations.

interface ClerkState {
  auth: { userId: string | null; sessionClaims: unknown }
  currentUser: unknown
}

const clerkState: ClerkState = { auth: { userId: null, sessionClaims: null }, currentUser: null }

type Row = Record<string, unknown>
let activeStore = new Map<string, Row[]>()

/** Per-module registry of auto-stubbed exports (each call gets a no-op `vi.fn`). */
const stubRegistry = new Map<string, Record<string, ReturnType<typeof vi.fn>>>()

function autoStubModule(path: string): Record<string, unknown> {
  let fns = stubRegistry.get(path)
  if (!fns) {
    fns = {}
    stubRegistry.set(path, fns)
  }
  const bag = fns
  return new Proxy(
    {},
    {
      get(_t, prop) {
        if (typeof prop !== 'string' || prop === 'default' || prop === 'then') return undefined
        if (!bag[prop]) bag[prop] = vi.fn(() => Promise.resolve(undefined))
        return bag[prop]
      },
      has: () => true,
      getOwnPropertyDescriptor: () => ({ configurable: true, enumerable: true, value: undefined }),
    },
  )
}

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => clerkState.auth,
  currentUser: async () => clerkState.currentUser,
}))

vi.mock('@/lib/db', () => ({ db: createDbProxy() }))

// Pure side effects the policy matrix never asserts on — no-op stubbed.
vi.mock('@/lib/activity/log', () => autoStubModule('@/lib/activity/log'))
vi.mock('@/lib/storage', () => autoStubModule('@/lib/storage'))
vi.mock('@/lib/uploads/assets', () => autoStubModule('@/lib/uploads/assets'))

// ─── In-memory Prisma stand-in ────────────────────────────────────────────────

class HarnessQueryError extends Error {
  constructor(msg: string) {
    super(`[route-policy harness] ${msg}`)
  }
}

const SCALAR_OPS = new Set([
  'equals',
  'not',
  'in',
  'notIn',
  'lt',
  'lte',
  'gt',
  'gte',
  'contains',
  'startsWith',
  'endsWith',
  'mode',
])
const RELATION_OPS = new Set(['some', 'every', 'none', 'is', 'isNot'])

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Date)
}

function scalarEquals(a: unknown, b: unknown): boolean {
  if (a instanceof Date || b instanceof Date) {
    return new Date(a as string).getTime() === new Date(b as string).getTime()
  }
  return a === b
}

function matchScalarOps(value: unknown, ops: Record<string, unknown>): boolean {
  for (const [op, arg] of Object.entries(ops)) {
    if (op === 'mode') continue
    const insensitive = ops.mode === 'insensitive'
    const norm = (v: unknown) => (insensitive && typeof v === 'string' ? v.toLowerCase() : v)
    switch (op) {
      case 'equals':
        if (!scalarEquals(norm(value), norm(arg))) return false
        break
      case 'not': {
        const negated = isPlainObject(arg)
          ? matchScalarOps(value, arg as Record<string, unknown>)
          : scalarEquals(value, arg)
        if (negated) return false
        break
      }
      case 'in':
        if (!Array.isArray(arg) || !arg.some((x) => scalarEquals(value, x))) return false
        break
      case 'notIn':
        if (Array.isArray(arg) && arg.some((x) => scalarEquals(value, x))) return false
        break
      case 'lt':
        if (!((value as number) < (arg as number))) return false
        break
      case 'lte':
        if (!((value as number) <= (arg as number))) return false
        break
      case 'gt':
        if (!((value as number) > (arg as number))) return false
        break
      case 'gte':
        if (!((value as number) >= (arg as number))) return false
        break
      case 'contains':
        if (typeof value !== 'string' || !String(norm(value)).includes(String(norm(arg)))) return false
        break
      case 'startsWith':
        if (typeof value !== 'string' || !String(norm(value)).startsWith(String(norm(arg)))) return false
        break
      case 'endsWith':
        if (typeof value !== 'string' || !String(norm(value)).endsWith(String(norm(arg)))) return false
        break
      default:
        throw new HarnessQueryError(`unsupported where operator "${op}"`)
    }
  }
  return true
}

/**
 * Match one row against a Prisma where clause. Relations are matched against
 * DENORMALIZED fixture data: seed the related rows inline on the parent (e.g. a
 * team row carries `members: [{ user: { classId: '…' } }]`) and `some`/`is`
 * recurse into them. Unknown operators throw — a silently-ignored filter would
 * make a policy test pass vacuously.
 */
function matchWhere(row: Row, where: Record<string, unknown>): boolean {
  for (const [key, cond] of Object.entries(where)) {
    if (cond === undefined) continue
    if (key === 'AND') {
      const list = Array.isArray(cond) ? cond : [cond]
      if (!list.every((w) => matchWhere(row, w as Record<string, unknown>))) return false
      continue
    }
    if (key === 'OR') {
      const list = cond as Record<string, unknown>[]
      if (!list.some((w) => matchWhere(row, w))) return false
      continue
    }
    if (key === 'NOT') {
      const list = Array.isArray(cond) ? cond : [cond]
      if (list.some((w) => matchWhere(row, w as Record<string, unknown>))) return false
      continue
    }

    const value = row[key]
    if (!isPlainObject(cond)) {
      if (!scalarEquals(value, cond)) return false
      continue
    }

    // Compound-unique lookup (`paperId_userId: { paperId, userId }`): the row
    // has no such field — flatten the condition onto the row itself.
    if (value === undefined && key.includes('_') && key.split('_').every((p) => p in cond)) {
      if (!matchWhere(row, cond)) return false
      continue
    }

    const keys = Object.keys(cond)
    if (keys.some((k) => RELATION_OPS.has(k))) {
      for (const [op, sub] of Object.entries(cond)) {
        const subWhere = sub as Record<string, unknown>
        const list = Array.isArray(value) ? (value as Row[]) : []
        switch (op) {
          case 'some':
            if (!list.some((r) => matchWhere(r, subWhere))) return false
            break
          case 'every':
            if (!list.every((r) => matchWhere(r, subWhere))) return false
            break
          case 'none':
            if (list.some((r) => matchWhere(r, subWhere))) return false
            break
          case 'is':
            if (!isPlainObject(value) || !matchWhere(value as Row, subWhere)) return false
            break
          case 'isNot':
            if (isPlainObject(value) && matchWhere(value as Row, subWhere)) return false
            break
          default:
            throw new HarnessQueryError(`unsupported relation operator "${op}"`)
        }
      }
      continue
    }
    if (keys.every((k) => SCALAR_OPS.has(k))) {
      if (!matchScalarOps(value, cond)) return false
      continue
    }
    // Nested relation object without an explicit operator (to-one shorthand:
    // `user: { classId: … }`).
    if (!isPlainObject(value) || !matchWhere(value as Row, cond)) return false
  }
  return true
}

/** Shape a row through `select`/`include`. Missing relation selects default to
 *  `[]` so unseeded to-many relations read as empty, not crash. */
function shapeRow(row: Row, args: Record<string, unknown> | undefined): Row {
  if (!args) return { ...row }
  const select = args.select as Record<string, unknown> | undefined
  const include = args.include as Record<string, unknown> | undefined
  if (!select && !include) return { ...row }
  if (select) {
    const out: Row = {}
    for (const [key, spec] of Object.entries(select)) {
      if (!spec) continue
      const value = row[key]
      if (value === undefined) {
        out[key] = isPlainObject(spec) ? [] : undefined
      } else if (isPlainObject(spec) && Array.isArray(value)) {
        const subWhere = (spec as Record<string, unknown>).where as Record<string, unknown> | undefined
        const filtered = subWhere ? (value as Row[]).filter((r) => matchWhere(r, subWhere)) : (value as Row[])
        out[key] = filtered.map((r) => shapeRow(r, spec as Record<string, unknown>))
      } else if (isPlainObject(spec) && isPlainObject(value)) {
        out[key] = shapeRow(value as Row, spec as Record<string, unknown>)
      } else {
        out[key] = value
      }
    }
    return out
  }
  const out: Row = { ...row }
  for (const [key, spec] of Object.entries(include ?? {})) {
    if (!spec) continue
    if (out[key] === undefined) out[key] = []
  }
  return out
}

function applyUpdateData(row: Row, data: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(data)) {
    if (isPlainObject(value)) {
      const ops = Object.keys(value)
      if (ops.length === 1 && ['increment', 'decrement', 'set', 'multiply', 'divide'].includes(ops[0]!)) {
        const arg = (value as Record<string, unknown>)[ops[0]!] as number
        const current = (row[key] as number) ?? 0
        if (ops[0] === 'increment') row[key] = current + arg
        else if (ops[0] === 'decrement') row[key] = current - arg
        else if (ops[0] === 'multiply') row[key] = current * arg
        else if (ops[0] === 'divide') row[key] = current / arg
        else row[key] = arg
        continue
      }
      if (ops.some((o) => ['create', 'connect', 'disconnect', 'upsert', 'deleteMany', 'connectOrCreate'].includes(o))) {
        throw new HarnessQueryError(`nested write "${ops[0]}" on "${key}" is not supported — seed rows directly`)
      }
    }
    row[key] = value
  }
}

function notFoundError(model: string): Error {
  const err = new Error(`No ${model} found`) as Error & { code: string }
  err.code = 'P2025'
  return err
}

let createSeq = 0

function modelApi(model: string) {
  const rows = () => {
    let list = activeStore.get(model)
    if (!list) {
      list = []
      activeStore.set(model, list)
    }
    return list
  }
  const filtered = (where: Record<string, unknown> | undefined) =>
    where ? rows().filter((r) => matchWhere(r, where)) : [...rows()]
  const takeSkip = (list: Row[], args: Record<string, unknown>) => {
    const skip = (args.skip as number) ?? 0
    const take = args.take as number | undefined
    return list.slice(skip, take !== undefined ? skip + take : undefined)
  }

  return {
    findFirst: async (args: Record<string, unknown> = {}) => {
      const hit = filtered(args.where as Record<string, unknown>)[0]
      return hit ? shapeRow(hit, args) : null
    },
    findUnique: async (args: Record<string, unknown> = {}) => {
      const hit = filtered(args.where as Record<string, unknown>)[0]
      return hit ? shapeRow(hit, args) : null
    },
    findFirstOrThrow: async (args: Record<string, unknown> = {}) => {
      const hit = filtered(args.where as Record<string, unknown>)[0]
      if (!hit) throw notFoundError(model)
      return shapeRow(hit, args)
    },
    findUniqueOrThrow: async (args: Record<string, unknown> = {}) => {
      const hit = filtered(args.where as Record<string, unknown>)[0]
      if (!hit) throw notFoundError(model)
      return shapeRow(hit, args)
    },
    findMany: async (args: Record<string, unknown> = {}) =>
      takeSkip(filtered(args.where as Record<string, unknown>), args).map((r) => shapeRow(r, args)),
    count: async (args: Record<string, unknown> = {}) =>
      filtered(args.where as Record<string, unknown>).length,
    create: async (args: Record<string, unknown>) => {
      const data = { ...(args.data as Row) }
      if (data.id === undefined) data.id = `${model}_gen_${createSeq++}`
      rows().push(data)
      return shapeRow(data, args)
    },
    createMany: async (args: Record<string, unknown>) => {
      const list = args.data as Row[]
      for (const d of list) rows().push({ ...d })
      return { count: list.length }
    },
    createManyAndReturn: async (args: Record<string, unknown>) => {
      const list = args.data as Row[]
      return list.map((d) => {
        const row = { ...d }
        if (row.id === undefined) row.id = `${model}_gen_${createSeq++}`
        rows().push(row)
        return shapeRow(row, args)
      })
    },
    update: async (args: Record<string, unknown>) => {
      const hit = filtered(args.where as Record<string, unknown>)[0]
      if (!hit) throw notFoundError(model)
      applyUpdateData(hit, args.data as Record<string, unknown>)
      return shapeRow(hit, args)
    },
    updateMany: async (args: Record<string, unknown>) => {
      const hits = filtered(args.where as Record<string, unknown>)
      for (const hit of hits) applyUpdateData(hit, args.data as Record<string, unknown>)
      return { count: hits.length }
    },
    upsert: async (args: Record<string, unknown>) => {
      const hit = filtered(args.where as Record<string, unknown>)[0]
      if (hit) {
        applyUpdateData(hit, args.update as Record<string, unknown>)
        return shapeRow(hit, args)
      }
      const data = { ...(args.create as Row) }
      if (data.id === undefined) data.id = `${model}_gen_${createSeq++}`
      rows().push(data)
      return shapeRow(data, args)
    },
    delete: async (args: Record<string, unknown>) => {
      const list = rows()
      const idx = list.findIndex((r) => matchWhere(r, args.where as Record<string, unknown>))
      if (idx === -1) throw notFoundError(model)
      const [gone] = list.splice(idx, 1)
      return shapeRow(gone!, args)
    },
    deleteMany: async (args: Record<string, unknown> = {}) => {
      const list = rows()
      const keep = args.where
        ? list.filter((r) => !matchWhere(r, args.where as Record<string, unknown>))
        : []
      const count = list.length - keep.length
      activeStore.set(model, keep)
      return { count }
    },
    aggregate: async () => {
      throw new HarnessQueryError(`${model}.aggregate is not supported — assert via findMany/count`)
    },
    // Read-only grouping (`by` + `_max`/`_min`/`_count`/`_sum`) so routes that
    // aggregate per-team activity (e.g. the teacher roster) stay testable.
    // Anything fancier still belongs in the real-Postgres suite.
    groupBy: async (args: Record<string, unknown> = {}) => {
      const byKeys = Array.isArray(args.by) ? (args.by as string[]) : [args.by as string]
      const groups = new Map<string, Row[]>()
      for (const r of filtered(args.where as Record<string, unknown>)) {
        const key = JSON.stringify(byKeys.map((k) => r[k]))
        const bucket = groups.get(key)
        if (bucket) bucket.push(r)
        else groups.set(key, [r])
      }
      const num = (v: unknown) => (v instanceof Date ? v.getTime() : (v as number))
      return [...groups.values()].map((bucket) => {
        const out: Row = {}
        for (const k of byKeys) out[k] = bucket[0]![k]
        for (const agg of ['_max', '_min', '_count', '_sum'] as const) {
          const spec = args[agg] as Record<string, boolean> | undefined
          if (!spec) continue
          const res: Row = {}
          for (const field of Object.keys(spec)) {
            if (!spec[field]) continue
            if (agg === '_count') {
              res[field] = field === '_all' ? bucket.length : bucket.filter((r) => r[field] != null).length
            } else if (agg === '_sum') {
              res[field] = bucket.reduce((acc, r) => acc + ((r[field] as number) ?? 0), 0)
            } else {
              const vals = bucket.map((r) => r[field]).filter((v) => v != null)
              if (vals.length === 0) res[field] = null
              else
                res[field] = vals.reduce((best, v) =>
                  agg === '_max' ? (num(v) > num(best) ? v : best) : num(v) < num(best) ? v : best,
                )
            }
          }
          out[agg] = res
        }
        return out
      })
    },
  }
}

function createDbProxy(): unknown {
  const models = new Map<string, ReturnType<typeof modelApi>>()
  const target = {
    $transaction: async (arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg)
      if (typeof arg === 'function') return arg(dbProxy)
      throw new HarnessQueryError('unsupported $transaction form')
    },
    /**
     * ONLY `lockAggregate`'s advisory lock, and only as a no-op.
     *
     * The harness runs single-threaded against in-memory maps, so there is no
     * concurrency for a lock to serialize — taking one is genuinely a no-op
     * here. Routes that guard a mutation with `lockAggregate` would otherwise be
     * untestable for AUTHORIZATION, which is all this harness claims to prove.
     * Real lock behaviour is proven against PostgreSQL in
     * `test/pg/invariants.pg.test.ts`; any other raw SQL still throws, so this
     * cannot quietly become a general escape hatch.
     */
    $executeRaw: async (arg: unknown) => {
      const sql = String(
        (arg as { strings?: string[]; text?: string })?.strings?.join(' ') ??
          (arg as { text?: string })?.text ??
          arg,
      )
      if (sql.includes('pg_advisory_xact_lock')) return 0
      throw new HarnessQueryError(
        'db.$executeRaw is not supported by the route-policy harness (advisory locks excepted)',
      )
    },
  }
  const dbProxy: unknown = new Proxy(target, {
    get(t, prop) {
      if (typeof prop !== 'string') return undefined
      if (prop in t) return (t as Record<string, unknown>)[prop]
      if (prop === 'then') return undefined
      if (prop.startsWith('$')) {
        throw new HarnessQueryError(`db.${prop} is not supported by the route-policy harness`)
      }
      let api = models.get(prop)
      if (!api) {
        api = modelApi(prop)
        models.set(prop, api)
      }
      return api
    },
  })
  return dbProxy
}

// ─── Fixture ──────────────────────────────────────────────────────────────────

export interface HarnessIds {
  teamA: string
  teamB: string
  studentA: string // internal User.id (dbUserId)
  studentB: string
  clerkStudentA: string
  clerkStudentB: string
  teacherA: string // internal User.id — owns classA (studentA's class)
  teacherB: string // owns classB (studentB's class)
  clerkTeacherA: string
  clerkTeacherB: string
  classA: string
  classB: string
}

let harnessSeq = 0

export interface RouteHarnessOptions {
  /** Team phase for BOTH fixture teams. Default `'showcase'` (everything unlocked). */
  phase?: string
  labType?: string | null
}

function buildFixture(ns: string, opts: RouteHarnessOptions): { ids: HarnessIds; store: Map<string, Row[]> } {
  const phase = opts.phase ?? 'showcase'
  const labType = opts.labType === undefined ? 'volt_lab' : opts.labType
  const ids: HarnessIds = {
    teamA: `${ns}_teamA`,
    teamB: `${ns}_teamB`,
    studentA: `${ns}_uA`,
    studentB: `${ns}_uB`,
    clerkStudentA: `${ns}_clerk_sA`,
    clerkStudentB: `${ns}_clerk_sB`,
    teacherA: `${ns}_uTA`,
    teacherB: `${ns}_uTB`,
    clerkTeacherA: `${ns}_clerk_tA`,
    clerkTeacherB: `${ns}_clerk_tB`,
    classA: `${ns}_classA`,
    classB: `${ns}_classB`,
  }

  const teamScalar = (id: string, name: string) => ({ id, name, phase, labType })
  const teamA = teamScalar(ids.teamA, 'Team A')
  const teamB = teamScalar(ids.teamB, 'Team B')

  const store = new Map<string, Row[]>()
  store.set('team', [
    // `members` is denormalized for teacherOwnsTeam's `some` filter.
    { ...teamA, members: [{ userId: ids.studentA, user: { id: ids.studentA, classId: ids.classA } }] },
    { ...teamB, members: [{ userId: ids.studentB, user: { id: ids.studentB, classId: ids.classB } }] },
  ])
  store.set('user', [
    {
      id: ids.studentA,
      clerkUserId: ids.clerkStudentA,
      name: 'Student A',
      email: 'a@example.test',
      role: 'student',
      classId: ids.classA,
      activeTeamId: ids.teamA,
      teamMemberships: [{ teamId: ids.teamA, team: teamA, joinedAt: new Date(0) }],
    },
    {
      id: ids.studentB,
      clerkUserId: ids.clerkStudentB,
      name: 'Student B',
      email: 'b@example.test',
      role: 'student',
      classId: ids.classB,
      activeTeamId: ids.teamB,
      teamMemberships: [{ teamId: ids.teamB, team: teamB, joinedAt: new Date(0) }],
    },
    {
      id: ids.teacherA,
      clerkUserId: ids.clerkTeacherA,
      name: 'Teacher A',
      email: 'ta@example.test',
      role: 'teacher',
      classId: null,
      activeTeamId: null,
      teamMemberships: [],
    },
    {
      id: ids.teacherB,
      clerkUserId: ids.clerkTeacherB,
      name: 'Teacher B',
      email: 'tb@example.test',
      role: 'teacher',
      classId: null,
      activeTeamId: null,
      teamMemberships: [],
    },
  ])
  store.set('class', [
    { id: ids.classA, teacherId: ids.teacherA, name: 'Class A' },
    { id: ids.classB, teacherId: ids.teacherB, name: 'Class B' },
  ])
  store.set('teamMember', [
    { teamId: ids.teamA, userId: ids.studentA, joinedAt: new Date(0) },
    { teamId: ids.teamB, userId: ids.studentB, joinedAt: new Date(0) },
  ])
  return { ids, store }
}

// ─── Callers + assertions ─────────────────────────────────────────────────────

// `Promise<any>` (not `unknown`): concrete handlers narrow params to their own
// segment shape, which contravariance would reject against `unknown`.
type RouteHandler = (req: NextRequest, route: { params: Promise<any> }) => Promise<Response>

interface CallOptions {
  body?: unknown
  query?: Record<string, string>
  headers?: Record<string, string>
}

export class PolicyCall {
  constructor(
    private readonly run: () => Promise<Response>,
    private readonly label: string,
  ) {}

  /** Invoke the handler and assert the status; returns the parsed body. */
  async expect(status: number): Promise<any> {
    const res = await this.run()
    const text = await res.text()
    expect(res.status, `${this.label} → expected ${status}, got ${res.status}: ${text.slice(0, 300)}`).toBe(
      status,
    )
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }

  /** Invoke without asserting; returns the raw Response. */
  async response(): Promise<Response> {
    return this.run()
  }
}

export interface RoutePolicyHarness {
  ids: HarnessIds
  /** Append a row to a model's in-memory table (model name as on `db.<model>`). */
  seed(model: string, row: Row): Row
  rows(model: string): Row[]
  asStudentA(): Caller
  asStudentB(): Caller
  asTeacherA(): Caller
  asTeacherB(): Caller
  anonymous(): Caller
}

export interface Caller {
  /** Pre-exhausts every rate-limit tier for this identity so the next call 429s. */
  overLimit(): Caller
  /** Sends a foreign Origin header — mutating verbs must 403 (CSRF). */
  crossOrigin(): Caller
  get(handler: RouteHandler, params?: string | Record<string, string>, opts?: CallOptions): PolicyCall
  post(handler: RouteHandler, params?: string | Record<string, string>, opts?: CallOptions): PolicyCall
  put(handler: RouteHandler, params?: string | Record<string, string>, opts?: CallOptions): PolicyCall
  patch(handler: RouteHandler, params?: string | Record<string, string>, opts?: CallOptions): PolicyCall
  delete(handler: RouteHandler, params?: string | Record<string, string>, opts?: CallOptions): PolicyCall
}

let ipSeq = 0

export function routeHarness(opts: RouteHarnessOptions = {}): RoutePolicyHarness {
  const ns = `h${harnessSeq++}`
  const { ids, store } = buildFixture(ns, opts)
  activeStore = store
  // Belt-and-braces: the Playwright flag would disable the limiter entirely.
  if (process.env.E2E_SKIP_LLM === '1') vi.stubEnv('E2E_SKIP_LLM', '')

  function makeCaller(clerkUserId: string | null, sessionClaims: unknown): Caller {
    // Unique IP per caller keeps the per-IP buckets of the module-singleton
    // rate limiter isolated between tests.
    const ip = `10.77.${Math.floor(ipSeq / 250)}.${(ipSeq++ % 250) + 1}`
    let exhaust = false
    let foreignOrigin = false

    const call = (method: string) =>
      function (
        handler: RouteHandler,
        params?: string | Record<string, string>,
        callOpts: CallOptions = {},
      ): PolicyCall {
        const resolvedParams = typeof params === 'string' ? { id: params } : (params ?? {})
        const label = `${method} as ${clerkUserId ?? 'anonymous'} params=${JSON.stringify(resolvedParams)}`
        return new PolicyCall(async () => {
          activeStore = store
          if (exhaust && clerkUserId) {
            const { enforceRateLimit, RATE_LIMITS } = await import('@/lib/rate-limit')
            const warm = new NextRequest('http://localhost:3000/api/_warm', {
              headers: { 'x-real-ip': ip },
            })
            for (const [tier, cfg] of Object.entries(RATE_LIMITS)) {
              for (let i = 0; i < cfg.limit; i++) {
                await enforceRateLimit(warm, tier as keyof typeof RATE_LIMITS, clerkUserId)
              }
            }
          }
          clerkState.auth = { userId: clerkUserId, sessionClaims }
          const url = new URL('http://localhost:3000/api/route-under-test')
          for (const [k, v] of Object.entries(callOpts.query ?? {})) url.searchParams.set(k, v)
          const hasBody = callOpts.body !== undefined
          const req = new NextRequest(url, {
            method,
            headers: {
              'x-real-ip': ip,
              ...(hasBody ? { 'content-type': 'application/json' } : {}),
              ...(foreignOrigin
                ? { origin: 'https://evil.example.net', host: 'localhost:3000' }
                : {}),
              ...callOpts.headers,
            },
            ...(hasBody ? { body: JSON.stringify(callOpts.body) } : {}),
          })
          return handler(req, { params: Promise.resolve(resolvedParams) })
        }, label)
      }

    const caller: Caller = {
      overLimit() {
        exhaust = true
        return caller
      },
      crossOrigin() {
        foreignOrigin = true
        return caller
      },
      get: call('GET'),
      post: call('POST'),
      put: call('PUT'),
      patch: call('PATCH'),
      delete: call('DELETE'),
    }
    return caller
  }

  return {
    ids,
    seed(model, row) {
      let list = store.get(model)
      if (!list) {
        list = []
        store.set(model, list)
      }
      list.push(row)
      return row
    },
    rows(model) {
      return store.get(model) ?? []
    },
    asStudentA: () => makeCaller(ids.clerkStudentA, null),
    asStudentB: () => makeCaller(ids.clerkStudentB, null),
    asTeacherA: () => makeCaller(ids.clerkTeacherA, { metadata: { role: 'teacher' } }),
    asTeacherB: () => makeCaller(ids.clerkTeacherB, { metadata: { role: 'teacher' } }),
    anonymous: () => makeCaller(null, null),
  }
}
