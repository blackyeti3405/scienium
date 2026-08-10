import { notFound } from 'next/navigation'
import { SkeletonAudit } from './SkeletonAudit'

/**
 * DEV-ONLY skeleton audit harness.
 *
 * Renders each loading skeleton next to the real panel it stands in for, at the
 * same width, so the two can be measured against each other instead of eyeballed
 * from source. Skeletons that "look about right" in code are exactly how the
 * shapes drifted in the first place.
 *
 * Named `page.dev.tsx`, an extension `next.config` only resolves OUTSIDE
 * production — so a production build never compiles this route and it cannot be
 * reached on scienium.app. The `notFound()` below and the dev-only middleware
 * entry are belt-and-braces behind that.
 */
export default function SkeletonAuditPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <SkeletonAudit />
}
