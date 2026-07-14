'use client'

/** Labelled form row with an optional required star and character/word counter. */
export function Field({
  label,
  required,
  counter,
  counterMax,
  children,
}: {
  label: string
  required?: boolean
  counter?: string
  counterMax?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="ops-field">
      <div className="sc-fhead">
        <span className="ops-label font-pixel">
          {label}
          {required && <span className="sc-req">*</span>}
        </span>
        {counter && <span className={`sc-count ${counterMax ? 'sc-count--max' : ''}`}>{counter}</span>}
      </div>
      {children}
    </div>
  )
}
