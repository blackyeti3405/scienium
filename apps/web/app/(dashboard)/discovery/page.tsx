import { DiscoveryFeature } from '@/components/discovery/DiscoveryFeature'

export const metadata = { title: 'Discovery' }

/**
 * Standalone Discovery route. The primary way in is the Discovery building's
 * overlay on the lab scene; this route renders the same component full-screen for
 * deep-linking / back-compat.
 */
export default function DiscoveryPage() {
  return (
    <div className="h-screen">
      <DiscoveryFeature />
    </div>
  )
}
