'use client'

import { useState } from 'react'
import { Flag } from 'lucide-react'
import { BusyButton } from '@/components/ui/BusyButton'
import {
  REPORT_REASON_LABELS,
  SHOWCASE_REPORT_REASONS,
  type ShowcaseReportReason,
} from '@/lib/showcase'

/**
 * "Report this project" on a public showcase (REFACTOR2 P1-6).
 *
 * A `<details>` disclosure rather than a modal: it is native, keyboard- and
 * screen-reader-accessible with no focus-trap code, and a report control should
 * be findable without being loud. Pick a reason, send, done — there is no
 * free-text box anywhere in this flow on purpose (see SHOWCASE_REPORT_REASONS).
 *
 * The response is deliberately the same whether the report was new, a duplicate,
 * or dropped at the per-showcase ceiling: a reporter learns that it was
 * received, and nothing about the page's moderation state.
 */
export function ReportButton({ showcase }: { showcase: string }) {
  const [reason, setReason] = useState<ShowcaseReportReason>('inappropriate')
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle')

  async function send() {
    setState('busy')
    try {
      const res = await fetch('/api/showcase/public/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showcase, reason }),
      })
      setState(res.ok ? 'sent' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'sent') {
    return (
      <p className="sc-report sc-report--done font-pixel">
        Thanks — a teacher will review this.
      </p>
    )
  }

  return (
    <details className="sc-report">
      <summary className="sc-report__toggle font-pixel">
        <Flag size={11} aria-hidden="true" /> Report this project
      </summary>
      <div className="sc-report__body">
        <label className="sc-report__label font-pixel" htmlFor="sc-report-reason">
          What&apos;s wrong with it?
        </label>
        <select
          id="sc-report-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value as ShowcaseReportReason)}
          className="sc-report__select"
        >
          {SHOWCASE_REPORT_REASONS.map((r) => (
            <option key={r} value={r}>
              {REPORT_REASON_LABELS[r]}
            </option>
          ))}
        </select>
        <BusyButton
          busy={state === 'busy'}
          busyLabel="Sending…"
          disabled={state === 'busy'}
          onClick={send}
          className="sc-report__send font-pixel"
        >
          Send report
        </BusyButton>
        {state === 'error' && (
          <span className="sc-report__error font-pixel">
            Couldn&apos;t send that — try again in a moment.
          </span>
        )}
      </div>
    </details>
  )
}
