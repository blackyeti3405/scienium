# Biomechanics — track brief (worked reference)

- **Slug:** `biomechanics` · **Label:** Biomechanics
- **home:** `false` (this is a specialist track selectable by any team, not
  a per-lab default — contrast with the six `*-home` tracks)
- **labType:** none

## Target shape

- **Core:** 5 units, 4 lessons each = 20 lessons. Foundations every student
  needs before any specialization: mechanics vocabulary, kinematics,
  kinetics, muscle/tissue mechanics, measurement/study design.
- **Branches:** 3-5 specialization segments, ~9-10 lessons each (3 units of
  ~3 lessons), unlocked only once Core is 100% complete. This cycle shipped
  ONE complete branch (Sports Biomechanics) as the full worked reference;
  Clinical & Rehab Biomechanics and Robotics & Biomechanical Engineering are
  the next two branches to author via this same pipeline (see
  `changes-F13-codex.md` for the explicit content-split note).

## Unit outline (Core)

1. **Foundations of Movement** — what biomechanics is; anatomical planes/
   axes; levers and joints; units and measurement.
2. **Kinematics** — position/velocity/acceleration; the gait cycle; joint
   angles/goniometry; motion capture basics.
3. **Kinetics** — force and Newton's laws; ground-reaction force; torque/
   joint moments; center of mass and balance.
4. **Muscle & Tissue Mechanics** — contraction types; force-length/force-
   velocity relationships; tendons/ligaments/elasticity; fatigue and injury
   mechanisms.
5. **Measurement & Study Design** — EMG basics; force plates/pressure
   mapping; statistics for movement data; designing a biomechanics
   experiment.

## Branch outline (Sports Biomechanics — shipped reference branch)

1. **Performance Mechanics** — sprinting mechanics; jumping/landing
   mechanics; throwing mechanics.
2. **Equipment & Technique** — footwear/surface effects; technique
   optimization; biomechanics of common sport injuries.
3. **Applied Analysis** — video analysis in sport; return-to-play metrics;
   an integrated case study (sprinter's stride) synthesizing the whole
   branch.

### Remaining branches (next content batch, not yet authored)

- **Clinical & Rehab Biomechanics** — suggested units: Gait Pathology
  (pathological gait patterns, prosthetics/orthotics, assistive devices),
  Rehab Assessment (range-of-motion assessment, functional movement
  screening, outcome measures), Applied Analysis (post-surgical gait case
  study, wearable sensors in rehab, designing a rehab study).
- **Robotics & Biomechanical Engineering** — suggested units: Human-Machine
  Systems (exoskeleton basics, prosthetic limb design, biomimicry),
  Modeling (musculoskeletal modeling, simulation/inverse dynamics, wearable
  materials), Applied Analysis (control systems for assistive devices,
  sensor fusion basics, case study designing an exosuit).

## Tone / reading-length constraints

- `readingMinutes`: 5-6 for every lesson (this track's content is denser
  than the home tracks' 5-minute average — acceptable for a specialist
  track, but don't drift much past 6).
- 3 sections per lesson is the norm (occasionally 2 for a tightly-scoped
  lesson).
- Every lesson MUST explicitly connect back to at least one EARLIER lesson's
  concept where mechanically true (e.g., the jumping/landing lesson
  explicitly invokes the earlier eccentric-contraction and tendon-elasticity
  lessons) — this is what makes the branch read as a genuine specialization
  built on Core, not a disconnected lesson list.

## "Why judges ask this" requirement

Every lesson's `judgeFraming` must name the SPECIFIC reason a science-fair
judge would probe this exact concept in THIS student's project defense —
never a generic "judges like rigor" sentence. Good: "Judges ask which class
of lever a joint is because it is a fast, concrete check of whether a
student actually understands the mechanical model behind their measurement."
Bad: "Judges appreciate scientific understanding."
