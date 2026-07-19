# Brief — classical-mechanics-physics · Core

- **slug:** `classical-mechanics-physics` · **label:** Classical Mechanics / Physics · **home:** false
- **segment:** Core · **target:** 8 units × ~6 lessons ≈ **50 lessons**
- **idPrefix:** `cmp-core` (every lesson id → `cmp-core-<unitShort>-<slug>`)
- **pairs-with:** fluid-dynamics-aerodynamics, robotics-control-systems, materials-science, acoustics-sound, renewable-energy
- **tone:** 4–6 min reads, AP/advanced-high-school. Real physics — numbers, named experiments, history, competing views — not definitions.

## Scope boundary (Core is the LINEAR, shared foundation)

Core teaches the vocabulary of motion/force, the conserved-quantity toolkit (energy, momentum — foundational only), lab craft, error/linearization, and reading the canonical plots. Deliberately **linear** — rotation, oscillation, projectile optimization, deep collision analysis, and gravitation are each a **branch**, so Core keeps momentum/collisions foundational (1D conservation, elastic/inelastic distinction) and leaves 2D collisions, restitution, and force–time impulse curves to `collisions-momentum`.

## Unit plan (vocabulary → dynamics → conserved quantities → lab craft → error → interpretation → landmark)

1. **The Language of Motion** — scalars vs vectors; distance/displacement; average vs instantaneous velocity & speed; acceleration; the constant-acceleration kinematic equations; free fall & g; relative motion / Galilean velocity addition. *(7)*
2. **Forces and Newton's Laws** — force as an interaction & the free-body diagram; 1st law/inertia; 2nd law F=ma; 3rd law & interaction pairs (why they don't cancel); weight/mass/normal/tension; static vs kinetic friction (µ, the friction cone); applying the laws to connected/Atwood systems. *(7)*
3. **Energy and Work** — work as F·d and the dot product; work–energy theorem; kinetic energy; gravitational & elastic PE (Hooke's law); conservation of mechanical energy; power; non-conservative forces, friction & energy dissipation. *(6)*
4. **Momentum, Impulse, and Center of Mass** — linear momentum p=mv; impulse–momentum theorem & the area under F–t; conservation of momentum & closed systems; elastic vs inelastic collisions (foundational); center of mass; Newton's laws for systems of particles. *(6)*
5. **Measurement, Units, and Lab Craft** — SI base units & why they matter; dimensional analysis as an error check; significant figures, precision vs accuracy; timing/tracking instruments (photogates, video tracking, ticker tape, stopwatches); force/motion/position sensors & calibration; controlling a mechanics experiment (IV/DV/controls, repeats, confounders). *(6)*
6. **Error, Uncertainty, and Linearization** — systematic vs random error; reporting uncertainty (mean, SD, standard error, error bars); propagation of uncertainty through sums/products/powers; fitting a straight line (slope/intercept, least-squares intuition); the **linearization trick** (T ∝ √L → T² ∝ L; F = kx; s = ½at²); residuals, R², and judging whether a fit supports a law. *(7)*
7. **Reading Mechanics Data** — motion graphs (x–t, v–t, a–t) and what slopes/areas mean; projectile trajectories on a plot; force–vs–displacement curves (area = work); energy-exchange (KE↔PE) curves; oscillation traces (amplitude, period, decay envelope); phase-space / phase-portrait plots; what each plot does and does NOT prove. *(6)*
8. **Landmark Work & Open Debates** *(required)* — Galileo's inclined planes & the law of falling bodies (vs Aristotle); Newton's *Principia* and the synthesis of terrestrial + celestial mechanics; the *vis viva* debate — momentum (mv) vs "living force" (mv²) (Descartes/Leibniz/du Châtelet); Galilean relativity, rotating frames & the Foucault pendulum (1851); determinism, the three-body problem & the roots of chaos (Poincaré); where classical mechanics breaks — the relativistic and quantum boundaries. *(7)*

**Total: 7+7+6+6+6+7+6+7 = 52 lessons.** Hits the 45–55 Core target.

## Depth requirements (arm a student for judge Q&A)
- **Named landmark work:** Galileo (inclined planes, ~1638 *Two New Sciences*), Newton (*Principia*, 1687), the Leibniz–Descartes *vis viva* controversy & Émilie du Châtelet's kinetic-energy insight, Foucault's 1851 pendulum, Poincaré & the three-body problem (chaos roots).
- **Debates/limits:** momentum-vs-energy as *the* conserved quantity (resolved: both, they measure different things); determinism vs chaos; the classical→relativistic/quantum boundary (when v→c or scale→atomic).
- **Competing methods in lab craft:** photogates vs video tracking vs ticker tape; why linearization beats eyeballing a curve.
- **Applications woven in:** designing a controlled mechanics experiment; what a v–t slope legitimately proves; using a linear fit's slope to extract a constant (g, k, µ).

## Judge-framing reminder
Every lesson's `judgeFraming` ties to why a fair judge probes THIS concept — e.g. "can you read acceleration off a v–t slope?", "did you control speed/mass?", "does your straight-line fit actually test the law you claim?" — not generic "shows understanding" filler.
