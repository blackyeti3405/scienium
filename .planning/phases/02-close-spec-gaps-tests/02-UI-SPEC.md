---
phase: 02
phase_name: Close Spec Gaps + Tests
status: draft
created: 2026-07-23
source: Signed-off Phase-1 audit report + CONTEXT.md (D-01..D-35) + RESEARCH.md + codebase scouting
---

# UI-SPEC: Phase 2 — Close Spec Gaps + Tests

## Design System State

| Dimension | Detected Value | Source |
|-----------|---------------|--------|
| Styling framework | Tailwind CSS ^3.4.10 | `tailwind.config.ts` |
| Component library | shadcn/ui (custom components + base) | `components/ui/` directory |
| Icon library | Lucide React ^0.436.0 | `package.json` |
| Animations | tailwindcss-animate ^1.0.7 | `tailwind.config.ts` plugin |
| Dark mode | `darkMode: ['class']`, `:root.dark` is the game default | `tailwind.config.ts`, `globals.css` |
| Pixel-art rendering | `image-rendering: pixelated; crisp-edges` via `.pixel-art` class | `globals.css:68-71` |
| Pixel-art components | `components/lab/LabScene`, `LabPlot`, `TileBackground`, `DecorationLayer` | Lab scene v0.23.0 overhaul |
| UI components (custom) | `PixelProgressBar`, `PixelSkeleton`, `PixelSpinner`, `BusyButton`, `ConfirmDialog`, `SectionTabs` | `components/ui/` |
| Sprite pipeline | `lib/sprites/manifest.ts` — single source of truth for all game art | `art/` pipeline + `versions.generated` |
| Gateway sprites | 7 keys x 7 skins (49 PNGs), 48x48 source @ 3x display | `public/sprites/gateways/` |
| Ground tiles | 32px source @ 2x display => TILE_CELL = 64px | `lib/sprites/manifest.ts:246-249` |
| Project skills | `pixel-art-generator` (any new/recolor sprites), `ui-ux-pro-max` (layout/interaction polish) | `CLAUDE.md` |

### Design System Confirmation

The app is a student-facing pixel-art game targeting ~120 students. The dark theme is the default (not optional). The v0.23.0 pixel-art overhaul (commit `18aae5d`, merge `7f67a12`) sets the visual direction for ALL Phase 2 PvP UI — BattleScreen (§7.1 prerequisite) and leaderboard MUST match this style.

---

## Spacing

**Scale:** 8-point grid (multiples of 4): 4, 8, 12, 16, 20, 24, 32, 40, 48, 64

| Token | Tailwind | CSS px | Usage |
|-------|----------|--------|-------|
| space-1 | `gap-1` `p-1` `m-1` | 4px | Inner element gaps, icon spacing, tight text spacing |
| space-2 | `gap-2` `p-2` | 8px | Cooldown indicator gaps, spell bar inter-item space, badge inset |
| space-3 | `gap-3` `p-3` | 12px | Small card padding, HUD element gaps |
| space-4 | `gap-4` `p-4` | 16px | Standard card padding, content group gaps |
| space-5 | `p-5` | 20px | Lobby card padding (existing pattern) |
| space-6 | `p-6` | 24px | Section spacing, BattleScreen inner margin |
| space-8 | `p-8` | 32px | Page section gaps, large content blocks |
| space-12 | `p-12` | 48px | Viewport-relative spacing |
| space-16 | `p-16` | 64px | Max element spacing |

**Pre-populated from:** CONTEXT.md (no explicit spacing decision) + Tailwind defaults (8-point scale is standard for shadcn/Tailwind projects).

---

## Typography

### System Fonts (declared from existing config)

**Sans (body):** `var(--font-inter)` — Inter, `ui-sans-serif`, `system-ui`, `sans-serif`
**Pixel (game UI):** `var(--font-pixel)` — Press Start 2P (or equivalent pixel font), `monospace`

### Font Sizes

Exactly 4 sizes declared for PvP UI:

