import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { requireTeamContext } from '@/lib/api/route-context'
import { putObject } from '@/lib/storage'
import { randomUUID } from 'crypto'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

// Map the *actual* decoded image format (from sharp, not the client-declared
// MIME) to a canonical extension + content-type. SVG is deliberately excluded —
// it can carry script and is the one image format that's an XSS vector.
const FORMAT_MAP: Record<string, { ext: string; contentType: string }> = {
  jpeg: { ext: 'jpg', contentType: 'image/jpeg' },
  png: { ext: 'png', contentType: 'image/png' },
  gif: { ext: 'gif', contentType: 'image/gif' },
  webp: { ext: 'webp', contentType: 'image/webp' },
  heif: { ext: 'heic', contentType: 'image/heic' },
  avif: { ext: 'avif', contentType: 'image/avif' },
}

export async function POST(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate' })
  if (error) return error

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid multipart body' }, { status: 400 })
  }

  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 413 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // Validate by *decoding* the bytes — never trust the client-declared MIME type.
  // This rejects mislabeled files, polyglots, and SVG, and gives us the true
  // format to store (so the view route serves an accurate content-type).
  let format: string | undefined
  try {
    format = (await sharp(buffer).metadata()).format
  } catch {
    return NextResponse.json({ error: 'File is not a readable image' }, { status: 415 })
  }
  const mapped = format ? FORMAT_MAP[format] : undefined
  if (!mapped) {
    return NextResponse.json(
      { error: 'Only JPEG, PNG, GIF, WebP, or HEIC images are accepted' },
      { status: 415 },
    )
  }

  const key = `log-attachments/${ctx.teamId}/${randomUUID()}.${mapped.ext}`
  await putObject(key, buffer, mapped.contentType)

  // Served through the authenticated streaming route (R2 bucket is private).
  const url = `/api/project-log/attachment/view?key=${encodeURIComponent(key)}`
  return NextResponse.json({ url, key }, { status: 201 })
}
