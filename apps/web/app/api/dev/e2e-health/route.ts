import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/dev/e2e-health — "is this the server the E2E suite thinks it is?"
 *
 * The route EXISTS ONLY when the process was started with `E2E_SKIP_LLM=1`;
 * anything else — including a production deploy — answers 404. That is the
 * whole design: its presence is the signal, so the preflight cannot be fooled
 * by a server that merely looks similar.
 *
 * ## The failure it prevents
 *
 * `playwright.config.ts` sets `E2E_SKIP_LLM` and `E2E_MOCK_SOURCES` in the
 * RUNNER process, and the server it spawns inherits them. It also sets
 * `reuseExistingServer: !CI`. So a dev server already listening on the port —
 * one started by hand, or by an editor's preview tool — gets reused **without
 * the stub flags**, and the suite silently starts making real, paid Anthropic
 * calls and hitting live third-party APIs. The symptom is not "misconfigured":
 * it is a 502 from a real model reply that missed a strict schema, which reads
 * exactly like a code regression in the route. That cost a debugging session
 * and real money on 2026-07-26.
 *
 * ## The database fingerprint
 *
 * The test runner talks to PostgreSQL directly (`e2e/db.ts`) while the server
 * has its own `DATABASE_URL`. When those differ, seeds land in one database and
 * assertions read another — every spec fails on "fixture not found" and the
 * cause is invisible. The fingerprint is a hash of the server's database
 * identity, never the URL, so it can be compared without exposing a credential.
 */
export async function GET() {
  if (process.env.E2E_SKIP_LLM !== '1') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const [row] = await db.$queryRaw<{ fp: string }[]>`
    SELECT md5(
      current_database() || ':' ||
      coalesce(host(inet_server_addr()), 'local') || ':' ||
      coalesce(inet_server_port()::text, '?')
    ) AS fp`

  return NextResponse.json({
    e2e: true,
    skipLlm: true,
    mockSources: process.env.E2E_MOCK_SOURCES === '1',
    nodeEnv: process.env.NODE_ENV,
    dbFingerprint: row?.fp ?? null,
    // Which source the Data Terminal runtime proxy will serve from. Reported
    // because `next start` is production mode, so `.env.production.local` — a
    // file that on a maintainer's machine holds the real production
    // environment — outranks `.env.local` and can point this at R2, where the
    // wheels may not exist. The whole Lab/Code lane then fails as a 150s
    // timeout per spec with no error anywhere: the fetches happen inside a Web
    // Worker, so nothing reaches the page console.
    pyodideSource: process.env.PYODIDE_SOURCE ?? '(unset — falls back to local cache if present)',
  })
}
