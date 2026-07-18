import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'

const ResolveBody = z.object({ url: z.string().trim().min(1).max(2000) }).strict()

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
    const oembed = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`,
      )}&format=json`,
      // Bounded wait — a slow oEmbed endpoint must not hold the request open;
      // the catch below falls back to the generic title.
      { cache: 'no-store', signal: AbortSignal.timeout(5_000) },
    )
    if (oembed.ok) {
      const data = await oembed.json()
      if (data.title) title = data.title
    }
  } catch {
    // Non-fatal — fall back to the generic title; the video still embeds by id.
  }

  return NextResponse.json({ videoId, title })
}
