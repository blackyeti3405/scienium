'use client'

import { useState } from 'react'
import { ExternalLink, ShieldOff, Undo2 } from 'lucide-react'
import { BusyButton } from '@/components/ui/BusyButton'
import {
  REPORT_REASON_LABELS,
  SHOWCASE_REPORT_REASONS,
  type ShowcaseReportReason,
} from '@/lib/showcase'
import { QueueNotice } from './DecisionControls'

/**
 * Reported / taken-down public showcases (REFACTOR2 P1-6).
 *
 * Sits ABOVE the pending queue on the moderation page, because a live page a
 * reader has objected to is more urgent than one waiting to go live. Everything
 * shown here is bounded data — counts, enum slugs, timestamps, the team name and
 * the project's own title. Nothing a REPORTER wrote reaches this screen, because
 * a reporter cannot write anything (see SHOWCASE_REPORT_REASONS).
 */

export interface FlaggedShowcase {
  id: string
  slug: string
  shortTitle: string
  title: string
  teamName: string
  previewUrl: string
  published: boolean
  moderationStatus: string
  takedownAt: string | null
  takedownReason: string | null
  reportCount: number
  reasons: { reason: string; count: number }[]
  /** True when at least one open report is about the revision live right now. */
  reportedCurrentRevision: boolean
  events: { id: string; action: string; note: string | null; createdAt: string }[]
}

const ENDPOINT = '/api/teacher/showcase-moderation'

function reasonLabel(reason: string): string {
  return REPORT_REASON_LABELS[reason as ShowcaseReportReason] ?? reason
}

export function FlaggedShowcases({
  flagged,
  onChanged,
}: {
  flagged: FlaggedShowcase[]
  onChanged: () => void
}) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<{ id: string; message: string } | null>(null)
  const [reasons, setReasons] = useState<Record<string, ShowcaseReportReason>>({})

  async function act(id: string, action: 'takedown' | 'restore') {
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch(ENDPOINT, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showcaseId: id,
          action,
          ...(action === 'takedown' ? { reason: reasons[id] ?? 'inappropriate' } : {}),
        }),
      })
      if (res.ok) onChanged()
      else {
        const body = await res.json().catch(() => null)
        setError({ id, message: body?.error ?? 'Could not apply that — try again.' })
      }
    } catch {
      setError({ id, message: 'Could not apply that — try again.' })
    } finally {
      setBusyId(null)
    }
  }

  if (flagged.length === 0) {
    return <QueueNotice>No reported or taken-down showcases.</QueueNotice>
  }

  return (
    <div className="space-y-4">
      {flagged.map((s) => {
        const down = s.takedownAt != null
        return (
          <div
            key={s.id}
            className={`border p-4 space-y-3 ${
              down ? 'border-red-400/40 bg-[#1a0d12]' : 'border-[#F5C518]/40 bg-[#0a1628]'
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-white font-medium">{s.teamName}</span>
              <a
                href={s.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-pixel text-[8px] text-[#F5C518]/70 hover:text-[#F5C518] transition-colors"
              >
                <ExternalLink size={10} /> View showcase
              </a>
            </div>

            <p className="text-xs text-white font-medium">{s.shortTitle || s.title}</p>

            <div className="flex flex-wrap items-center gap-2">
              {down ? (
                <span className="font-pixel text-[7px] border border-red-400/50 text-red-400 px-2 py-1">
                  Taken down {new Date(s.takedownAt!).toLocaleDateString()}
                  {s.takedownReason ? ` — ${reasonLabel(s.takedownReason)}` : ''}
                </span>
              ) : (
                <span className="font-pixel text-[7px] border border-[#F5C518]/50 text-[#F5C518] px-2 py-1">
                  {s.reportCount} open report{s.reportCount === 1 ? '' : 's'}
                </span>
              )}
              {s.reasons.map((r) => (
                <span
                  key={r.reason}
                  className="font-pixel text-[7px] border border-white/15 text-white/60 px-2 py-1"
                >
                  {reasonLabel(r.reason)} ×{r.count}
                </span>
              ))}
              {s.reportCount > 0 && (
                <span
                  className={`font-pixel text-[7px] px-2 py-1 border ${
                    s.reportedCurrentRevision
                      ? 'border-red-400/40 text-red-400/90'
                      : 'border-emerald-400/40 text-emerald-400/90'
                  }`}
                >
                  {s.reportedCurrentRevision
                    ? 'About the live version'
                    : 'Team has edited since'}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              {down ? (
                <BusyButton
                  busy={busyId === s.id}
                  busyLabel="Restoring…"
                  icon={<Undo2 size={12} />}
                  disabled={busyId !== null}
                  onClick={() => act(s.id, 'restore')}
                  className="inline-flex items-center gap-1.5 font-pixel text-[8px] border border-white/20 text-white/70 px-3 py-2 hover:border-emerald-400 hover:text-emerald-400 disabled:opacity-40 transition-all"
                >
                  Restore
                </BusyButton>
              ) : (
                <>
                  <select
                    value={reasons[s.id] ?? 'inappropriate'}
                    onChange={(e) =>
                      setReasons((r) => ({ ...r, [s.id]: e.target.value as ShowcaseReportReason }))
                    }
                    aria-label="Takedown reason"
                    className="bg-[#0d1b2e] border border-white/15 text-white text-xs px-2 py-2 outline-none focus:border-[#F5C518]/60"
                  >
                    {SHOWCASE_REPORT_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {REPORT_REASON_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  <BusyButton
                    busy={busyId === s.id}
                    busyLabel="Taking down…"
                    icon={<ShieldOff size={12} />}
                    disabled={busyId !== null}
                    onClick={() => act(s.id, 'takedown')}
                    className="inline-flex items-center gap-1.5 font-pixel text-[8px] border border-red-400/50 text-red-400 px-3 py-2 hover:bg-red-400/10 disabled:opacity-40 transition-all"
                  >
                    Take offline
                  </BusyButton>
                </>
              )}
              {error?.id === s.id && (
                <span className="font-pixel text-[7px] text-red-400">{error.message}</span>
              )}
            </div>

            {s.events.length > 0 && (
              <ul className="font-pixel text-[7px] text-white/35 space-y-1 border-t border-white/10 pt-2">
                {s.events.map((e) => (
                  <li key={e.id}>
                    {new Date(e.createdAt).toLocaleDateString()} · {e.action.replace(/_/g, ' ')}
                    {e.note ? ` · ${e.note}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
