'use client'

import { useState } from 'react'
import type { SpriteEntry } from '@/lib/sprites/manifest'

interface SpriteProps {
  entry: SpriteEntry
  /** Override the CSS scale (default: entry.scale). */
  scale?: number
  className?: string
}

/**
 * Renders a pixel-art sprite from a SpriteEntry manifest definition.
 *
 * Behavior:
 * - Renders <img> with image-rendering: pixelated at entry.scale
 * - If the PNG is missing (404), falls back to a labeled colored placeholder
 *   with the same dimensions, so layout never breaks during development
 * - The placeholder matches the sprite's placeholder color from the manifest
 */
export function Sprite({ entry, scale, className = '' }: SpriteProps) {
  const [imgError, setImgError] = useState(false)
  const s = scale ?? entry.scale
  const displayW = entry.srcWidth * s
  const displayH = entry.srcHeight * s

  if (imgError) {
    return (
      <PlaceholderSprite
        width={displayW}
        height={displayH}
        color={entry.placeholderColor}
        label={entry.description}
        className={className}
      />
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={entry.path}
      alt={entry.description}
      width={displayW}
      height={displayH}
      onError={() => setImgError(true)}
      className={className}
      style={{
        imageRendering: 'pixelated',
        width: displayW,
        height: displayH,
      }}
      draggable={false}
    />
  )
}

// ─── Placeholder (shown when PNG is absent) ───────────────────────────────────

interface PlaceholderSpriteProps {
  width: number
  height: number
  color: string
  label: string
  className?: string
}

function PlaceholderSprite({ width, height, color, label, className = '' }: PlaceholderSpriteProps) {
  return (
    <div
      role="img"
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center border border-black/20 ${className}`}
      style={{
        width,
        height,
        backgroundColor: color,
        imageRendering: 'pixelated',
        fontFamily: 'var(--font-pixel), monospace',
        fontSize: Math.max(6, Math.floor(height / 6)),
        color: 'rgba(255,255,255,0.85)',
        textAlign: 'center',
        lineHeight: 1.2,
        padding: 2,
        wordBreak: 'break-word',
        overflow: 'hidden',
      }}
    >
      {label}
    </div>
  )
}
