import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

/**
 * Narrow REAL-Postgres invariant suite (A11). The in-memory route-policy
 * harness proves access policy; it deliberately cannot prove database
 * behavior — constraints, rollback, and conditional-update atomicity under
 * true concurrency. This file covers exactly those, for the invariants the
 * v0.29.4 audit reopened:
 *
 *   - A12: the storage-quota reservation serializes concurrent uploads
 *   - A6:  the daily LC claim's unique key admits exactly one award
 *   - A8:  the retry-generation claim elects exactly one generator
 *   - A13: concurrent showcase views count once per visitor per day
 *   - P2-S1: every count-then-create cap admits exactly one caller at cap-1
 *   - P2-S4: two concurrent grades of one due vocabulary card admit exactly one
 *   - P2-6:  the DELETE rules themselves — what a cascade takes and what it must
 *            never take
 *
 * The P2-S1/P2-S4 blocks call the REAL route handlers (Clerk is the only thing
 * mocked) rather than a re-implementation of their logic, because the defect
 * being pinned is the ordering of a count and a create inside one handler —
 * a re-implementation could not fail when the handler regresses.
 *
 * Runs against the LOCAL dev database (docker `scienium-postgres`, loaded from
 * apps/web/.env.local) with self-created, self-cleaned fixture rows.
 *
 * On a developer laptop with no database up, every test here self-skips — the
 * suite is additive locally, never a hidden dependency. On CI it is the
 * OPPOSITE: `.github/workflows/ci.yml` gives the Test step a postgres service
 * and a `DATABASE_URL`, so an unreachable database there means the service
 * block broke, not that the tests are optional. A self-skip in that case is a
 * silently green CI over the repo's only true-concurrency coverage, so `CI=1`
 * turns the skip into a throw.
 */

vi.mock('server-only', () => ({}))

// Identity is the ONLY mocked input for the route-level races below — the
// guard, the rate limiter, the phase gate, zod and Prisma all run for real.
const clerkState: { userId: string | null } = { userId: null }
vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ userId: clerkState.userId, sessionClaims: null }),
  currentUser: async () => null,
}))

// Vocabulary build only: the paid curation call and the content-driven
// candidate extraction are replaced by a per-paper term, so the deck-capacity
// race below is about the CAP and never about Anthropic or paper text.
const termFor = (title: string) => ({
  termKey: `pgterm_${title}`,
  term: title,
  aliases: [],
  definition: 'a definition',
  source: 'llm_definition',
  sourceEntryId: null,
  quote: null,
  llmDefined: true,
})
vi.mock('@/lib/literature/vocab-curate', () => ({
  curateTerms: async (input: { paperTitle: string }) => [termFor(input.paperTitle)],
}))
vi.mock('@/lib/literature/vocab', () => ({
  extractCandidates: (input: { title: string }) => [termFor(input.title)],
  VOCAB_TEXT_SLICE_CHARS: 60_000,
}))

function loadEnvLocal(): void {
  if (process.env.DATABASE_URL) return
  try {
    const raw = readFileSync(join(__dirname, '..', '..', '.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=["']?(.*?)["']?\s*$/)
      if (m && process.env[m[1]!] === undefined) process.env[m[1]!] = m[2]!
    }
  } catch {
    /* no .env.local — the ping below decides */
  }
}

loadEnvLocal()

async function pingDatabase(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false
  try {
    const { PrismaClient } = await import('@prisma/client')
    const probe = new PrismaClient()
    try {
      await Promise.race([
        probe.$queryRaw`SELECT 1`,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2_000)),
      ])
      return true
    } finally {
      await probe.$disconnect().catch(() => {})
    }
  } catch {
    return false
  }
}

const dbUp = await pingDatabase()
if (!dbUp && process.env.CI) {
  throw new Error(
    'test/pg/invariants.pg.test.ts: no reachable DATABASE_URL on CI. These are the ' +
      'only true-concurrency tests in the repo — skipping them here would make CI ' +
      'green over zero coverage. Check the `services: postgres` block and the Test ' +
      "step's DATABASE_URL in .github/workflows/ci.yml.",
  )
}
const describePg = describe.skipIf(!dbUp)

// Loaded lazily so an unreachable-DB run never imports app modules at all.
type Db = typeof import('@/lib/db')['db']
let db: Db
let reserveUploadAsset: typeof import('@/lib/uploads/assets')['reserveUploadAsset']
let TEAM_STORAGE_QUOTA_BYTES: number
let awardDailyLabCredit: typeof import('@/lib/economy/lab-credit')['awardDailyLabCredit']
let recordShowcaseView: typeof import('@/lib/showcase-server')['recordShowcaseView']

