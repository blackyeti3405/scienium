import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/about(.*)', // Public outreach/landing page — no auth required
  '/pvp', // Marketing explainer for the Battle Arena — exact match only, not /pvp/lobby etc.
  '/teachers', // Marketing explainer for the teacher dashboard — distinct from /teacher(.*)
  '/robots.txt', // Crawler directives — must be reachable unauthenticated
  '/sitemap.xml', // Sitemap — same
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/showcase/(.*)', // Public showcase pages
  '/api/showcase/public/(.*)', // Privacy-checked public asset streaming
  '/api/cron/(.*)', // Scheduled jobs — authenticated by CRON_SECRET, not a session
  '/api/webhooks/(.*)', // Provider callbacks — authenticated by signature, not a session
  '/monitoring(.*)', // Sentry tunnel route — browser error reports arrive pre-auth too
  // E2E preflight probe. The route itself 404s unless the process was started
  // with E2E_SKIP_LLM=1, so it does not exist in production; it has to be
  // reachable pre-auth because the preflight runs before any sign-in.
  '/api/dev/e2e-health',
])

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return
  const { userId, redirectToSignIn } = await auth()
  if (userId) return

  // An /api/* request is FETCHED, never navigated to. Answering it with a 307 to
  // the sign-in page made `fetch` follow the redirect and hand the caller back a
  // 200 carrying 37KB of sign-in HTML — so `res.ok` was true and every
  // `res.json()` in the app died on "<!DOCTYPE" ("Failed to execute 'json' on
  // 'Response'") instead of reading a status it could act on. Answer the caller
  // in its own content type; only real navigations get redirected.
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return redirectToSignIn()
})

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
