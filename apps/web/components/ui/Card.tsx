import type { ReactNode } from 'react'

/**
 * Simple dark card surface matching the NOVA aesthetic.
 * Gold pixel-font label for section chrome; all data uses regular fonts.
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
        <h2 className="font-pixel text-[9px] text-[#F5C518] uppercase tracking-widest">
          {label}
        </h2>
      )}
      <div className="border border-white/10 bg-[#0a1628] p-4 space-y-2">{children}</div>
    </section>
  )
}

/** Small stat tile used in summary headers. */
export function StatTile({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent?: boolean
}) {
  return (
    <div className="border border-white/10 bg-[#0a1628] px-4 py-3 flex flex-col gap-0.5">
      <span className="font-pixel text-[7px] text-white/40 uppercase tracking-widest">{label}</span>
      <span className={`text-base font-medium ${accent ? 'text-[#F5C518]' : 'text-white'}`}>
        {value}
      </span>
    </div>
  )
}