const ns = `pgtest_${randomUUID().slice(0, 8)}`
let userId: string
let teamId: string

beforeAll(async () => {
  if (!dbUp) return
  ;({ db } = await import('@/lib/db'))
  ;({ reserveUploadAsset, TEAM_STORAGE_QUOTA_BYTES } = await import('@/lib/uploads/assets'))
  ;({ awardDailyLabCredit } = await import('@/lib/economy/lab-credit'))
  ;({ recordShowcaseView } = await import('@/lib/showcase-server'))

  const user = await db.user.create({
    data: {
      clerkUserId: `clerk_${ns}`,
      name: 'PG Invariant Fixture',
      email: `${ns}@invariants.test`,
      role: 'student',
    },
    select: { id: true },
  })
  userId = user.id
  const team = await db.team.create({
    // `showcase` unlocks every feature gate, so the route-level races below
    // exercise the cap rather than the phase gate.
    data: { name: `PG Fixture Lab ${ns}`, teamLeadId: userId, phase: 'showcase', labType: 'volt_lab' },
    select: { id: true },
  })
  teamId = team.id
  // `requireTeamContext` resolves the acting team through membership.
  await db.teamMember.create({ data: { teamId, userId, role: 'lead' } })
  await db.user.update({ where: { id: userId }, data: { activeTeamId: teamId } })
  clerkState.userId = `clerk_${ns}`
})

afterAll(async () => {
  if (!dbUp || !db) return
  // Children first, then the fixture principals.
  await db.uploadedAsset.deleteMany({ where: { teamId } }).catch(() => {})
  await db.labCreditClaim.deleteMany({ where: { teamId } }).catch(() => {})
  await db.teamCurrency.deleteMany({ where: { teamId } }).catch(() => {})
  await db.synthesisMatrix.deleteMany({ where: { teamId } }).catch(() => {})
  await db.topicInterest.deleteMany({ where: { teamId } }).catch(() => {})
  const logs = await db.projectLog.findMany({ where: { teamId }, select: { id: true } })
  await db.projectLogReference
    .deleteMany({ where: { projectLogId: { in: logs.map((l) => l.id) } } })
    .catch(() => {})
  await db.projectLog.deleteMany({ where: { teamId } }).catch(() => {})
  await db.vocabCard.deleteMany({ where: { teamId } }).catch(() => {})
  await db.activityFeed.deleteMany({ where: { teamId } }).catch(() => {})
  await db.notification.deleteMany({ where: { dedupeKey: { contains: ns } } }).catch(() => {})
  const papers = await db.paper.findMany({ where: { teamId }, select: { id: true } })
  await db.paperQuizSession
    .deleteMany({ where: { paperId: { in: papers.map((p) => p.id) } } })
    .catch(() => {})
  await db.paper.deleteMany({ where: { teamId } }).catch(() => {})
  await db.teamMember.deleteMany({ where: { teamId } }).catch(() => {})
  const showcase = await db.showcase.findUnique({ where: { teamId }, select: { id: true } })
  if (showcase) {
    await db.showcaseView.deleteMany({ where: { showcaseId: showcase.id } }).catch(() => {})
    await db.showcase.delete({ where: { id: showcase.id } }).catch(() => {})
  }
  // NOT swallowed. A `.catch(() => {})` here is how twelve "PG Fixture Lab"
  // teams accumulated in the dev database unnoticed: the team delete kept
  // failing on a child row nobody had added to the list above, silently. A
  // foreign-key error here means this cleanup is incomplete — the right
  // response is to add the missing table, not to hide it.
  await db.team.delete({ where: { id: teamId } })
  await db.user.deleteMany({ where: { clerkUserId: { startsWith: `clerk_${ns}` } } })
  await db.$disconnect().catch(() => {})
})

