'use client'

import { useEffect, useRef, useState } from 'react'
import {
  FileUp,
  X,
  Save,
  Globe,
  Eye,
  Github,
  FileText,
  Youtube,
  Check,
  AlertTriangle,
  ExternalLink,
  Copy,
  Rocket,
  LayoutGrid,
  Link2,
  Lock,
  Users,
  PenLine,
  Film,
  Paperclip,
  Printer,
} from 'lucide-react'
import {
  PRIVACY_OPTIONS,
  MAX_DEMO_VIDEOS,
  MAX_SUPPLEMENTS,
  SHORT_TITLE_MAX,
  TITLE_MAX,
  ABSTRACT_WORD_MAX,
  wordCount,
  type PrivacyLevel,
} from '@/lib/showcase'
import { PixelSkeleton } from '@/components/ui/PixelSkeleton'
import { PixelProgressBar } from '@/components/ui/PixelProgressBar'
import { BusyButton } from '@/components/ui/BusyButton'
import { uploadWithProgress } from '@/lib/uploadWithProgress'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Asset {
  id: string
  assetType: string
  url: string | null
  kind?: 'pdf' | 'image'
  metadata: Record<string, unknown> | null
}
interface Showcase {
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
function metaUrl(a: Asset) {
  return String(a.metadata?.url ?? '')
}

const PRIVACY_ICON: Record<PrivacyLevel, React.ReactNode> = {
  private: <Lock size={13} />,
  link_only: <Link2 size={13} />,
  school_only: <Users size={13} />,
  public: <Globe size={13} />,
}
// ─── Main ──────────────────────────────────────────────────────────────────────

export function ShowcaseEditor() {
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

  if (loading) {
    return (
      <div className="sc-editor" data-testid="showcase-editor-skeleton">
        <div className="sc-topbar">
          <PixelSkeleton variant="pill" h="h-5" w="w-24" />
          <PixelSkeleton variant="pill" h="h-6" w="w-16" />
        </div>
        <div className="sc-scroll flex flex-col gap-4 p-4">
          <PixelSkeleton variant="box" h="h-2" w="w-full" />
          <div className="ops-entry-card flex flex-col gap-3 p-4">
            <PixelSkeleton variant="line" h="h-4" w="w-40" />
            <PixelSkeleton variant="box" h="h-9" w="w-full" />
            <PixelSkeleton variant="box" h="h-16" w="w-full" />
            <PixelSkeleton variant="box" h="h-28" w="w-full" />
          </div>
          <div className="ops-entry-card flex flex-col gap-3 p-4">
            <PixelSkeleton variant="line" h="h-4" w="w-48" />
            <div className="grid grid-cols-2 gap-3">
              <PixelSkeleton variant="box" h="h-24" w="w-full" />
              <PixelSkeleton variant="box" h="h-24" w="w-full" />
            </div>
          </div>
        </div>
      </div>
    )
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

  return (
    <div className="sc-editor">
      {/* ── Top status bar ───────────────────────────────────────────── */}
      <div className="sc-topbar">
        <div className="sc-topbar__id">
          <span className={`sc-pill font-pixel ${sc?.published ? 'sc-pill--live' : 'sc-pill--draft'}`}>
            {sc?.published ? <Globe size={10} /> : <PenLine size={10} />}
            {sc?.published ? 'Published' : 'Draft'}
          </span>
          {sc?.published && sc.privacyLevel === 'public' && (
            <span
              className={`sc-pill font-pixel ${
                sc.moderationStatus === 'approved'
                  ? 'sc-pill--live'
                  : sc.moderationStatus === 'rejected'
                  ? 'sc-pill--draft'
                  : 'sc-pill--draft'
              }`}
              style={
                sc.moderationStatus === 'pending_review'
                  ? { color: '#F5C518', borderColor: '#F5C518' }
                  : sc.moderationStatus === 'rejected'
                  ? { color: '#f87171', borderColor: '#f87171' }
                  : undefined
              }
            >
              {sc.moderationStatus === 'approved' && <Check size={10} />}
              {sc.moderationStatus === 'pending_review' && <Globe size={10} />}
              {sc.moderationStatus === 'rejected' && <AlertTriangle size={10} />}
              {sc.moderationStatus === 'approved'
                ? 'Approved · live in gallery'
                : sc.moderationStatus === 'pending_review'
                ? 'Pending teacher review'
                : 'Changes requested'}
            </span>
          )}
          {sc && (
            <span className="sc-views" title="Total views">
              <Eye size={12} /> {sc.views.toLocaleString()}
            </span>
          )}
        </div>
        <div className="sc-topbar__right">
          {notice && <span className="sc-notice font-pixel">✓ {notice}</span>}
          {!!sc && !!publicUrl && (
            <a
              className="sc-ghost font-pixel"
              href={`${publicUrl}?print=1`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Printer size={11} /> Print one-pager
            </a>
          )}
          {sc?.published && publicUrl && sc.moderationStatus === 'approved' && (
            <>
              <button
                className="sc-ghost font-pixel"
                onClick={() => {
                  navigator.clipboard?.writeText(`${window.location.origin}${publicUrl}`)
                  flashNotice('Link copied')
                }}
              >
                <Copy size={11} /> Copy link
              </button>
              <a className="sc-ghost font-pixel" href={publicUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={11} /> View
              </a>
            </>
          )}
          {sc?.published && publicUrl && sc.moderationStatus !== 'approved' && (
            <a className="sc-ghost font-pixel" href={publicUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={11} /> Preview
            </a>
          )}
        </div>
      </div>

      {/* ── Rejection notice ─────────────────────────────────────────── */}
      {sc?.moderationStatus === 'rejected' && (
        <div className="sc-error" style={{ borderColor: '#f87171', background: 'rgba(248,113,113,0.08)' }}>
          <AlertTriangle size={13} className="shrink-0" style={{ color: '#f87171' }} />
          <span>
            <span className="font-pixel" style={{ color: '#f87171' }}>Changes requested by your teacher.</span>
            {sc.moderationNote && (
              <span className="block mt-1 text-white/70">{sc.moderationNote}</span>
            )}
            <span className="block mt-1 font-pixel text-[7px] text-white/40">
              Edit your showcase and re-publish to resubmit for review.
            </span>
          </span>
        </div>
      )}

      <div className="sc-scroll">
        {/* ── Completeness strip ───────────────────────────────────────── */}
        <div className="sc-prog">
          <div className="sc-prog__bar">
            <div className="sc-prog__fill" style={{ width: `${(doneCount / checklist.length) * 100}%` }} />
          </div>
          <div className="sc-prog__chips">
            {checklist.map((c) => (
              <span key={c.key} className={`sc-chip font-pixel ${c.done ? 'sc-chip--done' : ''}`}>
                <span className="sc-chip__dot">{c.done ? <Check size={9} /> : ''}</span>
                {c.label}
              </span>
            ))}
          </div>
        </div>

        {/* ── 1 · Project details ──────────────────────────────────────── */}
        <Card n={1} title="Project details" hint="Titles, abstract, and who can see it">
          <Field label="Short title" required counter={`${shortTitle.length}/${SHORT_TITLE_MAX}`}>
            <input
              value={shortTitle}
              onChange={(e) => setShortTitle(e.target.value.slice(0, SHORT_TITLE_MAX))}
              maxLength={SHORT_TITLE_MAX}
              placeholder="A punchy headline"
              className="sc-input"
            />
          </Field>

          <Field label="Full title" required counter={`${title.length}/${TITLE_MAX}`}>
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
              maxLength={TITLE_MAX}
              rows={2}
              placeholder="e.g. Detecting Microplastics in Freshwater with a Low-Cost Optical Scattering Sensor"
              className="sc-input sc-input--multiline"
            />
          </Field>

          <Field label="Abstract" required counter={`${words}/${ABSTRACT_WORD_MAX} words`} counterMax={overWords}>
            <textarea
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              rows={7}
              placeholder="Summarize your question, what you did, and what you found (max 250 words)."
              className={`sc-input sc-input--multiline ${overWords ? 'sc-textarea--error' : ''}`}
            />
          </Field>

          <Field label="Visibility">
            <div className="sc-priv">
              {PRIVACY_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setPrivacy(o.value)}
                  className={`sc-priv__opt ${privacy === o.value ? 'sc-priv__opt--on' : ''}`}
                >
                  <span className="sc-priv__icon">{PRIVACY_ICON[o.value]}</span>
                  <span className="sc-priv__text">
                    <span className="sc-priv__name font-pixel">{o.label}</span>
                    <span className="sc-priv__blurb">{o.blurb}</span>
                  </span>
                  <span className="sc-priv__check">{privacy === o.value && <Check size={14} />}</span>
                </button>
              ))}
            </div>
          </Field>

          <BusyButton
            busy={saving}
            busyLabel="Saving…"
            icon={<Save size={12} />}
            onClick={onSave}
            disabled={!dirtyOrNew}
            className="ops-submit-btn self-start"
          >
            {sc ? (dirty ? 'Save changes' : 'Saved') : 'Save & start'}
          </BusyButton>
        </Card>

        {/* ── 2 · Required materials ───────────────────────────────────── */}
        <Card n={2} title="Required materials" hint="Board, quad chart, and your video">
          <div className="sc-media2">
            <Field label="Board · PDF" required>
              <FileDrop
                asset={board}
                kind="board"
                accept="application/pdf"
                label="Upload board PDF"
                sub="PDF · up to 20 MB"
                ensureSaved={ensureSaved}
                onAdded={onAssetAdded}
                onRemove={removeAsset}
                onError={setError}
              />
            </Field>
            <Field label="Quad chart · PNG" required>
              <FileDrop
                asset={quad}
                kind="quad_chart"
                accept="image/png"
                label="Upload quad chart"
                sub="PNG · up to 10 MB"
                ensureSaved={ensureSaved}
                onAdded={onAssetAdded}
                onRemove={removeAsset}
                onError={setError}
              />
            </Field>
          </div>

          <Field label="Project video · ~2 min" required>
            {video ? (
              <VideoPreview asset={video} onRemove={removeAsset} />
            ) : (
              <LinkAdder
                assetType="video"
                placeholder="https://youtube.com/watch?v=…"
                icon={<Youtube size={15} />}
                ensureSaved={ensureSaved}
                onAdded={onAssetAdded}
                onError={setError}
              />
            )}
          </Field>
        </Card>

        {/* ── 3 · Optional ─────────────────────────────────────────────── */}
        <Card n={3} title="Optional" hint="Code, demo videos, and supplemental links">
          <Field label="GitHub repository">
            {repo ? (
              <LinkRow icon={<Github size={15} />} url={metaUrl(repo)} onRemove={() => removeAsset(repo.id)} />
            ) : (
              <LinkAdder
                assetType="repo_link"
                placeholder="https://github.com/…"
                icon={<Github size={15} />}
                ensureSaved={ensureSaved}
                onAdded={onAssetAdded}
                onError={setError}
              />
            )}
          </Field>

          <Field label={`Demo videos · up to ${MAX_DEMO_VIDEOS}`}>
            <div className="sc-linklist">
              {demos.map((a) => (
                <LinkRow key={a.id} icon={<Film size={15} />} url={metaUrl(a)} onRemove={() => removeAsset(a.id)} />
              ))}
            </div>
            {demos.length < MAX_DEMO_VIDEOS && (
              <LinkAdder
                assetType="demo_video"
                placeholder="https://youtube.com/watch?v=…"
                icon={<Film size={15} />}
                ensureSaved={ensureSaved}
                onAdded={onAssetAdded}
                onError={setError}
              />
            )}
          </Field>

          <Field label={`Supplemental info · up to ${MAX_SUPPLEMENTS}`}>
            <div className="sc-linklist">
              {supplements.map((a) => (
                <LinkRow key={a.id} icon={<Paperclip size={15} />} url={metaUrl(a)} onRemove={() => removeAsset(a.id)} />
              ))}
            </div>
            {supplements.length < MAX_SUPPLEMENTS && (
              <LinkAdder
                assetType="supplement"
                placeholder="https://… (dataset, slides, write-up)"
                icon={<Paperclip size={15} />}
                ensureSaved={ensureSaved}
                onAdded={onAssetAdded}
                onError={setError}
              />
            )}
          </Field>
        </Card>

        {error && (
          <div className="sc-error">
            <AlertTriangle size={13} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* ── Publish footer ───────────────────────────────────────────── */}
      <div className="sc-publish">
        <div className="sc-publish__meta">
          <span className="font-pixel text-[9px] text-white">
            {sc?.published && sc.privacyLevel === 'public' && sc.moderationStatus === 'pending_review'
              ? 'Submitted for teacher review'
              : sc?.published && sc.privacyLevel === 'public' && sc.moderationStatus === 'rejected'
              ? 'Showcase needs changes — resubmit when ready'
              : sc?.published
              ? 'Your showcase is live'
              : `${doneCount}/${checklist.length} required complete`}
          </span>
          <span className="font-pixel text-[6px] text-white/40 mt-1.5 flex items-center gap-1.5">
            {PRIVACY_ICON[privacy]}
            {privacy === 'public'
              ? 'Requires teacher approval before appearing in the gallery'
              : privacy === 'private'
              ? 'Only your team can see it'
              : privacy === 'school_only'
              ? 'Visible to your school'
              : 'Shareable by link'}
          </span>
        </div>
        <BusyButton
          busy={publishing}
          busyLabel={sc?.published ? 'Unpublishing…' : 'Publishing…'}
          onClick={onPublishToggle}
          className={`sc-btn font-pixel ${sc?.published ? 'sc-btn--unpublish' : 'sc-btn--publish'}`}
        >
          {sc?.published ? (
            'Unpublish'
          ) : privacy === 'public' ? (
            <>
              <Rocket size={13} /> Submit for review
            </>
          ) : (
            <>
              <Rocket size={13} /> Publish showcase
            </>
          )}
        </BusyButton>
      </div>
    </div>
  )
}

// ─── Building blocks ───────────────────────────────────────────────────────────

function Card({ n, title, hint, children }: { n: number; title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="ops-entry-card">
      <div className="ops-entry-card__head">
        <span className="ops-entry-card__badge font-pixel">{n}</span>
        <div className="flex flex-col min-w-0">
          <span className="font-pixel text-[9px] text-white">{title}</span>
          <span className="sc-cardhint">{hint}</span>
        </div>
      </div>
      <div className="ops-entry-card__body">{children}</div>
    </div>
  )
}

function Field({
  label,
  required,
  counter,
  counterMax,
  children,
}: {
  label: string
  required?: boolean
  counter?: string
  counterMax?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="ops-field">
      <div className="sc-fhead">
        <span className="ops-label font-pixel">
          {label}
          {required && <span className="sc-req">*</span>}
        </span>
        {counter && <span className={`sc-count ${counterMax ? 'sc-count--max' : ''}`}>{counter}</span>}
      </div>
      {children}
    </div>
  )
}

function FileDrop({
  asset,
  kind,
  accept,
  label,
  sub,
  ensureSaved,
  onAdded,
  onRemove,
  onError,
}: {
  asset?: Asset
  kind: 'board' | 'quad_chart'
  accept: string
  label: string
  sub: string
  ensureSaved: () => Promise<Showcase | null>
  onAdded: (a: Asset) => void
  onRemove: (id: string) => void
  onError: (msg: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  async function upload(file: File) {
    onError('')
    const saved = await ensureSaved()
    if (!saved) return
    setUploading(true)
    setProgress(0)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('kind', kind)
      const res = await uploadWithProgress('/api/showcase/asset', form, (fraction) =>
        setProgress(Math.round(fraction * 100)),
      )
      const data = (await res.json()) as { asset?: Asset; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      onAdded(data.asset!)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  if (asset?.url) {
    const isImage = asset.kind === 'image'
    return (
      <div className="sc-file">
        <div className="sc-file__preview">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={asset.url} alt={kind} />
          ) : (
            <div className="sc-file__pdf">
              <FileText size={26} />
              <span className="font-pixel">PDF</span>
            </div>
          )}
        </div>
        <div className="sc-file__bar">
          <span className="sc-file__name font-pixel">
            {isImage ? <LayoutGrid size={11} /> : <FileText size={11} />}
            {isImage ? 'Image' : 'PDF'}
          </span>
          <a href={asset.url} target="_blank" rel="noopener noreferrer" className="sc-file__open font-pixel">
            <ExternalLink size={10} /> Open
          </a>
          <button className="sc-file__remove font-pixel" onClick={() => onRemove(asset.id)}>
            <X size={11} /> Remove
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="sc-drop">
        {uploading ? (
          <div className="flex flex-col items-center gap-2 w-full px-4">
            <span className="font-pixel text-[8px]">Uploading… {progress}%</span>
            <PixelProgressBar value={progress} className="max-w-[160px]" />
          </div>
        ) : (
          <>
            <FileUp size={22} />
            <span className="font-pixel text-[8px]">{label}</span>
            <span className="sc-drop__sub">{sub}</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) upload(f)
          e.target.value = ''
        }}
      />
    </>
  )
}

function VideoPreview({ asset, onRemove }: { asset: Asset; onRemove: (id: string) => void }) {
  const embed = typeof asset.metadata?.embedUrl === 'string' ? (asset.metadata.embedUrl as string) : null
  return (
    <div className="sc-videowrap">
      {embed && (
        <div className="sc-videoembed">
          <iframe
            src={embed}
            title="Project video"
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      <LinkRow icon={<Youtube size={15} className="text-[#ff6b6b]" />} url={metaUrl(asset)} onRemove={() => onRemove(asset.id)} />
    </div>
  )
}

function LinkRow({ icon, url, onRemove }: { icon: React.ReactNode; url: string; onRemove: () => void }) {
  return (
    <div className="sc-linkrow">
      <span className="shrink-0 text-white/55 flex">{icon}</span>
      <span className="sc-linkrow__url">{url}</span>
      <button className="sc-linkrow__remove" onClick={onRemove} title="Remove">
        <X size={13} />
      </button>
    </div>
  )
}

function LinkAdder({
  assetType,
  placeholder,
  icon,
  ensureSaved,
  onAdded,
  onError,
}: {
  assetType: 'video' | 'demo_video' | 'repo_link' | 'supplement'
  placeholder: string
  icon: React.ReactNode
  ensureSaved: () => Promise<Showcase | null>
  onAdded: (a: Asset) => void
  onError: (msg: string) => void
}) {
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)

  async function add() {
    const trimmed = url.trim()
    if (!trimmed) return
    onError('')
    const saved = await ensureSaved()
    if (!saved) return
    setBusy(true)
    try {
      const res = await fetch('/api/showcase/asset/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetType, url: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not add link')
      onAdded(data.asset)
      setUrl('')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not add link')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sc-linkadd">
      <span className="sc-linkadd__icon">{icon}</span>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && add()}
        placeholder={placeholder}
        className="sc-input sc-linkadd__input"
      />
      <BusyButton
        busy={busy}
        icon={<Check size={13} />}
        onClick={add}
        disabled={!url.trim()}
        className="sc-linkadd__btn font-pixel"
        title="Add"
      />
    </div>
  )
}
