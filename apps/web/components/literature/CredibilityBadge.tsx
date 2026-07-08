import type { CredibilityTier } from '@prisma/client'
import { tierMeta } from '@/lib/discovery/credibility'

/**
 * Credibility badge — color + text label (never color alone), copying the
 * Discovery `SourceReader.tsx` badge's inline-style pattern so the same tier
 * always looks the same across the app. `tier` is `undefined`/`null` for a
 * self-uploaded source with no derivable signal.
 */
export function CredibilityBadge({ tier }: { tier?: CredibilityTier | null }) {
  const meta = tierMeta(tier ?? null)
  return (
    <span
      title={meta.caveat}
      data-tier={tier ?? 'self_uploaded'}
      className="font-pixel text-[7px] px-1.5 py-0.5 rounded-sm cursor-help shrink-0"
      style={{ color: meta.color, border: `1px solid ${meta.color}55`, background: `${meta.color}12` }}
    >
      {meta.label}
    </span>
  )
}
