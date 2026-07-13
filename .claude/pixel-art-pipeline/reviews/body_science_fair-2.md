# Body review — science_fair (round 2)

**Verdict: SHIP**

Render: `art/preview/science_fair_creative.png`
Builder: `art/gateways/creative_science_fair.py`
Source grid: `art/src/science_fair_creative_generic.json`

## Gate 1 — Is the body the intended PEAKED / GABLED exhibition PAVILION, not a flat box?

PASS, unambiguously. The old flat-top box lid is gone; `tent_roof()` (lines 400–446) draws
two folded canvas slopes rising from the side eaves to a raised apex at (32,28), meeting at a
lit front RIDGE crease (`c.line(apex, aF, "W")`) that runs down the middle to the front eave V.
The zoomed body crop reads instantly as a big-top tent: a sharp central peak, two fanning
slopes, a bright hip highlight down the left, festival pennant bunting swagged down both ridge
lines, and a footed flag-pole on the back-right slope. This is a tent silhouette, not a
rectangular box — the automatic-TWEAK trigger does not apply.

## Gate 2 — Distinct from the other three bodies?

PASS. The four bodies are now clearly different forms:
- operations_hub — wide multi-tier round DRUM/rotunda with a window band
- pvp — round tiered COLISEUM/arena with columns and flags
- showcase — round hall under a DOME roof
- science_fair — PEAKED/GABLED big-top TENT pavilion

No two share the flat-box body. science_fair is the only peaked/tent form in the batch.

## Gate 3 — Hologram hero + beam + sparkles intact and connected?

PASS. The floating teal holo-trophy remains the undisputed hero — radial-shaded cup, two
C-handles flanking the bowl, a framed winner's star on the bowl, slender stem, stepped
pedestal — ringed by one clean orbiting orange prize-ribbon (with an award rosette) and
showered in W confetti + sparkles. The projector beam is solidly CONNECTED: pixel trace shows
the teal cone descending from the pedestal base (rows 22–25) through a firm h/c core column
(rows 26–28) into the peak-apex emitter (rows 29–30). The emitter now springs from the tent
apex exactly as intended, so the beam rises cleanly into the trophy with no floating gap.

## Gate 4 — Crisp iso, clean K outline, only the 13 canonical chars?

PASS. Source grid uses exactly the 13 canonical chars (K W L M D d / h c g G / o O r) plus the
transparent `.` — zero off-palette pixels. Crisp K silhouette on the two peaked ridge edges,
the front eave V, the marquee jambs/thresholds, and window bezels. Per the design intent the
hologram carries NO K so it reads as pure floating light; panel seams use tonal edges (never K
webbing), so the tent stripes stay clean with no facet noise. Isometric footprint is consistent
(Box top=(32,35), wx=wy=9). Base carries hero-equal weight via orange rim-piping + O corner bolts,
open lit corner marquee, and flanking exhibit windows.

## Notes / optional (non-blocking)

- The alternating canvas stripe panels on the slopes are tonally subtle at 64px; they read
  correctly as folded tent canvas but the stripe alternation is quiet. Could nudge contrast a
  touch if more circus-tent "stripe" pop is wanted — purely optional, not required.

All four gates pass. Ship it.
