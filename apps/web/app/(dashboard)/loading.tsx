import { LabPageSkeleton } from '@/components/ui/skeletons/LabPageSkeleton'

/**
 * Route-level fallback for the entire `(dashboard)` group — the app's home
 * surface, hit on every login. Renders the lab-scene skeleton immediately so
 * navigation never lands on a blank screen while the server component
 * resolves the team/currency/plot query. Kept import-light: this pulls in
 * only `PixelSkeleton` (no hooks, no client-only chunks).
 */
export default function DashboardLoading() {
  return <LabPageSkeleton />
}
