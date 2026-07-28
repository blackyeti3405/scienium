'use client'

import { useEffect, useRef, useState } from 'react'
import { ABSTRACT_WORD_MAX, SINGLE_SLOT, wordCount, type PrivacyLevel, type ShowcaseAssetType } from '@/lib/showcase'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface Asset {
  id: string
  assetType: string
  url: string | null
  kind?: 'pdf' | 'image'
  metadata: Record<string, unknown> | null
}
export interface Showcase {
  id: string
  slug: string
  shortTitle: string
  title: string
  abstract: string
  privacyLevel: PrivacyLevel
  published: boolean
  publishedAt: string | null
  moderationStatus: string
  moderationNote: string | null
  /**
   * The URL to actually hand out. For `link_only` this carries the secret share
   * token, NOT the public slug (P1-R7) — never build a share link from `slug`.
   */
  shareUrl: string
  views: number
  assets: Asset[]
}

function byType(a: Asset[], t: string) {
  return a.find((x) => x.assetType === t)
}
function allByType(a: Asset[], t: string) {
  return a.filter((x) => x.assetType === t)
}
export function metaUrl(a: Asset) {
  return String(a.metadata?.url ?? '')
}

/**
 * Showcase-editor lifecycle hook: owns the load / save / publish / asset state
 * machine plus the derived form/checklist values, extracted verbatim from
 * `ShowcaseEditor`. The editor shell and its block subcomponents
 * (`showcase/editor/*`) stay purely presentational.
 */
