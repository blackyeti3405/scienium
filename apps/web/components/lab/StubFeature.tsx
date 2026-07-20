'use client'

/**
 * Placeholder feature body for gateways whose internals aren't built yet.
 *
 * Only Discovery is a real feature today; the other six gateways open this until
 * their implementation lands. The spatial shell (LabScene + FeaturePanel) is
 * complete, so dropping a real feature in later is a one-line registry change —
 * no shell work. Mirrors the current placeholder content of each feature route.
 */
export function StubFeature({
  title,
  description,
  route,
}: {
  title: string
  description: string
  route: string
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="font-pixel text-[10px] text-muted-foreground">[ {title.toUpperCase()} ]</div>
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      <div className="mt-2 rounded-lg border border-dashed px-6 py-5 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">Coming soon</p>
        <p className="mt-1 text-xs">
          This feature&apos;s interface is in development. It will open right here, inside the lab.
        </p>
      </div>
      <p className="text-[11px] text-muted-foreground/60">
        Route: <code className="font-mono">{route}</code>
      </p>
    </div>
  )
}
