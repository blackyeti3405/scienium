'use client'

import { useState } from 'react'

// ── Team interest seeds (#2) — seed 1–3 curiosities → one-tap START CHIPS ─────
// Pixel aesthetic (dark bg, font-pixel chrome, gold accents); the phrase text
// itself is a regular font (it's the student's own words). Pure local, no LLM.

export interface Interest {
  id: string
  text: string
  createdByUserId: string
  isMine: boolean
  createdAt: string
}

interface Props {
  interests: Interest[]
  currentUserId: string | null
  onAdd: (text: string) => void
  onRemove: (id: string) => void
  onSeed: (text: string) => void
}

const MAX_PER_USER = 3

export function InterestSeeds({ interests, currentUserId, onAdd, onRemove, onSeed }: Props) {
  const [draft, setDraft] = useState('')

  const mineCount = interests.filter((i) =>
    currentUserId ? i.createdByUserId === currentUserId : i.isMine,
  ).length
  const atCap = mineCount >= MAX_PER_USER

  function submit() {
    const text = draft.trim()
    if (!text || atCap) return
    onAdd(text)
    setDraft('')
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-pixel text-[8px] uppercase tracking-widest flex items-center gap-2 text-white/60">
          <span className="text-[#F5C518]">★</span>
          Team interests
        </h2>
        <span className={`font-pixel text-[7px] tabular-nums ${atCap ? 'text-[#F5C518]' : 'text-white/35'}`}>
          {mineCount} / {MAX_PER_USER} added
        </span>
      </div>
      <p className="font-pixel text-[7px] text-white/35 leading-loose">
        Add 1–3 topics you&apos;re curious about to get one-tap starts.
      </p>

      {/* Add input */}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
          }}
          maxLength={40}
          disabled={atCap}
          placeholder={atCap ? 'You’ve added 3 interests' : 'e.g. volcanoes, black holes…'}
          aria-label="Add a team interest"
          className="flex-1 bg-[#0a1628] border border-white/20 text-sm text-white placeholder:text-white/30 rounded-sm px-3 py-2 outline-none focus:border-[#F5C518]/60 disabled:opacity-40"
        />
        <button
          onClick={submit}
          disabled={!draft.trim() || atCap}
          className="shrink-0 font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] rounded-sm px-4 py-2 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Add
        </button>
      </div>

      {/* Chips */}
      {interests.length === 0 ? (
        <p className="font-pixel text-[7px] text-white/25 leading-loose">
          No interests yet — add one above to seed your first start.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {interests.map((it) => {
            const mine = currentUserId ? it.createdByUserId === currentUserId : it.isMine
            return (
              <div
                key={it.id}
                className="group flex items-center gap-1.5 rounded-sm border border-white/15 bg-white/[0.03] pl-2.5 pr-1.5 py-1.5 hover:border-[#F5C518]/40 transition-colors"
              >
                <button
                  data-testid="interest-chip"
                  aria-label={`Start exploring ${it.text}`}
                  onClick={() => onSeed(it.text)}
                  className="text-sm text-white/85 hover:text-[#F5C518] transition-colors max-w-[180px] truncate"
                  title={mine ? it.text : `${it.text} (teammate)`}
                >
                  <span className="text-[#F5C518]/70 mr-1">★</span>
                  {it.text}
                </button>
                {mine ? (
                  <button
                    aria-label={`Remove interest ${it.text}`}
                    onClick={() => onRemove(it.id)}
                    className="shrink-0 text-white/30 hover:text-red-400 transition-colors leading-none px-1"
                    title="Remove"
                  >
                    ×
                  </button>
                ) : (
                  <span
                    className="shrink-0 font-pixel text-[6px] text-white/25 uppercase tracking-wide pr-1"
                    title="Added by a teammate"
                  >
                    teammate
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
