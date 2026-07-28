'use client'

import { Card } from '@/components/ui/Card'
import { fmtDate } from '@/lib/format'
import { Empty } from '../shared'
import type { ClassHistoryRow } from '../types'

/**
 * The reader `ClassMembershipEvent` never had (REFACTOR2 P1-R8).
 *
 * `ClassJoinRequest` is live state that mutates in place — a re-request resets
 * `decidedAt`/`decidedByUserId` — so the row says where a student stands and
 * nothing said what happened. The log has recorded it since v0.52.0 and no
 * surface showed it, which meant a teacher could see that a student was in their
 * class but never that they had been removed and re-added, or by whom.
 *
 * Rows arrive pre-scoped to this teacher's own classes; nothing here filters.
 */

/** Past tense, student-first — the log stores the transition, not a sentence. */
const EVENT_LABEL: Record<string, string> = {
  requested: 'Requested to join',
  approved: 'Approved',
  denied: 'Denied',
  withdrawn: 'Withdrew the request',
  revoked: 'Enrolment ended',
  superseded: 'Superseded by another class',
}

const ACTOR_LABEL: Record<ClassHistoryRow['actor'], string> = {
  student: 'the student',
  teacher: 'a teacher',
  system: 'automatic',
}

/** Colour carries the same distinction the two extra statuses exist to make. */
const EVENT_TONE: Record<string, string> = {
  approved: 'text-green-300 border-green-500/30 bg-green-500/5',
  denied: 'text-red-300 border-red-400/30 bg-red-500/5',
  revoked: 'text-orange-300 border-orange-400/30 bg-orange-500/5',
  withdrawn: 'text-white/60 border-white/15 bg-white/5',
}

export function ClassHistorySection({ rows }: { rows: ClassHistoryRow[] }) {
  if (rows.length === 0) {
    return <Empty>No class membership history for this student in your classes.</Empty>
  }

  return (
    <Card>
      <ol className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.id}
            data-testid={`class-history-${r.event}`}
            className="flex items-baseline justify-between gap-3 border-b border-white/5 pb-2 last:border-0 last:pb-0"
          >
            <span className="flex items-baseline gap-2 min-w-0">
              <span
                className={`shrink-0 text-[11px] rounded-full border px-2 py-0.5 ${
                  EVENT_TONE[r.event] ?? 'text-white/60 border-white/15 bg-white/5'
                }`}
              >
                {EVENT_LABEL[r.event] ?? r.event}
              </span>
              <span className="text-sm text-white/70 truncate">{r.className}</span>
              <span className="text-xs text-white/35 shrink-0">by {ACTOR_LABEL[r.actor]}</span>
            </span>
            <span className="text-xs text-white/40 tabular-nums shrink-0">
              {fmtDate(r.createdAt)}
            </span>
          </li>
        ))}
      </ol>
    </Card>
  )
}
