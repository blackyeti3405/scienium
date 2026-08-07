import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * A signed-out `/api/*` request must be answered with JSON, never a redirect.
 *
 * The regression this locks down (2026-08-06): middleware answered every
 * unauthenticated request with `redirectToSignIn()`. For a *navigation* that is
 * right, but `/api/*` is reached by `fetch`, which FOLLOWS the 307 and hands the
 * caller back a 200 carrying the sign-in page's HTML. So `res.ok` was true and
 * `await res.json()` died on "<!DOCTYPE" — surfacing to users as the raw
 * "Failed to execute 'json' on 'Response'" during account creation, and doing
 * the same to ~30 other bare `res.json()` call sites across the app.
 *
 * `clerkMiddleware` is mocked to hand back the handler it was given, so this
 * exercises OUR branch rather than Clerk's wrapper.
 */
const redirectToSignIn = vi.fn(
  () => new Response(null, { status: 307, headers: { location: '/sign-in' } }),
)

// `clerkMiddleware(handler)` hands the handler back untouched, so the default
// export IS our handler and keeps Clerk's real `(auth, req)` signature.
vi.mock('@clerk/nextjs/server', () => ({
  clerkMiddleware: (handler: unknown) => handler,
  createRouteMatcher: (patterns: string[]) => (req: NextRequest) => {
    const path = new URL(req.url).pathname
    return patterns.some((p) => new RegExp(`^${p.replace(/\(\.\*\)/g, '.*')}$`).test(path))
  },
}))

const { default: middleware } = await import('@/middleware')

type Handler = (
  auth: () => Promise<{ userId: string | null; redirectToSignIn: () => Response }>,
  req: NextRequest,
) => Promise<Response | undefined>

// Every request in this file is signed out — the case that used to answer with
// HTML where the caller expected JSON.
// Through `unknown`: the real export is typed `NextMiddleware` — the mock is what
// strips Clerk's wrapper and leaves the bare `(auth, req)` handler behind.
const call = (path: string, method = 'GET') =>
  (middleware as unknown as Handler)(
    async () => ({ userId: null, redirectToSignIn }),
    new NextRequest(`http://localhost:3000${path}`, { method }),
  )

describe('middleware: unauthenticated /api/* answers JSON, not HTML', () => {
  it('returns a 401 with a JSON body the caller can parse', async () => {
    const res = await call('/api/onboarding', 'POST')
    expect(res?.status).toBe(401)
    expect(res?.headers.get('content-type')).toContain('application/json')
    await expect(res!.json()).resolves.toEqual({ error: 'Unauthorized' })
  })

  it('does not redirect an API request', async () => {
    const res = await call('/api/team/join', 'POST')
    // A 3xx here is the bug: `fetch` would follow it into the sign-in HTML.
    const isRedirect = res!.status >= 300 && res!.status < 400
    expect(isRedirect).toBe(false)
    expect(res?.headers.get('location')).toBeNull()
    expect(redirectToSignIn).not.toHaveBeenCalled()
  })

  it('still redirects real page navigations to sign-in', async () => {
    redirectToSignIn.mockClear()
    const res = await call('/dashboard')
    expect(redirectToSignIn).toHaveBeenCalled()
    expect(res?.status).toBe(307)
  })

  it('leaves public routes alone', async () => {
    redirectToSignIn.mockClear()
    expect(await call('/sign-in')).toBeUndefined()
    expect(redirectToSignIn).not.toHaveBeenCalled()
  })
})
