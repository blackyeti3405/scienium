'use client'

import { Activity, Coins, Zap } from 'lucide-react'
import { Card, StatTile } from '@/components/ui/Card'
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
        <StatTile
          icon={<Coins size={16} />}
          accent
          value={studentKp.toLocaleString()}
          label="Student KP"
          testId="student-kp"
        />
        <StatTile icon={<Coins size={16} />} value={currency.kp.toLocaleString()} label="Team KP" />
        <StatTile icon={<Zap size={16} />} value={currency.clearanceLevel} label="Clearance Level" />
        <StatTile icon={<Activity size={16} />} value={currency.lc.toLocaleString()} label="Lab Credits" />
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
