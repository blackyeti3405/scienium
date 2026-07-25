'use client'

import { useState } from 'react'
import {
  Save,
  Github,
  Youtube,
  Check,
  AlertTriangle,
  Film,
  Paperclip,
  ChevronDown,
} from 'lucide-react'
import {
  PRIVACY_OPTIONS,
  MAX_DEMO_VIDEOS,
  MAX_SUPPLEMENTS,
  SHORT_TITLE_MAX,
  TITLE_MAX,
  ABSTRACT_WORD_MAX,
} from '@/lib/showcase'
import { BusyButton } from '@/components/ui/BusyButton'
import { AbstractGuide } from '@/components/showcase/AbstractGuidePanel'
import { useShowcaseEditor, metaUrl } from '@/components/showcase/useShowcaseEditor'
import { Card } from '@/components/showcase/editor/Card'
import { Field } from '@/components/showcase/editor/Field'
import { FileDrop } from '@/components/showcase/editor/FileDrop'
import { VideoPreview } from '@/components/showcase/editor/VideoPreview'
import { LinkRow } from '@/components/showcase/editor/LinkRow'
import { LinkAdder } from '@/components/showcase/editor/LinkAdder'
import { EditorSkeleton } from '@/components/showcase/editor/EditorSkeleton'
import { TopBar } from '@/components/showcase/editor/TopBar'
import { PublishFooter } from '@/components/showcase/editor/PublishFooter'
import { PRIVACY_ICON } from '@/components/showcase/editor/PrivacyIcon'

export function ShowcaseEditor() {
  const {
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
    onRotateShareLink,
    board,
    quad,
    video,
    repo,
    demos,
    supplements,
    checklist,
    doneCount,
  } = useShowcaseEditor()
  const [abstractGuideOpen, setAbstractGuideOpen] = useState(false)

  if (loading) return <EditorSkeleton />

  return (
    <div className="sc-editor">
      {/* ── Top status bar ───────────────────────────────────────────── */}
      <TopBar
        sc={sc}
        publicUrl={publicUrl}
        onRotateShareLink={onRotateShareLink}
        notice={notice}
        flashNotice={flashNotice}
      />

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

          <button
            type="button"
            data-testid="abstract-guide-toggle"
            aria-expanded={abstractGuideOpen}
            onClick={() => setAbstractGuideOpen((v) => !v)}
            className="font-pixel text-[7px] text-white/45 hover:text-white/80 uppercase tracking-widest flex items-center gap-1.5 self-start transition-colors"
          >
            <ChevronDown
              size={12}
              className={`transition-transform ${abstractGuideOpen ? 'rotate-180' : ''}`}
            />
            Abstract Structure
          </button>
          {abstractGuideOpen && <AbstractGuide />}

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
      <PublishFooter
        sc={sc}
        privacy={privacy}
        doneCount={doneCount}
        checklistLength={checklist.length}
        publishing={publishing}
        onPublishToggle={onPublishToggle}
      />
    </div>
  )
}
