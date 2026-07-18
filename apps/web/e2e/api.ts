import type { APIRequestContext, APIResponse, Browser, Page } from '@playwright/test'
import { clerk, clerkSetup, setupClerkTestingToken } from '@clerk/testing/playwright'
import { STORAGE, getAccounts, type Role } from './roles'

const BASE_URL = `http://localhost:${process.env.E2E_PORT ?? 3000}`
const LANDING: Record<Role, string> = { leader: '/lab', student: '/lab', teacher: '/teacher' }

/**
 * Which role a page is signed in as, so session recovery can re-authenticate
 * with the right credentials. `withSeedPage` registers its role; the default
 * `chromium` project's `page` fixture always carries the leader storageState
 * (see playwright.config.ts), so 'leader' is the correct fallback.
 */
const PAGE_ROLE = new WeakMap<Page, Role>()

/**
 * Register which role a page is signed in as. `withSeedPage` does this
 * automatically; specs whose MAIN `page` fixture is not the leader (e.g. a
 * `test.use({ storageState: STORAGE.teacher })` block) must call this in
 * `beforeEach` so session recovery re-authenticates with the right account.
 */
export function registerPageRole(page: Page, role: Role): void {
  PAGE_ROLE.set(page, role)
}

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

/**
 * A stale-session request doesn't fail — middleware 307s it to /sign-in and
 * Playwright follows, so the caller sees `ok() === true` with an HTML page
 * where JSON was expected (`Unexpected token '<'` at parse time). Two tells,
 * either sufficient:
 *  - the final URL landed on /sign-in (the redirect chain can also continue
 *    PAST /sign-in to a landing page, so this alone is not enough);
 *  - the call targeted an /api/ route but the response is text/html — no API
 *    route in this app ever legitimately answers HTML, so an HTML body means
 *    the request was redirected somewhere else entirely.
 */
function staleSessionResponse(requestedUrl: string, res: APIResponse): boolean {
  if (res.url().includes('/sign-in')) return true
  const requestedPath = new URL(requestedUrl, BASE_URL).pathname
  if (!requestedPath.startsWith('/api/')) return false
  const contentType = res.headers()['content-type'] ?? ''
  return contentType.includes('text/html')
}

/** Bounded wait for clerk-js to boot a live session on the current document. */
async function waitForClerkSession(page: Page, timeout: number): Promise<void> {
  await page
    .waitForFunction(() => Boolean((window as { Clerk?: { session?: unknown } }).Clerk?.session), null, {
      timeout,
    })
    .catch(() => {})
}

/**
 * Strongest available recovery: a real navigation reboots clerk-js, which
 * rotates the `__session` cookie shared with `page.request`. The pre-call
 * `refreshClerkSession` can silently no-op (clerk-js wedged or never booted on
 * this page); a reload cannot.
 *
 * The reload's own document request rides the SAME stale cookie, so middleware
 * may bounce the page to /sign-in, where clerk-js (whose client session is
 * still valid) auto-returns to the app. Retrying before that chain settles
 * re-sends the stale cookie and fails identically — so wait for a live Clerk
 * session, and if the page is still parked on /sign-in, hop back to the app
 * URL explicitly before refreshing the token.
 */
async function forceSessionRecovery(page: Page): Promise<void> {
  try {
    const target = page.url()
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
    await waitForClerkSession(page, 10_000)
    if (page.url().includes('/sign-in') && !target.includes('/sign-in')) {
      await page.goto(target, { waitUntil: 'domcontentloaded' }).catch(() => {})
      await waitForClerkSession(page, 10_000)
    }
  } catch {
    // Blank or closed page — the plain refresh below is the best remaining shot.
  }
  await refreshClerkSession(page)
}

/**
 * Last-resort recovery: a full programmatic re-sign-in with the page's role
 * credentials — the same supported @clerk/testing path auth.setup.ts uses.
 * Reached only when clerk-js could not refresh the session at all (observed on
 * dev instances deep into long serial files: the reload's own document request
 * bounces to /sign-in and the token refresh never lands). Navigates the page,
 * so any DOM state is lost — acceptable, since every request from this page
 * would otherwise fail.
 */
async function reauthenticate(page: Page): Promise<void> {
  const role = PAGE_ROLE.get(page) ?? 'leader'
  const acct = getAccounts().find((a) => a.role === role)!
  console.warn(`[e2e/api] session unrecoverable — re-signing in programmatically as ${role}`)
  // The Testing Token is normally minted by auth.setup.ts's clerkSetup, which
  // runs in a different worker process — fetch one here if this worker lacks it.
  if (!process.env.CLERK_TESTING_TOKEN) {
    await clerkSetup({ publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY })
  }
  await setupClerkTestingToken({ page })
  await page.goto('/')
  await clerk.signOut({ page }).catch(() => {}) // a half-dead session blocks signIn
  await clerk.signIn({
    page,
    signInParams: { strategy: 'password', identifier: acct.identifier, password: acct.password },
  })
}

async function refreshed(
  page: Page,
  url: string,
  run: () => Promise<APIResponse>,
): Promise<APIResponse> {
  await refreshClerkSession(page)
  let res = await run()
  if (!staleSessionResponse(url, res)) return res

  // Escalating, loudly-logged recovery. Mutations are safe to retry here — a
  // stale-session request never reached its route (the auth middleware
  // redirected it away). A genuinely broken account still fails loudly:
  // clerk.signIn throws on bad credentials, and a stale response after all
  // recovery attempts fails in the caller exactly as before.
  console.warn(
    `[e2e/api] stale Clerk session — ${url} answered from ${res.url()} as ${
      res.headers()['content-type'] ?? 'unknown'
    }; reloading page and retrying`,
  )
  await forceSessionRecovery(page)
  res = await run()
  if (!staleSessionResponse(url, res)) return res

  await reauthenticate(page)
  return run()
}

/**
 * Navigate with a verified-fresh session. A stale `__session` cookie bounces
 * the DOCUMENT request through /sign-in, and Clerk's auto-return lands on the
 * fallback surface (/lab) instead of the requested page — the spec then fails
 * on a visibility assertion while sitting on the wrong URL. Refresh before
 * navigating, verify the final path, and re-sign-in + retry once if the
 * navigation was hijacked. Use for leader-page navigations that follow a long
 * detour (e.g. a `withSeedPage` teacher block) in long serial files.
 */
export async function gotoFresh(page: Page, url: string): Promise<void> {
  await refreshClerkSession(page)
  await page.goto(url)
  const targetPath = new URL(url, BASE_URL).pathname
  if (new URL(page.url()).pathname !== targetPath) {
    console.warn(
      `[e2e/api] navigation to ${url} landed on ${page.url()} (stale session) — re-signing in and retrying`,
    )
    await reauthenticate(page)
    await page.goto(url)
  }
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
    refreshed(page, url, () => page.request.get(url, opts)),
  post: (page: Page, url: string, opts?: PostOpts): Promise<APIResponse> =>
    refreshed(page, url, () => page.request.post(url, opts)),
  put: (page: Page, url: string, opts?: PutOpts): Promise<APIResponse> =>
    refreshed(page, url, () => page.request.put(url, opts)),
  patch: (page: Page, url: string, opts?: PatchOpts): Promise<APIResponse> =>
    refreshed(page, url, () => page.request.patch(url, opts)),
  delete: (page: Page, url: string, opts?: DeleteOpts): Promise<APIResponse> =>
    refreshed(page, url, () => page.request.delete(url, opts)),
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
  PAGE_ROLE.set(page, role) // so session recovery re-signs-in with the right account
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
