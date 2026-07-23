'use client'

import Link from 'next/link'
import { ExternalLink, FileText, Trophy } from 'lucide-react'
import { Card, StatTile } from '@/components/ui/Card'
import { Field, Empty } from '../shared'
import type { Overview } from '../types'

export function ShowcaseSection({ overview }: { overview: Overview }) {
  const { showcase } = overview

  if (!showcase) {
    return (
      <Card>
        <Empty>No showcase published yet.</Empty>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <StatTile icon={<Trophy size={16} />} value={showcase._count.views.toLocaleString()} label="Views" />
        <StatTile icon={<FileText size={16} />} value={showcase._count.assets} label="Assets" />
      </div>

      <Card>
        <div className="space-y-2.5">
          <Field label="Privacy" value={showcase.privacyLevel.replace(/_/g, ' ')} />
          <Field
            label="Status"
            value={
              <span
                className={
                  showcase.moderationStatus === 'approved'
                    ? 'text-emerald-400'
                    : showcase.moderationStatus === 'rejected'
                    ? 'text-red-400'
                    : 'text-white/70'
                }
              >
                {showcase.moderationStatus.replace(/_/g, ' ')}
              </span>
            }
          />
          <div className="pt-1">
            <Link
              href={`/showcase/${showcase.slug}`}
              className="inline-flex items-center gap-1.5 text-sm text-[#F5C518] hover:brightness-110 transition-all"
              target="_blank"
              rel="noopener noreferrer"
            >
              View showcase <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}

export function ScienceFairSection({ overview }: { overview: Overview }) {
  const { fairAssociations, formStatuses } = overview

  return (
    <div className="space-y-4">
      <Card label="Registered fairs">
        {fairAssociations.length > 0 ? (
          <ul className="space-y-2">
            {fairAssociations.map((fa, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="text-white/80">{fa.fair.name}</span>
                <span className="text-white/40 text-xs">{fa.fair.level}</span>
                {fa.isPrimary && (
                  <span className="text-xs text-[#F5C518] bg-[#F5C518]/10 border border-[#F5C518]/20 rounded-full px-1.5 py-0.5">
                    primary
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No fairs registered.</Empty>
        )}
      </Card>

      {formStatuses.length > 0 && (
        <Card label="Form statuses">
          <ul className="space-y-2">
            {formStatuses.map((fs, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-white/75">{fs.form.name}</span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    fs.status === 'complete'
                      ? 'bg-emerald-400/10 text-emerald-400'
                      : fs.status === 'in_progress'
                      ? 'bg-amber-400/10 text-amber-400'
                      : 'bg-white/5 text-white/40'
                  }`}
                >
                  {fs.status.replace(/_/g, ' ')}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
