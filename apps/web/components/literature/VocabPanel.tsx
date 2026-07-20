'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Brain, Trash2 } from 'lucide-react'
import { LabeledLoader } from '@/components/ui/LabeledLoader'
import { EmptyState } from '@/components/ui/EmptyState'
import { BusyButton } from '@/components/ui/BusyButton'
import { nextBox, BOX_INTERVAL_DAYS, type ReviewGrade } from '@/lib/literature/srs'
import { useVocabDeck, type JustGraded } from './useVocabDeck'
import type { VocabCardView, VocabSourceView, VocabReviewResult } from './vocab-api'

type PanelView = 'review' | 'deck'

const DICTIONARY_LABEL: Record<'research_glossary' | 'stats_guide' | 'methods_guide' | 'data_quality_guide', string> = {
  research_glossary: 'Research Guide glossary',
  stats_guide: 'Stats Guide',
  methods_guide: 'Methods Guide',
  data_quality_guide: 'Data-Quality Guide',
}

const SOURCE_BADGE_LABEL: Record<VocabSourceView, string> = {
  research_glossary: 'Research Guide',
  stats_guide: 'Stats Guide',
  methods_guide: 'Methods Guide',
  data_quality_guide: 'Data-Quality Guide',
  paper_definition: 'From your paper',
  paper_context: 'Paper context',
  llm_definition: 'From your paper',
}

/**
 * The four grades are the student's honest self-report of recall — the whole
 * schedule is built on it, and an unlabelled row of buttons invites guessing.
 * `hint` says what the grade MEANS; the `(Nd)` interval beside it says what the
 * grade DOES. Both are needed: a student who reads only the intervals will pick
 * the number they like rather than the truth.
 */
const GRADES: { grade: ReviewGrade; label: string; hint: string }[] = [
  { grade: 'again', label: 'Again', hint: 'No idea — show me this one again tomorrow' },
  { grade: 'hard', label: 'Hard', hint: 'I got there, but it was a struggle' },
  { grade: 'good', label: 'Good', hint: 'I knew it' },
  { grade: 'easy', label: 'Easy', hint: 'Instant — wait longer before asking again' },
]

/**
 * The mandatory source-attribution line for a card's back face. Never
 * embeds the quote's text (that's rendered separately in `vocab-quote`, so
 * the two elements' text content each stay independently checkable — e.g.
 * "verbatim substring of the paper text" for the quote alone).
 */
function attributionText(card: VocabCardView): string {
  switch (card.source) {
    case 'paper_definition':
      return 'Defined in your paper:'
    case 'llm_definition':
      return 'How your paper uses it:'
    case 'paper_context':
      // Legacy rows built before curation existed. New cards always carry a
      // definition — see lib/literature/vocab-curate.ts.
      return "No definition available — here's how your paper uses it:"
    default:
      return `Definition — ${DICTIONARY_LABEL[card.source]} · ${card.term}`
  }
}

function intervalLabel(box: number, grade: ReviewGrade): string {
  const nb = nextBox(box, grade)
  return `${BOX_INTERVAL_DAYS[nb - 1]}d`
}

/**
 * Vocabulary Builder — a full-screen sub-view (mirrors `ResearchGuidePanel`):
 * a spaced-repetition deck of terms EXTRACTED from the student's own
 * sources, each definition GROUNDED in an authored guide or the paper's own
 * verbatim sentence. ZERO LLM anywhere in this component or its data hook.
 */
