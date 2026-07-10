import Image from 'next/image'

/**
 * Frames a REAL captured game screenshot (public/marketing/*.png). The window
 * chrome is the scienium mark + the surface's own route, not generic macOS
 * traffic-lights, so the frame reads "this is a scienium screen". The game UI
 * is dark, the page is light, so framed dark shots pop against the paper field.
 * On mobile the shot is letterboxed (object-contain) so its UI stays legible
 * instead of being cropped to a sliver; on desktop it fills (object-cover).
 * Captured via scripts/capture-marketing-shots.mjs.
 */
export function Shot({
  src,
  title,
  alt,
  ratio = '16 / 10',
  position = 'top',
  priority = false,
  className = '',
}: {
  src: string
  title: string
  alt: string
  ratio?: string
  position?: 'top' | 'center'
  priority?: boolean
  className?: string
}) {
  return (
    <figure
      className={`overflow-hidden border border-[#e4e3db] bg-white shadow-[0_36px_70px_-40px_rgba(13,27,46,0.45)] ${className}`}
      style={{ borderRadius: 8 }}
    >
      <figcaption className="flex items-center gap-2.5 border-b border-[#ecebe3] bg-[#f4f3ee] px-4 py-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/scienium-logo.png" alt="" aria-hidden width={16} height={16} className="mkt-pixel" />
        <span className="font-pixel text-[#5a6b80]" style={{ fontSize: '0.6rem', letterSpacing: '0.02em' }}>
          {title}
        </span>
      </figcaption>
      <div className="relative w-full bg-[#0d1b2e]" style={{ aspectRatio: ratio }}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 720px"
          priority={priority}
          className={`object-contain object-top md:object-cover ${position === 'center' ? 'md:object-center' : 'md:object-top'}`}
        />
      </div>
    </figure>
  )
}

/**
 * Labeled placeholder for a surface we can't screenshot yet (not built, or needs
 * seeded data). Reads as an intentional slot in product voice, never as an
 * authoring note.
 */
export function ShotPlaceholder({
  title,
  note,
  ratio = '16 / 10',
  badge = 'Coming soon',
}: {
  title: string
  note: string
  ratio?: string
  badge?: string
}) {
  return (
    <figure
      className="flex flex-col items-center justify-center border border-dashed border-[#c6c5ba] bg-[#eeede6] px-8 text-center"
      style={{ borderRadius: 8, aspectRatio: ratio }}
    >
      <span className="font-pixel text-[#5a6b80]" style={{ fontSize: '0.6rem', letterSpacing: '0.02em' }}>{title}</span>
      <p className="mt-3 max-w-xs font-display text-sm leading-relaxed text-[#5a6b80]">{note}</p>
      <span
        className="mt-5 font-pixel text-[#0d1b2e]"
        style={{ fontSize: '0.55rem', background: '#F5C518', padding: '6px 9px', borderRadius: 4 }}
      >
        {badge}
      </span>
    </figure>
  )
}
