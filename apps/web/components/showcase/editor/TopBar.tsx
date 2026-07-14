'use client'

import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  Eye,
  Globe,
  PenLine,
  Printer,
} from 'lucide-react'
import type { Showcase } from '@/components/showcase/useShowcaseEditor'

/** Top status bar: draft/published + moderation pills, view count, and the
 *  print / copy-link / view actions. */
export function TopBar({
  sc,
  publicUrl,
  notice,
  flashNotice,
}: {
  sc: Showcase | null
  publicUrl: string | null
  notice: string | null
  flashNotice: (msg: string) => void
}) {
  return (
    <div className="sc-topbar">
      <div className="sc-topbar__id">
        <span className={`sc-pill font-pixel ${sc?.published ? 'sc-pill--live' : 'sc-pill--draft'}`}>
          {sc?.published ? <Globe size={10} /> : <PenLine size={10} />}
          {sc?.published ? 'Published' : 'Draft'}
        </span>
        {sc?.published && sc.privacyLevel === 'public' && (
          <span
            className={`sc-pill font-pixel ${
              sc.moderationStatus === 'approved'
                ? 'sc-pill--live'
                : sc.moderationStatus === 'rejected'
                ? 'sc-pill--draft'
                : 'sc-pill--draft'
            }`}
            style={
              sc.moderationStatus === 'pending_review'
                ? { color: '#F5C518', borderColor: '#F5C518' }
                : sc.moderationStatus === 'rejected'
                ? { color: '#f87171', borderColor: '#f87171' }
                : undefined
            }
          >
            {sc.moderationStatus === 'approved' && <Check size={10} />}
            {sc.moderationStatus === 'pending_review' && <Globe size={10} />}
            {sc.moderationStatus === 'rejected' && <AlertTriangle size={10} />}
            {sc.moderationStatus === 'approved'
              ? 'Approved · live in gallery'
              : sc.moderationStatus === 'pending_review'
              ? 'Pending teacher review'
              : 'Changes requested'}
          </span>
        )}
        {sc && (
          <span className="sc-views" title="Total views">
            <Eye size={12} /> {sc.views.toLocaleString()}
          </span>
        )}
      </div>
      <div className="sc-topbar__right">
        {notice && <span className="sc-notice font-pixel">✓ {notice}</span>}
        {!!sc && !!publicUrl && (
          <a
            className="sc-ghost font-pixel"
            href={`${publicUrl}?print=1`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Printer size={11} /> Print one-pager
          </a>
        )}
        {sc?.published && publicUrl && sc.moderationStatus === 'approved' && (
          <>
            <button
              className="sc-ghost font-pixel"
              onClick={() => {
                navigator.clipboard?.writeText(`${window.location.origin}${publicUrl}`)
                flashNotice('Link copied')
              }}
            >
              <Copy size={11} /> Copy link
            </button>
            <a className="sc-ghost font-pixel" href={publicUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={11} /> View
            </a>
          </>
        )}
        {sc?.published && publicUrl && sc.moderationStatus !== 'approved' && (
          <a className="sc-ghost font-pixel" href={publicUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={11} /> Preview
          </a>
        )}
      </div>
    </div>
  )
}
