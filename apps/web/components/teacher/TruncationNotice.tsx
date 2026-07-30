import { AlertTriangle } from 'lucide-react'

/**
 * "This list is partial" banner (P2-1). A bounded teacher read may serve fewer
 * students than the class scope contains; what it may never do is let the
 * teacher believe the partial list is the whole class. Same amber treatment as
 * the roster's refresh warning.
 */
export function TruncationNotice({ limit, noun }: { limit: number; noun: string }) {
  return (
    <div
      role="status"
      data-testid="truncation-notice"
      className="flex items-start gap-2.5 rounded-lg border border-amber-400/25 bg-amber-400/10 px-4 py-2.5"
    >
      <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-300" aria-hidden />
      <span className="text-sm text-amber-300">
        Showing the first {limit.toLocaleString()} {noun}. Your classes hold more than this view can
        load at once — narrow your classes, or contact support.
      </span>
    </div>
  )
}
