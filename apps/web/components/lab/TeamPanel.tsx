'use client'

import { useEffect, useRef, useState } from 'react'
import { Users, Crown, Copy, Check, Loader2, X, UserPlus } from 'lucide-react'

/**
 * Team panel (Feature 1b) — opened from the team name in the status strip. Shows
 * the lab roster + capacity, and lets the lead mint a single-use join code to
 * share. Mirrors the lab's pixel-frame chrome and the dark literature styling.
 */

interface Member {
  name: string
  role: 'lead' | 'member'
  isYou: boolean
}

interface TeamData {
  name: string
  maxMembers: number
  memberCount: number
  isLead: boolean
  members: Member[]
  invite: { code: string; expiresAt: string } | null
}

export function TeamPanel({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const [data, setData] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [minting, setMinting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  useEffect(() => {
    fetch('/api/team')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error)
        setData(d)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load team'))
      .finally(() => setLoading(false))
  }, [])

  async function mintCode() {
    setMinting(true)
    setError(null)
    try {
      const res = await fetch('/api/team/invite', { method: 'POST' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Could not create a code')
      setData((prev) => (prev ? { ...prev, invite: d.invite } : prev))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create a code')
    } finally {
      setMinting(false)
    }
  }

  function copyCode() {
    if (!data?.invite) return
    navigator.clipboard?.writeText(data.invite.code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const full = data ? data.memberCount >= data.maxMembers : false

  return (
    <div
      className="feature-panel__backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Team"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="flex flex-col w-[min(440px,94vw)] max-h-[80vh] bg-[#0d1b2e] text-white border-[3px] border-[#2a3048] rounded-[4px] overflow-hidden shadow-[0_0_0_3px_#10131f,0_18px_60px_rgba(0,0,0,0.6)]">
        <header className="flex items-center justify-between px-4 py-3 border-b-[3px] border-[#2a3048] bg-[#0f1320] shrink-0">
          <span className="font-pixel text-[10px] text-[#e8ecfb] flex items-center gap-2">
            <Users size={12} className="text-[#F5C518]" /> Your Lab
          </span>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="text-white/40 hover:text-white/70 transition-colors"
          >
            <X size={14} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-white/40">
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : error && !data ? (
            <p className="font-pixel text-[8px] text-red-400 text-center py-6">{error}</p>
          ) : data ? (
            <>
              {/* Roster */}
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="font-pixel text-[9px] text-white/90">{data.name}</h3>
                  <span className="font-pixel text-[8px] text-white/35">
                    {data.memberCount} / {data.maxMembers} researchers
                  </span>
                </div>
                <p className="font-pixel text-[7px] text-white/30 leading-loose mb-2">
                  Each researcher earns KP independently — it all adds to your shared lab total,
                  shown the same for everyone.
                </p>
                <ul className="flex flex-col gap-1.5">
                  {data.members.map((m, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 px-3 py-2 bg-white/4 border border-white/10 rounded-sm"
                    >
                      {m.role === 'lead' ? (
                        <Crown size={12} className="text-[#F5C518] shrink-0" />
                      ) : (
                        <Users size={12} className="text-white/30 shrink-0" />
                      )}
                      <span className="text-sm text-white/85 truncate">{m.name}</span>
                      {m.isYou && (
                        <span className="font-pixel text-[6px] text-white/30 uppercase tracking-widest">
                          you
                        </span>
                      )}
                      <span className="ml-auto font-pixel text-[6px] text-white/30 uppercase tracking-widest">
                        {m.role}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Invite (lead only) */}
              {data.isLead ? (
                <div className="border-t border-white/10 pt-4">
                  <h3 className="font-pixel text-[8px] text-white/50 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <UserPlus size={11} className="text-[#F5C518]" /> Invite a researcher
                  </h3>
                  {full ? (
                    <p className="font-pixel text-[7px] text-white/35 leading-loose">
                      Your lab is full ({data.maxMembers} researchers). No seats to fill.
                    </p>
                  ) : (
                    <>
                      <p className="font-pixel text-[7px] text-white/35 leading-loose mb-3">
                        Share a single-use code. Each member tracks their own source proficiency
                        and earns KP independently.
                      </p>
                      {data.invite ? (
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-center font-pixel text-[14px] tracking-[0.3em] text-[#F5C518] bg-[#0a1628] border border-[#F5C518]/30 py-2.5 rounded-sm">
                            {data.invite.code}
                          </code>
                          <button
                            onClick={copyCode}
                            title="Copy code"
                            className="shrink-0 p-2.5 border border-white/20 text-white/60 rounded-sm hover:border-white/40 hover:text-white/80 transition-colors"
                          >
                            {copied ? (
                              <Check size={14} className="text-green-400" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </div>
                      ) : null}
                      <button
                        onClick={mintCode}
                        disabled={minting}
                        className="mt-3 w-full font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] py-2.5 rounded-sm hover:brightness-110 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
                      >
                        {minting ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <UserPlus size={11} />
                        )}
                        {data.invite ? 'Generate a new code' : 'Generate join code'}
                      </button>
                    </>
                  )}
                  {error && (
                    <p className="font-pixel text-[7px] text-red-400 mt-2">{error}</p>
                  )}
                </div>
              ) : (
                <p className="border-t border-white/10 pt-4 font-pixel text-[7px] text-white/30 leading-loose">
                  Only the lab lead can invite new researchers.
                </p>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
