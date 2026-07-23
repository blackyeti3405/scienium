'use client'

import { Pencil, Check, X } from 'lucide-react'
import type { DiscoveryNode } from '@/stores/discoveryStore'
import { InterestSeeds, type Interest } from '@/components/discovery/InterestSeeds'
import { useToggleSet } from '@/lib/hooks/useToggleSet'

// ── Accordion content ───────────────────────────────────────────────────────

const ITEMS = [
  {
    title: 'What is a Wikipedia deep dive?',
    body: (
      <div className="space-y-3 text-sm text-white/55 leading-relaxed">
        <p>
          A <strong className="text-white">Wikipedia deep dive</strong> is an
          idea-generation technique originally conceived by{' '}
          <strong className="text-white">Rishab Jain</strong> — science fair champion and
          author. The core idea is simple: open a Wikipedia article on any subject, then follow
          the hyperlinks that catch your eye, letting one topic lead naturally to the next and
          uncovering unexpected connections along the way.
        </p>
        <p>
          scienium has adapted this into its current interactive form. As you click through
          links, a <strong className="text-white">live branching tree diagram</strong> is
          built automatically, mapping your exact path. You can split into two directions at any
          article, star entries worth revisiting, prune dead ends, and backtrack through any
          node — turning a freeform browse into a structured, visual map of ideas.
        </p>
      </div>
    ),
  },
  {
    title: 'How are they useful?',
    body: (
      <div className="space-y-3 text-sm text-white/55 leading-relaxed">
        <p>
          Deep dives give you <strong className="text-white">rapid, broad exposure</strong>{' '}
          to a whole landscape of topics in a single session. Instead of committing to one
          subject upfront, you surface dozens of related fields, sub-disciplines, and adjacent
          ideas — perfect for the early research phase of a science fair project when you need
          inspiration but aren&apos;t sure where to focus yet.
        </p>
        <p>
          Anything that sparks genuine interest can be{' '}
          <strong className="text-white">starred</strong> as you go. By the end of a
          20-minute session your starred list becomes a curated shortlist of angles to pursue
          more deeply — saving you hours of unfocused googling later.
        </p>
      </div>
    ),
  },
  {
    title: 'How do I use them?',
    body: (
      <ol className="space-y-3.5 text-sm text-white/55">
        {(
          [
            ['🔍', 'Search a topic', 'Type any subject into the search bar. This becomes the root node of your tree.'],
            ['📖', 'Read the article', 'Skim the Wikipedia article that loads. Blue underlined links are clickable and can become branches.'],
            ['🌿', 'Select up to 2 branches', "Click 1–2 blue links that interest you. They'll highlight and appear in the Branch Selections panel on the right."],
            ['➡️', 'Commit and move forward', 'Press "Branch into articles →" to lock in your choices, expand the tree, and jump to the first new article.'],
            ['🔁', 'Explore freely', 'Keep branching, or click any node in the tree to jump back and take a different path.'],
            ['⭐', 'Star what matters', 'Click the ☆ icon on any tree node to star it. Starred articles appear in the sidebar and here on the home screen.'],
            ['🗑', 'Prune dead ends', 'Right-click any tree node to delete it and all its children — keeping your tree focused.'],
          ] as [string, string, string][]
        ).map(([icon, label, desc], i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="shrink-0 text-base leading-5 mt-0.5">{icon}</span>
            <span>
              <strong className="text-white">{label}</strong>
              {' — '}
              {desc}
            </span>
          </li>
        ))}
      </ol>
    ),
  },
  {
    title: 'What about YouTube deep dives?',
    body: (
      <div className="space-y-3 text-sm text-white/55 leading-relaxed">
        <p>
          YouTube is one of the richest places to fall down a research rabbit hole — one video&apos;s
          recommendations lead to the next. scienium lets you <strong className="text-white">capture
          that rabbit hole as a tree</strong>, right alongside your Wikipedia explorations.
        </p>
        <p>
          In the explorer, flip the <strong className="text-white">📄 Wiki / ▶ YouTube</strong> toggle
          to YouTube. Keep watching videos on YouTube as you normally would — when one is worth keeping,
          copy its link, come back to scienium, and press <strong className="text-white">⌘V / Ctrl+V</strong>.
          The video is added to your tree and plays right inside the app.
        </p>
        <p>
          Each video you add <strong className="text-white">branches off the one you&apos;re on</strong>,
          so your tree maps the exact path you took. You can even bridge sources — paste a video while
          reading a Wikipedia article and it attaches as a child of that article. Unrelated dives simply
          stay as separate trees.
        </p>
      </div>
    ),
  },
]

// ── Props ───────────────────────────────────────────────────────────────────

interface Props {
  starredNodes: DiscoveryNode[]
  hasExisting: boolean
  finalTopic: string | null
  // Edit state lifted to `useFinalTopic` (via DiscoveryFeature) — the same
  // machine FinalTopicBar drives, so the two "edit the final topic" widgets
  // don't each hand-roll their own editing/draft state.
  editingTopic: boolean
  topicDraft: string
  onDraftChange: (draft: string) => void
  onBeginEdit: (initialDraft: string) => void
  onSave: (topic: string) => void
  onCancelEdit: () => void
  onContinue: () => void
  onOpenStarred: (nodeId: string) => void
  // ── Team interests (#2) ──
  interests: Interest[]
  currentUserId: string | null
  onAddInterest: (text: string) => void
  onRemoveInterest: (id: string) => void
  onSeedInterest: (text: string) => void
}

// ── Component ───────────────────────────────────────────────────────────────

