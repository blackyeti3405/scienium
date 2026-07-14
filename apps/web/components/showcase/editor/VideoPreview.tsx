'use client'

import { Youtube } from 'lucide-react'
import { metaUrl, type Asset } from '@/components/showcase/useShowcaseEditor'
import { LinkRow } from './LinkRow'

/** The saved project video: inline YouTube embed (when available) + link row. */
export function VideoPreview({ asset, onRemove }: { asset: Asset; onRemove: (id: string) => void }) {
  const embed = typeof asset.metadata?.embedUrl === 'string' ? (asset.metadata.embedUrl as string) : null
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
