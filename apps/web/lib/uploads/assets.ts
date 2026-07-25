import 'server-only'
import { db } from '@/lib/db'
import { deleteObject } from '@/lib/storage'
import { lockAggregate } from '@/lib/db-lock'
import { Prisma } from '@prisma/client'

/**
 * Uploaded-asset lifecycle helpers. Every object we put in R2 gets a durable
 * `UploadedAsset` row BEFORE the upload itself (`reserveUploadAsset`), so no
 * object can ever exist untracked and quota is enforced atomically (A5/A12):
 *
 *   temporary  — reserved/uploaded, not yet bound to a domain row
 *   attached   — bound to a live domain row (a saved project log)
 *   orphaned   — no longer referenced (log deleted / attachment removed / a
 *                failed upload step); awaiting reclaim
 *   deleting   — claimed by the sweep, object not yet confirmed gone; retryable
 *                by lease age
 *   deleted    — object confirmed removed from storage (terminal)
 *
 * There is exactly ONE physical-delete site: the reclaim sweep. Domain routes only
 * record intent (`attached` / `orphaned`), in the SAME transaction as the domain
 * delete that caused it (P1-S8) — so a crash can never leave an `attached` row with
 * no live owner. They never call `deleteObject`.
 *
 * The sweep claims into `deleting`, deletes the object, and only then writes the
 * terminal `deleted` (P1-R12). The intermediate state is the whole point: the old
 * order wrote `deleted` FIRST, so a process death before the R2 call left a live
 * object behind a terminal row that no later sweep would ever select.
 */

/**
 * Per-team storage ceiling. Rate limits alone bound the *rate* of upload, not the
 * total: at the `upload` tier a single team can still add hundreds of GB over a
 * term. 2 GB is roughly 100 papers at the 20 MB PDF cap — far above real pilot use,
 * low enough that a runaway or scripted team can't run up an unbounded R2 bill.
 */
export const TEAM_STORAGE_QUOTA_BYTES = 2 * 1024 * 1024 * 1024

/** Bytes a team currently holds in storage: everything not yet physically deleted. */
async function teamStorageBytes(teamId: string): Promise<number> {
  const agg = await db.uploadedAsset.aggregate({
    where: { teamId, status: { not: 'deleted' } },
    _sum: { sizeBytes: true },
  })
  return agg._sum.sizeBytes ?? 0
}

/**
 * CHEAP, non-authoritative quota pre-check — an early 413 before a request
 * buffers/parses a large body. The binding check is `reserveUploadAsset`,
 * which re-verifies the quota atomically while inserting the ledger row; this
 * one is unsynchronized and may pass concurrently for several uploads (A12:
 * that race no longer matters because the reservation is what enforces).
 */
export async function checkTeamStorageQuota(
  teamId: string,
  incomingBytes: number,
): Promise<{ used: number; quota: number } | null> {
  const used = await teamStorageBytes(teamId)
  if (used + incomingBytes <= TEAM_STORAGE_QUOTA_BYTES) return null
  return { used, quota: TEAM_STORAGE_QUOTA_BYTES }
}

type UploadReservation =
  | { ok: true; id: string }
  | { ok: false; used: number; quota: number }

/**
 * Reserve quota + create the durable `temporary` ledger row for an upload,
 * BEFORE any byte reaches R2 (A5/A12). One transaction under a per-team
 * advisory lock, so N concurrent uploaders serialize on the quota check and
 * the ceiling can no longer be overshot by `(N-1) × size`.
 *
 * The reservation IS the recovery contract: if the R2 put (or anything after
 * it) fails, the row is either flipped to `orphaned` by the caller or aged out
 * of `temporary` by the reclaim sweep — `deleteObject` on a key that was never
 * uploaded is a no-op, so both paths converge with no untracked object and no
 * stranded quota.
 */
export async function reserveUploadAsset(input: {
  teamId: string
  userId: string
  objectKey: string
  url: string
  contentType: string
  sizeBytes: number
  purpose: string
}): Promise<UploadReservation> {
  return db.$transaction(async (tx) => {
    await lockAggregate(tx, `team-storage:${input.teamId}`)
    const agg = await tx.uploadedAsset.aggregate({
      where: { teamId: input.teamId, status: { not: 'deleted' } },
      _sum: { sizeBytes: true },
    })
    const used = agg._sum.sizeBytes ?? 0
    if (used + input.sizeBytes > TEAM_STORAGE_QUOTA_BYTES) {
      return { ok: false as const, used, quota: TEAM_STORAGE_QUOTA_BYTES }
    }
    const row = await tx.uploadedAsset.create({
      data: { ...input, status: 'temporary' },
      select: { id: true },
    })
    return { ok: true as const, id: row.id }
  })
}

