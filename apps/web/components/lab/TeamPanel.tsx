'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ModalBackdrop } from '@/components/ui/ModalBackdrop'
import { Users, Crown, Copy, Check, X, UserPlus, GraduationCap, LogOut, UserMinus } from 'lucide-react'
import { PixelSkeleton } from '@/components/ui/PixelSkeleton'
import { PanelListSkeleton } from '@/components/ui/skeletons/PanelListSkeleton'
import { BusyButton } from '@/components/ui/BusyButton'
import { ApiError } from '@/lib/api/client'
import { getTeam, mintInvite, joinClass as postJoinClass, type TeamData } from './teamApi'

/**
 * Team panel (Feature 1b) — opened from the team name in the status strip. Shows
 * the lab roster + capacity, and lets the lead mint a single-use join code to
 * share. Mirrors the lab's pixel-frame chrome and the dark literature styling.
 *
 * Membership lifecycle (REFACTOR2 P1-R8) lives here too: the lead can hand over
 * the lead role or remove a researcher, and anyone can leave. Leaving states its
 * consequence BEFORE it happens — handing over the lead, or archiving the lab
 * when you are the last one out — because those are exactly the outcomes a
 * student would not predict from the word "leave".
 *
 * Switching labs is NOT here: it happens by entering another lab's join code,
 * which departs this one in the same transaction. One lab at a time.
 */