describePg('A12 — storage reservation is atomic under real concurrency', () => {
  it('two concurrent reservations that only fit one admit exactly one', async () => {
    // Fill the quota to within 150 bytes, then race two 100-byte reservations.
    await db.uploadedAsset.create({
      data: {
        teamId,
        userId,
        objectKey: `${ns}/filler`,
        url: '',
        contentType: 'application/octet-stream',
        sizeBytes: TEAM_STORAGE_QUOTA_BYTES - 150,
        purpose: 'pg_test',
        status: 'attached',
      },
    })
    const [a, b] = await Promise.all([
      reserveUploadAsset({
        teamId,
        userId,
        objectKey: `${ns}/a`,
        url: '',
        contentType: 'image/png',
        sizeBytes: 100,
        purpose: 'pg_test',
      }),
      reserveUploadAsset({
        teamId,
        userId,
        objectKey: `${ns}/b`,
        url: '',
        contentType: 'image/png',
        sizeBytes: 100,
        purpose: 'pg_test',
      }),
    ])
    expect([a.ok, b.ok].sort()).toEqual([false, true])
    const held = await db.uploadedAsset.count({ where: { teamId, status: { not: 'deleted' } } })
    expect(held).toBe(2) // the filler + exactly ONE reservation
  })
})

describePg('A6 — the daily LC claim admits exactly one award', () => {
  it('concurrent awards yield one awarded + one already_claimed, LC += 1', async () => {
    const [a, b] = await Promise.all([
      awardDailyLabCredit({ teamId, dbUserId: userId }),
      awardDailyLabCredit({ teamId, dbUserId: userId }),
    ])
    expect([a, b].sort()).toEqual(['already_claimed', 'awarded'])
    const currency = await db.teamCurrency.findUnique({ where: { teamId } })
    expect(currency?.lc).toBe(1)
  })
})

describePg('A8 — the retry-generation claim elects exactly one generator', () => {
  it('two concurrent conditional claims: one count=1, one count=0', async () => {
    const paper = await db.paper.create({
      data: { teamId, title: 'PG fixture paper', authors: [], sourceType: 'pdf', uploadedByUserId: userId },
      select: { id: true },
    })
    const session = await db.paperQuizSession.create({
      data: { paperId: paper.id, userId, questionsJson: [] },
      select: { id: true },
    })
    const claim = () =>
      db.paperQuizSession.updateMany({
        where: {
          id: session.id,
          OR: [
            { retryGenClaimedAt: null },
            { retryGenClaimedAt: { lt: new Date(Date.now() - 120_000) } },
          ],
        },
        data: { retryGenClaimedAt: new Date() },
      })
    const [a, b] = await Promise.all([claim(), claim()])
    expect([a.count, b.count].sort()).toEqual([0, 1])
  })
})

// ─── P2-S1: count-then-create caps under true concurrency ─────────────────────
//
// Every one of these caps was a `count()` outside the write's transaction. The
// attack is always the same: two valid calls at cap-1, each seeing the other's
// slot as free. `Promise.all` on the real handlers reproduces it — before the
// fix these blocks store cap+1 (e.g. a synthesis matrix over its team cap).

type Handler = (req: NextRequest, route: { params: Promise<unknown> }) => Promise<Response>

let seq = 0

/** POST `body` to `handler` with the fixture's identity. */
function post(handler: Handler, body: unknown, params: Record<string, string> = {}): Promise<Response> {
  const req = new NextRequest('http://localhost:3000/api/route-under-test', {
    method: 'POST',
    // A unique IP per call keeps the per-IP rate-limit bucket out of the way;
    // the per-USER bucket still applies and is far above these counts.
    headers: { 'content-type': 'application/json', 'x-real-ip': `10.88.${(seq++ % 250) + 1}.1` },
    body: JSON.stringify(body),
  })
  return handler(req, { params: Promise.resolve(params) })
}

/** Statuses of two concurrent POSTs, sorted so the assertion is order-free. */
async function raceTwo(run: () => Promise<Response>): Promise<number[]> {
  const [a, b] = await Promise.all([run(), run()])
  return [a.status, b.status].sort((x, y) => x - y)
}