/**
 * `decodeURIComponent` throws a `URIError` on a malformed escape (`%zz`, a lone
 * `%`). These parse user-reachable legacy URLs, so an unguarded call turned bad
 * input into a route-level 500 (REFACTOR2 P1-R12). A URL we cannot decode simply
 * is not a reference we recognise.
 */
function safeDecode(raw: string | undefined): string | null {
  if (raw === undefined) return null
  try {
    return decodeURIComponent(raw)
  } catch {
    return null
  }
}

/** How long a `deleting` claim is honoured before the sweep retries it. */
const DELETE_LEASE_MS = 5 * 60_000

/** Extract the R2 object key from a legacy key-based attachment URL, or null. */
function keyFromAttachmentUrl(url: string): string | null {
  return safeDecode(url.match(/[?&]key=([^&]+)/)?.[1])
}

/** Extract the asset id from an id-based attachment view URL, or null. */
function assetIdFromAttachmentUrl(url: string): string | null {
  return safeDecode(url.match(/[?&]id=([^&]+)/)?.[1])
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
 *
 * Accepts a transaction client so callers can make "retire the old object" part
 * of the same atomic step that installs its replacement (A5).
 *
 * Only a lost adoption RACE (`P2002` on the unique objectKey) is swallowed —
 * any other failure (e.g. a DB outage) propagates, because silently continuing
 * would leak the legacy object forever (A5).
 */
export async function orphanObjectKey(
  input: {
    teamId: string
    userId: string
    objectKey: string
    contentType: string
    purpose: string
  },
  client: Prisma.TransactionClient = db,
): Promise<void> {
  const { count } = await client.uploadedAsset.updateMany({
    where: {
      teamId: input.teamId,
      objectKey: input.objectKey,
      status: { in: ['temporary', 'attached'] },
    },
    data: { status: 'orphaned' },
  })
  if (count > 0) return

  // No ledger row (legacy object) — adopt it as orphaned so the sweep reclaims it.
  try {
    await client.uploadedAsset.create({
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
  } catch (err) {
    // A concurrent adopt winning the unique-objectKey race is a no-op…
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return
    // …anything else means the object is NOT in the ledger — surface it.
    throw err
  }
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
  /** A `deleting` claim older than this is assumed dead and retried. */
  leaseMs?: number
}): Promise<number> {
  const now = Date.now()
  const cutoff = new Date(now - opts.olderThanMs)
  const leaseCutoff = new Date(now - (opts.leaseMs ?? DELETE_LEASE_MS))

  const candidates = await db.uploadedAsset.findMany({
    where: {
      OR: [
        { status: 'orphaned' },
        { status: 'temporary', createdAt: { lt: cutoff } },
        // Crash recovery (P1-R12): a claim whose worker never came back. Without
        // this arm the object leaks permanently, because the old code had
        // already written the terminal status before calling R2.
        { status: 'deleting', deleteLeaseAt: { lt: leaseCutoff } },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: opts.limit,
    select: { id: true, objectKey: true, status: true },
  })

  let cleaned = 0
  for (const asset of candidates) {
    // Claim into the INTERMEDIATE state. Only transition if the row is still in
    // the status we read — an attach that won the race leaves `attached`, so the
    // guard matches 0 rows. `deleting` is not terminal, so a crash from here on
    // is recoverable by lease age rather than a silent leak.
    const claim = await db.uploadedAsset.updateMany({
      where: { id: asset.id, status: asset.status },
      data: {
        status: 'deleting',
        deleteLeaseAt: new Date(),
        deleteAttempts: { increment: 1 },
      },
    })
    if (claim.count !== 1) continue // raced (e.g. just attached, or another sweep).

    try {
      await deleteObject(asset.objectKey)
    } catch (err) {
      // Leave it `deleting`: the lease arm above retries it. Restoring the old
      // status would work too, but only for THIS failure mode — the lease also
      // covers the crash, and one recovery path is easier to trust than two.
      console.error('[uploads] object delete failed, leaving claim to expire', asset.objectKey, err)
      continue
    }

    // Terminal ONLY after the object is confirmed gone.
    await db.uploadedAsset.updateMany({
      where: { id: asset.id, status: 'deleting' },
      data: { status: 'deleted', deletedAt: new Date(), deleteLeaseAt: null },
    })
    cleaned++
  }
  return cleaned
}