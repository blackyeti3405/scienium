'use client'

import { Printer } from 'lucide-react'

/**
 * Triggers the browser's native print dialog (the user picks "Save as PDF" or a
 * real printer there — scienium never renders PDF bytes itself). Lives in its own
 * client component because the one-pager route around it is a server component
 * and can't call `window.print()` directly.
 */
export function PrintButton() {
  return (
    <button type="button" className="sc-ghost font-pixel" onClick={() => window.print()}>
      <Printer size={11} /> Print / Save as PDF
    </button>
  )
}
