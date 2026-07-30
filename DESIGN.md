---
version: "alpha"
name: Scienium
description: Marketing pages for a pixel-art science-fair game. LIGHT paper field, navy ink, ONE gold accent, real game screenshots as product shots. The in-game UI stays dark; these public pages are light.
colors:
  # Public marketing pages (/, /about) — LIGHT. Values are WCAG-AA verified.
  background: "#f7f7f4"   # paper field (near-neutral off-white)
  band: "#f2f1ea"         # alternating section band
  panel: "#ffffff"        # framed shots / input fills
  border: "#e6e5dd"       # hairline dividers / card outlines
  ink: "#0d1b2e"          # primary text (navy) — an accent, not the field
  bodyMuted: "#46566b"    # body/secondary text (>=7:1 on paper)
  labelMuted: "#5a6b80"   # smallest muted text; floor for text (>=4.5:1)
  numeral: "#63614f"      # the 01-06 journey numerals (legible muted)
  primary: "#F5C518"      # gold — the ONLY accent; CTA/emphasis fills
  accentInk: "#7d6108"    # dark-gold stop for small pixel labels (fill fails AA as text)
  # in-game chrome (dark) is documented separately; do not use it on marketing pages.
typography:
  display:
    fontFamily: Space Grotesk   # font-display: headlines + body on marketing pages
    fontSize: clamp(2.5rem, 6vw, 3.4rem)
    lineHeight: 1.05
  h2:
    fontFamily: Space Grotesk
    fontSize: clamp(1.75rem, 4vw, 2.7rem)
    lineHeight: 1.1
  label:
    fontFamily: "Press Start 2P"  # font-pixel: eyebrows, nav, numbers, badges, wordmark ONLY
    fontSize: 0.6rem              # legibility floor for real pixel runs
    lineHeight: 1.6
    letterSpacing: 0.1em
  body:
    fontFamily: Space Grotesk
    fontSize: 1.0625rem
    lineHeight: 1.6
  body-sm:
    fontFamily: Space Grotesk
    fontSize: 0.9375rem
    lineHeight: 1.5
rounded:
  none: 0px
  sm: 3px
  md: 4px
  lg: 6px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  # component-internal spacing stays on the tight scale above.
  # PAGE RHYTHM (section gaps, hero) uses the generous scale below —
  # marketing pages breathe; the game chrome stays dense.
  section-y: 128px    # vertical padding per marketing section (clamp 80–160px)
  section-gap: 96px   # gap between stacked blocks within a section
  hero-y: 160px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.background}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: transparent
    textColor: "{colors.textPrimary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.textPrimary}"
    rounded: "{rounded.none}"
  nav-link:
    textColor: "{colors.textMuted}"
    typography: "{typography.label}"
  tag:
    backgroundColor: "{colors.teal}"
    textColor: "{colors.background}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
  status-message:
    textColor: "{colors.success}"
    typography: "{typography.body-sm}"
  status-error:
    textColor: "{colors.danger}"
    typography: "{typography.body-sm}"
---

## Overview

The marketing pages read as a game brand, not a SaaS product, but they are
**light**: a paper field carries the page and the real game screenshots (which
are dark) pop when framed against it. Navy and gold are **accents**, not the
field. The in-game `/lab` chrome stays dark; do not paint the marketing pages
navy. Identity comes from the pixel font, the gold accent, and real pixel art,
not from a dark background.

## Colors

A light paper field, navy ink, and exactly one accent (gold). Everything else
is a neutral. No secondary brand hue. Every text/background pair below is
verified for WCAG AA (body >=4.5:1, large/bold >=3:1); the single biggest
readability failure is muted gray on a near-white band, so muted text bottoms
out at `#5a6b80`, never lighter.

- **Field (`#f7f7f4`):** page background, a near-neutral off-white. Not pure
  white, not a warm cream/beige.
- **Band (`#f2f1ea`):** alternating section background, one step off the field.
- **Panel (`#ffffff`):** framed-screenshot chrome and input fills only.
- **Border (`#e6e5dd` / `#e4e3db`):** hairline dividers and outlines.
- **Ink (`#0d1b2e`, navy):** primary headings and body. An accent color used
  as text, never as the page field.
- **Body muted (`#46566b`):** secondary body copy. **Label muted (`#5a6b80`):**
  the floor for any text (captions, footer, form helper). Nothing lighter.
- **Primary (`#F5C518`, gold):** the *only* accent, for CTA fills and emphasis.
  As a **fill** with navy text it passes; as small **text** it fails contrast,
  so small gold labels use the darker stop **`#7d6108`** (accent-ink). One
  accent, two stops, referenced consistently.
- **Numeral (`#63614f`):** the 01-06 journey sequence numbers (legible muted).
- Gold is never used as body text, and there is no teal/second brand hue on
  the marketing pages.

## Typography

Two families on a contrast axis (pixel bitmap + geometric sans), used for
distinct jobs, never mixed within one line. Pixel type is an **accent**, not
the workhorse: it signs the brand in short bursts; Space Grotesk carries
everything the reader actually reads. (The in-game UI still uses Inter; the
marketing pages deliberately do not.)

