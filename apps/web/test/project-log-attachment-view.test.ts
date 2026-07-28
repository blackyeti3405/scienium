import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `app/api/project-log/attachment/view/route.ts` — zero direct tests (audit §3).
 *
 * It streams PRIVATE R2 bytes and has two authorization paths:
 *
 *  - `?id=` — the canonical one (SEC-6). The `UploadedAsset` ledger row is what
 *    authorizes the read, scoped by `teamId` and excluding `status: 'deleted'`.
 *  - `?key=` — legacy log rows saved before id-URLs, guarded ONLY by
 *    `!key.includes('..') && key.startsWith('log-attachments/<teamId>/')`.
 *
 * That second guard is one boolean expression standing between a student and
 * another team's private uploads, and it is exactly the branch a cleanup
 * refactor deletes as "dead legacy code". Every clause of it is exercised here.
 */

let assets: { id: string; teamId: string; objectKey: string; status: string }[]
let fetched: string[]

const mocks = vi.hoisted(() => ({ requireTeamContext: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/api/route-context', () => ({ requireTeamContext: mocks.requireTeamContext }))
vi.mock('@/lib/storage', () => ({
  getObjectStream: async (key: string) => {
    fetched.push(key)
    return { body: 'BYTES', contentLength: 5, contentType: 'image/png' }
  },
}))

function matches(row: Record<string, unknown>, where: any): boolean {
  for (const [field, cond] of Object.entries(where ?? {})) {
    const actual = row[field]
    if (cond !== null && typeof cond === 'object') {
      if ((cond as any).not !== undefined && actual === (cond as any).not) return false
      continue
    }
    if (actual !== cond) return false
  }
  return true
}

vi.mock('@/lib/db', () => ({
  db: {
    uploadedAsset: {
      findFirst: async ({ where }: any) => assets.find((a) => matches(a, where)) ?? null,
    },
  },
}))

const { GET } = await import('@/app/api/project-log/attachment/view/route')

const viewReq = (query: string) =>
  new NextRequest(`http://app.example.com/api/project-log/attachment/view?${query}`)

beforeEach(() => {
  vi.clearAllMocks()
  fetched = []
  assets = [
    { id: 'a_mine', teamId: 'team_1', objectKey: 'log-attachments/team_1/photo.png', status: 'attached' },
    { id: 'a_theirs', teamId: 'team_2', objectKey: 'log-attachments/team_2/secret.png', status: 'attached' },
    { id: 'a_gone', teamId: 'team_1', objectKey: 'log-attachments/team_1/old.png', status: 'deleted' },
  ]
  mocks.requireTeamContext.mockResolvedValue({
    ctx: { teamId: 'team_1', dbUserId: 'user_1', userId: 'clerk_1' },
    error: null,
  })
})

describe('the guard runs before anything is read', () => {
  it('an unauthenticated caller gets the guard error and no object is fetched', async () => {
    mocks.requireTeamContext.mockResolvedValue({
      ctx: null,
      error: new Response('no', { status: 401 }),
    })

    expect((await GET(viewReq('id=a_mine'))).status).toBe(401)
    expect(fetched).toEqual([])
  })
})

describe('?id= — the ledger row authorizes the read', () => {
  it('streams the team’s own asset with the private, non-executable headers', async () => {
    const res = await GET(viewReq('id=a_mine'))

    expect(res.status).toBe(200)
    expect(fetched).toEqual(['log-attachments/team_1/photo.png'])
    expect(res.headers.get('content-type')).toBe('image/png')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('content-security-policy')).toBe("default-src 'none'; sandbox")
    expect(res.headers.get('cache-control')).toBe('private, max-age=86400')
  })

  it('404s on ANOTHER team’s asset id — and never touches storage', async () => {
    // Two layers refuse this: the ledger `where` is team-scoped, and the
    // objectKey would fail the prefix guard below anyway.
    const res = await GET(viewReq('id=a_theirs'))

    expect(res.status).toBe(404)
    expect(fetched).toEqual([])
  })

  it('the LEDGER scope refuses on its own, without help from the prefix guard', async () => {
    // A row owned by team_2 whose objectKey happens to sit under team_1's
    // prefix. That state should not arise — which is why it is the case that
    // isolates the `teamId` clause: the prefix guard would wave this through,
    // so only the ledger `where` can refuse it.
    assets.push({
      id: 'a_crossed',
      teamId: 'team_2',
      objectKey: 'log-attachments/team_1/crossed.png',
      status: 'attached',
    })

    expect((await GET(viewReq('id=a_crossed'))).status).toBe(404)
    expect(fetched).toEqual([])
  })

  it('404s on a deleted asset even though the row still exists', async () => {
    expect((await GET(viewReq('id=a_gone'))).status).toBe(404)
    expect(fetched).toEqual([])
  })

  it('404s on an unknown id', async () => {
    expect((await GET(viewReq('id=nope'))).status).toBe(404)
    expect(fetched).toEqual([])
  })
})

describe('?key= — the legacy prefix guard', () => {
  it('serves a key under the caller team’s own prefix', async () => {
    const res = await GET(viewReq('key=log-attachments%2Fteam_1%2Flegacy.png'))

    expect(res.status).toBe(200)
    expect(fetched).toEqual(['log-attachments/team_1/legacy.png'])
  })

  it('REFUSES another team’s prefix — this is the cross-team private-file read', async () => {
    const res = await GET(viewReq('key=log-attachments%2Fteam_2%2Fsecret.png'))

    expect(res.status).toBe(404)
    expect(fetched).toEqual([])
  })

  it('refuses a traversal that would climb out of the team prefix', async () => {
    const res = await GET(viewReq('key=log-attachments%2Fteam_1%2F..%2F..%2Fteam_2%2Fsecret.png'))

    expect(res.status).toBe(404)
    expect(fetched).toEqual([])
  })

  it('refuses a team id that merely PREFIXES the caller’s — no sibling-tenant read', async () => {
    // `team_1` vs `team_10`: a `startsWith` without the trailing slash would
    // let team_1 read team_10's uploads.
    mocks.requireTeamContext.mockResolvedValue({
      ctx: { teamId: 'team_1', dbUserId: 'user_1', userId: 'clerk_1' },
      error: null,
    })
    const res = await GET(viewReq('key=log-attachments%2Fteam_10%2Fsecret.png'))

    expect(res.status).toBe(404)
    expect(fetched).toEqual([])
  })

  it('refuses a key outside the log-attachments namespace entirely', async () => {
    for (const key of [
      'showcase-assets%2Fteam_1%2Fboard.pdf',
      'data-exports%2Fteam_1.json',
      '%2Fetc%2Fpasswd',
    ]) {
      expect((await GET(viewReq(`key=${key}`))).status).toBe(404)
    }
    expect(fetched).toEqual([])
  })

  it('404s when neither id nor key is supplied', async () => {
    expect((await GET(viewReq(''))).status).toBe(404)
    expect(fetched).toEqual([])
  })
})

describe('a storage failure', () => {
  it('502s rather than leaking the provider error to the student', async () => {
    const storage = (await import('@/lib/storage')) as any
    const real = storage.getObjectStream
    // eslint-disable-next-line no-console
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(storage, 'getObjectStream').mockRejectedValue(new Error('r2 down: bucket nova-lab'))
    try {
      const res = await GET(viewReq('id=a_mine'))
      expect(res.status).toBe(502)
      expect(await res.json()).toEqual({ error: 'Not available' })
    } finally {
      spy.mockRestore()
      storage.getObjectStream = real
      vi.restoreAllMocks()
    }
  })
})
