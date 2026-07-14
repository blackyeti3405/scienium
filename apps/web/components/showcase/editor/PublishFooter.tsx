'use client'

import { Rocket } from 'lucide-react'
import type { PrivacyLevel } from '@/lib/showcase'
import { BusyButton } from '@/components/ui/BusyButton'
import type { Showcase } from '@/components/showcase/useShowcaseEditor'
import { PRIVACY_ICON } from './PrivacyIcon'

/** Publish footer: completion/moderation status line + the publish toggle. */
export function PublishFooter({
  sc,
  privacy,
  doneCount,
  checklistLength,
  publishing,
  onPublishToggle,
}: {
  sc: Showcase | null
  privacy: PrivacyLevel
  doneCount: number
  checklistLength: number
  publishing: boolean
  onPublishToggle: () => void
}) {
  return (
    <div className="sc-publish">
      <div className="sc-publish__meta">
        <span className="font-pixel text-[9px] text-white">
          {sc?.published && sc.privacyLevel === 'public' && sc.moderationStatus === 'pending_review'
            ? 'Submitted for teacher review'
            : sc?.published && sc.privacyLevel === 'public' && sc.moderationStatus === 'rejected'
            ? 'Showcase needs changes — resubmit when ready'
            : sc?.published
            ? 'Your showcase is live'
            : `${doneCount}/${checklistLength} required complete`}
        </span>
        <span className="font-pixel text-[6px] text-white/40 mt-1.5 flex items-center gap-1.5">
          {PRIVACY_ICON[privacy]}
          {privacy === 'public'
            ? 'Requires teacher approval before appearing in the gallery'
            : privacy === 'private'
            ? 'Only your team can see it'
            : privacy === 'school_only'
            ? 'Visible to your school'
            : 'Shareable by link'}
        </span>
      </div>
      <BusyButton
        busy={publishing}
        busyLabel={sc?.published ? 'Unpublishing…' : 'Publishing…'}
        onClick={onPublishToggle}
        className={`sc-btn font-pixel ${sc?.published ? 'sc-btn--unpublish' : 'sc-btn--publish'}`}
      >
        {sc?.published ? (
          'Unpublish'
        ) : privacy === 'public' ? (
          <>
            <Rocket size={13} /> Submit for review
          </>
        ) : (
          <>
            <Rocket size={13} /> Publish showcase
          </>
        )}
      </BusyButton>
    </div>
  )
}