describePg('P2-S1 — count-then-create caps admit exactly one caller at cap-1', () => {
  it('synthesis matrices: two concurrent creates at cap-1 → one 201, one 409', async () => {
    const { POST } = await import('@/app/api/literature/synthesis/route')
    const { MAX_MATRICES_PER_TEAM } = await import('@/lib/literature/synthesis')
    const papers = await Promise.all(
      [0, 1].map((i) =>
        db.paper.create({
          data: {
            teamId,
            title: `PG synth source ${i}`,
            authors: [],
            sourceType: 'pdf',
            status: 'ready',
            uploadedByUserId: userId,
          },
          select: { id: true },
        }),
      ),
    )
    await db.synthesisMatrix.createMany({
      data: Array.from({ length: MAX_MATRICES_PER_TEAM - 1 }, () => ({
        teamId,
        templateId: 'filler',
        columnsJson: [],
        paperIds: [],
        createdByUserId: userId,
      })),
    })
    const body = { paperIds: papers.map((p) => p.id) }
    const statuses = await raceTwo(() => post(POST as Handler, body))
    expect(statuses).toEqual([201, 409])
    expect(await db.synthesisMatrix.count({ where: { teamId } })).toBe(MAX_MATRICES_PER_TEAM)
  })

  it('project-log references: two concurrent links at cap-1 → one 201, one 400', async () => {
    const { POST } = await import('@/app/api/project-log/[id]/references/route')
    const logs = []
    for (let i = 0; i < 12; i++) {
      logs.push(
        await db.projectLog.create({
          data: { teamId, createdByUserId: userId, entryType: 'progress', body: `b${i}`, stage: 's' },
          select: { id: true },
        }),
      )
    }
    const from = logs[0]!.id
    await db.projectLogReference.createMany({
      data: logs.slice(1, 10).map((l) => ({ projectLogId: from, referencesLogId: l.id })),
    })
    // Two DIFFERENT targets: `skipDuplicates` must not be what saves the cap.
    const [a, b] = await Promise.all([
      post(POST as Handler, { targetId: logs[10]!.id }, { id: from }),
      post(POST as Handler, { targetId: logs[11]!.id }, { id: from }),
    ])
    expect([a.status, b.status].sort()).toEqual([201, 400])
    expect(await db.projectLogReference.count({ where: { projectLogId: from } })).toBe(10)

    // At the cap, re-posting a link that already exists consumes no slot and
    // stores no second row (the composite PK + `skipDuplicates`).
    const again = await post(POST as Handler, { targetId: logs[3]!.id }, { id: from })
    expect(again.status).toBe(201)
    expect(await db.projectLogReference.count({ where: { projectLogId: from } })).toBe(10)
  })

  it('interests: two concurrent adds at cap-1 → one 201, one 409', async () => {
    const { POST } = await import('@/app/api/discovery/interests/route')
    await db.topicInterest.createMany({
      data: [
        { teamId, createdByUserId: userId, text: 'batteries' },
        { teamId, createdByUserId: userId, text: 'magnets' },
      ],
    })
    const [a, b] = await Promise.all([
      post(POST as Handler, { text: 'circuits' }),
      post(POST as Handler, { text: 'resistors' }),
    ])
    expect([a.status, b.status].sort()).toEqual([201, 409])
    expect(await db.topicInterest.count({ where: { teamId, createdByUserId: userId } })).toBe(3)
  })

  it('interests: two concurrent adds of the SAME phrase store one row', async () => {
    const { POST } = await import('@/app/api/discovery/interests/route')
    await db.topicInterest.deleteMany({ where: { teamId } })
    const [a, b] = await Promise.all([
      post(POST as Handler, { text: 'solar cells' }),
      post(POST as Handler, { text: 'Solar Cells' }),
    ])
    expect([a.status, b.status].sort()).toEqual([200, 201])
    expect(await db.topicInterest.count({ where: { teamId, createdByUserId: userId } })).toBe(1)
  })
})

describePg('P2-S1 — the vocabulary deck cap holds across concurrent builds', () => {
  it('two builds of DIFFERENT papers with one slot left store one card, not two', async () => {
    const { POST } = await import('@/app/api/literature/vocab/build/route')
    const papers = await Promise.all(
      ['alpha', 'beta'].map((title) =>
        db.paper.create({
          data: {
            teamId,
            title,
            authors: [],
            sourceType: 'pdf',
            status: 'ready',
            fullText: 'text',
            uploadedByUserId: userId,
          },
          select: { id: true },
        }),
      ),
    )
    // 199 held → room for exactly one more card.
    const filler = await db.paper.create({
      data: { teamId, title: 'filler', authors: [], sourceType: 'pdf', uploadedByUserId: userId },
      select: { id: true },
    })
    await db.vocabCard.createMany({
      data: Array.from({ length: 199 }, (_, i) => ({
        userId,
        teamId,
        paperId: filler.id,
        termKey: `filler_${ns}_${i}`,
        term: `filler ${i}`,
        definition: 'd',
        source: 'llm_definition' as const,
        box: 1,
        dueAt: new Date(),
      })),
    })

    const [a, b] = await Promise.all([
      post(POST as Handler, { paperId: papers[0]!.id }),
      post(POST as Handler, { paperId: papers[1]!.id }),
    ])
    expect([a.status, b.status]).toEqual([200, 200])
    expect(await db.vocabCard.count({ where: { userId, teamId } })).toBe(200)
  })
})

