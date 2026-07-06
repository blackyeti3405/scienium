import { LabeledLoader } from '@/components/ui/LabeledLoader'

/**
 * `/game` is a pure redirect page with no layout of its own to skeleton — a
 * full-screen labeled loader covers the auth+role lookup before it chains
 * into the `(dashboard)` (or `(teacher)`) route's own `loading.tsx`.
 */
export default function GameLoading() {
  return (
    <div className="h-screen w-full bg-[#0d1b2e]">
      <LabeledLoader label="Entering your lab…" fill="panel" tone="gold" />
    </div>
  )
}
