'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DialogVariant = 'confirm' | 'alert'
export type DialogTone = 'default' | 'danger'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  variant?: DialogVariant
  confirmLabel?: string
  tone?: DialogTone
  onConfirm: () => void
  onCancel: () => void
}

// ─── Presentational component ─────────────────────────────────────────────────

/**
 * Pixel-native dialog overlay — matches the FeaturePanel visual language
 * (dark bg, chunky border, font-pixel title bar, gold accents).
 *
 * Supports two variants:
 *  - 'confirm': Cancel + Confirm buttons (danger or default tone)
 *  - 'alert':   Single OK button
 *
 * Behaviour: Escape = cancel/dismiss, backdrop click = cancel/dismiss,
 * primary button is auto-focused, body scroll is locked while open.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  variant = 'confirm',
  confirmLabel = 'Delete',
  tone = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const primaryRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    // Autofocus primary button
    primaryRef.current?.focus()
    // Lock body scroll
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Escape dismisses
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCancel()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onCancel])

  if (!open) return null

  const isDanger = tone === 'danger'

  return (
    <div
      className="confirm-dialog__backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-testid="confirm-dialog"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div className="confirm-dialog">
        {/* Title bar — pixel chrome matching FeaturePanel */}
        <header className="confirm-dialog__bar">
          <span className="confirm-dialog__title font-pixel">{title}</span>
        </header>

        {/* Body */}
        <div className="confirm-dialog__body">
          <p className="confirm-dialog__message">{message}</p>
        </div>

        {/* Action row */}
        <div className="confirm-dialog__actions">
          {variant === 'confirm' && (
            <button
              type="button"
              className="confirm-dialog__btn confirm-dialog__btn--cancel font-pixel"
              onClick={onCancel}
              data-testid="confirm-dialog-cancel"
            >
              Cancel
            </button>
          )}
          <button
            ref={primaryRef}
            type="button"
            className={`confirm-dialog__btn font-pixel ${
              isDanger ? 'confirm-dialog__btn--danger' : 'confirm-dialog__btn--primary'
            }`}
            onClick={onConfirm}
            data-testid="confirm-dialog-confirm"
          >
            {variant === 'alert' ? 'OK' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Imperative hook ──────────────────────────────────────────────────────────

interface ConfirmOpts {
  title: string
  message: string
  confirmLabel?: string
  tone?: DialogTone
}

interface AlertOpts {
  title: string
  message: string
}

interface DialogState {
  open: boolean
  variant: DialogVariant
  title: string
  message: string
  confirmLabel: string
  tone: DialogTone
}

const CLOSED: DialogState = {
  open: false,
  variant: 'confirm',
  title: '',
  message: '',
  confirmLabel: 'Delete',
  tone: 'default',
}

/**
 * Imperative hook that exposes `confirm()` and `alert()` as Promises and
 * provides a `dialog` element to render once in the component's JSX.
 *
 * Usage:
 *   const { confirm, alert, dialog } = useConfirm()
 *   // in JSX: {dialog}
 *   // in handler: if (!(await confirm({ title, message }))) return
 */
export function useConfirm() {
  const [state, setState] = useState<DialogState>(CLOSED)
  // Store the resolver; only one dialog open at a time per hook instance.
  const resolverRef = useRef<((value: boolean) => void) | null>(null)

  const handleConfirm = useCallback(() => {
    setState(CLOSED)
    resolverRef.current?.(true)
    resolverRef.current = null
  }, [])

  const handleCancel = useCallback(() => {
    setState(CLOSED)
    resolverRef.current?.(false)
    resolverRef.current = null
  }, [])

  const confirm = useCallback(
    (opts: ConfirmOpts): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        resolverRef.current = resolve
        setState({
          open: true,
          variant: 'confirm',
          title: opts.title,
          message: opts.message,
          confirmLabel: opts.confirmLabel ?? 'Delete',
          tone: opts.tone ?? 'default',
        })
      })
    },
    [],
  )

  const alert = useCallback(
    (opts: AlertOpts): Promise<void> => {
      return new Promise<void>((resolve) => {
        resolverRef.current = () => resolve()
        setState({
          open: true,
          variant: 'alert',
          title: opts.title,
          message: opts.message,
          confirmLabel: 'OK',
          tone: 'default',
        })
      })
    },
    [],
  )

  const dialog = useMemo(
    () => (
      <ConfirmDialog
        open={state.open}
        title={state.title}
        message={state.message}
        variant={state.variant}
        confirmLabel={state.confirmLabel}
        tone={state.tone}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    ),
    [state, handleConfirm, handleCancel],
  )

  return { confirm, alert, dialog }
}
