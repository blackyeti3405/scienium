# Brief — classical-mechanics-physics · projectile-ballistics (branch)

- **branch id / label:** `projectile-ballistics` · **Projectile Motion & Ballistics**
- **target:** 7 units × ~6 lessons ≈ **44 lessons** (subfield target 40–50)
- **idPrefix:** `cmp-projectile` (lesson ids → `cmp-projectile-<unitShort>-<slug>`)
- **scope:** 2D motion under gravity — launch-angle/range/height optimization, decomposition into independent horizontal & vertical components, and how (light) air resistance bends the ideal parabola. Trajectory-focused.
- **boundaries:** Core owns the general kinematic vocabulary; this branch goes deep on 2D trajectories. Full drag/turbulence modeling belongs to `fluid-dynamics-aerodynamics` — keep air resistance at the trajectory level (how it bends the parabola), not Navier–Stokes.

## Unit plan (foundations → optimization → variants → lab → real air → ballistics → landmark)
1. **Foundations of 2D Projectile Motion** — the decoupling insight (independent horizontal constant-velocity and vertical accelerated motion); the parabola; time of flight; horizontal range from launch velocity; why a dropped and a horizontally-fired object land together. *(6)*
2. **Range, Height, and Launch Angle** — range R = v²·sin(2θ)/g on level ground; 45° maximizes range; complementary angles give equal range; maximum height; the trade between range and hang time. *(6)*
3. **Projectiles from Heights and onto Slopes** — launch and landing at different heights (table/cliff); why optimal angle drops below 45° when landing lower or when release height matters; projectile onto an incline; the monkey-and-hunter demonstration. *(6)*
4. **Measuring Projectile Motion in the Lab** — spring/pneumatic launchers, photogates for muzzle velocity, video tracking, carbon-paper landing scatter; extracting v₀ and θ; dominant errors (launch-angle jitter, spin, timing lag, air). *(6)*
5. **Air Resistance and the Real Trajectory** — linear vs quadratic drag qualitatively; how drag shortens range, lowers the optimal angle below 45°, and breaks rise/fall symmetry (steeper descent); the "ballistic" vs vacuum parabola; where the ideal model fails. *(7)*
6. **Ballistics and Spin: Sport to Artillery** — the four ballistics phases (internal/transitional/external/terminal), external as our focus; ballistic coefficient qualitatively; the Magnus effect on spinning balls (curveball, topspin dip, backspin lift); why real sports launch angles sit below 45°. *(7)*
7. **Landmark Work & Open Debates** *(required)* — Tartaglia's and Galileo's discovery that trajectories are parabolic (16th–17th c.); Newton's cannonball thought experiment linking projectiles to orbits; ballistics and the birth of computing (WWII firing tables, the human "computers," ENIAC); the historical drag-law debate (which power of v?); the long dispute over the Magnus/curveball effect. *(6)*

**Total: 6+6+6+6+7+7+6 = 44 lessons.**

## Depth cues
Named work: Tartaglia (*Nova Scientia*, 1537), Galileo (parabola, *Two New Sciences* 1638), Newton's cannonball, Robins' ballistic pendulum & drag work, ENIAC firing tables. Debates: correct drag power law; reality of the Magnus effect (once doubted); why textbook 45° is wrong for real sports. Applications: basketball/free-throw arc, long-jump & shot-put optimal angles, javelin aerodynamics, water jets. Pairs-with the Core's projectile-plot lesson and `gravitation-orbits` (Newton's cannonball is the bridge).