describePg('P2-S4 — one due vocabulary card admits exactly one grade', () => {
  it('two concurrent reviews of the same due card → one 200, one 409, reviewCount 1', async () => {
    const { POST } = await import('@/app/api/literature/vocab/review/route')
    const paper = await db.paper.create({
      data: { teamId, title: 'PG vocab source', authors: [], sourceType: 'pdf', uploadedByUserId: userId },
      select: { id: true },
    })
    const card = await db.vocabCard.create({
      data: {
        userId,
        teamId,
        paperId: paper.id,
        termKey: `pgterm_${ns}`,
        term: 'photosynthesis',
        definition: 'd',
        source: 'llm_definition',
        box: 1,
        dueAt: new Date(Date.now() - 60_000), // due
      },
      select: { id: true },
    })
    const [a, b] = await Promise.all([
      post(POST as Handler, { cardId: card.id, grade: 'good' }),
      post(POST as Handler, { cardId: card.id, grade: 'good' }),
    ])
    expect([a.status, b.status].sort()).toEqual([200, 409])
    const after = await db.vocabCard.findUnique({
      where: { id: card.id },
      select: { box: true, reviewCount: true },
    })
    expect(after).toMatchObject({ box: 2, reviewCount: 1 })
  })
})

describePg('A13 — concurrent showcase views count once per visitor per day', () => {
  it('three concurrent first visits produce exactly one row', async () => {
    const showcase = await db.showcase.create({
      data: {
        teamId,
        slug: `pg-fixture-${ns}`,
        title: 'PG fixture showcase',
        abstract: 'fixture',
      },
      select: { id: true },
    })
    const fp = `fp_${ns}`
    const results = await Promise.all([
      recordShowcaseView(showcase.id, fp),
      recordShowcaseView(showcase.id, fp),
      recordShowcaseView(showcase.id, fp),
    ])
    expect(results.filter((r) => r === 'counted')).toHaveLength(1)
    const rows = await db.showcaseView.count({
      where: { showcaseId: showcase.id, visitorFingerprint: fp },
    })
    expect(rows).toBe(1)
  })
})

// ─── P2-S3 / HANDOFF #4-#5: notification read state and reach ─────────────────
//
// Two defects that share one root cause — `Notification` carried a single
// `read_at` for a row every teammate reads, and a required `team_id` the bell
// filtered on:
//
//   - one member's "mark all read" cleared the badge for the whole team;
//   - a notice addressed to a student who has no live team was unreadable,
//     which is exactly the case (removed from a class, removed from a team)
//     the notice exists for.
//
// Real Postgres because both are about what the DATABASE holds per user, and
// both go through the real route handler — a re-implementation could not fail
// when the handler regresses.

/** GET a handler with the fixture identity currently in `clerkState`. */
function get(handler: (req: NextRequest) => Promise<Response>): Promise<Response> {
  const req = new NextRequest('http://localhost:3000/api/notifications', {
    headers: { 'x-real-ip': `10.89.${(seq++ % 250) + 1}.1` },
  })
  return handler(req)
}

describePg('P2-S3 — read state is per member, not per team', () => {
  it('one member marking a team-wide notification read leaves it UNREAD for a teammate', async () => {
    const { GET, POST } = await import('@/app/api/notifications/route')
    const mate = await db.user.create({
      data: {
        clerkUserId: `clerk_${ns}_mate`,
        name: 'PG Teammate',
        email: `${ns}-mate@invariants.test`,
        role: 'student',
      },
      select: { id: true },
    })
    await db.teamMember.create({ data: { teamId, userId: mate.id, role: 'member' } })
    await db.notification.create({
      data: {
        teamId,
        userId: null, // whole team
        kind: 'teacher_feedback',
        title: 'PG shared notice',
        body: 'body',
        dedupeKey: `pg_shared_${ns}`,
      },
    })

    clerkState.userId = `clerk_${ns}`
    expect(((await (await get(GET)).json()) as { unreadCount: number }).unreadCount).toBeGreaterThan(0)
    await post(POST as unknown as Handler, { all: true })
    expect(((await (await get(GET)).json()) as { unreadCount: number }).unreadCount).toBe(0)

    // THE ATTACK: the teammate never opened it. A shared `read_at` clears their
    // badge too, and the notice is gone before they ever saw it.
    clerkState.userId = `clerk_${ns}_mate`
    const mateView = (await (await get(GET)).json()) as {
      unreadCount: number
      items: Array<{ title: string; readAt: string | null }>
    }
    expect(mateView.unreadCount).toBe(1)
    expect(mateView.items.find((i) => i.title === 'PG shared notice')?.readAt).toBeNull()

    clerkState.userId = `clerk_${ns}`
  })
})