- **Press Start 2P** (`font-pixel`): eyebrows, nav, buttons, badges, stat
  numbers, framed-shot captions, and the `scienium` wordmark. It is a bitmap
  face, so keep runs short and never below **~0.6rem** (strokes collapse
  smaller) with letter-spacing <=0.06em at that size. **Never** paragraph copy
  or full-sentence headlines (a sentence H1 in pixel is a wall of hard-to-read
  blocks; that was the old hero's mistake).
- **Space Grotesk** (`font-display`): all body copy **and the display/section
  headlines**. Headlines go big and confident (clamp up to ~3.4rem, weight
  600–700, tight leading, `text-wrap: balance`). Character comes from the face
  itself plus the pixel art and gold accent, not from setting headlines in
  pixel. Cap body measure at ~65ch.

## Layout

Generous and editorial — the marketing pages breathe so the pixel art and
one big idea per section can land. (This reverses the earlier "tight, not
airy" rule: dense game chrome is right *inside* the game, wrong for the front
door. The reference bar is Teenage Engineering / Dirtywave / Stripe — huge
negative space, the product shown large.)

- **Section rhythm is big:** ~80–160px vertical padding per section
  (`section-y`), not 24-48px. Let sections be mostly empty around a single
  focal block. Whitespace is the primary tool for looking high-end.
- **One idea per section.** A section makes one point, shows one product
  surface, and moves on. Don't cram a 3-up grid of one-liners where a single
  large statement + one real screenshot would carry it.
- **Wide, calm measure.** Constrain text to ~60ch; center or left-align
  against generous margins. Large type + short lines + air.
- Component-internal spacing still uses the tight `xs–2xl` scale; the
  generous scale is only for *page rhythm* (section gaps, hero).

## Motion

Motion must be **relevant** — it should reveal, sequence, or explain, never
just decorate. (The old hero's spinning-logo cube and cursor-tilt cards are
exactly what to avoid: movement that carries no meaning.)

- **Scroll is the narrative.** Content reveals as you arrive — a short
  fade + 12–20px rise as each block enters the viewport. The page reads like
  walking the student research journey top to bottom.
- **The lab is alive, quietly.** The hero pixel scene may drift/parallax
  gently (slow, small-amplitude float on buildings); accents can bob on
  hover. Subtle, ambient, never spinning-for-attention.
- **Numbers count up** when a stat band enters view (real figures only).
- **Honor `prefers-reduced-motion: reduce`** everywhere: reveals resolve to
  their final state, ambient float and count-ups are disabled. No parallax
  for reduced-motion users.
- Implement with CSS transitions + `IntersectionObserver` — no heavy
  animation libraries.

## Elevation & Depth

Flat, mostly. Depth comes from a border and a solid darker/lighter fill, not
soft drop shadows or blur. The one exception is functional overlays (modals,
panels), which use a hard-edged box-shadow for separation, not a glow.

## Shapes

Sharp by default. Radius scale stays small: `none 0px / sm 3px / md 4px /
lg 6px`. Nothing rounder than 6px anywhere on marketing pages — no
`rounded-xl`/`rounded-2xl` cards, no pill buttons except where the game
itself already uses one (badges/status pills).

## Components

- **button-primary:** solid gold fill, navy text, `md` radius, brightness
  shift on hover — matches the existing `shop-button`/CTA styling in the
  game, no gradient-and-glow SaaS button.
- **button-secondary:** transparent fill, border-only, border brightens to
  gold on hover.
- **card:** surface fill, thin border, **no radius** (`rounded.none`) — flat
  rectangular panels, like the game's feature panels.
- **nav-link:** muted by default, brightens to white/gold on hover/active.
- **tag:** small teal-filled label (`sm` radius) — status/category chips
  only, e.g. a lab-type badge.
- **status-message / status-error:** inline form/validation feedback text,
  success or danger colored — never used decoratively.

## Do's and Don'ts

- **Do** keep one accent color per screen. **Don't** introduce a second
  "brand" hue (teal is a rare status/tag color, not a second accent).
- **Do** use hard borders for separation. **Don't** use soft drop shadows,
  frosted-glass blur, or gradient mesh backgrounds — no generic-SaaS glow.
- **Do** give marketing sections generous whitespace and one idea each.
  **Don't** cram — the crowded, screenshot-less, one-liner-grid look is the
  thing we're fixing.
- **Do** reserve Press Start 2P for short strings (eyebrows, labels, nav,
  buttons, numbers, wordmark). **Don't** set paragraphs *or full-sentence
  headlines* in it — big sentence headlines are Inter.
- **Do** make motion mean something (reveal-on-scroll, ambient lab drift).
  **Don't** add decorative motion for its own sake (no spinning logos, no
  cursor-tilt gimmicks).
- **Do** keep corners sharp (≤6px). **Don't** use large rounded corners,
  pill-shaped cards, or blob shapes.
- **Do** show the real product — pixel sprites and faithful re-creations of
  actual in-game surfaces (the Codex lesson, the glossary, the ISEF rubric).
  **Don't** ship abstract SaaS illustrations or claim features that aren't
  built (no PvP "raids", no "citation graph" — cut/unbuilt; see the codebase).
