import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { randomUUID } from 'crypto'
import { requireTeamContext } from '@/lib/api/route-context'
import { putObject } from '@/lib/storage'
import { inspectPdf } from '@/lib/pdf/sanitize'
import {
  checkTeamStorageQuota,
  orphanObjectKey,
  recordAttachedAsset,
} from '@/lib/uploads/assets'
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
  const { ctx, error } = await requireTeamContext(req, { tier: 'upload', feature: 'showcase' })
  if (error) return error

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

  // Reject on the declared size BEFORE materializing the body, matching the paper
  // and project-log routes. Buffering first would let a multi-GB multipart body
  // OOM the function before the 413 could ever be returned.
  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: 'File too large (max 20 MB)' }, { status: 413 })
  }

  const overQuota = await checkTeamStorageQuota(ctx.teamId, file.size)
  if (overQuota) {
    return NextResponse.json(
      {
        error: `Your team's storage is full (${Math.round(overQuota.quota / (1024 * 1024 * 1024))} GB). Delete some uploads and try again.`,
      },
      { status: 413 },
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // Decide the true type by INSPECTING the bytes — never the client MIME.
  let key: string
  let contentType: string
  if (allows.pdf && isPdf(buffer)) {
    if (buffer.length > MAX_PDF_BYTES) {
      return NextResponse.json({ error: 'PDF too large (max 20 MB)' }, { status: 413 })
    }
    // Active-content inspection, same as the paper upload path. This matters MORE
    // here, not less: the board is served inline by `showcase/public/asset`, which
    // is on the public middleware allowlist, so an unscanned payload would reach
    // anonymous fair visitors and judges.
    const inspection = inspectPdf(buffer)
    if (!inspection.ok) {
      return NextResponse.json(
        { error: `This PDF was rejected for safety: ${inspection.reason}` },
        { status: 415 },
      )
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

  // Ledger row so the object has a database-owned lifecycle: it counts toward the
  // team's quota and, once replaced, becomes reclaimable by the sweep. Recorded as
  // `attached` immediately — unlike a project-log photo, a showcase asset is bound
  // to its domain row in the same request, so there is no temporary window.
  await recordAttachedAsset({
    teamId: ctx.teamId,
    userId: ctx.dbUserId,
    objectKey: key,
    url: key,
    contentType,
    sizeBytes: buffer.length,
    purpose: `showcase_${kind}`,
    attachedToType: 'showcase_asset',
    attachedToId: showcase.id,
  })

  // Single-slot: replace any existing asset of this kind (and retire its object).
  const prev = await db.showcaseAsset.findFirst({
    where: { showcaseId: showcase.id, assetType: kind },
    select: { fileUrl: true },
  })
  if (prev) await db.showcaseAsset.deleteMany({ where: { showcaseId: showcase.id, assetType: kind } })

  const asset = await db.showcaseAsset.create({
    data: { showcaseId: showcase.id, assetType: kind, fileUrl: key },
    select: { id: true, assetType: true },
  })

  // Record intent only — the reclaim sweep owns the physical delete. The previous
  // fire-and-forget `deleteObject(...).catch(() => {})` swallowed failures after
  // the row was already gone, leaking the object with nothing left pointing at it.
  if (prev?.fileUrl) {
    await orphanObjectKey({
      teamId: ctx.teamId,
      userId: ctx.dbUserId,
      objectKey: prev.fileUrl,
      contentType,
      purpose: `showcase_${kind}`,
    })
  }

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