// ─── P2-6: the deletion rules themselves ──────────────────────────────────────
//
// The lifecycle was documented (`docs/runbooks/data-export-delete.md`) and the
// erasure workflow is tested, but the DELETE rules never were — and a cascade is
// the one failure that leaves nothing behind to notice. The three shapes that
// matter are all here: what a cascade must never reach, what happens when it is
// correctly refused, and what it does take when it fires.
//
// Real Postgres because a delete rule is a property of the database. Prisma's
// schema is a claim about it; `information_schema` is the fact, and the two have
// disagreed before (a migration applied by hand, a `migrate diff` that dropped a
// clause). Everything below reads or exercises the live constraint.

/** `child.column -> parent` for every FK, with its ON DELETE rule. */
interface FkEdge {
  child: string
  parent: string
  rule: string
}

async function foreignKeys(): Promise<FkEdge[]> {
  return db.$queryRaw<FkEdge[]>`
    SELECT c.conrelid::regclass::text AS child,
           c.confrelid::regclass::text AS parent,
           CASE c.confdeltype WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL'
                              WHEN 'd' THEN 'SET DEFAULT' WHEN 'r' THEN 'RESTRICT'
                              ELSE 'NO ACTION' END AS rule
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.contype = 'f' AND n.nspname = 'public'`
}

/**
 * Tables no cascade may ever reach, and why. Two kinds:
 *
 *   - a row that is the ONLY record of something outside Postgres. Deleting an
 *     `uploaded_assets` row destroys the sole pointer to an R2 object, which is
 *     then unreachable by the reclaim sweep, by an operator, by anyone —
 *     billed forever and impossible to find. `papers.pdf_key` is the same
 *     object-key problem one table over. This is the exact defect P1-R12 fixed
 *     by moving `uploaded_assets.team_id` off CASCADE, and the exact defect a
 *     cascade added ANYWHERE else would silently reintroduce;
 *   - a row that is the record of an ACCOUNT of something. Membership and class
 *     history, teacher feedback, activity, LLM spend and data requests are what
 *     answers "what happened to this student's work" and "what did this cost".
 *     A parent delete that quietly takes the audit trail with it is how the
 *     answer stops existing.
 *
 * A row here is a deliberate policy statement, not a snapshot: adding an
 * `onDelete: Cascade` that reaches one of these fails this test, which is the
 * point. Deletion of those parents is meant to be a LOUD refusal that a
 * teardown command must handle in order.
 */
const NEVER_CASCADED: Record<string, string> = {
  uploaded_assets: 'the only record of an R2 object (P1-R12)',
  papers: 'papers.pdf_key is an R2 object key',
  activity_feed: 'the record of what a team did',
  teacher_feedback: "the teacher's record, not the student's row",
  ai_usage: 'paid-call accounting',
  team_membership_events: 'append-only authorization log',
  class_membership_events: 'append-only authorization log',
  data_requests: 'the evidence that an erasure ran',
}

describePg('P2-6 — no cascade path can reach an object ledger or an audit trail', () => {
  it('every protected table is unreachable from any parent by CASCADE', async () => {
    const edges = (await foreignKeys()).filter((e) => e.rule === 'CASCADE')
    // Being the CHILD of any cascade edge is enough: a delete of that parent is
    // always reachable somehow, so no transitive walk is needed and none is
    // assumed. Depending on "but that parent is itself protected" would make
    // this guard only as strong as the weakest RESTRICT one hop up.
    const reachable = new Set(edges.map((e) => e.child))
    const breached = [...Object.keys(NEVER_CASCADED)]
      .filter((t) => reachable.has(t))
      .map((t) => `${t} — ${NEVER_CASCADED[t]}`)
    expect(breached, breached.join('\n')).toEqual([])
  })

  it('the protected tables still exist under these names (the guard is not vacuous)', async () => {
    const present = await db.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
    const names = new Set(present.map((r) => r.table_name))
    expect(Object.keys(NEVER_CASCADED).filter((t) => !names.has(t))).toEqual([])
    // And the two object-key columns the storage half is about.
    const cols = await db.$queryRaw<{ table_name: string; column_name: string }[]>`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (table_name = 'uploaded_assets' AND column_name = 'object_key'
          OR table_name = 'papers' AND column_name = 'pdf_key')`
    expect(cols).toHaveLength(2)
  })
})

