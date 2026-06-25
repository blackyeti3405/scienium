# Review: Behavioral Lab (mindframe) — round 0

**VERDICT: TWEAK**

The built form is on-spec in the abstract (two abutting boxes, roof visible, glazed LEFT, MindFrame palette) but two contract-critical things fail at sprite scale: (a) the hero signature interior is an illegible dark scramble — no readable seated subject, no clear A/B button pair, no leaning magenta needle — reading as a black-barred panel rather than glass with a story behind it; and (b) the two-part stepped silhouette barely reads, the volumes look nearly equal-height and the one-way mirror seam reads as a dark crack, not a silvered mirror.

## Per-criterion notes

1. **Iso 2:1?** PASS. Edges follow clean 2:1 isometric; roof diamond and wall verticals are correct. No broken iso.

2. **Roof visible?** PASS. Good 3/4 top-down `M` roof face (rows ~14–22, the broad `M` diamond), readable parapet at the front lip with the `o` magenta accent strip (rows ~20–21, the `Koo`/`MMoo` run). This is the strongest part of the sprite.

3. **Front corner faces viewer?** PASS. The near vertical corner (col ~10, rows ~20–44) is the viewer-facing edge; left and right faces splay correctly.

4. **Sharp/clean/in-palette/clean K outline/no strays — and do glass + mirror read as GLASS?** PARTIAL/FAIL.
   - Outline & palette: clean hard `K` perimeter, all glyphs in the 13-color set, no strays or off-palette pixels, no anti-alias. Good.
   - **Glass read FAILS.** The chamber observation pane (cols ~13–27, rows ~24–37) is ~97 `K` cells (counted) with `h`/`c`/`G`/`o`/`W` confetti scattered through it. There is no sheen sweep, no continuous mullion, no glass plane — it reads as a **black panel with noise**, i.e. exactly the "black-barred panel" the contract forbids. A glass pane needs a coherent `g`/`c` glass field + a diagonal `h` sheen streak + one clean `M` mullion, with the dark detail living *inside* that lit field — not a black field with sparkles.
   - The one-way **mirror wall** (the shared seam at col ~28–30) reads as a dark vertical crack between the boxes, not a silvered `c`+`h` mirror panel. No sheen, no frame — the "watched through a mirror" read is absent.

5. **Cohesive MindFrame palette + motifs?** PASS on palette (muted indigo/violet `M`/`D`/`d` walls, magenta `o`/`O` accents, `h`/`c` highlights — correct MindFrame mood). Motif execution is weak though: observation glass, one-way mirror, and the data-screen all fail to *read* (see 4 and 6), so the motifs are nominally present but not legible.

6. **One-of-one signature present + legible + distinct (A/B choice + needle, human not animal)?** FAIL — this is the blocker. Painter's self-noted weak spot is confirmed and is worse than "busy": it is not legible at 1× and barely parses on 3× zoom.
   - **Seated subject:** no readable figure. The interior is a `K`/`G`/`o` scramble; there is no `d`/`D` seated silhouette that reads as a person.
   - **A/B two-button panel:** the A button (`c`/`h`) and B button (`o`/`O`) are not placed as a clear side-by-side pair. `o`/`O` pixels are smeared across rows 27–34 cols 18–26 (diffuse, not a button), and the `c`/`h` "A" is lost in noise. A viewer cannot find "two buttons."
   - **Predicted-choice needle:** the magenta `o`/`O` does not form a single leaning needle/arrow tilting toward B. It's diffuse fill, so the "prediction leaning pre-press" — the whole point — does not exist as a shape.
   - **Reaction-time readout:** no readable `c`/`g` strip with a climbing `o` bar; the `G`/`g` cells (rows 27–39) read as a vertical glow column, not a labeled readout.
   - It does NOT read as an animal maze (good — no path/heat-map), but it doesn't yet read as the intended human A/B experiment either. Right now it reads as "a dark window with magenta glow."

7. **Attractive?** PARTIAL. Roof, parapet accent, and overall palette are pleasant. But the busy black-with-confetti interior is muddy and draws the eye to noise, undercutting the whole front face.

8. **UNIQUE built form (two-part observation block, opening LIT-LEFT)?** PARTIAL.
   - Opening LEFT: PASS — hero glazing is on the front-left face, correct assigned side.
   - Two-part block: WEAK. The chamber and observation room read as **nearly equal height** — the stepped "taller chamber / lower room" silhouette is almost flat across the roofline (the back-right `M` roof sits only ~1–2px lower). At 1× it reads as one wide box with a seam, not two distinct abutting volumes. Not the gateway cube (good), but the "split-room, two heights" silhouette that distinguishes it from siblings is not landing.

## Tweak list (numbered, painter-actionable)

1. **Rebuild the chamber pane as actual glass, dark detail inside a lit field.** Lay a coherent glass field first: fill the pane interior (cols ~14–26, rows ~25–36) with `g`/`c` glass, add one continuous diagonal `h` sheen streak (e.g. upper-left to mid), and one clean single `M` mullion. Then place the signature detail *on top of / silhouetted against* that lit field. Goal: the pane must read as a lit window, never a black box. Drop the loose `K` confetti currently filling it.

2. **Make the seated subject a real silhouette.** Place a small but unambiguous `d`/`D` seated figure (head + torso, ~3–4px tall) in the lower-left of the pane, facing right toward the panel, dark against the lit glass. One clear shape beats scattered dark pixels.

3. **Build the A/B panel as two distinct adjacent buttons.** To the figure's right, a `K`-framed mini panel with TWO clearly separated lit buttons side by side: **A** = a 2×2 `c` core with an `h` highlight; **B** = a 2×2 `o` core with an `O` highlight. Leave a `K` gutter between them so "two buttons / two options" reads instantly.

4. **Make the predicted-choice needle one clean leaning arrow.** A single `O`-tipped `o` needle (3–4px) pivoting from between the buttons and **tilting toward B**, with a faint 1–2px `o` ghost-press halo on B only. Consolidate the currently-smeared `o`/`O` pixels into this one shape — it is the hero read ("the model predicted B before they pressed").

5. **Add a tiny but legible RT readout.** Beside the panel, a 2–4px `c`/`g` strip with a short climbing `o` bar (or 2–3 stacked `o` ticks) so it reads as a meter, not part of the glow column. Keep it separated from the buttons by a `K` pixel.

6. **Turn the shared seam into a real one-way mirror.** At the chamber/observation boundary (col ~28–30), make a narrow vertical `c` glass panel with a strong `h` sheen sweep and a faint `M` mullion frame — so it reads as a silvered mirror, not a dark crack. Tuck a faint `d` observer silhouette + a single `c`/`O` recording dot just behind it so "watched from behind glass" lands.

7. **Exaggerate the height step between the two volumes.** Drop the observation-room roof noticeably lower (≥3–4px below the chamber roof) and/or raise the chamber, so the silhouette clearly reads as two abutting boxes of different heights. The stepped split-room form is what makes this distinct from the Interview booth and Focus Group pit — sell it.

8. **(Minor) Calm the right/observation face.** Per blueprint it should stay plainer: one small window + the `louver` vent. The current right face has scattered `c`/`G` specks (rows 25–34) that add noise — simplify to a clean `M`/`D` face with one opaque-slat vent and one small window, so the eye goes to the LEFT hero pane.

## Note
Priority order for the repaint: #1 (glass field) + #3/#4 (two buttons + leaning needle) are the must-fix for criterion 6/4; #7 (height step) for criterion 8. If the A/B + needle still don't read at true 1× after the repaint, enlarge the pane by 1–2px each way rather than shrinking the detail further — legibility at sprite scale is the bar.
