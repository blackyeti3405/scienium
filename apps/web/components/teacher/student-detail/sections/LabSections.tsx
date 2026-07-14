'use client'

import { Activity, Coins, Zap } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { fmtDate } from '@/lib/format'
import { Empty } from '../shared'
import type { Overview } from '../types'

export function EconomySection({ overview }: { overview: Overview }) {
  const { team, studentKp } = overview
  const currency = team?.currency

  if (!currency) {
    return (
      <Card>
        <Empty>No economy data yet.</Empty>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-white/10 bg-[#0a1628] rounded-lg p-4 flex flex-col gap-2">
          <span className="text-white/40"><Coins size={16} /></span>
          <span className="text-2xl font-semibold tabular-nums text-[#F5C518]" data-testid="student-kp">
            {studentKp.toLocaleString()}
          </span>
          <span className="text-xs text-white/50">Student KP</span>
        </div>
        <div className="border border-white/10 bg-[#0a1628] rounded-lg p-4 flex flex-col gap-2">
          <span className="text-white/40"><Coins size={16} /></span>
          <span className="text-2xl font-semibold tabular-nums text-white">
            {currency.kp.toLocaleString()}
          </span>
          <span className="text-xs text-white/50">Team KP</span>
        </div>
        <div className="border border-white/10 bg-[#0a1628] rounded-lg p-4 flex flex-col gap-2">
          <span className="text-white/40"><Zap size={16} /></span>
          <span className="text-2xl font-semibold tabular-nums text-white">
            {currency.clearanceLevel}
          </span>
          <span className="text-xs text-white/50">Clearance Level</span>
        </div>
        <div className="border border-white/10 bg-[#0a1628] rounded-lg p-4 flex flex-col gap-2">
          <span className="text-white/40"><Activity size={16} /></span>
          <span className="text-2xl font-semibold tabular-nums text-white">
            {currency.lc.toLocaleString()}
          </span>
          <span className="text-xs text-white/50">Lab Credits</span>
        </div>
      </div>
    </div>
  )
}

export function BuildingsSection({ overview }: { overview: Overview }) {
  const { teamBuildings, shopBuildings } = overview
  const hasBuildings = teamBuildings.length > 0 || shopBuildings.length > 0

  if (!hasBuildings) {
    return (
      <Card>
        <Empty>No buildings yet.</Empty>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {teamBuildings.length > 0 && (
        <Card label="Gateway buildings">
          <ul className="space-y-2.5">
            {teamBuildings.map((b, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-white">{b.name}</span>
                  <span className="ml-2 text-white/50 text-xs">Lv {b.currentLevel}</span>
                </div>
                {b.lastUpgradedByName && (
                  <span className="text-white/35 text-xs">
                    upgraded by {b.lastUpgradedByName}
                    {b.lastUpgradedAt ? ` · ${fmtDate(b.lastUpgradedAt)}` : ''}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {shopBuildings.length > 0 && (
        <Card label="Shop buildings">
          <ul className="space-y-3">
            {shopBuildings.map((b, i) => (
              <li key={i} className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white text-sm">{b.name}</span>
                  {b.purchasedByName && (
                    <span className="text-white/35 text-xs">
                      {b.purchasedByName} · {fmtDate(b.purchasedAt)}
                    </span>
                  )}
                </div>
                <p className="text-white/50 text-xs">{b.description}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