| Size | Tailwind | CSS px | Usage | Font |
|------|----------|--------|-------|------|
| pixel-micro | N/A (custom) | 10px (0.625rem) | Building/spell names in HUD, label text, badge text | `.font-pixel` |
| body-xs | `text-xs` | 12px (0.75rem) | Explanatory text, secondary info, meter notch labels | sans |
| body-sm | `text-sm` | 14px (0.875rem) | Body text, non-interactive details, trophy count | sans |
| body-base | `text-base` | 16px (1rem) | Primary body text, button labels, lobby text | sans |
| heading-md | `text-xl` | 20px (1.25rem) | Section headings, opponent name | sans (bold) |
| heading-lg | `text-2xl` | 24px (1.5rem) | Lobby page heading, trophy display | sans (bold) |
| heading-xl | `text-3xl` | 30px (1.875rem) | Results screen trophy delta, timer | sans (bold) |

**Note:** `.font-pixel` at 10px is defined in `globals.css:59-64` with `line-height: 1.6`. This is the explicit game-UI font utility. Use it ONLY for game chrome (HUD, spell bar, meter labels) — NOT for body text (accessibility concern documented in the existing CSS comment).

### Font Weights

Exactly 2 weights:

| Weight | Tailwind | Usage |
|--------|----------|-------|
| 400 (normal) | `font-normal` | All body text, explanatory text |
| 600 (semibold) | `font-semibold` | Section headings, important labels, trophy numbers, meter idle/active labels |
| 700 (bold) | `font-bold` | Lobby heading, opponent name, results trophy delta |

### Line Heights

- **Body text:** 1.5 (`leading-normal`)
- **Game UI (pixel font):** 1.6 (as defined in `globals.css`)
- **Headings:** 1.2 (`leading-tight`)

**Pre-populated from:** `tailwind.config.ts` (font families), `globals.css` (`.font-pixel` class), `lobby/page.tsx` (existing usage patterns).

---

## Color

### Dark Theme (game default — the ONLY theme)

| Role | Tailwind Variable | HSL | CSS | Usage | % of UI |
|------|-------------------|-----|-----|-------|---------|
| **Dominant background** | `bg-background` | 222.2 84% 4.9% | `--background` | Page backgrounds, viewport backgrounds | 60% |
| **Secondary surface** | `bg-slate-800/60` | N/A (Tailwind) | `rgba(...)` with `border-slate-700/50` | Cards, lobby opponent card, meter panel, trophy display | 30% |
| **Accent — gold** | `bg-[#F5C518]` or gold gradient | N/A | `#F5C518` → `#ffe566` gradient | Primary CTA buttons, meter fill, progress bars, active indicators, spell power "Overcharged" tier | 5% |
| **Accent — green** | `text-[#5ef08a]` | N/A | `#5ef08a` | Success states, valid actions, positive trophy change, unobstructed tile indicator | <3% |
| **Accent — red** | `bg-red-600` / `bg-red-900/40` | N/A | Tailwind red palette | Destructive actions, Raid button, error banners, negative trophy change | <2% |
| **Destructive** | `bg-destructive` | 0 62.8% 30.6% | `--destructive` | Error backgrounds (dark variant), confirmation dialogs | <1% |
| **Muted foreground** | `text-slate-400` / `text-slate-500` | N/A | Tailwind slate palette | Secondary text, explanatory text, disabled states | N/A |
| **Border** | `border-slate-700/50` | N/A | `rgba(...)` | Card borders, panel division | N/A |

### Accent Reserved-For List