export function TeamPanel({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const [data, setData] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [minting, setMinting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [classCode, setClassCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [classError, setClassError] = useState<string | null>(null)
  // Set after a successful request that's awaiting the teacher's approval.
  const [classPending, setClassPending] = useState<string | null>(null)
  const [leavingClass, setLeavingClass] = useState(false)
  const [confirmLeaveClass, setConfirmLeaveClass] = useState(false)
  /** Which membership action is in flight, so only that row shows a spinner. */
  const [busyMember, setBusyMember] = useState<string | null>(null)
  /** The change landed, but the roster below it could not be re-read (§0.8). */
  const [staleRoster, setStaleRoster] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    getTeam()
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load team'))
      .finally(() => setLoading(false))
  }, [])

  async function mintCode() {
    setMinting(true)
    setError(null)
    try {
      const invite = await mintInvite()
      setData((prev) => (prev ? { ...prev, invite } : prev))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create a code')
    } finally {
      setMinting(false)
    }
  }

  /**
   * Re-read the roster after a membership change rather than patching it
   * locally. NEVER throws: the change it follows has already committed, so a
   * failed re-read is a stale LIST, not a failed action, and reporting it as the
   * latter is exactly what this used to do. Same shape as `TeacherRoster`'s
   * `rosterRefreshError` after an approval.
   */
  async function refresh() {
    try {
      setData(await getTeam())
      setStaleRoster(false)
    } catch {
      setStaleRoster(true)
    }
  }

  async function makeLead(userId: string) {
    setBusyMember(userId)
    setError(null)
    try {
      const res = await fetch('/api/team/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId: userId }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Could not hand over the lead role')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not hand over the lead role')
    } finally {
      setBusyMember(null)
    }
  }

  async function removeMember(userId: string) {
    setBusyMember(userId)
    setError(null)
    try {
      const res = await fetch(`/api/team/members/${userId}`, { method: 'DELETE' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Could not remove that researcher')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove that researcher')
    } finally {
      setBusyMember(null)
    }
  }

  async function leaveLab() {
    setLeaving(true)
    setError(null)
    try {
      const res = await fetch('/api/team/membership', { method: 'DELETE' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Could not leave the lab')
      // No active team any more — a full navigation, not a client route change,
      // so every server component re-resolves against the new state.
      window.location.href = '/onboarding'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not leave the lab')
      setLeaving(false)
    }
  }

  function copyCode() {
    if (!data?.invite) return
    navigator.clipboard?.writeText(data.invite.code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  /**
   * Leave the class (REFACTOR2 P1-R8, class half). Until this existed there was
   * no way out of a class from the student's side — a wrong-class enrolment, and
   * the teacher visibility it grants, was permanent.
   */
  async function leaveClass() {
    if (leavingClass) return
    setLeavingClass(true)
    setClassError(null)
    try {
      const res = await fetch('/api/class/membership', { method: 'DELETE' })
      const out = await res.json()
      if (!res.ok) throw new Error(out.error ?? 'Could not leave that class')
      setData((prev) => (prev ? { ...prev, myClass: null } : prev))
      setConfirmLeaveClass(false)
    } catch (err) {
      setClassError(err instanceof Error ? err.message : 'Could not leave that class')
    } finally {
      setLeavingClass(false)
    }
  }

  async function joinClass(e: FormEvent) {
    e.preventDefault()
    const code = classCode.trim()
    if (!code) return
    setJoining(true)
    setClassError(null)
    setClassPending(null)
    try {
      const d = await postJoinClass(code)
      if (d.status === 'approved') {
        // Already enrolled in this class — reflect it immediately.
        setData((prev) => (prev ? { ...prev, myClass: { id: d.classId, name: d.className } } : prev))
      } else {
        // Pending teacher approval — not yet on the roster.
        setClassPending(d.className)
      }
      setClassCode('')
    } catch (err) {
      setClassError(err instanceof ApiError ? err.message : 'Could not join that class')
    } finally {
      setJoining(false)
    }
  }

  /** Who inherits the lead if the current lead leaves — longest-standing member. */
  const nextLeadName = data?.members.find((m) => !m.isYou)?.name ?? null
  const full = data ? data.memberCount >= data.maxMembers : false

  return (
    <ModalBackdrop label="Team" onClose={onClose} initialFocusRef={closeRef}>
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
            <div className="flex flex-col gap-3" data-testid="team-panel-skeleton">
              <div className="flex items-baseline justify-between">
                <PixelSkeleton variant="line" h="h-4" w="w-32" />
                <PixelSkeleton variant="line" h="h-3" w="w-20" />
              </div>
              <PanelListSkeleton rows={3} />
            </div>
          ) : error && !data ? (
            <p className="font-pixel text-[8px] text-red-400 text-center py-6">{error}</p>
          ) : data ? (
            <>
              {/* Roster */}
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="font-pixel text-[9px] text-white/90">{data.name}</h3>
                  <span className="font-pixel text-[8px] text-white/40">
                    {data.memberCount} / {data.maxMembers} researchers
                  </span>
                </div>
                <p className="font-pixel text-[7px] text-white/40 leading-loose mb-2">
                  Each researcher earns KP independently — it all adds to your shared lab total,
                  shown the same for everyone.
                </p>
                {staleRoster && (
                  <div
                    data-testid="team-roster-stale"
                    className="flex items-center justify-between gap-3 border border-amber-400/25 bg-amber-400/10 rounded-sm px-3 py-2 mb-2"
                  >
                    <span className="font-pixel text-[7px] text-amber-300 leading-loose">
                      That change was saved — but this list may be out of date.
                    </span>
                    <button
                      type="button"
                      onClick={() => void refresh()}
                      className="shrink-0 font-pixel text-[7px] text-white/60 border border-white/20 rounded-sm px-2 py-1 hover:border-[#F5C518]/50 hover:text-[#F5C518] transition-colors"
                    >
                      Try again
                    </button>
                  </div>
                )}
                <ul className="flex flex-col gap-1.5">
                  {data.members.map((m, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 px-3 py-2 bg-white/4 border border-white/10 rounded-sm"
                    >
                      {m.role === 'lead' ? (
                        <Crown size={12} className="text-[#F5C518] shrink-0" />
                      ) : (
                        <Users size={12} className="text-white/40 shrink-0" />
                      )}
                      <span className="text-sm text-white/85 truncate">{m.name}</span>
                      {m.isYou && (
                        <span className="font-pixel text-[6px] text-white/40 uppercase tracking-widest">
                          you
                        </span>
                      )}
                      {data.isLead && !m.isYou ? (
                        <span className="ml-auto flex items-center gap-1.5">
                          <BusyButton
                            busy={busyMember === m.userId}
                            onClick={() => makeLead(m.userId)}
                            title={`Make ${m.name} the lab lead`}
                            className="font-pixel text-[6px] uppercase tracking-widest text-white/50 border border-white/15 px-2 py-1 rounded-sm hover:text-[#F5C518] hover:border-[#F5C518]/40 disabled:opacity-40 transition-colors"
                          >
                            Make lead
                          </BusyButton>
                          <BusyButton
                            busy={busyMember === m.userId}
                            onClick={() => removeMember(m.userId)}
                            title={`Remove ${m.name} from the lab`}
                            className="font-pixel text-[6px] uppercase tracking-widest text-white/50 border border-white/15 px-2 py-1 rounded-sm hover:text-red-400 hover:border-red-400/40 disabled:opacity-40 transition-colors flex items-center gap-1"
                          >
                            <UserMinus size={9} /> Remove
                          </BusyButton>
                        </span>
                      ) : (
                        <span className="ml-auto font-pixel text-[6px] text-white/40 uppercase tracking-widest">
                          {m.role}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Your teacher's class — every member links individually */}
              <div className="border-t border-white/10 pt-4">
                <h3 className="font-pixel text-[8px] text-white/50 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <GraduationCap size={11} className="text-[#F5C518]" /> Your teacher&apos;s class
                </h3>
                {data.myClass ? (
                  <>
                    <p className="font-pixel text-[7px] text-white/40 leading-loose">
                      Connected to <span className="text-[#F5C518]">{data.myClass.name}</span> — your
                      teacher can see this lab&apos;s progress.
                    </p>
                    {confirmLeaveClass ? (
                      <div className="flex flex-col gap-2 mt-2">
                        <p className="font-pixel text-[7px] text-orange-300 leading-loose">
                          Leave {data.myClass.name}? You keep your lab and all of your work — your
                          teacher just stops seeing it.
                        </p>
                        <div className="flex items-center gap-2">
                          <BusyButton
                            busy={leavingClass}
                            busyLabel="Leaving…"
                            onClick={leaveClass}
                            data-testid="leave-class-confirm"
                            className="font-pixel text-[7px] bg-red-500/80 text-white px-3 py-1.5 rounded-sm hover:brightness-110 disabled:opacity-40 transition-all"
                          >
                            Confirm leave
                          </BusyButton>
                          <button
                            type="button"
                            onClick={() => setConfirmLeaveClass(false)}
                            className="font-pixel text-[7px] text-white/40 hover:text-white/70 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmLeaveClass(true)}
                        data-testid="leave-class"
                        className="mt-2 font-pixel text-[7px] text-white/40 hover:text-white/70 border border-white/15 rounded-sm px-2.5 py-1 transition-colors"
                      >
                        Leave this class
                      </button>
                    )}
                  </>
                ) : classPending ? (
                  <p className="font-pixel text-[7px] text-amber-300/80 leading-loose">
                    Request sent to <span className="text-[#F5C518]">{classPending}</span> — waiting
                    for your teacher to approve you before your lab is linked.
                  </p>
                ) : (
                  <p className="font-pixel text-[7px] text-white/40 leading-loose">
                    Not linked to a teacher yet. Enter the class code from your teacher — they&apos;ll
                    approve your request so they can follow your lab.
                  </p>
                )}
                <form onSubmit={joinClass} className="flex items-center gap-2 mt-3">
                  <input
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                    placeholder={data.myClass ? 'Switch class code' : 'Class code'}
                    maxLength={32}
                    className="flex-1 min-w-0 bg-[#0a1628] border border-white/20 text-white text-sm tracking-[0.2em] px-3 py-2.5 rounded-sm outline-none focus:border-[#F5C518]/60 transition-colors placeholder:text-white/40 placeholder:tracking-normal"
                  />
                  <BusyButton
                    busy={joining}
                    type="submit"
                    disabled={!classCode.trim()}
                    className="shrink-0 font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] px-3 py-2.5 rounded-sm hover:brightness-110 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
                  >
                    {data.myClass ? 'Switch' : 'Join'}
                  </BusyButton>
                </form>
                {classError && (
                  <p className="font-pixel text-[7px] text-red-400 mt-2">{classError}</p>
                )}
              </div>

              {/* Invite (lead only) */}
              {data.isLead ? (
                <div className="border-t border-white/10 pt-4">
                  <h3 className="font-pixel text-[8px] text-white/50 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <UserPlus size={11} className="text-[#F5C518]" /> Invite a researcher
                  </h3>
                  {full ? (
                    <p className="font-pixel text-[7px] text-white/40 leading-loose">
                      Your lab is full ({data.maxMembers} researchers). No seats to fill.
                    </p>
                  ) : (
                    <>
                      <p className="font-pixel text-[7px] text-white/40 leading-loose mb-3">
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
                      <BusyButton
                        busy={minting}
                        icon={<UserPlus size={11} />}
                        onClick={mintCode}
                        className="mt-3 w-full font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] py-2.5 rounded-sm hover:brightness-110 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
                      >
                        {data.invite ? 'Generate a new code' : 'Generate join code'}
                      </BusyButton>
                    </>
                  )}
                  {error && (
                    <p className="font-pixel text-[7px] text-red-400 mt-2">{error}</p>
                  )}
                </div>
              ) : (
                <p className="border-t border-white/10 pt-4 font-pixel text-[7px] text-white/40 leading-loose">
                  Only the lab lead can invite new researchers.
                </p>
              )}

              {/* Leave — states the consequence before it happens (P1-R8). */}
              <div className="border-t border-white/10 pt-4">
                <h3 className="font-pixel text-[8px] text-white/50 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <LogOut size={11} className="text-white/40" /> Leave this lab
                </h3>
                <p className="font-pixel text-[7px] text-white/40 leading-loose mb-3">
                  {data.memberCount === 1
                    ? 'You are the last researcher here. Leaving archives the lab — its sources, logs and showcase are kept and stay visible to your teacher, but nobody can work in it again.'
                    : data.isLead
                      ? `You are the lead, so ${nextLeadName ?? 'the longest-standing researcher'} takes over when you go. Your lab keeps everything you contributed.`
                      : 'Your lab keeps everything you contributed. You can join another lab with its join code.'}
                </p>
                {confirmLeave ? (
                  <div className="flex items-center gap-2">
                    <BusyButton
                      busy={leaving}
                      onClick={leaveLab}
                      className="flex-1 font-pixel text-[8px] bg-red-500/85 text-white py-2.5 rounded-sm hover:brightness-110 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
                    >
                      {data.memberCount === 1 ? 'Leave and archive the lab' : 'Yes, leave the lab'}
                    </BusyButton>
                    <button
                      onClick={() => setConfirmLeave(false)}
                      disabled={leaving}
                      className="shrink-0 font-pixel text-[8px] text-white/50 border border-white/20 px-3 py-2.5 rounded-sm hover:text-white/80 hover:border-white/40 disabled:opacity-40 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmLeave(true)}
                    className="w-full font-pixel text-[8px] text-white/60 border border-white/20 py-2.5 rounded-sm hover:text-red-300 hover:border-red-400/40 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <LogOut size={11} /> Leave lab
                  </button>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </ModalBackdrop>
  )
}