export function DiscoveryHome({
  starredNodes,
  hasExisting,
  finalTopic,
  editingTopic,
  topicDraft,
  onDraftChange,
  onBeginEdit,
  onSave,
  onCancelEdit,
  onContinue,
  onOpenStarred,
  interests,
  currentUserId,
  onAddInterest,
  onRemoveInterest,
  onSeedInterest,
}: Props) {
  const [open, toggle] = useToggleSet<number>()

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">

        {/* ── Hero ── */}
        <div className="text-center space-y-3">
          <div className="text-5xl mb-2">🔭</div>
          <h1 className="font-pixel text-[14px] text-white">Topic Discovery</h1>
          <p className="font-pixel text-[8px] text-white/40 max-w-sm mx-auto leading-loose">
            Explore ideas through Wikipedia — let curiosity branch your thinking.
          </p>
        </div>

        {/* ── Final topic ── */}
        {(finalTopic || editingTopic) && (
          <div className="rounded-sm border border-[#F5C518]/30 bg-[#F5C518]/[0.06] px-4 py-3 flex items-center gap-3">
            <span className="text-base shrink-0">🎯</span>
            <div className="min-w-0 flex-1">
              <p className="font-pixel text-[7px] text-[#F5C518]/70 uppercase tracking-widest mb-1">Final research topic</p>
              {editingTopic ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={topicDraft}
                    onChange={(e) => onDraftChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && topicDraft.trim()) onSave(topicDraft.trim())
                      if (e.key === 'Escape') onCancelEdit()
                    }}
                    className="flex-1 bg-transparent border-b border-[#F5C518]/50 text-sm text-white/90 outline-none focus:border-[#F5C518] pb-0.5 min-w-0"
                    placeholder="Type your research topic…"
                  />
                  <button
                    onClick={() => topicDraft.trim() && onSave(topicDraft.trim())}
                    disabled={!topicDraft.trim()}
                    className="text-[#F5C518] hover:text-[#F5C518]/80 disabled:opacity-30 shrink-0"
                    title="Save"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={onCancelEdit}
                    className="text-white/40 hover:text-white/60 shrink-0"
                    title="Cancel"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <p className="text-sm text-white/90">{finalTopic}</p>
              )}
            </div>
            {!editingTopic && (
              <button
                onClick={() => onBeginEdit(finalTopic ?? '')}
                className="text-white/40 hover:text-[#F5C518]/70 shrink-0 transition-colors"
                title="Edit research topic"
              >
                <Pencil size={13} />
              </button>
            )}
          </div>
        )}

        {/* ── Accordion ── */}
        <div className="space-y-2">
          {ITEMS.map((item, i) => {
            const isOpen = open.has(i)
            return (
              <div
                key={i}
                className="border border-white/10 rounded-sm overflow-hidden bg-white/[0.02]"
              >
                <button
                  onClick={() => toggle(i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.04] transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="font-pixel text-[9px] text-white/90">{item.title}</span>
                  <span
                    className={`text-white/40 text-[10px] transition-transform duration-200 ml-4 shrink-0 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  >
                    ▼
                  </span>
                </button>

                {/* Smooth expand/collapse via animated grid rows (0fr → 1fr) */}
                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                    isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="px-5 pb-5 pt-3 border-t border-white/10 bg-black/20">
                      {item.body}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Team interests (#2) — one-tap start chips ── */}
        <div className="rounded-sm border border-white/10 bg-white/[0.02] px-5 py-4">
          <InterestSeeds
            interests={interests}
            currentUserId={currentUserId}
            onAdd={onAddInterest}
            onRemove={onRemoveInterest}
            onSeed={onSeedInterest}
          />
        </div>

        {/* ── Starred topics ── */}
        {starredNodes.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-pixel text-[8px] uppercase tracking-widest flex items-center gap-2 text-white/60">
              <span className="text-[#F5C518]">★</span>
              Starred Topics
              <span className="text-white/40">({starredNodes.length})</span>
            </h2>
            <div className="grid gap-2">
              {starredNodes.map((n) => (
                <div
                  key={n.id}
                  className="flex items-center gap-2 px-4 py-3 rounded-sm border border-white/10 bg-white/[0.02] hover:border-[#F5C518]/30 transition-all group"
                >
                  <span className="text-[#F5C518] text-base shrink-0">★</span>
                  <button
                    onClick={() => { onOpenStarred(n.id); onContinue() }}
                    className="flex-1 text-left text-sm text-white/85 truncate hover:text-white transition-colors"
                    title="Open this topic"
                  >
                    {n.title}
                  </button>
                  <button
                    onClick={() => onSave(n.title)}
                    title="Make this your final research topic"
                    className={`font-pixel text-[7px] shrink-0 flex items-center gap-1 px-2 py-1 rounded-sm border transition-colors ${
                      finalTopic === n.title
                        ? 'border-[#F5C518]/50 text-[#F5C518]'
                        : 'border-white/15 text-white/40 hover:border-[#F5C518]/40 hover:text-[#F5C518]'
                    }`}
                  >
                    🎯 {finalTopic === n.title ? 'Topic' : 'Set topic'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CTA ── */}
        <button
          onClick={onContinue}
          className="w-full rounded-sm py-3.5 px-4 font-pixel text-[9px]
            bg-[#F5C518] text-[#0d1b2e]
            hover:brightness-110 active:scale-[0.98] transition-all"
        >
          {hasExisting ? '🌿 Continue Exploring' : '🚀 Start Exploring'}
        </button>

      </div>
    </div>
  )
}