The gold accent (#F5C518) is reserved for:

1. **Primary CTAs** — "Raid" button, "Start Raid", "Refind"
2. **Spell Power Meter** — fill bar (gold gradient), "Overcharged" badge (amber-400), active tier indicator
3. **Trophy display** — the trophy icon/emoji, trophy count number
4. **Spell bar** — selected spell highlight, active cooldown indicator ring
5. **Results screen** — positive trophy gain display, "Victory" label
6. **Progress indicators** — PixelProgressBar (gold gradient fill per existing pattern)
7. **Interactive hover states** — button hover brightness, building hover underline

Green (#5ef08a) is reserved for:

1. **Positive outcomes** — trophy gain, success messages
2. **Valid targets** — defender building hover when in valid spell range
3. **Spell Power Meter** — "Active" (BASE) tier

Red is reserved for:

1. **Destructive actions** — "Raid" button, "Attack" label, negative trophy change
2. **Errors** — error banners, error text, 403/error states
3. **Low health / damaged state** — partially destroyed defender buildings

### Second Semantic Color

**Red (destructive):** Already declared as `--destructive` in the CSS variable system. Used for confirming destructive actions: raid initiation, low-destruction trophy loss display, error states. No other semantic colors needed in Phase 2.

**Pre-populated from:** `globals.css` (CSS variables), `lobby/page.tsx` (existing usage), `PixelProgressBar.tsx` (gold gradient pattern), `LabScene.tsx` (green for valid states).

---

## Component Inventory

### Existing UI Components (reusable for PvP)

| Component | File | Reuse in PvP |
|-----------|------|-------------|
| `PixelProgressBar` | `components/ui/PixelProgressBar.tsx` | **YES** — Spell Power Meter fill (segmented or continuous) |
| `BusyButton` | `components/ui/BusyButton.tsx` | **YES** — Action buttons in lobby, BattleScreen cast buttons |
| `PixelSkeleton` | `components/ui/PixelSkeleton.tsx` | **YES** — Loading state for BattleScreen defender grid |
| `PixelSpinner` | `components/ui/PixelSpinner.tsx` | **YES** — Loading indicator while raid is starting |
| `ConfirmDialog` | `components/ui/ConfirmDialog.tsx` | **MAYBE** — Confirmation before starting a raid (approvable/skippable) |
| `Card` | `components/ui/Card.tsx` | **MAYBE** — Lobby card structure (lobby already uses hand-rolled cards) |
| `SectionTabs` | `components/ui/SectionTabs.tsx` | **NO** — Leaderboard is class-only (no tabs) |
| `LabScene`, `LabPlot`, `TileBackground`, `DecorationLayer` | `components/lab/` | **REFERENCE** — visual style to match for BattleScreen and leaderboard (§7.1 prerequisite) |
| `Sprite` | `components/lab/Sprite.tsx` | **MAYBE** — If rendering gateway sprites in BattleScreen/leaderboard |

### New Components Needed in Phase 2

| Component | Target Plan | Priority | Description |
|-----------|-------------|----------|-------------|
| `BattleScreen` | 02-02 | **HIGH** (milestone blocker) | Full raid UI: defender grid, spell bar, click-spell->click-target interaction, cast animation, results screen |
| `SpellBar` | 02-02 | HIGH | Player spell selection bar: spell icons/icons, names, cooldown state, type labels, selection interaction |
| `DefenderGrid` | 02-02 | HIGH | Read-only defender base layout: building sprites, health indicators, type labels, AOE highlight on hover |
| `CastTimer` | 02-02 | MEDIUM | 15-second countdown display (client-side UX only; server is authoritative per ENGINE-03) |
| `ResultsScreen` | 02-02 | HIGH | Post-raid results: percent destroyed, trophy delta (gain/loss), defender building status, "Return to Lobby" |
| `TypeCycleTooltip` | 02-02 | MEDIUM | Science explanation tooltip for the empirical > theoretical > applied cycle (in raid HUD + lobby) |
| `Leaderboard` | 02-02 | MEDIUM | Class trophy ranking table from `PvpTrophies`, pixel-art styled |
| `TrophyBadge` | 02-02 | LOW | Reusable trophy count badge (lobby, leaderboard, results screen) |
| `CooldownIndicator` | 02-02 | LOW | Visual cooldown ring/dim on spell bar items (1.5s enforced server-side, client presentation only) |

---

## Copywriting

### Primary CTA Labels

| Context | Label | Element | Rationale |
|---------|-------|---------|-----------|
| Lobby — start raid | `Raid` | Button (red, prominent) | Existing in lobby. Keep unchanged. |
| Lobby — reroll opponent | `Refind (N)` | Button (secondary) | Existing in lobby. Keep unchanged. |
| BattleScreen — cast spell | `Cast` or spell icon click | Spell bar click action | Click spell -> click target. No explicit "Cast" button needed; clicking a target on the grid IS the cast action. |
| BattleScreen — return after results | `Return to Lobby` | Results screen button | Post-raid navigation. |
| Leaderboard | `Class Rankings` | Page heading | Class-only scope (not school/global). |
| BattleScreen — timer | `X.Xs remaining` | Timer HUD | Countdown indicator. |

### Empty States

| Context | Copy | Where |
|---------|------|-------|
| No opponent found | `No opponents found in your class.` + `Opponents appear once other teams in your class have placed buildings.` | Lobby — currently implemented; keep unchanged |
| No spells available | `No spells available — place buildings first.` | BattleScreen spell bar — new |
| No trophies yet | `No rankings yet — raids start after the first team places a base.` | Leaderboard — new |
| No battle history | `No battles yet. Start one from the lobby.` | BattleScreen (defender grid while loading) — new |

### Error States

| Context | Copy | Behavior |
|---------|------|----------|
| Phase gate (403) | `This feature unlocks at the Working phase.` | API route returns 403; client shows error banner (can pre-emptively hide PvP nav for below-working teams) |
| No quota (raids exhausted) | `No raids remaining today. Try again tomorrow.` | Lobby — disable Raid button, update quota display. Already implemented (dimmed button). |
| No quota (refinds exhausted) | `No refinds remaining today.` | Lobby — disable Refind button. Already implemented (dimmed button). |
| Server error (5xx) | `Something went wrong. Please try again.` | Error banner in lobby (already implemented pattern). |
| Connection lost mid-raid | `Connection lost — raid ended.` | BattleScreen error state. Server persists the raid log; client navigates back to lobby. |
| Invalid target | `Not a valid target.` | Grid hover — building is out of AOE range or invalid target type. |
| Cooldown active | `Spell on cooldown — wait {N}s.` | Client-side visual; server enforces the 1.5s cooldown and rejects early casts. |

### Destructive Actions

| Action | Confirmation Approach | Phase |
|--------|----------------------|-------|
| Starting a raid | **No explicit confirmation** — the Raid button itself is a deliberate action. The 3/day cap adds weight. | 02-02 |
| Using a refind | **No confirmation** — same pattern as Raid. | 02-02 |
| Casting a spell | **No confirmation** — the click -> click interaction is the action. Server validates within 15s window. | 02-02 |

No destructive confirmation dialogs are needed in Phase 2. The existing quota counters + button disable state provide sufficient friction.

**Pre-populated from:** D-13 (type-cycle science explanations), D-19 (BattleScreen interaction), D-20 (leaderboard), D-22 (lobby visual-pass), existing lobby page copy.

---

## Interaction Contracts

### BattleScreen (02-02, milestone blocker)

**Layout (top-to-bottom):**

```
+---------------------------------------------+
|  Timer: 12.4s remaining      PWR: [#### ]  |   <-- HUD bar
+---------------------------------------------+
|                                             |
|         DEFENDER BASE (grid view)            |   <-- Read-only snapshot
|    [Bldg A]  [Bldg B]  [Bldg C]             |       Building sprites
|         [Bldg D]  [Bldg E]                   |       Health bars
|                                              |       Type labels
+---------------------------------------------+
|  Type Chart [?]                              |   <-- Type-cycle tooltip
+---------------------------------------------+
|  [Spell 1]  [Spell 2]  [Spell 3]  [Spell 4]  |   <-- Spell bar
|   cooldown    ready      ready     cooldown   |       Cooldown indicators
|   [empirical] [theoret.] [applied] [empirical]|       Type labels
+---------------------------------------------+
```

**Cast flow:**

1. Player clicks a spell in the spell bar → spell becomes "selected" (gold highlight ring)
2. Player hovers over defender grid buildings → buildings within AOE radius get a valid-target overlay (green highlight); out-of-range buildings remain normal (or get a dim overlay)
3. Player clicks a highlighted building → cast event fires (`POST /api/pvp/{id}/action` with `{spellId, x, y, clientTs}`)
4. Server response: updated defender building state (health, destroyed status)
5. Client updates grid: destroyed buildings show cracked/damaged state; building health bars update
6. Spell bar: the cast spell enters cooldown (1.5s dim state with countdown)
7. Timer continues counting down (15s from raid start, server-enforced)
8. When timer expires OR all buildings destroyed → server auto-completes the raid → client transitions to ResultsScreen

**Visual style requirements (MANDATORY per §7.1):**
- Defender grid background uses `TileBackground` (seeded grass tiles) at z-index 0
- Decoration layer (`DecorationLayer`) at z-index 0 below the grid
- Defender buildings render using gateway sprite PNGs from `public/sprites/gateways/` or economy building sprites (same pixel-art rendering with `.pixel-art` class + `image-rendering: pixelated`)
- Overall viewport has the `lab-scene__viewport` styling (flex: 1, min-height: 0, overflow: hidden, inset box-shadow vignette)
- The dark navy background (#10131f) is the page default
- No new heavyweight animation library — CSS transitions + Tailwind animations only (D-26)

**Accessibility considerations:**
- Spells and buildings have visible text labels (not just icons)
- Health bars use both color AND text/percentage (not color-only)
- Timer has both visual countdown and audible-adjacent visual pulse
- All interactive elements are keyboard-accessible (Tab to spell, Enter to select, Tab to target, Enter to cast)

### Spell Bar

| Property | Value |
|----------|-------|
| Position | Fixed bottom of BattleScreen |
| Background | `bg-slate-800/90` with `border-t border-slate-700/50` |
| Spell items | Horizontal row, each 64-80px wide |
| Selected state | Gold border (`ring-2 ring-[#F5C518]`) |
| Cooldown state | Dimmed (`opacity-40`), with circular progress indicator |
| Ready state | Full opacity, hover lift effect (`hover:-translate-y-1`) |
| Type label | Below spell name, in type color (empirical=blue, theoretical=purple, applied=amber) |
| Spell name | `.font-pixel` at 10px, white |
| Empty state | `No spells available` in muted text |

### Defender Grid

| Property | Value |
|----------|-------|
| Layout | Isometric grid (matching LabPlot convention with TILE_CELL=64px) OR simple top-down 2D grid (implementer's choice per Claude's Discretion) |
| Building rendering | Gateway sprite PNGs or economy building sprite PNGs with `.pixel-art` class |
| Building health | Health bar below each building: `PixelProgressBar` (gold gradient), show health fraction (`HP: 80/100`) |
| Destroyed state | Building sprite fades to 40% opacity + shows cracked overlay or `X` indicator |
| Valid target highlight | Green glow/tint (`ring-2 ring-[#5ef08a]`) on buildings within AOE radius |
| Invalid target | Normal rendering (no highlight) |
| Hover | Building name tooltip, type label, current HP |

### Type-Cycle Science Tooltip (D-13)

**Location:** Raid HUD (above spell bar) + Lobby page (next to meter or as a help icon)

**Content (declared as constants in `lib/pvp`, not inline in components):**

| Type Pair | Effectiveness | Science Explanation |
|-----------|---------------|---------------------|
| Empirical > Theoretical | 2x super-effective | "Experiments reveal flaws in theoretical models." |
| Theoretical > Applied | 2x super-effective | "Mathematical models predict real-world outcomes." |
| Applied > Empirical | 2x super-effective | "Engineered solutions outperform raw discovery." |
| Same type | 1x neutral | "Similar methodologies yield no advantage." |
| All other pairs | 0.5x resisted | "The opposing methodology counters your approach." |

**Interaction:** Click a `[?]` icon → opens a small popover/panel showing the type cycle diagram with the one-line explanations. Popover closes on click-outside or Esc.

### Results Screen

| Property | Value |
|----------|-------|
| Full viewport overlay | Semi-transparent dark background (`bg-black/70`), centred content card |
| Card background | `bg-slate-800/90` with `border border-slate-700/50` |
| Percent destroyed | Large number (30px, bold, gold if ≥30%, red if <30%) |
| Trophy delta | Green `+N` or red `-N`, with trophy icon |
| Building summary | Grid of defender buildings showing final state (destroyed/surviving) |
| Return button | `Return to Lobby` — `bg-slate-700 hover:bg-slate-600` secondary button |

### Leaderboard (02-02)

**Layout:** Simple table/list. Class-only (TROPHY-04, not school/global).

| Property | Value |
|----------|-------|
| List style | Ranked rows, 1-indexed |
| Current user row | Highlighted (`bg-slate-700/50` or gold left border) |
| Columns | Rank, Team Name, Lab Type, Trophy count |
| Empty state | `No rankings yet — raids start after the first team places a base.` |
| Visual style | Match dark card pattern from lobby (`bg-slate-800/60 rounded-xl border border-slate-700/50 px-5 py-4`) |
| Loading state | `PixelSkeleton` rows |

### Lobby Visual Pass (D-22, LOW — approvable/skippable)

The current lobby (committed `70f82db`, pre-v0.23.0 overhaul) uses flat Tailwind styling:
- Cards: `bg-slate-800/60 rounded-xl border border-slate-700/50`
- Buttons: flat colored backgrounds
- No pixel-art sprites or background

**Recommended (approvable) visual pass:**
- Add `TileBackground` as viewport background
- PvP gateway sprite as decorative element
- Meter bar: replace linear-fill with `PixelProgressBar` segment-aware fill (D-18 optional polish)
- Add `.font-pixel` to game-UI labels (trophy, meter badges)
- Consistent `lab-scene__viewport` vignette

**If skipped:** The lobby remains functional but visually inconsistent with the post-overhaul BattleScreen and leaderboard. Record the skip decision in the 02-02 plan.

---

## Registry

**shadcn initialized:** Yes — `tailwind.config.ts` has shadcn CSS variables, `components/ui/` directory exists with shadcn-compatible components, `globals.css` has the `@layer base` CSS variable declarations.

**Third-party registries:** None. All components in Phase 2 are either:
- Existing shadcn/ui or custom pixel-art components already in the project
- New components built specifically for PvP (BattleScreen, SpellBar, DefenderGrid, etc.)
- No external registries, no new library dependencies per D-26

**Registry Safety Gate:** N/A — no third-party registries declared.

---

## Pixel-Art Prerequisite (§7.1)

The BattleScreen and leaderboard MUST match the v0.23.0 pixel-art style. These components are the reference:

| Reference | Path | Key Visual Properties |
|-----------|------|----------------------|
| `LabScene` | `components/lab/LabScene.tsx` | Full-bleed viewport, isometric grid, dark navy (#10131f) background, `.font-pixel` labels, seeded grass tiles, vignette box-shadow |
| `TileBackground` | `components/lab/TileBackground.tsx` | 64px tiles (TILE_CELL), seeded deterministic coverage, `image-rendering: pixelated`, z-index 0 |
| `DecorationLayer` | `components/lab/DecorationLayer.tsx` | Seeded shrub/rock scatter, pointer-events:none, below building plot |
| `LabPlot` | `components/lab/LabPlot.tsx` | Isometric grid at z-index 1, cellToScreen coordinate system, building hover/select interactions |
| Gateway sprites | `public/sprites/gateways/*.png` | 48x48 source @ 3x display, pixel-art rendering, 6 lab-type skin variants |
| Decor sprites | `public/sprites/decor/*.png` | Shrub/rock variants, 32px source @ 2x display |
| `Sprite` | `components/lab/Sprite.tsx` | Placeholder rendering when PNG is missing, versioned URLs (`?v=<hash>`) |

### Applying the Style to PvP Screens

1. **BattleScreen:** Use `TILE_CELL` (64px) as the grid cell size. Defender building coordinates map to the same isometric grid used by `LabPlot`. Gateway sprites from `pvp_{skin}.png` can represent defender gateway positions. The `.lab-scene__viewport` dark vignette should frame the battle grid.

2. **Leaderboard:** The leaderboard doesn't need the full TileBackground + DecorationLayer (it's a data table, not a game world). But matching the visual styling means: dark background (`bg-background`), card containers matching `bg-slate-800/60 rounded-xl border border-slate-700/50`, `.font-pixel` for game-UI labels, gold accent for trophy display.

3. **Any new sprites:** Use the `pixel-art-generator` project skill. Follow the existing pipeline: char-grid JSON under `art/src/`, run `art/build_sprites.py` for generation, `art/recolor.py` for palette-swapping.

---

## Design Decisions Summary

| Category | Decision | Source | Overrideable? |
|----------|----------|--------|---------------|
| Grid system | Isometric TILE_CELL=64px for BattleScreen defender grid | Lab scene convention (§7.1) | Implementer can use 2D top-down grid if isometric proves too complex (Claude's Discretion) |
| Spell interaction | Click spell -> click target (2-click cast) | D-19, common raiding UX | Implementer's discretion on single-click (click spell then auto-target on hover) |
| Timer display | Client countdown; server enforces 15s | D-05, ENGINE-03 | Presentation only — server always authoritative |
| Empty spell bar | `No spells available — place buildings first.` | New (this spec) | Approvable during implementation |
| Type-cycle tooltip | Click `[?]` -> popover with explanations | D-13, SPELL-05 | Implementer can use permanent small panel below HUD instead of popover |
| Meter bar fill | Keep linear (tasksCompleted/5) for v1 | D-18 (optional polish deferred) | Approvable to skip — badge is threshold-correct |
| Lobby visual pass | Assess in 02-02, approvable/skippable | D-22 | LOW priority; do NOT block BattleScreen or leaderboard |
| Leaderboard scope | Class-only (not school/global) | D-20, TROPHY-04 | Locked — spec is clear |
| Team-builder | REMOVE (stub + route entry) | D-21 | Locked — user-directed removal |
| New libraries | NONE (D-26) | SPEC §11.8, D-26 | Locked — CSS/Tailwind only for animations |
| Trophy delta | Symmetric gain/loss for v1 | D-16 | Locked — already built and verified |
| `TROPHY_LOSS_TODO` | Stays `true` through Phase 2 | D-15 | Locked — Phase 3 flips it |

---

## Success Criteria (UI-SPEC specific)

- [ ] BattleScreen is playable: player can see defender grid, select spell, click target, see cast result
- [ ] Defender grid renders with pixel-art sprites matching v0.23.0 overhaul (§7.1)
- [ ] Spell bar shows available spells, cooldown state, type labels, tooltip
- [ ] 15s timer displayed as countdown; server enforces the window
- [ ] Results screen shows percent destroyed + trophy change (gain or loss)
- [ ] Type-cycle science explanations surface in raid HUD and lobby (D-13)
- [ ] Leaderboard shows class trophy rankings from `PvpTrophies` (D-20)
- [ ] Team-builder stub removed (D-21)
- [ ] Lobby visual-pass assessed (D-22) — recorded in 02-02 plan as done or skipped
- [ ] No regressions in existing lobby functionality (trophy display, spell power meter, opponent matching, raid/refind actions)
- [ ] All PvP UI uses existing Tailwind pixel-art classes — no new CSS library (D-26)
- [ ] meter-bar linear fill is acceptable (optional polish deferred)