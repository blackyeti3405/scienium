export const metadata = { title: 'Research Plan' }

export default function ResearchPlanPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Research Plan</h1>
        <p className="text-muted-foreground mt-1">
          Define your hypothesis, methodology, variables, and study design.
        </p>
      </div>

      {/* TODO: Research planning tools — hypothesis builder, methodology designer,
          variable table, study design wizard */}
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
        <p className="font-semibold">Coming soon</p>
        <p className="text-sm mt-1">
          Research planning tools are in development for the Research Planning phase.
        </p>
      </div>
    </div>
  )
}
