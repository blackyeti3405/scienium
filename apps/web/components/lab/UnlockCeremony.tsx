'use client'

/**
 * The "BUILDING UNLOCKED" moment.
 *
 * Dims the lab, points a growing arrow at the SHOP button, and makes everything
 * except that button inert until the student opens the shop. It is deliberately
 * not a modal: the thing it is teaching is *where the shop is*, so the shop must
 * stay visible and clickable rather than being covered by a dialog.
 *
 * Inertness is done with a full-screen backdrop that swallows pointer events,
 * with the shop button raised above it — not by disabling every control. That
 * way nothing has to be re-enabled afterwards, and there is no state to get
 * stuck in if the ceremony unmounts unexpectedly.
 *
 * The dismissal is the parent's job (LabScene): opening the shop acknowledges it
 * server-side, so a reload does not replay it.
 */
export function UnlockCeremony({ count }: { count: number }) {
  return (
    <div className="unlock-ceremony" data-testid="unlock-ceremony">
      {/* Swallows every click that is not the shop button (which sits above via
          z-index), so the rest of the lab is inert without being disabled. */}
      <div className="unlock-ceremony__scrim" aria-hidden />

      <div className="unlock-ceremony__banner" role="status" aria-live="polite">
        <p className="unlock-ceremony__title font-pixel">
          {count > 1 ? `${count} BUILDINGS UNLOCKED` : 'BUILDING UNLOCKED'}
        </p>
        <p className="unlock-ceremony__hint font-pixel">
          Open the shop to place {count > 1 ? 'them' : 'it'}
        </p>
      </div>

      {/*
        Aimed at the shop button. The HEAD is pinned: the container is anchored
        by `right`, so the shaft growing pushes the box leftward and the
        arrowhead never moves off its target. (It used to scale from the left,
        which swung the head away from the button it was pointing at.)

        Drawn as blocks on a 4px grid with `shapeRendering: crispEdges` and never
        scaled, so it stays pixel-crisp next to the sprite art.
      */}
      <div className="unlock-ceremony__arrow" aria-hidden>
        <span className="unlock-ceremony__arrow-shaft" />
        {/* Size comes from CSS so it can animate; the 4x7 viewBox means every
            animated width (12/16/20px) is an exact 3/4/5px per unit. */}
        <svg
          className="unlock-ceremony__arrow-head"
          viewBox="0 0 4 7"
          preserveAspectRatio="none"
          shapeRendering="crispEdges"
        >
          <rect x="0" y="0" width="1" height="7" fill="#F5C518" />
          <rect x="1" y="1" width="1" height="5" fill="#F5C518" />
          <rect x="2" y="2" width="1" height="3" fill="#F5C518" />
          <rect x="3" y="3" width="1" height="1" fill="#F5C518" />
        </svg>
      </div>
    </div>
  )
}