describePg('P2-6 — deleting a team that still holds storage is refused, not silent', () => {
  it('team.delete rejects and the asset ledger row survives', async () => {
    const doomed = await db.team.create({
      data: { name: `PG Teardown Lab ${ns}`, teamLeadId: userId, phase: 'discovery' },
      select: { id: true },
    })
    const asset = await db.uploadedAsset.create({
      data: {
        teamId: doomed.id,
        userId,
        objectKey: `${ns}/teardown`,
        url: '',
        contentType: 'image/png',
        sizeBytes: 10,
        purpose: 'pg_test',
        status: 'attached',
      },
      select: { id: true },
    })

    // THE ATTACK: an end-of-pilot teardown deletes the team while an object is
    // still in R2. Under CASCADE this succeeds, the ledger row disappears, and
    // the object is orphaned with nothing left pointing at it.
    await expect(db.team.delete({ where: { id: doomed.id } })).rejects.toThrow()
    expect(await db.uploadedAsset.findUnique({ where: { id: asset.id } })).not.toBeNull()

    // Retire the asset first — the order the refusal is teaching — and the team
    // deletes cleanly. A refusal nothing can satisfy would be its own bug.
    await db.uploadedAsset.delete({ where: { id: asset.id } })
    await db.team.delete({ where: { id: doomed.id } })
  })
})

describePg('P2-6 — deleting a paper takes its derived rows and nothing else', () => {
  it('cascades citations/jobs/cards/curations, leaves the asset ledger standing', async () => {
    const paper = await db.paper.create({
      data: {
        teamId,
        title: 'PG lifecycle paper',
        authors: [],
        sourceType: 'pdf',
        pdfKey: `${ns}/lifecycle.pdf`,
        uploadedByUserId: userId,
      },
      select: { id: true },
    })
    await db.citation.create({
      data: { paperId: paper.id, teamId, apa: 'a', mla: 'm', ieee: 'i' },
    })
    await db.paperProcessingJob.create({ data: { paperId: paper.id } })
    await db.vocabPaperCuration.create({ data: { paperId: paper.id, userId } })
    await db.vocabCard.create({
      data: {
        userId,
        teamId,
        paperId: paper.id,
        termKey: `lifecycle_${ns}`,
        term: 'lifecycle',
        definition: 'd',
        source: 'llm_definition',
        box: 1,
        dueAt: new Date(),
      },
    })
    // The ledger row for that paper's PDF. It carries no FK to `papers` — the
    // binding is `attachedToType`/`attachedToId` — precisely so the record of
    // the object outlives the row that referenced it and the reclaim sweep can
    // still find it (`reconcileOrphanedAssets`).
    const asset = await db.uploadedAsset.create({
      data: {
        teamId,
        userId,
        objectKey: `${ns}/lifecycle.pdf`,
        url: '',
        contentType: 'application/pdf',
        sizeBytes: 10,
        purpose: 'paper_pdf',
        status: 'attached',
        attachedToType: 'paper',
        attachedToId: paper.id,
      },
      select: { id: true },
    })

    await db.paper.delete({ where: { id: paper.id } })

    expect(await db.citation.count({ where: { paperId: paper.id } })).toBe(0)
    expect(await db.paperProcessingJob.count({ where: { paperId: paper.id } })).toBe(0)
    expect(await db.vocabPaperCuration.count({ where: { paperId: paper.id } })).toBe(0)
    expect(await db.vocabCard.count({ where: { paperId: paper.id } })).toBe(0)
    // THE ATTACK: if this row went with the paper, the PDF in R2 becomes
    // untracked and permanently unbillable-to-anyone.
    const survivor = await db.uploadedAsset.findUnique({
      where: { id: asset.id },
      select: { status: true, objectKey: true },
    })
    expect(survivor).toMatchObject({ status: 'attached' })
  })
})

