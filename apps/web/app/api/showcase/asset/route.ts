import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { randomUUID } from 'crypto'
import { getTeamContext, assertFeatureUnlocked, PhaseGateError } from '@/lib/phase'
import { enforceRateLimit } from '@/lib/rate-limit'
import { putObject, deleteObject } from '@/lib/storage'
import { db } from '@/lib/db'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10 MB
const MAX_PDF_BYTES = 20 * 1024 * 1024 // 20 MB

// Decoded image format (from sharp, not the client MIME) → ext + content-type.
// SVG is excluded — it can carry script (XSS vector).
const IMAGE_FORMATS: Record<string, { ext: string; contentType: string }> = {
  jpeg: { ext: 'jpg', contentType: 'image/jpeg' },
  png: { ext: 'png', contentType: 'image/png' },
  gif: { ext: 'gif', contentType: 'image/gif' },
  webp: { ext: 'webp', contentType: 'image/webp' },
  heif: { ext: 'heic', contentType: 'image/heic' },
  avif: { ext: 'avif', contentType: 'image/avif' },
}

// What each slot accepts. Board must be a PDF; the quad chart must be a PNG.
// `imageFormats` lists the allowed *decoded* sharp formats (null = no images).
const ALLOWS: Record<string, { pdf: boolean; imageFormats: string[] | null; reject: string }> = {
  board: { pdf: true, imageFormats: null, reject: 'The board must be a PDF file.' },
  quad_chart: { pdf: false, imageFormats: ['png'], reject: 'The quad chart must be a PNG image.' },
}

function isPdf(buf: Buffer): boolean {
  // %PDF- magic bytes at the start.
  return buf.length > 4 && buf.subarray(0, 5).toString('latin1') === '%PDF-'
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = await enforceRateLimit(req, 'upload', userId)
  if (limited) return limited

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })
  try {
    assertFeatureUnlocked(ctx.phase, 'showcase')
  } catch (err) {
    if (err instanceof PhaseGateError) return NextResponse.json({ error: err.message }, { status: 403 })
    throw err
  }

  const showcase = await db.showcase.findUnique({ where: { teamId: ctx.teamId }, select: { id: true } })
  if (!showcase) {
    return NextResponse.json({ error: 'Save your showcase details first.' }, { status: 409 })
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid multipart body' }, { status: 400 })
  }

  const kindRaw = String(form.get('kind') ?? '')
  const allows = ALLOWS[kindRaw]
  if (!allows) return NextResponse.json({ error: 'Invalid upload slot' }, { status: 400 })
  const kind = kindRaw as 'board' | 'quad_chart'

  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())

  // Decide the true type by INSPECTING the bytes — never the client MIME.
  let key: string
  let contentType: string
  if (allows.pdf && isPdf(buffer)) {
    if (buffer.length > MAX_PDF_BYTES) {
      return NextResponse.json({ error: 'PDF too large (max 20 MB)' }, { status: 413 })
    }
    key = `showcase/${ctx.teamId}/${randomUUID()}.pdf`
    contentType = 'application/pdf'
  } else if (allows.imageFormats) {
    if (buffer.length > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image too large (max 10 MB)' }, { status: 413 })
    }
    let format: string | undefined
    try {
      format = (await sharp(buffer).metadata()).format
    } catch {
      return NextResponse.json({ error: allows.reject }, { status: 415 })
    }
    // Enforce the exact allowed decoded format(s) for this slot (e.g. PNG only).
    const mapped = format && allows.imageFormats.includes(format) ? IMAGE_FORMATS[format] : undefined
    if (!mapped) {
      return NextResponse.json({ error: allows.reject }, { status: 415 })
    }
    key = `showcase/${ctx.teamId}/${randomUUID()}.${mapped.ext}`
    contentType = mapped.contentType
  } else {
    return NextResponse.json({ error: allows.reject }, { status: 415 })
  }

  await putObject(key, buffer, contentType)

  // Single-slot: replace any existing asset of this kind (and clean up its object).
  const prev = await db.showcaseAsset.findFirst({
    where: { showcaseId: showcase.id, assetType: kind },
    select: { fileUrl: true },
  })
  if (prev) await db.showcaseAsset.deleteMany({ where: { showcaseId: showcase.id, assetType: kind } })

  const asset = await db.showcaseAsset.create({
    data: { showcaseId: showcase.id, assetType: kind, fileUrl: key },
    select: { id: true, assetType: true },
  })

  if (prev?.fileUrl) deleteObject(prev.fileUrl).catch(() => {})

  return NextResponse.json(
    {
      asset: {
        id: asset.id,
        assetType: asset.assetType,
        url: `/api/showcase/public/asset?id=${asset.id}`,
        kind: contentType === 'application/pdf' ? 'pdf' : 'image',
      },
    },
    { status: 201 },
  )
}
