// Small presentational helpers shared by the StudentDetail sections.

export function Field({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-white/40 w-28 shrink-0 text-xs">{label}</span>
      <span className="text-white/80">{value}</span>
    </div>
  )
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-white/30 py-2">{children}</p>
}
