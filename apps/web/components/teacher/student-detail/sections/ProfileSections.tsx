'use client'

import { Card } from '@/components/ui/Card'
import {
  PHASE_ORDER,
  PHASE_INFO,
  LAB_TYPE_LABELS,
  type Phase,
  type LabType,
} from '@/lib/phase'
import { fmtDate } from '@/lib/format'
import { Field, Empty } from '../shared'
import type { Overview } from '../types'

export function IdentitySection({ overview }: { overview: Overview }) {
  const { student, team } = overview
  const labTypeLabel = team?.labType
    ? (LAB_TYPE_LABELS[team.labType as LabType] ?? team.labType)
    : null

  return (
    <Card>
      <div className="space-y-2.5">
        <Field label="Name" value={student.name} />
        <Field label="Email" value={student.email} />
        {student.class && <Field label="Class" value={student.class.name} />}
        {student.memberRole && <Field label="Role" value={student.memberRole} />}
        <Field label="Joined" value={fmtDate(student.joinedAt ?? student.createdAt)} />
        {team && <Field label="Team" value={team.name} />}
        {labTypeLabel && <Field label="Lab type" value={labTypeLabel} />}
        {team?.topic && <Field label="Topic" value={team.topic} />}
        {team?.members && (
          <Field
            label="Team members"
            value={
              <span className="flex flex-wrap gap-1.5">
                {team.members.map((m) => (
                  <span
                    key={m.user.id}
                    className="text-xs bg-white/5 border border-white/10 rounded-full px-2 py-0.5 text-white/70"
                  >
                    {m.user.name}
                    {m.role === 'lead' && (
                      <span className="ml-1 text-[#F5C518]/70">★</span>
                    )}
                  </span>
                ))}
              </span>
            }
          />
        )}
      </div>
    </Card>
  )
}

export function PhaseSection({ overview }: { overview: Overview }) {
  const { team } = overview
  if (!team) return <Empty>No team yet.</Empty>

  const currentPhase = team.phase as Phase
  const currentIdx = PHASE_ORDER.indexOf(currentPhase)

  return (
    <div className="space-y-4">
      <Card>
        <div className="space-y-4">
          {/* Phase cards grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PHASE_ORDER.map((p, idx) => {
              const info = PHASE_INFO[p]
              const isCurrent = p === currentPhase
              const isPast = idx < currentIdx
              return (
                <div
                  key={p}
                  className={`rounded-md px-3 py-2.5 border text-sm ${
                    isCurrent
                      ? 'border-[#F5C518]/50 bg-[#F5C518]/[0.06] text-white'
                      : isPast
                      ? 'border-white/10 bg-white/[0.02] text-white/40'
                      : 'border-white/5 text-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-medium">{info.label}</span>
                    {isCurrent && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F5C518] shrink-0" />
                    )}
                    {isPast && (
                      <span className="text-[#F5C518]/50 text-xs">✓</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

    </div>
  )
}
