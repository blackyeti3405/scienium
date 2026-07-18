'use client'

import * as Sentry from '@sentry/nextjs'
import { Bug } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

/**
 * Give the widget the game's chrome: `font-pixel` titles/labels/buttons at the
 * app's tiny sizes, with the message textarea left in the readable body font.
 *
 * Why injected rather than written in globals.css: the widget lives in a shadow
 * root, so outer-document rules can only reach it through custom properties on
 * the host (that's where the base font/colors are set). Per-element styling has
 * to go inside — which the shadow root permits. This is purely cosmetic and
 * degrades safely: if Sentry renames these classes, the dialog simply keeps the
 * inherited Inter base from globals.css.
 */
const PIXEL_CHROME_CSS = `
  .dialog__title, .form__label__text, .btn, .form__error-container {
    font-family: var(--font-pixel), 'Courier New', monospace;
    letter-spacing: 0.03em;
    line-height: 1.8;
  }
  .dialog__title { font-size: 11px; }
  .form__label__text { font-size: 7px; text-transform: uppercase; opacity: 0.7; }
  .btn { font-size: 8px; padding: 10px 12px; border-radius: 2px; }
  .form__error-container { font-size: 7px; }
  /* The student's own words stay in the body font at a comfortable size. */
  .form__input--textarea {
    font-family: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    border-radius: 2px;
  }
`

function applyPixelChrome(): void {
  const host = document.getElementById('sentry-feedback')
  const root = host?.shadowRoot
  // Idempotent: the form is recreated per open, but guard anyway.
  if (!root || root.querySelector('[data-scienium-chrome]')) return
  const style = document.createElement('style')
  style.setAttribute('data-scienium-chrome', '')
  style.textContent = PIXEL_CHROME_CSS
  root.appendChild(style)
}

/**
 * "Report a bug" — opens the Sentry User Feedback form (configured in
 * instrumentation-client.ts with `autoInject: false`, so this button is the
 * ONE way in; no floating vendor widget). Renders nothing when Sentry is
 * disabled (no DSN — dev without env, E2E), so the chrome stays clean there.
 */
export function BugReportButton({ className }: { className?: string }) {
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    // getFeedback() resolves only when the SDK initialized with the
    // integration — i.e. a DSN was configured.
    setAvailable(Boolean(Sentry.getFeedback()))
  }, [])

  const openForm = useCallback(async () => {
    const feedback = Sentry.getFeedback()
    if (!feedback) return
    const form = await feedback.createForm()
    form.appendToDom()
    applyPixelChrome()
    form.open()
  }, [])

  if (!available) return null

  return (
    <button
      type="button"
      onClick={openForm}
      title="Report a bug — tell us what broke"
      aria-label="Report a bug"
      data-testid="bug-report-button"
      className={
        className ??
        'text-white/50 hover:text-[#F5C518] transition-colors flex items-center'
      }
    >
      <Bug size={16} />
    </button>
  )
}
