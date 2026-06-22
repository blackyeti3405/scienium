import type { ReactNode } from 'react'

/**
 * Dark card surface matching the NOVA aesthetic.
 * Gold pixel-font eyebrow label for section chrome; data uses regular fonts.
 */
export function Card({
  label,
  children,
  className,
}: {
  label?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`space-y-2 ${className ?? ''}`}>
      {label && (
        <h2 className="font-pixel text-[10px] text-[#F5C518] uppercase tracking-widest">
          {label}
        </h2>
      )}
      <div className="border border-white/10 bg-[#0a1628] rounded-lg p-4 space-y-2">
        {children}
      </div>
    </section>
  )
}

/**
 * Stat tile used in summary grids.
 * Use within: grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4
 */
export function StatTile({
  label,
  value,
  accent,
  icon,
}: {
  label: string
  value: string | number
  accent?: boolean
  icon?: ReactNode
}) {
  return (
    <div className="border border-white/10 bg-[#0a1628] rounded-lg p-4 flex flex-col gap-2">
      {icon && (
        <span className={`${accent ? 'text-[#F5C518]' : 'text-white/40'}`}>{icon}</span>
      )}
      <span
        className={`text-2xl font-semibold tabular-nums leading-none ${
          accent ? 'text-[#F5C518]' : 'text-white'
        }`}
      >
        {value}
      </span>
      <span className="text-xs text-white/50 leading-tight">{label}</span>
    </div>
  )
}
