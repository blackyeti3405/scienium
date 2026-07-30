'use client'

import { Youtube } from 'lucide-react'
import { metaUrl, type Asset } from '@/components/showcase/useShowcaseEditor'
import { safeEmbedUrl } from '@/lib/showcase'
import { LinkRow } from './LinkRow'

/** The saved project video: inline YouTube embed (when available) + link row. */
export function VideoPreview({ asset, onRemove }: { asset: Asset; onRemove: (id: string) => void }) {
  // Re-pinned to the allowlisted provider hosts at the render boundary (P2-3),
  // the same gate the public page applies — the team's own editor renders the
  // same stored `embedUrl`, so a legacy row must not frame an arbitrary origin
  // here either.
  const embed = safeEmbedUrl(asset.metadata?.embedUrl)
  return (
    <div className="sc-videowrap">
      {embed && (
        <div className="sc-videoembed">
          <iframe
            src={embed}
            title="Project video"
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      <LinkRow icon={<Youtube size={15} className="text-[#ff6b6b]" />} url={metaUrl(asset)} onRemove={() => onRemove(asset.id)} />
    </div>
  )
}
