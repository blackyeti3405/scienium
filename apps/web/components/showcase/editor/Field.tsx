'use client'

/**
 * Labelled form row with an optional required star and character/word counter.
 *
 * Pass `htmlFor` (and give the control the matching `id`) whenever the row
 * wraps ONE form control: the caption then becomes a real `<label>` and names
 * it (§0.9 Row B — Short title / Full title / Abstract had only a placeholder).
 * Rows that wrap something else — a file dropzone, a group of radios — leave it
 * off deliberately, so the caption never mis-names a hidden file input.
 */
export function Field({
  label,
  required,
  counter,
  counterMax,
  htmlFor,
  children,
}: {
  label: string
  required?: boolean
  counter?: string
  counterMax?: boolean
  htmlFor?: string
  children: React.ReactNode
}) {
  const Caption = htmlFor ? 'label' : 'span'
  return (
    <div className="ops-field">
      <div className="sc-fhead">
        <Caption className="ops-label font-pixel" htmlFor={htmlFor}>
          {label}
          {required && <span className="sc-req">*</span>}
        </Caption>
        {counter && <span className={`sc-count ${counterMax ? 'sc-count--max' : ''}`}>{counter}</span>}
      </div>
      {children}
    </div>
  )
}
