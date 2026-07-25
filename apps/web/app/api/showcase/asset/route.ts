import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { randomUUID } from 'crypto'
import { requireTeamContext } from '@/lib/api/route-context'
import { putObject } from '@/lib/storage'
import { getDocumentProxy } from 'unpdf'
import { inspectPdf, isPdfMagic } from '@/lib/pdf/sanitize'
import {
  attachAssetsByKey,
  checkTeamStorageQuota,
  markAssetsOrphanedByKey,
  orphanObjectKey,
  reserveUploadAsset,
} from '@/lib/uploads/assets'
import { lockAggregate } from '@/lib/db-lock'
import { syncShowcaseRevision } from '@/lib/showcase-server'
import { db } from '@/lib/db'
import { MAX_PDF_BYTES } from '@/lib/papers/service'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10 MB

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
  if (allows.pdf && isPdfMagic(buffer)) {
    if (buffer.length > MAX_PDF_BYTES) {
      return NextResponse.json({ error: 'PDF too large (max 20 MB)' }, { status: 413 })
    }
    // Active-content inspection, same as the paper upload path. This matters MORE
    // here, not less: the board is served inline by `showcase/public/asset`, which
    // is on the public middleware allowlist, so an unscanned payload would reach
    // anonymous fair visitors and judges.
    //
    // The page count is parsed and passed so the page-bomb cap actually applies —
    // omitting it silently skipped that check on the one PDF path anonymous
    // visitors can reach. A parse failure is itself disqualifying: we will not
    // serve bytes we could not read.
    let numPages: number
    try {
      numPages = (await getDocumentProxy(new Uint8Array(buffer))).numPages
    } catch {
      return NextResponse.json(
        { error: 'That PDF could not be read. Export a clean copy and try again.' },
        { status: 415 },
      )
    }
    const inspection = inspectPdf(buffer, numPages)
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

  // Reservation FIRST (A5/A12): quota + durable `temporary` ledger row commit
  // atomically before any byte reaches R2.
  const reservation = await reserveUploadAsset({
    teamId: ctx.teamId,
    userId: ctx.dbUserId,
    objectKey: key,
    url: key,
    contentType,
    sizeBytes: buffer.length,
    purpose: `showcase_${kind}`,
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
    await putObject(key, buffer, contentType)
  } catch (err) {
    console.error('[showcase/asset] R2 put failed:', err)
    await markAssetsOrphanedByKey(db, { teamId: ctx.teamId, objectKeys: [key] }).catch(() => {})
    return NextResponse.json({ error: 'Could not store the file' }, { status: 502 })
  }

  // Atomic single-slot replacement (A5/A12): old-row delete, new-row create,
  // ledger attach, and old-object retirement commit or roll back TOGETHER,
  // serialized per (showcase, slot) by an advisory lock so two concurrent
  // uploads cannot duplicate the slot. On rollback the reservation stays
  // `temporary` and the sweep reclaims the freshly-stored object.
  let asset: { id: string; assetType: string }
  try {
    asset = await db.$transaction(async (tx) => {
      await lockAggregate(tx, `showcase-slot:${showcase.id}:${kind}`)
      const prev = await tx.showcaseAsset.findFirst({
        where: { showcaseId: showcase.id, assetType: kind },
        select: { fileUrl: true },
      })
      await tx.showcaseAsset.deleteMany({ where: { showcaseId: showcase.id, assetType: kind } })
      const created = await tx.showcaseAsset.create({
        data: { showcaseId: showcase.id, assetType: kind, fileUrl: key },
        select: { id: true, assetType: true },
      })
      const attached = await attachAssetsByKey(tx, {
        teamId: ctx.teamId,
        objectKeys: [key],
        attachedToType: 'showcase_asset',
        attachedToId: created.id,
      })
      if (attached !== 1) throw new Error('upload reservation expired')
      // Retire the replaced object in the SAME commit — the reclaim sweep owns
      // the physical delete.
      if (prev?.fileUrl && prev.fileUrl !== key) {
        await orphanObjectKey(
          {
            teamId: ctx.teamId,
            userId: ctx.dbUserId,
            objectKey: prev.fileUrl,
            contentType,
            purpose: `showcase_${kind}`,
          },
          tx,
        )
      }
      // Replacing the board/quad chart changes the revision a teacher approved
      // (P0-R3) — inside the same commit as the slot swap, so the digest can
      // never lag the asset it covers.
      await syncShowcaseRevision(tx, showcase.id, ctx.dbUserId)
      return created
    })
  } catch (err) {
    console.error('[showcase/asset] slot replacement failed:', err)
    await markAssetsOrphanedByKey(db, { teamId: ctx.teamId, objectKeys: [key] }).catch(() => {})
    return NextResponse.json({ error: 'Could not save the upload' }, { status: 502 })
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
