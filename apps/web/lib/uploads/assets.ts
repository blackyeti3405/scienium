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

/** Extract the R2 object key from a project-log attachment view URL, or null. */
export function keyFromAttachmentUrl(url: string): string | null {
  const m = url.match(/[?&]key=([^&]+)/)
  return m ? decodeURIComponent(m[1]) : null
}

/**
 * Resolve attachment view-URLs to deduped object keys, asserting every one lives
 * under the caller team's upload prefix (`log-attachments/<teamId>/`). Returns null
 * if any URL is malformed or points outside the team's namespace — the caller turns
 * that into a 400. Enforced at write time, this closes the cross-team delete/attach
 * vector (a crafted URL can't name another team's object).
 */
export function attachmentKeysUnderTeam(teamId: string, urls: string[]): string[] | null {
  const prefix = `log-attachments/${teamId}/`
  const keys = urls.map(keyFromAttachmentUrl)
  if (keys.some((k) => k === null || !k.startsWith(prefix))) return null
  return Array.from(new Set(keys as string[]))
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