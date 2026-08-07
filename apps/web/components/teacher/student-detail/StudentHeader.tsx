'use client'

import { Coins, Zap } from 'lucide-react'
import {
  PHASE_ORDER,
  PHASE_INFO,
  LAB_TYPE_LABELS,
  type Phase,
  type LabType,
} from '@/lib/phase'
import { fmtDate } from '@/lib/format'
import { RemoveFromClass } from './RemoveFromClass'
import { MakeLabLead } from './MakeLabLead'
import { AdvancePhase } from './AdvancePhase'
import type { Overview } from './types'

// ─── Student Identity Header ───────────────────────────────────────────────────

export function StudentHeader({ overview }: { overview: Overview }) {
  const { student, team, studentKp } = overview
  const phase = team?.phase as Phase | undefined
  const labTypeLabel = team?.labType
    ? (LAB_TYPE_LABELS[team.labType as LabType] ?? team.labType)
    : null
  const currentIdx = phase ? PHASE_ORDER.indexOf(phase) : -1

  // Initials avatar
  const initials = student.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div className="border border-white/10 bg-[#0a1628] rounded-lg p-5 space-y-5">
      {/* Top row: avatar + name + meta */}
      <div className="flex items-start gap-4">
        {/* Circular initials avatar */}
        <div className="shrink-0 w-12 h-12 rounded-full bg-[#F5C518]/15 border border-[#F5C518]/30 flex items-center justify-center">
          <span className="text-[#F5C518] text-sm font-semibold tabular-nums select-none">
            {initials || '?'}
          </span>
        </div>

        {/* Name + role + meta */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-semibold text-white leading-none">{student.name}</h1>
            {student.memberRole && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                  student.memberRole === 'lead'
                    ? 'bg-[#F5C518]/10 border-[#F5C518]/30 text-[#F5C518]'
                    : 'bg-white/5 border-white/15 text-white/60'
                }`}
              >
                {student.memberRole}
              </span>
            )}
          </div>
          {/* Meta row */}
          <p className="text-sm text-white/45 flex flex-wrap gap-x-2 gap-y-0.5">
            {team && <span>{team.name}</span>}
            {labTypeLabel && (
              <>
                <span className="text-white/40">·</span>
                <span>{labTypeLabel}</span>
              </>
            )}
            {student.class && (
              <>
                <span className="text-white/40">·</span>
                <span>{student.class.name}</span>
              </>
            )}
            <span className="text-white/40">·</span>
            <span>Joined {fmtDate(student.joinedAt ?? student.createdAt)}</span>
          </p>
          {/* Stat chips */}
          <div className="flex flex-wrap gap-2 pt-0.5">
            <span className="inline-flex items-center gap-1.5 text-xs bg-white/5 border border-white/10 rounded-full px-2.5 py-1">
              <Coins size={12} className="text-[#F5C518]" />
              <span className="tabular-nums text-white/80">
                {studentKp.toLocaleString()} KP
              </span>
            </span>
            {team?.currency && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-white/5 border border-white/10 rounded-full px-2.5 py-1">
                <Zap size={12} className="text-white/50" />
                <span className="tabular-nums text-white/80">
                  Clearance {team.currency.clearanceLevel}
                </span>
              </span>
            )}
          </div>
          {/* Membership authority a teacher can exercise (REFACTOR2 P1-R8):
              reassigning the lead, and ending the class enrolment. */}
          {(student.class || student.memberRole === 'member') && (
            <div className="pt-1 flex flex-wrap items-start gap-2">
              {student.memberRole === 'member' && (
                <MakeLabLead
                  studentId={student.id}
                  studentName={student.name}
                  currentLeadName={
                    team?.members?.find((m) => m.role === 'lead')?.user.name ?? null
                  }
                />
              )}
              {student.class && (
                <RemoveFromClass
                  studentId={student.id}
                  studentName={student.name}
                  className={student.class.name}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Phase stepper */}
      {team && (
        <div className="space-y-2">
          <p className="font-pixel text-[10px] text-[#F5C518] uppercase tracking-widest">
            Phase
          </p>
          <div className="flex items-center gap-0">
            {PHASE_ORDER.map((p, idx) => {
              const info = PHASE_INFO[p]
              const isCurrent = p === phase
              const isPast = idx < currentIdx
              const isLast = idx === PHASE_ORDER.length - 1
              return (
                <div key={p} className="flex items-center flex-1 min-w-0">
                  {/* Step node */}
                  <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isCurrent
                          ? 'bg-[#F5C518] ring-2 ring-[#F5C518]/30'
                          : isPast
                          ? 'bg-[#F5C518]/50'
                          : 'bg-white/15'
                      }`}
                    />
                    <span
                      className={`text-[10px] text-center leading-tight hidden sm:block truncate px-0.5 w-full ${
                        isCurrent
                          ? 'text-[#F5C518] font-medium'
                          : isPast
                          ? 'text-white/40'
                          : 'text-white/40'
                      }`}
                    >
                      {info.label}
                    </span>
                  </div>
                  {/* Connector line */}
                  {!isLast && (
                    <div
                      className={`h-px flex-1 shrink-0 mx-1 ${
                        idx < currentIdx ? 'bg-[#F5C518]/40' : 'bg-white/10'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
          {/* The teacher's lever. A classroom lab cannot advance itself — the
              student route refuses it with `teacherPaced` — so this is the only
              way a class moves forward. */}
          {phase && (
            <div className="pt-1">
              <AdvancePhase
                studentId={student.id}
                teamName={team.name}
                phase={phase}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
