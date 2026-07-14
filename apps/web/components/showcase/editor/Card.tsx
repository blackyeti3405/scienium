'use client'

/** Numbered section card for the showcase editor (badge + title + hint). */
export function Card({ n, title, hint, children }: { n: number; title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="ops-entry-card">
      <div className="ops-entry-card__head">
        <span className="ops-entry-card__badge font-pixel">{n}</span>
        <div className="flex flex-col min-w-0">
          <span className="font-pixel text-[9px] text-white">{title}</span>
          <span className="sc-cardhint">{hint}</span>
        </div>
      </div>
      <div className="ops-entry-card__body">{children}</div>
    </div>
  )
}
