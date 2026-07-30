import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { requireTeamContext } from '@/lib/api/route-context'
import { putObject } from '@/lib/storage'
import { markAssetsOrphanedByKey, reserveUploadAsset } from '@/lib/uploads/assets'
import { db } from '@/lib/db'
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
  // `upload`, not `mutate`: this route stores bytes, so it belongs on the same
  // tight tier as the paper and showcase uploads. On `mutate` (40/min) a single
  // student could push ~400 MB/min — far faster than the reclaim sweep drains.
  const { ctx, error } = await requireTeamContext(req, { tier: 'upload' })
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

  // Reservation FIRST (A5/A12): quota + durable `temporary` ledger row commit
  // atomically before any byte reaches R2, so an upload can never land
  // untracked and concurrent uploads can't overshoot the team ceiling.
  const reservation = await reserveUploadAsset({
    teamId: ctx.teamId,
    userId: ctx.dbUserId,
    objectKey: key,
    url: '', // filled below — the canonical URL embeds this row's own id
    contentType: mapped.contentType,
    sizeBytes: buffer.length,
    purpose: 'project_log_attachment',
  })
  if (!reservation.ok) {
    return NextResponse.json(
      {
        error: `Your team's storage is full (${Math.round(reservation.quota / (1024 * 1024 * 1024))} GB). Delete some uploads and try again.`,
      },
      { status: 413 },
    )
  }

  try {
    await putObject(key, buffer, mapped.contentType)
  } catch (err) {
    // Store failed — hand the reservation to the sweep (deleting a key that
    // was never uploaded is a no-op) instead of leaking a phantom quota hold.
    console.error('[project-log/attachment] R2 put failed:', err)
    await markAssetsOrphanedByKey(db, { teamId: ctx.teamId, objectKeys: [key] }).catch(() => {})
    return NextResponse.json({ error: 'Could not store the photo' }, { status: 502 })
  }

  // Served through the authenticated streaming route (R2 bucket is private).
  // The reference is the ASSET ID (SEC-6): the view route authorizes through
  // the team-scoped ledger row, never by parsing a client-supplied object key.
  const url = `/api/project-log/attachment/view?id=${encodeURIComponent(reservation.id)}`
  await db.uploadedAsset.update({ where: { id: reservation.id }, data: { url } })

  return NextResponse.json({ url, key, assetId: reservation.id }, { status: 201 })
}
