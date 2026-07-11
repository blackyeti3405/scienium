import type { APIRequestContext, APIResponse, Browser, Page } from '@playwright/test'
import { STORAGE, type Role } from './roles'

const BASE_URL = `http://localhost:${process.env.E2E_PORT ?? 3000}`
const LANDING: Record<Role, string> = { leader: '/lab', student: '/lab', teacher: '/teacher' }

/**
 * Clerk's session JWT (the `__session` cookie) is short-lived and only
 * refreshes when clerk-js runs inside a live page. Playwright's saved
 * `storageState` is a frozen snapshot, so a `page.request.*` call made long
 * enough after the last navigation carries a stale token and gets silently
 * redirected to sign-in (307, not 401 — see middleware.ts) instead of
 * returning JSON. `page.request` shares the browsing context's cookie jar
 * with `page`, so refreshing the token from inside the page — no
 * navigation, no lost DOM/app state — keeps every call below fresh
 * automatically.
 */
async function refreshClerkSession(page: Page): Promise<void> {
  try {
    // Wait (bounded) for clerk-js to boot a session on a just-navigated page. Without
    // this, `getToken` runs before `window.Clerk.session` exists, silently no-ops, and
    // the request rides the frozen storageState token — which 307s to /sign-in once its
    // ~60s TTL lapses (Playwright then follows the redirect and reads a 200 sign-in page).
    await page
      .waitForFunction(() => Boolean((window as { Clerk?: { session?: unknown } }).Clerk?.session), null, {
        timeout: 5_000,
      })
      .catch(() => {})
    await page.evaluate(async () => {
      const clerk = (window as unknown as {
        Clerk?: { session?: { getToken(opts: { skipCache: boolean }): Promise<unknown> } }
      }).Clerk
      await clerk?.session?.getToken({ skipCache: true })
    })
  } catch {
    // No live Clerk instance on this page (e.g. a pre-navigation blank page) — nothing to refresh.
  }
}

async function refreshed<T>(page: Page, run: () => Promise<T>): Promise<T> {
  await refreshClerkSession(page)
  return run()
}

type GetOpts = Parameters<APIRequestContext['get']>[1]
type PostOpts = Parameters<APIRequestContext['post']>[1]
type PutOpts = Parameters<APIRequestContext['put']>[1]
type PatchOpts = Parameters<APIRequestContext['patch']>[1]
type DeleteOpts = Parameters<APIRequestContext['delete']>[1]

/**
 * Authenticated requests against the test's own `page`. Use these instead of
 * `page.request.*` so every call refreshes the Clerk session first and can't
 * silently 307 to sign-in mid-spec.
 */
export const api = {
  get: (page: Page, url: string, opts?: GetOpts): Promise<APIResponse> =>
    refreshed(page, () => page.request.get(url, opts)),
  post: (page: Page, url: string, opts?: PostOpts): Promise<APIResponse> =>
    refreshed(page, () => page.request.post(url, opts)),
  put: (page: Page, url: string, opts?: PutOpts): Promise<APIResponse> =>
    refreshed(page, () => page.request.put(url, opts)),
  patch: (page: Page, url: string, opts?: PatchOpts): Promise<APIResponse> =>
    refreshed(page, () => page.request.patch(url, opts)),
  delete: (page: Page, url: string, opts?: DeleteOpts): Promise<APIResponse> =>
    refreshed(page, () => page.request.delete(url, opts)),
}

/**
 * Run a seed/cleanup routine with a FRESH authenticated page. `beforeAll`/`afterAll`
 * have no `page` fixture, and a raw `request.newContext({ storageState })` carries a
 * frozen Clerk token that 307-redirects to /sign-in once its short (~60s) TTL lapses —
 * the seed then parses an HTML sign-in page as JSON and throws
 * `Unexpected token '<'`. This opens a real page (so clerk-js can mint a fresh token),
 * navigates to the role's landing surface, hands the page to `fn` (use `api.*` on it,
 * which re-refreshes before every call), and always tears the context down.
 *
 * Seeders written against a request context (`ctx.get/post/...`) port over by taking
 * a `page` and swapping `ctx.` for `api.`(page, ...)`.
 */
export async function withSeedPage<T>(
  browser: Browser,
  role: Role,
  fn: (page: Page) => Promise<T>,
): Promise<T> {
  const context = await browser.newContext({ storageState: STORAGE[role], baseURL: BASE_URL })
  const page = await context.newPage()
  try {
    await page.goto(LANDING[role])
    return await fn(page)
  } finally {
    await context.close()
  }
}

// Smallest valid PNG (1×1, transparent). sharp decodes it, so the attachment
// upload route accepts it as a real image.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

/**
 * Upload a real (tiny) image via the project-log attachment route and return its
 * view URL. Use this instead of fabricating an attachment URL: a log POST now
 * requires each referenced attachment to be a genuine upload (team-prefixed object
 * key + a `temporary` UploadedAsset ledger row), so a made-up URL is rejected 400/409.
 */
export async function uploadLogAttachment(page: Page): Promise<string> {
  const res = await api.post(page, '/api/project-log/attachment', {
    multipart: { file: { name: 'e2e-seed.png', mimeType: 'image/png', buffer: TINY_PNG } },
  })
  if (!res.ok()) {
    throw new Error(`Attachment upload failed while seeding: ${res.status()} ${await res.text()}`)
  }
  const { url } = (await res.json()) as { url: string }
  return url
}