describePg('P2-6 — a personal notification never becomes a broadcast', () => {
  it('deleting its subject deletes the notice instead of re-addressing it to the team', async () => {
    const { GET } = await import('@/app/api/notifications/route')
    const subject = await db.user.create({
      data: {
        clerkUserId: `clerk_${ns}_subject`,
        name: 'PG Erased Student',
        email: `${ns}-subject@invariants.test`,
        role: 'student',
      },
      select: { id: true },
    })
    await db.notification.create({
      data: {
        teamId, // the team they were removed FROM — the row still names it
        userId: subject.id,
        kind: 'membership_changed',
        title: 'PG private removal notice',
        body: 'Your teacher un-enrolled you.',
        dedupeKey: `pg_private_${ns}`,
      },
    })

    const titlesForFixtureMember = async () => {
      clerkState.userId = `clerk_${ns}`
      const body = (await (await get(GET)).json()) as { items: Array<{ title: string }> }
      return body.items.map((i) => i.title)
    }
    expect(await titlesForFixtureMember()).not.toContain('PG private removal notice')

    // THE ATTACK: an end-of-pilot teardown (or any raw delete outside the
    // erasure workflow) removes the student. Under the implicit SET NULL,
    // `user_id` becomes NULL — which on this table does not mean "nobody", it
    // means TEAM-WIDE — and every remaining member's bell now shows a private
    // notice about a classmate.
    await db.user.delete({ where: { id: subject.id } })

    // The harm first, the mechanism second: assert what the teammate can SEE
    // before asserting the row is gone, so a regression reports the disclosure
    // rather than a row count.
    expect(await titlesForFixtureMember()).not.toContain('PG private removal notice')
    expect(await db.notification.count({ where: { dedupeKey: `pg_private_${ns}` } })).toBe(0)
  })

  it('a team-wide notice is untouched when an unrelated user is deleted', async () => {
    // The other half: cascading on `user_id` must not reach rows that were
    // team-wide to begin with (`user_id` already NULL).
    await db.notification.create({
      data: {
        teamId,
        userId: null,
        kind: 'teacher_feedback',
        title: 'PG survives-deletion notice',
        body: 'body',
        dedupeKey: `pg_survives_${ns}`,
      },
    })
    const bystander = await db.user.create({
      data: {
        clerkUserId: `clerk_${ns}_bystander`,
        name: 'PG Bystander',
        email: `${ns}-bystander@invariants.test`,
        role: 'student',
      },
      select: { id: true },
    })
    await db.user.delete({ where: { id: bystander.id } })

    expect(await db.notification.count({ where: { dedupeKey: `pg_survives_${ns}` } })).toBe(1)
  })
})

describePg('HANDOFF #4/#5 — a notice reaches a student with no live team', () => {
  it('both shapes of an end-of-membership notice are readable with no team', async () => {
    const { GET } = await import('@/app/api/notifications/route')
    const orphan = await db.user.create({
      data: {
        clerkUserId: `clerk_${ns}_orphan`,
        name: 'PG Removed Student',
        email: `${ns}-orphan@invariants.test`,
        role: 'student',
      },
      select: { id: true },
    })
    await db.notification.createMany({
      data: [
        {
          // #4: removed from a class while holding no team at all — there was
          // no row that could be written, `team_id` being NOT NULL.
          teamId: null,
          userId: orphan.id,
          kind: 'membership_changed',
          title: 'PG class removal notice',
          body: 'Your teacher un-enrolled you.',
          dedupeKey: `pg_orphan_class_${ns}`,
        },
        {
          // #5: removed from a TEAM. The row could be written and was still
          // unreadable — the bell filtered on the team the reader is on, which
          // is precisely the team they just left.
          teamId,
          userId: orphan.id,
          kind: 'membership_changed',
          title: 'PG team removal notice',
          body: 'You were removed from the lab.',
          dedupeKey: `pg_orphan_team_${ns}`,
        },
      ],
    })

    clerkState.userId = `clerk_${ns}_orphan`
    const res = await get(GET)
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      unreadCount: number
      items: Array<{ title: string }>
    }
    expect(body.items.map((i) => i.title).sort()).toEqual([
      'PG class removal notice',
      'PG team removal notice',
    ])
    expect(body.unreadCount).toBe(2)

    clerkState.userId = `clerk_${ns}`
  })

  it('a team-wide notice is NOT visible to someone who is not on that team', async () => {
    // The other half of the same predicate: widening it to reach a removed
    // student must not turn the bell into a cross-team read.
    const { GET } = await import('@/app/api/notifications/route')
    await db.notification.create({
      data: {
        teamId,
        userId: null,
        kind: 'teacher_feedback',
        title: 'PG team-only notice',
        body: 'body',
        dedupeKey: `pg_teamonly_${ns}`,
      },
    })

    clerkState.userId = `clerk_${ns}_orphan`
    const body = (await (await get(GET)).json()) as { items: Array<{ title: string }> }
    expect(body.items.map((i) => i.title)).not.toContain('PG team-only notice')

    clerkState.userId = `clerk_${ns}`
  })
})
