import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserContext } from '@/lib/api/route-context'
import { fetchWithRetry, readJsonCapped } from '@/lib/fetch-retry'
import { parseJson } from '@/lib/validation'

const ResolveBody = z.object({ url: z.string().trim().min(1).max(2000) }).strict()

/**
 * oEmbed's answer, PARSED before the title reaches the caller — the old
 * `data.title` read was a `.json()` with no shape check at all, so a non-string
 * title (or a body of any size) went straight into the response the client
 * stores and renders. Only `title` is ours to care about; the rest of oEmbed's
 * envelope stays unconstrained.
 */
const OEmbed = z.object({ title: z.string().trim().min(1).max(300) }).passthrough()

/** oEmbed's JSON is a few hundred bytes; 64 KB is headroom. */
const MAX_BODY_BYTES = 64 * 1024

// Extracts a YouTube video ID from any common URL shape.
function extractVideoId(input: string): string | null {
  const url = input.trim()
  // Bare 11-char id
  if (/^[\w-]{11}$/.test(url)) return url
  const patterns = [
    /[?&]v=([\w-]{11})/, // watch?v=ID
    /youtu\.be\/([\w-]{11})/, // youtu.be/ID
    /youtube\.com\/embed\/([\w-]{11})/, // embed/ID
    /youtube\.com\/shorts\/([\w-]{11})/, // shorts/ID
    /youtube\.com\/live\/([\w-]{11})/, // live/ID
  ]
  for (const re of patterns) {
    const m = url.match(re)
    if (m) return m[1]
  }
  return null
}

// Resolves a pasted YouTube URL → { videoId, title } using the public oEmbed
// endpoint (no API key, no quota). Done server-side to avoid CORS.
export async function POST(req: NextRequest) {
  // Mutating + triggers an external oEmbed fetch — moderate per-user + per-IP limit.
  const { error: guardError } = await requireUserContext(req, { tier: 'mutate' })
  if (guardError) return guardError

  const { data, error } = await parseJson(req, ResolveBody)
  if (error) return error
  const { url } = data

  const videoId = extractVideoId(url)
  if (!videoId) {
    return NextResponse.json({ error: "That doesn't look like a YouTube link" }, { status: 422 })
  }

  let title = 'YouTube video'
  try {
    const oembed = await fetchWithRetry(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`,
      )}&format=json`,
      {
        headers: { Accept: 'application/json' },
        // Bounded wait — a slow oEmbed endpoint must not hold the request open;
        // the catch below falls back to the generic title. One attempt, as
        // before: the title is a nicety, not worth three round-trips.
        timeoutMs: 5_000,
        attempts: 1,
        contentTypes: ['application/json'],
      },
    )
    if (oembed.ok) {
      const parsed = OEmbed.safeParse(await readJsonCapped(oembed, MAX_BODY_BYTES))
      if (parsed.success) title = parsed.data.title
    }
  } catch {
    // Non-fatal — fall back to the generic title; the video still embeds by id.
  }

  return NextResponse.json({ videoId, title })
}
