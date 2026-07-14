'use client'

/**
 * Small presentational helpers shared by the Project Log and Failure Log tabs
 * (both timelines render the same avatar/label/date chrome) — extracted
 * verbatim from the old inlined `OperationsHubFeature`.
 */

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function Avatar({ name, size = 26 }: { name: string; size?: number }) {
  return (
    <span className="ops-avatar font-pixel" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {name[0]?.toUpperCase() ?? '?'}
    </span>
  )
}

export function SectionLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <p className="ops-label font-pixel">
      {children}
      {required && <span className="ops-label__req">*</span>}
    </p>
  )
}
