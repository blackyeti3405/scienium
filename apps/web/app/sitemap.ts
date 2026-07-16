import type { MetadataRoute } from 'next'

/**
 * Static top-level public routes only. Individual showcase pages
 * (/showcase/[slug]) are real public content too, but listing them requires
 * querying the DB for every public+approved showcase — a bigger, DB-touching
 * change better done as its own reviewed piece rather than folded in here.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const now = new Date()
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/showcase/gallery`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
  ]
}
