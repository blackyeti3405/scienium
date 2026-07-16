# Marketing page: 6 new UI features — design

**Scope:** UI/structure only. No copy changes yet (tracked separately). All on `Isaac-features`.
Source: prompts copied from matching components on 21st.dev, adapted to existing patterns
(`Reveal`, `MarketingChrome`, `Shot`) and `DESIGN.md` tokens (light theme, navy `#0d1b2e` ink,
gold `#F5C518` as the only accent, ≤6px radius, no gradients/glow/glassmorphism).

## 1. FAQ accordion — `/about`, near Contact
Plain accordion, one question open at a time, full-width row dividers (no cards, matching the
existing "Who is building it" groups list). Real questions: cost, devices, data/privacy, pilot
signup — placeholder answers marked for the later copy pass.

## 2. Stepper for the Journey section — `/`
The existing 01–06 phase blocks stay; add a slim sticky-left progress rail (numerals + a filled
segment per phase in view) so the real 6-phase sequence reads as a stepper on scroll. No layout
rewrite of the existing content blocks.

## 3. Commits Grid — `/about`
GitHub-contribution-style heatmap. **Static, build-time snapshot from local `git log`** (a small
script generates a JSON of date→commit-count, imported by the component) — no live API call, no
public-repo dependency, no exposure of live team activity to visitors.

## 4. Category List — `/`, six-lab-type section
The six lab-type pills become a real interactive list (row-based, hover/click state) sitting
below the (separately animated) headline — lets a visitor pin one lab type instead of only
auto-cycling.

## 5. 3D Carousel — `/`, replaces the static floating-sprite row
Same "game layer" section, same real sprite assets (`volt_lab/ai-incubator`, `biocore/greenhouse`,
etc. plus the 7 gateway buildings), rendered as a CSS 3D carousel a visitor can drag/click through
instead of the current static floating row.

## 6. Flip Words — `/`, "reskins to your field" section
The six lab-type names auto-cycle through the existing pill/label spot (BioCore → ChemWorks →
Volt Lab → …), reusing the real names already in `infra/seed/lab_types.ts` / the marketing copy.

## Out of scope
Copy/content edits (separate pass), any backend/API work, any new npm dependency for 3D (CSS
transforms only, matching the existing hero-cube/TiltCard precedent from the design-system work).
