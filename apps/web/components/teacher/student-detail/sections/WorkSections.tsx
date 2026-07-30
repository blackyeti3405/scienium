'use client'

import { Card } from '@/components/ui/Card'
import { fmtDate } from '@/lib/format'
import { Empty } from '../shared'
import type { Overview } from '../types'

export function LogsSection({ overview }: { overview: Overview }) {
  const { logs } = overview

  if (logs.length === 0) {
    return (
      <Card>
        <Empty>No project logs yet.</Empty>
      </Card>
    )
  }

  return (
    <Card>
      <ul className="space-y-5">
        {logs.map((log) => (
          <li key={log.id} className="space-y-1.5 border-l-2 border-white/10 pl-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  log.entryType === 'failure'
                    ? 'bg-orange-400/10 text-orange-400'
                    : 'bg-emerald-400/10 text-emerald-400'
                }`}
              >
                {log.entryType}
              </span>
              {log.stage && (
                <span className="text-xs text-white/40">{log.stage}</span>
              )}
              <span className="text-xs text-white/40">{fmtDate(log.createdAt)}</span>
              <span className="text-xs text-white/40">by {log.createdBy.name}</span>
            </div>
            <p className="text-sm text-white/75">{log.body}</p>

            {log.followups.length > 0 && (
              <ul className="mt-2 space-y-2 pl-2">
                {log.followups.map((fu, i) => (
                  <li key={i} className="space-y-0.5">
                    <p className="text-xs text-white/50 italic">{fu.question}</p>
                    {fu.response ? (
                      <p className="text-sm text-white/70">{fu.response}</p>
                    ) : (
                      <p className="text-xs text-white/40">Awaiting response…</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function DatasetsSection({ overview }: { overview: Overview }) {
  const { datasets } = overview

  if (datasets.length === 0) {
    return (
      <Card>
        <Empty>No datasets yet.</Empty>
      </Card>
    )
  }

  return (
    <Card>
      <ul className="space-y-2">
        {datasets.map((ds) => (
          <li key={ds.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 min-w-0">
              <span className="text-white/80 truncate">{ds.name}</span>
              <span className="shrink-0 text-[10px] uppercase tracking-wide text-white/40">
                {ds.tableType}
              </span>
            </span>
            <span className="text-white/40 tabular-nums text-xs shrink-0">
              {ds.rowCount} row{ds.rowCount !== 1 ? 's' : ''}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
