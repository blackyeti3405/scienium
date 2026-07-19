import 'server-only'
import { db } from '@/lib/db'
import { deleteObject } from '@/lib/storage'
import type { Prisma } from '@prisma/client'

/**
 * Uploaded-asset lifecycle helpers. Every object we put in R2 gets a durable
 * `UploadedAsset` row so an abandoned upload is discoverable and cleanable rather
 * than an orphaned blob:
 *
 *   temporary  — uploaded, not yet bound to a domain row
 *   attached   — bound to a live domain row (a saved project log)
 *   orphaned   — no longer referenced (log deleted / attachment removed); awaiting reclaim
 *   deleted    — object removed from storage (terminal)
 *
 * There is exactly ONE physical-delete site: the reclaim sweep. Domain routes only
 * record intent (`attached` / `orphaned`); they never call `deleteObject`. The sweep
 * uses claim-then-delete (guarded status transition first, object delete second) so a
 * concurrent attach can never have its live object removed, and a failed delete leaves
 * the row reclaimable for a later run instead of leaking.
 */

/**
 * Per-team storage ceiling. Rate limits alone bound the *rate* of upload, not the
 * total: at the `upload` tier a single team can still add hundreds of GB over a
 * term. 2 GB is roughly 100 papers at the 20 MB PDF cap — far above real pilot use,
 * low enough that a runaway or scripted team can't run up an unbounded R2 bill.
 */
export const TEAM_STORAGE_QUOTA_BYTES = 2 * 1024 * 1024 * 1024

/** Bytes a team currently holds in storage: everything not yet physically deleted. */
export async function teamStorageBytes(teamId: string): Promise<number> {
  const agg = await db.uploadedAsset.aggregate({
    where: { teamId, status: { not: 'deleted' } },
    _sum: { sizeBytes: true },
  })
  return agg._sum.sizeBytes ?? 0
}

/**
 * Enforce the team's storage ceiling before an upload is accepted. Returns null
 * when there is room, or a `{ used, quota }` snapshot when the incoming object
 * would exceed it — the caller turns that into a 413.
 *
 * Deliberately check-then-write rather than transactional: two concurrent uploads
 * can both observe room and both land, overshooting by at most one object. That is
 * an acceptable slack for a ceiling this far above real use, and far cheaper than
 * serializing every upload behind a lock.
 */
export async function checkTeamStorageQuota(
  teamId: string,
  incomingBytes: number,
): Promise<{ used: number; quota: number } | null> {
  const used = await teamStorageBytes(teamId)
  if (used + incomingBytes <= TEAM_STORAGE_QUOTA_BYTES) return null
  return { used, quota: TEAM_STORAGE_QUOTA_BYTES }
}

/** Record a freshly-uploaded object as a temporary asset. Returns its id. */
export async function recordTemporaryAsset(input: {
  teamId: string
  userId: string
  objectKey: string
  url: string
  contentType: string
  sizeBytes: number
  purpose: string
}): Promise<{ id: string }> {
  return db.uploadedAsset.create({
    data: { ...input, status: 'temporary' },
    select: { id: true },
  })
}

/**
 * Record an object that is bound to its domain row in the SAME request (a paper
 * PDF, a showcase board) — so it is born `attached`, never `temporary`.
 *
 * Using `recordTemporaryAsset` for these would be a live-data bug: the reclaim
 * sweep deletes `temporary` rows older than its window, so a perfectly live
 * showcase board would have its object deleted a day after upload.
 */
export async function recordAttachedAsset(input: {
  teamId: string
  userId: string
  objectKey: string
  url: string
  contentType: string
  sizeBytes: number
  purpose: string
  attachedToType: string
  attachedToId: string
}): Promise<{ id: string }> {
  return db.uploadedAsset.create({
    data: { ...input, status: 'attached', attachedAt: new Date() },
    select: { id: true },
  })
}

/** Extract the R2 object key from a legacy key-based attachment URL, or null. */
export function keyFromAttachmentUrl(url: string): string | null {
  const m = url.match(/[?&]key=([^&]+)/)
  return m ? decodeURIComponent(m[1]) : null
}

/** Extract the asset id from an id-based attachment view URL, or null. */
export function assetIdFromAttachmentUrl(url: string): string | null {
  const m = url.match(/[?&]id=([^&]+)/)
  return m ? decodeURIComponent(m[1]) : null
}

/**
 * Resolve attachment view-URLs to a per-URL object key, asserting team ownership
 * of every reference (SEC-6). Two accepted forms:
 *
 *   ?id=<assetId>  — canonical since the ledger became the authority: the id is
 *                    resolved through the team-scoped `UploadedAsset` row, so the
 *                    row (not string parsing) proves ownership.
 *   ?key=<objectKey> — legacy rows from before id-URLs; validated against the
 *                    team's upload prefix (`log-attachments/<teamId>/`).
 *
 * Returns a url → objectKey map, or null if ANY reference is malformed, another
 * team's, or already deleted — the caller turns that into a 400.
 */
export async function resolveAttachmentKeys(
  teamId: string,
  urls: string[],
): Promise<Map<string, string> | null> {
  const prefix = `log-attachments/${teamId}/`
  const out = new Map<string, string>()

  const idUrls = new Map<string, string>() // assetId -> url
  for (const url of urls) {
    const assetId = assetIdFromAttachmentUrl(url)
    if (assetId) {
      idUrls.set(assetId, url)
      continue
    }
    const key = keyFromAttachmentUrl(url)
    if (!key || key.includes('..') || !key.startsWith(prefix)) return null
    out.set(url, key)
  }

  if (idUrls.size > 0) {
    const assets = await db.uploadedAsset.findMany({
      where: { id: { in: [...idUrls.keys()] }, teamId, status: { not: 'deleted' } },
      select: { id: true, objectKey: true },
    })
    if (assets.length !== idUrls.size) return null
    for (const a of assets) out.set(idUrls.get(a.id)!, a.objectKey)
  }

  return out
}

