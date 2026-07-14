'use client'

import { useEffect, useState } from 'react'
import { ABSTRACT_WORD_MAX, wordCount, type PrivacyLevel } from '@/lib/showcase'

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
      .then((r) => r.json())
      .then((d) => {
        if (d.showcase) applyShowcase(d.showcase)
      })
      .catch(() => setError('Could not load your showcase.'))
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

  async function save(extra?: { published?: boolean }): Promise<Showcase | null> {
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
      const single = asset.assetType !== 'demo_video' && asset.assetType !== 'supplement'
      const base = single ? prev.assets.filter((a) => a.assetType !== asset.assetType) : prev.assets
      return { ...prev, assets: [...base, asset] }
    })
  }

  async function removeAsset(id: string) {
    setSc((prev) => (prev ? { ...prev, assets: prev.assets.filter((a) => a.id !== id) } : prev))
    await fetch(`/api/showcase/asset/${id}`, { method: 'DELETE' }).catch(() => {})
  }

  const publicUrl = sc ? `/showcase/${sc.slug}` : null
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
