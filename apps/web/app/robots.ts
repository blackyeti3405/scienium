import type { MetadataRoute } from 'next'

/**
 * Disallows crawling of every authenticated/private route (dashboard, lab,
 * teacher panels, API, etc.) — none of it has value indexed, and the app
 * already 501s/redirects unauthenticated requests anyway. Allows the real
 * public surfaces: the two marketing pages and the Showcase Wing.
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/about', '/showcase', '/pvp'],
      disallow: [
        '/dashboard',
        '/game',
        '/lab',
        '/onboarding',
        '/daily',
        '/discovery',
        '/literature',
        '/pvp/',
        '/research-plan',
        '/fair-hub',
        '/settings',
        '/teacher',
        '/api',
        '/sign-in',
        '/sign-up',
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  }
}