export function useShowcaseEditor() {
  const [loading, setLoading] = useState(true)
  const [sc, setSc] = useState<Showcase | null>(null)

  const [shortTitle, setShortTitle] = useState('')
  const [title, setTitle] = useState('')
  const [abstract, setAbstract] = useState('')
  const [privacy, setPrivacy] = useState<PrivacyLevel>('link_only')

  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/showcase')
      .then(async (r) => {
        // 404 is the legitimate "no showcase yet" case — start with a blank editor.
        // Any OTHER non-2xx must surface: the old code only checked `d.showcase`,
        // so a 403 phase gate or a 429 parsed cleanly, produced no `showcase` key,
        // and rendered a bare "Draft" editor. A student whose showcase was blocked
        // saw an empty one instead of a reason.
        if (r.status === 404) return null
        const d = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(d.error ?? 'Could not load your showcase.')
        return d.showcase ?? null
      })
      .then((showcase) => {
        if (showcase) applyShowcase(showcase)
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Could not load your showcase.'),
      )
      .finally(() => setLoading(false))
  }, [])

  function applyShowcase(next: Showcase) {
    // Preserve moderationStatus/moderationNote from server response.
    setSc(next)
    setShortTitle(next.shortTitle ?? '')
    setTitle(next.title)
    setAbstract(next.abstract)
    setPrivacy(next.privacyLevel)
  }

  const dirty =
    !!sc &&
    (shortTitle !== sc.shortTitle ||
      title !== sc.title ||
      abstract !== sc.abstract ||
      privacy !== sc.privacyLevel)
  const dirtyOrNew = dirty || !sc

  const words = wordCount(abstract)
  const overWords = words > ABSTRACT_WORD_MAX

  async function writeShowcase(
    extra?: { published?: boolean; rotateShareToken?: boolean },
  ): Promise<Showcase | null> {
    setError(null)
    const res = await fetch('/api/showcase', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shortTitle: shortTitle.trim(),
        title: title.trim(),
        abstract: abstract.trim(),
        privacyLevel: privacy,
        ...extra,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Save failed')
      return null
    }
    applyShowcase(data.showcase)
    return data.showcase as Showcase
  }

  /**
   * Every PUT goes through one chain, so two of them can never be in flight at
   * once (§0.9 Row C3). `save` PUTs the WHOLE object and `applyShowcase`es
   * whatever comes back, and five call sites reach it — Save, Publish,
   * Rotate link, and `ensureSaved` from every FileDrop/LinkAdder. Publishing
   * while a plain save was still open let the save's older response land last
   * and flip `published` back to false, on screen, with no error.
   *
   * Deliberately NOT `lib/save-queue.ts`: that primitive COALESCES, which is
   * right for one autosaved snapshot and wrong here — these calls carry
   * different commands (`{published}`, `{rotateShareToken}`), and coalescing
   * would silently drop one of them. Serialize only.
   */
  const chainRef = useRef<Promise<unknown>>(Promise.resolve())

  function save(
    extra?: { published?: boolean; rotateShareToken?: boolean },
  ): Promise<Showcase | null> {
    const next = chainRef.current.then(() => writeShowcase(extra))
    chainRef.current = next.catch(() => null)
    return next
  }

  async function onSave() {
    if (overWords) {
      setError(`Abstract is limited to ${ABSTRACT_WORD_MAX} words.`)
      return
    }
    setSaving(true)
    const saved = await save()
    if (saved) flashNotice('Saved')
    setSaving(false)
  }

  async function onPublishToggle() {
    setPublishing(true)
    const saved = await save({ published: !sc?.published })
    if (saved) flashNotice(saved.published ? 'Published!' : 'Reverted to draft')
    setPublishing(false)
  }

  /**
   * Mint a new share token. There is no way to un-share a link somebody already
   * copied — rotating is the revocation (P1-R7), so it is deliberately an
   * explicit action rather than something a save does silently.
   */
  async function onRotateShareLink() {
    setSaving(true)
    const saved = await save({ rotateShareToken: true })
    if (saved) flashNotice('New link generated — the old one no longer works')
    setSaving(false)
  }

  function flashNotice(msg: string) {
    setNotice(msg)
    setTimeout(() => setNotice(null), 2500)
  }

  async function ensureSaved(): Promise<Showcase | null> {
    if (sc) return sc
    if (shortTitle.trim().length < 1 && title.trim().length < 3) {
      setError('Add a title before uploading.')
      return null
    }
    return save()
  }

  function onAssetAdded(asset: Asset) {
    setSc((prev) => {
      if (!prev) return prev
      const single = SINGLE_SLOT[asset.assetType as ShowcaseAssetType]
      const base = single ? prev.assets.filter((a) => a.assetType !== asset.assetType) : prev.assets
      return { ...prev, assets: [...base, asset] }
    })
  }

  async function removeAsset(id: string) {
    const removed = sc?.assets.find((a) => a.id === id)
    setSc((prev) => (prev ? { ...prev, assets: prev.assets.filter((a) => a.id !== id) } : prev))
    try {
      const res = await fetch(`/api/showcase/asset/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`delete failed (${res.status})`)
    } catch {
      // The optimistic removal was a lie: the asset is still on the server and
      // still on the published board. Put it back and say so — silently
      // diverging from the server is how a student "removes" a file that their
      // judges then see (§0.9 Row C3). Keyed re-insert so an upload that
      // finished during the DELETE survives.
      if (removed) {
        setSc((prev) =>
          prev && !prev.assets.some((a) => a.id === id)
            ? { ...prev, assets: [...prev.assets, removed] }
            : prev,
        )
      }
      setError('Could not remove that file. Please try again.')
    }
  }

  const publicUrl = sc?.shareUrl ?? null
  const board = sc ? byType(sc.assets, 'board') : undefined
  const quad = sc ? byType(sc.assets, 'quad_chart') : undefined
  const video = sc ? byType(sc.assets, 'video') : undefined
  const repo = sc ? byType(sc.assets, 'repo_link') : undefined
  const demos = sc ? allByType(sc.assets, 'demo_video') : []
  const supplements = sc ? allByType(sc.assets, 'supplement') : []

  const checklist = [
    { key: 'short', label: 'Short title', done: shortTitle.trim().length >= 1 },
    { key: 'title', label: 'Full title', done: title.trim().length >= 3 },
    { key: 'abstract', label: 'Abstract', done: words >= 1 && !overWords },
    { key: 'board', label: 'Board', done: !!board },
    { key: 'video', label: 'Video', done: !!video },
    { key: 'quad', label: 'Quad chart', done: !!quad },
  ]
  const doneCount = checklist.filter((c) => c.done).length

  return {
    loading,
    sc,
    shortTitle,
    setShortTitle,
    title,
    setTitle,
    abstract,
    setAbstract,
    privacy,
    setPrivacy,
    saving,
    publishing,
    error,
    setError,
    notice,
    dirty,
    dirtyOrNew,
    words,
    overWords,
    onSave,
    onPublishToggle,
    onRotateShareLink,
    flashNotice,
    ensureSaved,
    onAssetAdded,
    removeAsset,
    publicUrl,
    board,
    quad,
    video,
    repo,
    demos,
    supplements,
    checklist,
    doneCount,
  }
}
