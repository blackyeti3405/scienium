'use client'

/**
 * The "this didn't load — try again" surface that goes where the content would
 * have been. It exists so a failed load is never rendered as an EMPTY one: a
 * returning team that sees zero sources, zero citations or zero experiments
 * concludes their work is gone, and may redo it.
 *
 * Extracted from the four near-identical copies in `LiteratureFeature`,
 * `VocabPanel`, `CodexTab` and `ExperimentDetail` when §0.9 Row C2 added the
 * fifth through ninth — same markup, one place.
 */
export function LoadRetry({
  message,
  onRetry,
  className = '',
  testId,
}: {
  message: string
  onRetry: () => void
  className?: string
  testId?: string
}) {
  return (
    <div
      data-testid={testId}
      className={`border border-dashed border-red-400/25 rounded-sm py-10 text-center flex flex-col items-center gap-3 ${className}`}
    >
      <p className="font-pixel text-[9px] text-red-300">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="font-pixel text-[8px] border border-white/20 text-white/60 px-4 py-2 rounded-sm hover:border-[#F5C518]/50 hover:text-[#F5C518] transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