/**
 * Flip the team's temporary assets identified by `objectKeys` to `attached`,
 * bound to the saved domain row. Scoped to the team, so only the team's own
 * uploads can be attached. Runs inside the caller's transaction. Returns how many
 * rows were flipped — the caller compares this to the number of freshly-referenced
 * keys to detect a reference to an asset that was already swept away or never ours.
 */
export async function attachAssetsByKey(
  tx: Prisma.TransactionClient,
  input: { teamId: string; objectKeys: string[]; attachedToType: string; attachedToId: string },
): Promise<number> {
  if (input.objectKeys.length === 0) return 0
  const { count } = await tx.uploadedAsset.updateMany({
    where: { teamId: input.teamId, objectKey: { in: input.objectKeys }, status: 'temporary' },
    data: {
      status: 'attached',
      attachedToType: input.attachedToType,
      attachedToId: input.attachedToId,
      attachedAt: new Date(),
    },
  })
  return count
}

/**
 * Mark the team's assets identified by `objectKeys` as `orphaned` — the domain row
 * that referenced them is gone (deleted log) or dropped the attachment (edit). The
 * reclaim sweep does the physical delete. Scoped to the team; runs on the caller's
 * client (a transaction client or the base `db`). No-op for keys with no live row.
 */
export async function markAssetsOrphanedByKey(
  client: Prisma.TransactionClient,
  input: { teamId: string; objectKeys: string[] },
): Promise<void> {
  if (input.objectKeys.length === 0) return
  await client.uploadedAsset.updateMany({
    where: {
      teamId: input.teamId,
      objectKey: { in: input.objectKeys },
      status: { in: ['temporary', 'attached'] },
    },
    data: { status: 'orphaned' },
  })
}

/**
 * Mark a single object key orphaned, adopting it into the ledger first if it has
 * no row yet. Domain rows written before their upload path joined the ledger (e.g.
 * pre-ledger showcase assets) have no `UploadedAsset`, so a plain `updateMany`
 * would silently no-op and leak the object forever. Creating an already-orphaned
 * row hands it to the sweep instead, keeping the single-physical-delete-site
 * invariant intact rather than falling back to a direct `deleteObject`.
 */
export async function orphanObjectKey(input: {
  teamId: string
  userId: string
  objectKey: string
  contentType: string
  purpose: string
}): Promise<void> {
  const { count } = await db.uploadedAsset.updateMany({
    where: {
      teamId: input.teamId,
      objectKey: input.objectKey,
      status: { in: ['temporary', 'attached'] },
    },
    data: { status: 'orphaned' },
  })
  if (count > 0) return

  // No ledger row (legacy object) — adopt it as orphaned so the sweep reclaims it.
  // `objectKey` is unique; a concurrent adopt losing the race is a no-op, not an error.
  await db.uploadedAsset
    .create({
      data: {
        teamId: input.teamId,
        userId: input.userId,
        objectKey: input.objectKey,
        url: input.objectKey,
        contentType: input.contentType,
        sizeBytes: 0, // unknown for legacy objects; only affects quota accounting
        purpose: input.purpose,
        status: 'orphaned',
      },
    })
    .catch(() => {})
}

/**
 * Reclaim assets that are no longer wanted: any `orphaned` row (a dropped/deleted
 * attachment), plus `temporary` rows that were never attached within `olderThanMs`
 * (an upload the user abandoned). Bounded per call.
 *
 * Claim-then-delete: for each candidate, first flip status -> `deleted` guarded on
 * its current status. If the guard matches nothing (0 rows) the asset was attached
 * in the race window — skip it, leaving its live object untouched. Only after we own
 * the claim do we delete the object; if that delete fails we release the claim back
 * to its prior status so a later sweep retries rather than leaking the blob.
 * Returns how many objects were actually deleted.
 */
export async function reclaimAbandonedAssets(opts: {
  olderThanMs: number
  limit: number
}): Promise<number> {
  const cutoff = new Date(Date.now() - opts.olderThanMs)
  const candidates = await db.uploadedAsset.findMany({
    where: {
      OR: [{ status: 'orphaned' }, { status: 'temporary', createdAt: { lt: cutoff } }],
    },
    orderBy: { createdAt: 'asc' },
    take: opts.limit,
    select: { id: true, objectKey: true, status: true },
  })

  let cleaned = 0
  for (const asset of candidates) {
    // Claim: only transition if the row is still in the status we read. An attach
    // that won the race leaves status='attached', so the guard matches 0 rows.
    const claim = await db.uploadedAsset.updateMany({
      where: { id: asset.id, status: asset.status },
      data: { status: 'deleted', deletedAt: new Date() },
    })
    if (claim.count !== 1) continue // raced (e.g. just attached) — leave it alone.

    try {
      await deleteObject(asset.objectKey)
      cleaned++
    } catch (err) {
      console.error('[uploads] failed to delete object, releasing claim', asset.objectKey, err)
      // Release the claim so a later sweep retries instead of leaving a blob that
      // no longer has a reclaimable ledger row.
      await db.uploadedAsset.updateMany({
        where: { id: asset.id, status: 'deleted' },
        data: { status: asset.status, deletedAt: null },
      })
    }
  }
  return cleaned
}