export function VocabPanel({ onClose }: { onClose: () => void }) {
  const {
    cards,
    due,
    counts,
    loaded,
    loadError,
    retryLoad,
    buildBusy,
    buildError,
    build,
    reviewBusy,
    reviewError,
    justGraded,
    clearJustGraded,
    review,
    remove,
  } = useVocabDeck()

  const [view, setView] = useState<PanelView>('deck')
  const autoViewSetRef = useRef(false)

  // Review view is the default ONLY when cards are due — before we know
  // that (first load), fall back to the deck view so AC1's "renders
  // vocab-deck (or the EmptyState)" holds for a fresh team with no deck yet.
  useEffect(() => {
    if (loaded && !autoViewSetRef.current) {
      setView(due.length > 0 ? 'review' : 'deck')
      autoViewSetRef.current = true
    }
  }, [loaded, due.length])

  return (
    <div className="flex flex-col h-full bg-[#0d1b2e] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <Brain size={14} className="text-[#F5C518]" />
          <h2 className="font-pixel text-[10px] text-white">Vocabulary</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <button
              type="button"
              data-testid="vocab-nav-review"
              onClick={() => setView('review')}
              className={`font-pixel text-[7px] px-2.5 py-1.5 rounded-sm transition-colors ${
                view === 'review'
                  ? 'bg-[#F5C518] text-[#0d1b2e]'
                  : 'text-white/45 hover:text-white/80 border border-white/15'
              }`}
            >
              Review
            </button>
            <button
              type="button"
              data-testid="vocab-nav-deck"
              onClick={() => setView('deck')}
              className={`font-pixel text-[7px] px-2.5 py-1.5 rounded-sm transition-colors ${
                view === 'deck'
                  ? 'bg-[#F5C518] text-[#0d1b2e]'
                  : 'text-white/45 hover:text-white/80 border border-white/15'
              }`}
            >
              Deck
            </button>
          </div>
          <button onClick={onClose} aria-label="Close Vocab Builder" className="text-white/30 hover:text-white/60 transition-colors">
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {!loaded ? (
          <LabeledLoader label="Loading your deck…" fill="panel" />
        ) : loadError ? (
          <div className="border border-dashed border-red-400/25 rounded-sm py-10 text-center flex flex-col items-center gap-3">
            <p className="font-pixel text-[9px] text-red-300">Couldn&apos;t load your deck — check your connection.</p>
            <button
              onClick={() => retryLoad()}
              className="font-pixel text-[8px] border border-white/20 text-white/60 px-4 py-2 rounded-sm hover:border-[#F5C518]/50 hover:text-[#F5C518] transition-colors"
            >
              Try again
            </button>
          </div>
        ) : view === 'review' ? (
          <ReviewView
            cards={cards}
            due={due}
            counts={counts}
            buildBusy={buildBusy}
            buildError={buildError}
            onBuild={build}
            reviewBusy={reviewBusy}
            reviewError={reviewError}
            onReview={review}
            justGraded={justGraded}
            onClearJustGraded={clearJustGraded}
          />
        ) : (
          <DeckView
            cards={cards}
            buildBusy={buildBusy}
            buildError={buildError}
            onBuild={build}
            onRemove={remove}
          />
        )}
      </div>
    </div>
  )
}

// ─── Review view ────────────────────────────────────────────────────────────

function ReviewView({
  cards,
  due,
  counts,
  buildBusy,
  buildError,
  onBuild,
  reviewBusy,
  reviewError,
  onReview,
  justGraded,
  onClearJustGraded,
}: {
  cards: VocabCardView[]
  due: VocabCardView[]
  counts: { total: number; dueToday: number; byBox: Record<string, number> }
  buildBusy: boolean
  buildError: string | null
  onBuild: (paperId?: string) => Promise<void>
  reviewBusy: boolean
  reviewError: string | null
  onReview: (cardId: string, grade: ReviewGrade) => Promise<VocabReviewResult>
  // Lifted into useVocabDeck (not local state) — see that hook's `review()`
  // doc comment for why: a local `justGraded` here would get destroyed by
  // the post-review deck refresh before ever rendering.
  justGraded: JustGraded | null
  onClearJustGraded: () => void
}) {
  const current = due[0] ?? null
  const [revealed, setRevealed] = useState(false)
  const seenCardIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (current?.id !== seenCardIdRef.current) {
      setRevealed(false)
      seenCardIdRef.current = current?.id ?? null
    }
  }, [current?.id])

  async function handleGrade(grade: ReviewGrade) {
    if (!current) return
    try {
      await onReview(current.id, grade)
    } catch {
      // reviewError already surfaces the message
    }
  }

  // The banner persists (surviving the silent post-review refresh) until
  // the student actively moves on to the next card.
  function handleReveal() {
    setRevealed(true)
    onClearJustGraded()
  }

  const nextDueLabel = (() => {
    if (cards.length === 0) return null
    const earliest = cards.reduce((min, c) => Math.min(min, new Date(c.dueAt).getTime()), Infinity)
    return Number.isFinite(earliest) ? new Date(earliest).toLocaleDateString() : null
  })()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span data-testid="vocab-due-count" className="font-pixel text-[8px] text-white/60">
          {counts.dueToday} due today
        </span>
      </div>

      {current && (
        <p data-testid="vocab-review-intro" className="text-sm text-white/45 leading-relaxed">
          Try to recall what the term means, then reveal the answer and rate how well you knew it.
          Terms you find hard come back sooner; terms you know get pushed further out.
        </p>
      )}

      {justGraded && (
        <div className="flex items-center gap-3 border border-[#F5C518]/25 bg-[#F5C518]/[0.06] px-4 py-2.5 rounded-sm">
          {justGraded.kpEarned > 0 && (
            <span data-testid="vocab-kp-earned" className="font-pixel text-[8px] text-[#F5C518]">
              +{justGraded.kpEarned} KP — term mastered!
            </span>
          )}
          {justGraded.capReached && (
            <span data-testid="vocab-cap-reached" className="font-pixel text-[8px] text-white/60">
              Daily KP cap reached — this review still counted, no KP today.
            </span>
          )}
          {!justGraded.kpEarned && !justGraded.capReached && (
            <span className="font-pixel text-[8px] text-white/50">Scheduled.</span>
          )}
        </div>
      )}

      {reviewError && <p className="font-pixel text-[7px] text-red-400">{reviewError}</p>}

      {current ? (
        <div data-testid="vocab-review-card" className="border border-white/10 bg-[#0a1628] px-5 py-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span data-testid="vocab-term" className="font-pixel text-[13px] text-[#F5C518]">
              {current.term}
            </span>
            <span className="text-sm text-white/50">from &ldquo;{current.paperTitle}&rdquo;</span>
          </div>

          {!revealed ? (
            <button
              type="button"
              data-testid="vocab-reveal"
              onClick={handleReveal}
              className="self-start font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] px-4 py-2 rounded-sm hover:brightness-110 transition-all"
            >
              Reveal
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <p data-testid="vocab-definition" className="text-base text-white/85 leading-relaxed">
                {current.definition}
              </p>
              <p data-testid="vocab-attribution" className="text-sm text-white/50 italic">
                {attributionText(current)}
              </p>
              {current.quote && (
                <p
                  data-testid="vocab-quote"
                  className="text-sm text-white/60 leading-relaxed pl-3 border-l-2 border-white/15 before:content-['“'] after:content-['”']"
                >
                  {current.quote}
                </p>
              )}

              <div className="flex flex-col gap-1.5 mt-2">
                <span className="font-pixel text-[7px] text-white/35">How well did you know it?</span>
                <div className="flex flex-wrap gap-2">
                  {GRADES.map(({ grade, label, hint }) => (
                    <BusyButton
                      key={grade}
                      data-testid={`vocab-grade-${grade}`}
                      busy={reviewBusy}
                      showSpinner={false}
                      spinnerTone="vega"
                      onClick={() => handleGrade(grade)}
                      title={`${hint} — next review in ${intervalLabel(current.box, grade)}`}
                      className="font-pixel text-[7px] border border-white/20 text-white/70 px-3 py-2 rounded-sm hover:border-[#F5C518]/50 hover:text-[#F5C518] transition-colors disabled:opacity-40"
                    >
                      {label} ({intervalLabel(current.box, grade)})
                    </BusyButton>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : counts.total === 0 ? (
        <>
          <EmptyState
            testId="vocab-empty"
            message="No vocabulary cards yet"
            hint="Build a deck from your sources to start."
          />
          <div className="flex justify-center mt-3">
            <BusyButton
              data-testid="vocab-build"
              busy={buildBusy}
              busyLabel="Building…"
              onClick={() => onBuild()}
              className="font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] px-4 py-2 rounded-sm hover:brightness-110 disabled:opacity-40 transition-all"
            >
              Build deck
            </BusyButton>
          </div>
          {buildError && <p className="font-pixel text-[7px] text-red-400 text-center mt-2">{buildError}</p>}
        </>
      ) : (
        <EmptyState
          testId="vocab-nothing-due"
          message="Nothing due today"
          hint={nextDueLabel ? `Next card is due ${nextDueLabel}.` : undefined}
        />
      )}
    </div>
  )
}

// ─── Deck view ──────────────────────────────────────────────────────────────

function DeckView({
  cards,
  buildBusy,
  buildError,
  onBuild,
  onRemove,
}: {
  cards: VocabCardView[]
  buildBusy: boolean
  buildError: string | null
  onBuild: (paperId?: string) => Promise<void>
  onRemove: (cardId: string) => Promise<void>
}) {
  return (
    <div data-testid="vocab-deck" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-pixel text-[7px] text-white/40">
          {cards.length} card{cards.length === 1 ? '' : 's'}
        </span>
        <BusyButton
          data-testid="vocab-build"
          busy={buildBusy}
          busyLabel="Building…"
          onClick={() => onBuild()}
          className="font-pixel text-[7px] border border-white/20 text-white/60 px-3 py-1.5 rounded-sm hover:border-[#F5C518]/50 hover:text-[#F5C518] disabled:opacity-40 transition-colors"
        >
          Build deck
        </BusyButton>
      </div>

      {buildError && <p className="font-pixel text-[7px] text-red-400">{buildError}</p>}

      {cards.length === 0 ? (
        <EmptyState
          testId="vocab-empty"
          message="No vocabulary cards yet"
          hint="Build a deck from your sources to start."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {cards.map((card) => (
            <DeckRow key={card.id} card={card} onRemove={onRemove} />
          ))}
        </ul>
      )}
    </div>
  )
}

/** One deck row — the full card (term, definition, attribution, quote,
 *  badges, Remove) always visible, so a student can browse their whole
 *  deck's grounded definitions without having to "review" (grade) each
 *  card one at a time. */
function DeckRow({ card, onRemove }: { card: VocabCardView; onRemove: (cardId: string) => Promise<void> }) {
  return (
    <li
      data-testid={`vocab-card-${card.id}`}
      className="border border-white/10 bg-[#0a1628] px-4 py-3 flex flex-col gap-2"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <span data-testid="vocab-term" className="font-pixel text-[9px] text-white">
            {card.term}
          </span>
          <span className="text-sm text-white/40 truncate">from &ldquo;{card.paperTitle}&rdquo;</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-pixel text-[6px] text-white/50 border border-white/15 px-1.5 py-1 rounded-sm">
            Box {card.box}
          </span>
          <span className="font-pixel text-[6px] text-[#F5C518]/70 border border-[#F5C518]/25 px-1.5 py-1 rounded-sm">
            {SOURCE_BADGE_LABEL[card.source]}
          </span>
          <button
            type="button"
            data-testid="vocab-card-remove"
            onClick={() => onRemove(card.id)}
            title="Remove this card"
            className="text-white/30 hover:text-red-400 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      <p data-testid="vocab-definition" className="text-sm text-white/75 leading-relaxed">
        {card.definition}
      </p>
      <p data-testid="vocab-attribution" className="text-sm text-white/50 italic">
        {attributionText(card)}
      </p>
      {card.quote && (
        <p
          data-testid="vocab-quote"
          className="text-sm text-white/55 leading-relaxed pl-3 border-l-2 border-white/15 before:content-['“'] after:content-['”']"
        >
          {card.quote}
        </p>
      )}
    </li>
  )
}
