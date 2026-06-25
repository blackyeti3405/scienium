# Review: Sampling Station (terrabase) — round 1
**VERDICT: SHIP**

Judged: `art/preview/buildings/terrabase_sampling-station.png` (640×640 upscale of 64×64 source) against `art/pixel-art-pipeline/blueprints/sampling-station.md`, with detailed crops of the signature, back-left crate, and lower-mass regions. Round-0 review (`sampling-station-0.md`) cross-checked for fix landing.

## Round-0 fix verification

1. **Fanned ID tags were a flat bar → now 2–3 discrete cards.** RESOLVED. Right of the scanner ring there are now three distinct holographic label cards stepped diagonally in a fan: a top/confirmed card (`K` outline, `L`/`W` field, `c` teal tick + bright `o`/`O` amber coord dot, `L` text line under it), a middle card (`c` tick + `o` dot), and a smaller lower card (`o` dot). Each is separated by a `K`/dark gap, so they read as separate cards, not one bar. The "fanning out an arc of ID tags" half of the hero now reads.
2. **Back-left crate blended into the wing → now has contrast/separation.** RESOLVED (adequately). The crate now carries `o` amber corner-bracket dots and a `r` rust board/handle that silhouette it off the dark `K`/`d` wing, with a dark gap behind the stack. Separation reads. It's the weakest of the three fixes — the stack is still a touch busy/muddy — but it no longer dissolves into the wing.
3. **Lower mass was boxy → open depot should read.** RESOLVED. The pad floor is re-lit a warmer `L`/`M` diamond ringed by the `o`/`K` survey-stripe ticks (the amber dots running the front edge), and the front base bays open up so it reads as an open packed-earth work-yard under the tarp rather than an enclosed dark plinth. The open-on-poles silhouette now carries the lower half too.

## Per-criterion notes

1. **True isometric (2:1)?** Yes. Tarp top slab and the pad diamond hold clean 2:1 iso edges; no broken-angle stairstepping. Pass.
2. **3/4 top-down framing, roof/floor visible?** Yes. The full tarp top plane is the dominant top surface and the packed-earth pad reads below it. Both roof and floor visible. Pass.
3. **Front CORNER faces viewer?** Yes. The near corner of the pad points at the viewer, front faces splaying left/right, with the front-corner tarp sag present. Pass.
4. **Sharp — clean K outline, in-palette, no strays?** Pass. Single-pixel `K` outline is crisp, no anti-alias/mush. Colors on-palette (ochre `L/M/D/d`, teal `h/c/g/G`, amber `o/O`, rust `r`). The round-0 speckled lower-ring `g` pixels are tidied into a cleaner torus. No strays spotted.
5. **Cohesive TerraBase palette + motifs?** Yes. Literal tarp awning, stacked field crates, mineral-teal scanner glow, weathered `D`/`d` timber poles, `o`/`K` survey striping, `d` strata seam on the pad, gold pennant at the back corner — all honored. Pass.
6. **One-of-one signature present + legible + distinct?** Pass — and this is the headline upgrade from round 0. Rotating `r`/`M` clod (with `W` glint) hovers inside a clean mineral-teal `g`/`G` scanner ring with `c`/`h` inner glow, and now fans out 3 discrete holographic ID cards with a brighter `O`/`h` confirmed card on top. Distinct from siblings (not a petri carousel, jar wall, or magnified-cell hologram). Legible and one-of-one.
7. **Attractive?** Yes. Strong open tarp silhouette, teal focal glow popping against warm ochre, readable pennant, lively fanned-tag detail. The warmer pad lifts the previously muddy lower mass. Reads well at sprite scale.
8. **Unique built form + opening reads OPEN?** Pass. It is emphatically NOT the gateway cube — a tarp-on-four-poles awning over an open work-yard, the most lightweight/expedition member of the set. Transparency gaps show between corner poles left and right; the signature cataloguing table + scanner sit OUT in the open court, not behind a glazed face. The openness is the read.

## Verdict rationale
All three round-0 blockers are resolved with no regressions: the signature now delivers its full "identify + fan ID tags" story, the crate separates from the wing, and the lower mass reads as an open yard. Criteria 1–8 all pass. SHIP.

## Optional polish (non-blocking — do NOT gate on these)
1. **Back-left crate stack legibility.** The fix landed but the stack still reads a little busy where it meets the dark wing. If a future pass touches this, one more step of `M`/`L` on the crate's top-front board faces (vs the `D`/`d` it shares with the wing) would make the "stack of field crates" read instantly rather than on a second look.
2. **Tag arc spacing.** The three ID cards are discrete and fan correctly; if anything the middle and lower cards sit slightly tight. A 1px more diagonal step between cards 2 and 3 would make the fan arc even cleaner — purely cosmetic.
3. **One open crate's rock chunks.** The blueprint's "one open crate showing `r`/`M` rock chunks inside" is only faintly present. A 1–2px `r` chunk peeking from the top crate would reward a close look — optional flavor, not required.
