/**
 * Field Codex (Feature F13) — "Astronomy / Astrophysics" track.
 *
 * Lazily imported by `../index.ts`'s `loadTrack` — do not import this module
 * eagerly from panel code. Authored via `.claude/codex-pipeline/` (fact-checked
 * unit drafts reconciled to the typed `Unit` shape — see
 * `.claude/pipeline/changes-astronomy-core.md`).
 * Ships a deep-authored Core segment (8 units / 48 lessons: the sky and its
 * objects, light as data, telescopes, photometry, diagnostic plots,
 * distance/inference, landmark work and open debates, and applications of
 * designing a defensible astronomy study) — branches (cosmology, exoplanets,
 * galactic-extragalactic, observational-methods-timedomain,
 * stellar-astrophysics) to follow via `/codex-pipeline`. Every lesson ends in a
 * 3-5 question authored checkpoint with a written explanation for every
 * option (including the correct one).
 */
import type { CodexTrack } from '../types'

const track: CodexTrack = {
  slug: 'astronomy-astrophysics',
  label: 'Astronomy / Astrophysics',
  home: false,
  core: {
    id: 'core',
    kind: 'core',
    label: 'Core',
    units: [
      {
        id: 'astro-core-sky',
        label: 'The Sky and Its Objects',
        lessons: [
          // ─── Lesson 1 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-sky-celestial-coordinates',
            label: 'Celestial Coordinates: RA, Dec, and the Celestial Sphere',
            readingMinutes: 5,
            sections: [
              {
                heading: 'The celestial sphere: a useful fiction',
                body: 'To locate objects, astronomers pretend the sky is the inside of a giant sphere — the celestial sphere — centered on Earth, with the stars painted on it. This is geometrically false (stars are at wildly different distances), but it is a powerful bookkeeping device: because the stars are so far away, their DIRECTIONS barely change as Earth orbits, so a fixed pair of angles pins each one down. The sphere has poles and an equator that are just Earth\'s own projected outward. The North and South Celestial Poles sit directly above Earth\'s geographic poles; the Celestial Equator is Earth\'s equator projected onto the sphere. As Earth rotates west-to-east once per ~23h 56m (the sidereal day), the whole sphere appears to wheel east-to-west overhead, which is why stars rise in the east and set in the west.',
              },
              {
                heading: 'Right Ascension and Declination: the sky\'s latitude and longitude',
                body: 'The equatorial coordinate system mirrors Earth\'s latitude/longitude. DECLINATION (Dec, δ) is the celestial latitude: the angle north (+) or south (−) of the Celestial Equator, running from +90° at the North Celestial Pole to −90° at the South, measured in degrees, arcminutes, and arcseconds. RIGHT ASCENSION (RA, α) is the celestial longitude: the angle measured eastward along the Celestial Equator, but by deep convention it is expressed in TIME units — hours, minutes, and seconds — not degrees, because the sky sweeps overhead at a steady rate. A full circle of 360° corresponds to 24 hours of RA, so 1 hour of RA = 15°, and 1 minute of RA = 15 arcminutes (at the equator). RA\'s zero point is the vernal equinox — the point where the Sun crosses the Celestial Equator going north in March, also called the First Point of Aries.',
              },
              {
                heading: 'Why coordinates drift: precession and epochs',
                body: 'Because RA and Dec are tied to Earth\'s equator and the equinox, and because Earth\'s spin axis slowly wobbles like a top — a 25,772-year precession cycle Hipparchus first detected around 129 BCE by comparing star positions to older records — the coordinate grid itself creeps against the stars. A star\'s cataloged RA/Dec therefore drifts by roughly 50 arcseconds per year. To keep catalogs unambiguous, positions are always tagged with an EPOCH: the modern standard is J2000.0 (noon TT, 1 January 2000), which replaced the older B1950.0. Software must precess coordinates from the catalog epoch to the date of observation, or a telescope will point in slightly the wrong place. This is why "the North Star" is only temporary: Polaris is near the pole now, but around 14,000 CE precession will carry the pole toward Vega.',
              },
            ],
            workedExample: 'A student wants to point a telescope at Betelgeuse, cataloged at RA 05h 55m 10s, Dec +07° 24′ 25″ (J2000). First, converting RA to degrees for a mount that wants decimal degrees: 05h 55m 10s = 5 + 55/60 + 10/3600 = 5.9194 hours; times 15°/hour = 88.79°. The declination is already an angle: +07° 24′ 25″ = 7 + 24/60 + 25/3600 = +7.407°. To check whether Betelgeuse is even observable tonight from a latitude of +40°, the student uses the rule that an object is circumpolar (never sets) if Dec > (90° − latitude) = 50°, and never rises if Dec < −50°. Betelgeuse\'s +7.4° falls comfortably between, so it rises and sets and is visible for part of the night — a quick feasibility check made entirely from its coordinates.',
            judgeFraming: 'Judges ask "how did you know where your target was, and in what epoch?" because a student who reports a J2000 catalog position and precesses (or at least knows they must) has done real observational planning, while one who typed raw numbers into a mount and got an empty field has not. The tell is knowing that RA is in time units (1h = 15°) and that Dec sets whether an object is even reachable from your latitude — a student who can compute the circumpolar limit for their site shows they understood the geometry rather than trusting the software blindly.',
            checkpoint: {
              questions: [
                {
                  kind: 'mc',
                  id: 'q1',
                  prompt: 'One hour of Right Ascension corresponds to how many degrees along the Celestial Equator?',
                  options: [
                    { id: 'a', text: '1°' },
                    { id: 'b', text: '15°' },
                    { id: 'c', text: '24°' },
                    { id: 'd', text: '360°' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: '1° would only be true if RA ran 0–360 in degrees; RA runs 0–24 hours, so each hour is larger than a degree.',
                    b: 'Correct — the sky turns a full 360° in 24 hours of RA, so 360° ÷ 24 h = 15° per hour of RA.',
                    c: '24 is the number of RA hours in a full circle, not the degrees per hour.',
                    d: '360° is the whole circle (all 24 hours of RA), not one hour.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'Why are cataloged star positions always tagged with an epoch such as J2000.0?',
                  options: [
                    { id: 'a', text: 'Because stars physically move so fast that their positions change nightly' },
                    { id: 'b', text: 'Because the coordinate grid itself drifts against the stars as Earth\'s axis precesses (~50″ per year)' },
                    { id: 'c', text: 'Because telescopes were only invented in the year 2000' },
                    { id: 'd', text: 'Because declination but not right ascension changes over time' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Stellar proper motion is real but tiny for most stars (well under an arcsecond per year); it is not the main reason for epochs.',
                    b: 'Correct — Earth\'s 25,772-year axial precession moves the equinox and equator that define the grid, so RA/Dec of a fixed star drift ~50″/yr and must be referenced to a stated epoch.',
                    c: 'J2000 is a reference date, not the invention of telescopes; epochs long predate 2000 (e.g., B1950).',
                    d: 'Precession shifts both RA and Dec, not just declination.',
                  },
                },
                {
                  kind: 'matching',
                  id: 'q3',
                  prompt: 'Match each equatorial-coordinate term to its correct description.',
                  left: [
                    { id: 'ra', text: 'Right Ascension (RA)' },
                    { id: 'dec', text: 'Declination (Dec)' },
                    { id: 'ncp', text: 'North Celestial Pole' },
                    { id: 'equinox', text: 'Vernal equinox' },
                  ],
                  right: [
                    { id: 'longitude', text: 'Celestial "longitude," measured eastward in hours (0–24h)' },
                    { id: 'latitude', text: 'Celestial "latitude," +90° to −90° from the Celestial Equator' },
                    { id: 'pole', text: 'Earth\'s north pole projected onto the sphere; Dec = +90°' },
                    { id: 'zero', text: 'The RA = 0h reference point where the Sun crosses the equator going north' },
                  ],
                  correctPairs: [
                    ['ra', 'longitude'],
                    ['dec', 'latitude'],
                    ['ncp', 'pole'],
                    ['equinox', 'zero'],
                  ],
                  explanation: 'RA is celestial longitude in time units (0–24h, eastward); Dec is celestial latitude (+90° to −90° from the equator); the North Celestial Pole is Earth\'s north pole projected out (Dec +90°); the vernal equinox is the RA = 0h origin where the Sun crosses the Celestial Equator northbound in March.',
                },
                {
                  kind: 'mc',
                  id: 'q4',
                  prompt: 'From a site at latitude +40°, which star is circumpolar (never sets)?',
                  options: [
                    { id: 'a', text: 'A star at Dec +60°' },
                    { id: 'b', text: 'A star at Dec 0° (on the Celestial Equator)' },
                    { id: 'c', text: 'A star at Dec −20°' },
                    { id: 'd', text: 'A star at Dec −70°' },
                  ],
                  answerId: 'a',
                  explanations: {
                    a: 'Correct — a star is circumpolar when Dec > (90° − latitude) = 50°; +60° exceeds 50°, so it circles the pole and never sets.',
                    b: 'A Dec 0° star rises and sets (it crosses the equator, which passes through the sky at this latitude), so it is not circumpolar.',
                    c: 'A Dec −20° star rises and sets and spends little time above the horizon; it is far from circumpolar.',
                    d: 'A star at Dec −70° never even rises from +40° (it is below the "never rises" limit of −50°), let alone stays up.',
                  },
                },
              ],
            },
          },

          // ─── Lesson 2 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-sky-magnitude-scale',
            label: 'Apparent vs Absolute Magnitude and the Magnitude Scale',
            readingMinutes: 6,
            sections: [
              {
                heading: 'A backwards, logarithmic scale inherited from antiquity',
                body: 'The magnitude system is the most notorious "gotcha" in astronomy because it runs BACKWARD and is LOGARITHMIC. It descends from Hipparchus (~2nd century BCE), who ranked naked-eye stars from 1st magnitude (brightest) to 6th magnitude (faintest visible). In 1856 Norman Pogson formalized this centuries-old habit by noticing that a 1st-magnitude star was about 100× brighter than a 6th — a span of 5 magnitudes. He fixed the scale so that a difference of exactly 5 magnitudes equals a flux ratio of exactly 100. Because 100^(1/5) ≈ 2.512, each single step of one magnitude is a flux ratio of ~2.512 (the "Pogson ratio"). The crucial consequences: SMALLER (even negative) magnitudes are BRIGHTER, and the scale is logarithmic, so magnitudes are NOT proportional to brightness. Sirius sits at m = −1.46, the full Moon near −12.7, the Sun at −26.7; the faintest stars Hubble can reach are around +30.',
              },
              {
                heading: 'The defining equation, and how to use it',
                body: 'The relationship between a flux (brightness) ratio and a magnitude difference is m₁ − m₂ = −2.5 · log₁₀(F₁ / F₂). The minus sign encodes the backwardness: if star 1 is brighter (F₁ larger), the log is positive, so m₁ − m₂ is negative — the brighter star has the smaller magnitude, as required. Equivalently, F₁ / F₂ = 10^(−0.4·(m₁ − m₂)). Two shortcuts worth memorizing: a 5-magnitude difference is exactly a factor of 100 in flux, and a 1-magnitude difference is about 2.512×. This means a Δm of 2.5 is a factor of 10, and a Δm of 10 is a factor of 10,000. A frequent student error is treating "magnitude 2 is twice as bright as magnitude 4" — it is not; it is 100^(2/5) ≈ 6.3× brighter.',
              },
              {
                heading: 'Apparent vs absolute: brightness seen vs brightness intrinsic',
                body: 'APPARENT magnitude (m) is how bright a star LOOKS from Earth — it mixes the star\'s true output with its distance. ABSOLUTE magnitude (M) is a fair-comparison measure: the apparent magnitude the star WOULD have if placed at a standard distance of exactly 10 parsecs (≈ 32.6 light-years). Because absolute magnitude strips out distance, it is a proxy for intrinsic luminosity, letting you compare a nearby dim star to a distant brilliant one on equal footing. The two are linked by the distance modulus: m − M = 5·log₁₀(d) − 5, with d in parsecs. Rearranged, d = 10^((m − M + 5)/5). The quantity (m − M) is literally called the "distance modulus," and it is one of the workhorses of measuring cosmic distances: measure m, know or infer M, and solve for d.',
              },
            ],
            workedExample: 'The Sun has apparent magnitude m = −26.7 (blindingly bright, because it is close). What is its absolute magnitude — how bright would it look from the standard 10 parsecs? The Sun\'s distance is 1 AU = 4.848 × 10⁻⁶ pc. Using the distance modulus m − M = 5·log₁₀(d) − 5: M = m − 5·log₁₀(d) + 5 = −26.7 − 5·log₁₀(4.848 × 10⁻⁶) + 5. Now log₁₀(4.848 × 10⁻⁶) = −5.31, so −5 × (−5.31) = +26.57. Thus M = −26.7 + 26.57 + 5 = +4.87. So the Sun\'s absolute magnitude is about +4.8 — meaning from 10 parsecs the Sun would be a modest, barely-naked-eye star, not a standout. This is the whole point of absolute magnitude: it reveals the Sun as a fairly ordinary star whose apparent glory is purely an accident of proximity.',
            judgeFraming: 'Judges love the magnitude scale precisely because it trips people up: they will ask "your star is magnitude 3 and this one is magnitude 8 — how many times brighter is it?" A student who answers "about 100 times" (5 magnitudes = 100×) and can explain the scale is backward and logarithmic has real command; one who says "about 2.7 times" or reasons linearly reveals they memorized a label without the math. Distinguishing apparent from absolute magnitude — and knowing absolute magnitude is defined at 10 parsecs — is the other frequent probe, because it separates "how bright it looks" from "how bright it really is."',
            checkpoint: {
              questions: [
                {
                  kind: 'mc',
                  id: 'q1',
                  prompt: 'Star A has apparent magnitude +2 and Star B has +7. How do their brightnesses compare?',
                  options: [
                    { id: 'a', text: 'Star B is brighter, by a factor of about 3.5' },
                    { id: 'b', text: 'Star A is brighter, by a factor of exactly 100' },
                    { id: 'c', text: 'Star A is brighter, by a factor of exactly 5' },
                    { id: 'd', text: 'They are equally bright; magnitude only encodes color' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'This gets the direction backward (smaller magnitude is brighter) and the size wrong.',
                    b: 'Correct — a 5-magnitude difference is by definition a flux ratio of exactly 100, and the smaller magnitude (Star A, +2) is the brighter one.',
                    c: '5 is the magnitude DIFFERENCE, not the brightness ratio; the ratio for 5 magnitudes is 100.',
                    d: 'Magnitude encodes brightness (flux), not color; a 5-magnitude gap is a large real brightness difference.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'Absolute magnitude (M) is defined as the apparent magnitude a star would have if it were placed at what distance?',
                  options: [
                    { id: 'a', text: '1 astronomical unit (AU)' },
                    { id: 'b', text: '1 light-year' },
                    { id: 'c', text: '10 parsecs (≈ 32.6 light-years)' },
                    { id: 'd', text: '1 parsec' },
                  ],
                  answerId: 'c',
                  explanations: {
                    a: '1 AU is the Earth–Sun distance, far too close to serve as the standard reference for stars.',
                    b: '1 light-year is not the convention; the standard is defined in parsecs.',
                    c: 'Correct — absolute magnitude is the apparent magnitude a star would show at exactly 10 parsecs (~32.6 ly), which removes distance and isolates intrinsic luminosity.',
                    d: '1 parsec is a tenth of the correct reference distance; the standard is 10 parsecs, not 1.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'A star has apparent magnitude m = +10 and absolute magnitude M = +5. How far away is it?',
                  options: [
                    { id: 'a', text: '10 parsecs' },
                    { id: 'b', text: '50 parsecs' },
                    { id: 'c', text: '100 parsecs' },
                    { id: 'd', text: '1000 parsecs' },
                  ],
                  answerId: 'c',
                  explanations: {
                    a: 'At 10 pc the distance modulus (m − M) would be 0, meaning m = M; here m − M = 5, so it is farther.',
                    b: '50 pc gives m − M = 5·log₁₀(50) − 5 = 5(1.70) − 5 = 3.5, not 5.',
                    c: 'Correct — distance modulus m − M = 5 gives d = 10^((5+5)/5) = 10² = 100 parsecs.',
                    d: '1000 pc gives m − M = 5·log₁₀(1000) − 5 = 15 − 5 = 10, twice the actual modulus.',
                  },
                },
                {
                  kind: 'ordering',
                  id: 'q4',
                  prompt: 'Order these objects from BRIGHTEST-appearing (most negative magnitude) to FAINTEST as seen from Earth.',
                  items: [
                    { id: 'sun', text: 'The Sun (m ≈ −26.7)' },
                    { id: 'moon', text: 'The full Moon (m ≈ −12.7)' },
                    { id: 'sirius', text: 'Sirius (m ≈ −1.5)' },
                    { id: 'polaris', text: 'Polaris (m ≈ +2.0)' },
                    { id: 'faint', text: 'A faint telescopic star (m ≈ +15)' },
                  ],
                  correctOrder: ['sun', 'moon', 'sirius', 'polaris', 'faint'],
                  explanation: 'Because the scale is inverted, brightest = most negative: the Sun (−26.7) → full Moon (−12.7) → Sirius (−1.5) → Polaris (+2.0) → a faint +15 telescopic star. Larger (more positive) magnitude means fainter.',
                },
              ],
            },
          },

          // ─── Lesson 3 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-sky-flux-luminosity-inverse-square',
            label: 'Flux, Luminosity, and the Inverse-Square Law',
            readingMinutes: 5,
            sections: [
              {
                heading: 'Luminosity is intrinsic; flux is what you catch',
                body: 'These two are constantly confused, and keeping them apart is foundational. LUMINOSITY (L) is the total power a star radiates in all directions — energy per unit time, measured in watts. It is an intrinsic property: the Sun\'s luminosity is L☉ = 3.83 × 10²⁶ W whether you observe it from Mercury or Neptune. FLUX (F) is the power PER UNIT AREA arriving at your detector — watts per square meter — and it depends entirely on how far away you are. A 100 W bulb has the same luminosity across a room, but the flux on your retina plummets as you back away. Astronomers measure flux (that is all a telescope can catch), then infer luminosity if they know the distance — or infer distance if they know the luminosity. That second move is the engine of the entire cosmic distance ladder.',
              },
              {
                heading: 'The inverse-square law: geometry, not physics of light',
                body: 'A star radiates its luminosity L outward. By the time that power reaches a distance d, it has spread over the surface of a sphere of radius d, whose area is 4πd². So the flux is F = L / (4πd²). The "inverse-square" name comes from the d² in the denominator: double the distance and the SAME power is smeared over 4× the area, so flux drops to one quarter; triple the distance and flux drops to one ninth. This is pure geometry — the surface area of an expanding sphere — not a property of light itself, which is why the same law governs sound intensity, gravity, and radio signals. The law assumes empty space; interstellar dust that absorbs or scatters light (extinction) makes real stars look fainter than the clean inverse-square value, a correction serious observers must apply.',
              },
              {
                heading: 'Putting them together: the standard-candle idea',
                body: 'Rearranging F = L / (4πd²) to solve for distance gives d = √(L / (4πF)). This is the single most important equation in extragalactic distance measurement. If you can independently KNOW an object\'s luminosity L — because it is a "standard candle," a class of object with a predictable intrinsic brightness — then measuring its flux F immediately yields its distance. Cepheid variable stars (whose pulsation period reveals their luminosity, the Leavitt Law discovered by Henrietta Leavitt in 1912) and Type Ia supernovae (which explode at a near-uniform peak luminosity) are the two most famous standard candles. The 2011 Nobel Prize in Physics went to work using Type Ia supernovae as standard candles to discover the accelerating expansion of the universe — the whole result rests on the inverse-square law connecting their known L to their measured F.',
              },
            ],
            workedExample: 'A Cepheid variable is identified in a distant galaxy. From its pulsation period, the Leavitt Law tells us its luminosity is L = 3.0 × 10³⁰ W (about 7,800 Suns). Astronomers measure its flux at Earth as F = 4.0 × 10⁻¹⁵ W/m². How far away is the galaxy? Using d = √(L / (4πF)): first compute the denominator, 4π × 4.0 × 10⁻¹⁵ = 5.03 × 10⁻¹⁴. Then L / (4πF) = 3.0 × 10³⁰ / 5.03 × 10⁻¹⁴ = 5.97 × 10⁴³ m². Taking the square root gives d = 7.7 × 10²¹ m. Converting to more familiar units (1 pc = 3.086 × 10¹⁶ m) gives d ≈ 2.5 × 10⁵ pc = 250 kpc — roughly the distance to a nearby galaxy. Notice the entire measurement hinged on independently KNOWING L from the period; the flux alone tells you nothing about distance without it.',
            judgeFraming: 'Judges probe the flux-vs-luminosity distinction because it is the fault line between students who understand why a dim-looking star can be intrinsically enormous and those who conflate "faint" with "small." Expect a question like "your sensor reads a certain brightness — is that luminosity or flux, and what else do you need to get the other one?" The right answer names flux (W/m²) as the measured quantity and distance as the missing piece, invoking F = L/(4πd²). A student who can explain that doubling distance quarters the flux — and that this is geometry, not a property of light — has genuinely understood the inverse-square law rather than reciting its name.',
            checkpoint: {
              questions: [
                {
                  kind: 'mc',
                  id: 'q1',
                  prompt: 'If a star\'s distance from us were tripled (with nothing else changing), the flux we receive would:',
                  options: [
                    { id: 'a', text: 'Drop to 1/3 of its original value' },
                    { id: 'b', text: 'Drop to 1/9 of its original value' },
                    { id: 'c', text: 'Stay the same, because luminosity is unchanged' },
                    { id: 'd', text: 'Drop to 1/6 of its original value' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Flux falls as 1/d², not 1/d, so tripling distance is not a simple factor of 3.',
                    b: 'Correct — flux ∝ 1/d², so tripling the distance multiplies flux by 1/3² = 1/9.',
                    c: 'Luminosity (intrinsic power) is unchanged, but flux (power per area at the observer) still falls with distance.',
                    d: '1/6 does not follow from any power of the distance; the inverse-square law gives 1/9 for a 3× distance.',
                  },
                },
                {
                  kind: 'matching',
                  id: 'q2',
                  prompt: 'Match each quantity or object to its correct description.',
                  left: [
                    { id: 'lum', text: 'Luminosity (L)' },
                    { id: 'flux', text: 'Flux (F)' },
                    { id: 'candle', text: 'Standard candle' },
                    { id: 'law', text: 'Inverse-square law' },
                  ],
                  right: [
                    { id: 'watts', text: 'Total power radiated in all directions, in watts (intrinsic)' },
                    { id: 'wattsm2', text: 'Power per unit area at the detector, in W/m² (distance-dependent)' },
                    { id: 'known', text: 'An object of known intrinsic L, so measured F gives distance' },
                    { id: 'geom', text: 'F = L/(4πd²): power spread over an expanding sphere\'s area' },
                  ],
                  correctPairs: [
                    ['lum', 'watts'],
                    ['flux', 'wattsm2'],
                    ['candle', 'known'],
                    ['law', 'geom'],
                  ],
                  explanation: 'Luminosity is the intrinsic total power in watts; flux is the distance-dependent power per area (W/m²) that a telescope catches; a standard candle has known L so its measured flux yields distance; the inverse-square law F = L/(4πd²) reflects power spreading over a sphere of area 4πd².',
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'Two stars have identical apparent flux at Earth, but Star X is 4× farther away than Star Y. What must be true of their luminosities?',
                  options: [
                    { id: 'a', text: 'Star X is 4× more luminous than Star Y' },
                    { id: 'b', text: 'Star X is 16× more luminous than Star Y' },
                    { id: 'c', text: 'They have equal luminosity' },
                    { id: 'd', text: 'Star X is 16× less luminous than Star Y' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: '4× the distance means 16× the required luminosity for equal flux, not 4× — flux scales with 1/d².',
                    b: 'Correct — since F = L/(4πd²) and fluxes are equal, L ∝ d²; Star X at 4× the distance needs 4² = 16× the luminosity to match Star Y\'s flux.',
                    c: 'Equal luminosity at 4× the distance would make Star X appear 16× fainter, not equally bright.',
                    d: 'Being farther yet equally bright requires MORE luminosity, not less.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q4',
                  prompt: 'Why does interstellar dust cause a real star to appear fainter than the clean inverse-square-law prediction?',
                  options: [
                    { id: 'a', text: 'Dust increases the star\'s distance' },
                    { id: 'b', text: 'Dust absorbs and scatters some of the light en route (extinction), removing flux the law assumes is preserved' },
                    { id: 'c', text: 'Dust lowers the star\'s intrinsic luminosity' },
                    { id: 'd', text: 'The inverse-square law already accounts for dust' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Dust does not change the geometric distance; it removes light along the path.',
                    b: 'Correct — the inverse-square law assumes empty space, but dust absorbs and scatters photons (interstellar extinction), so measured flux falls below the pure-geometry value and must be corrected.',
                    c: 'The star\'s intrinsic luminosity is unchanged; only the light reaching us is diminished.',
                    d: 'The pure inverse-square law assumes a transparent medium and does NOT include extinction; that correction is added separately.',
                  },
                },
              ],
            },
          },

          // ─── Lesson 4 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-sky-electromagnetic-spectrum',
            label: 'The Electromagnetic Spectrum Across Astronomy',
            readingMinutes: 5,
            sections: [
              {
                heading: 'Every wavelength tells a different physical story',
                body: 'Visible light is a sliver — roughly 400–700 nm — of an electromagnetic spectrum that spans more than a trillion-fold range of wavelengths, and each band reveals different physics because photon energy scales with frequency (E = hν, where h is Planck\'s constant) and inversely with wavelength (E = hc/λ). Ordered from longest wavelength (lowest energy) to shortest (highest energy): RADIO, MICROWAVE, INFRARED, VISIBLE, ULTRAVIOLET, X-RAY, GAMMA-RAY. Cold gas and pulsars announce themselves in radio; the 2.7 K cosmic microwave background is the relic of the Big Bang; warm dust and forming stars glow in infrared; hot stellar surfaces peak in visible/UV; million-degree gas around black holes and supernova remnants blazes in X-rays; the most violent events — gamma-ray bursts — emit gamma rays. A star that is invisible in one band can be the brightest object in another, which is why "multi-wavelength astronomy" is essential rather than optional.',
              },
              {
                heading: 'Blackbody radiation and Wien\'s law: color is a thermometer',
                body: 'Any warm, dense object emits a continuous "blackbody" (thermal) spectrum whose SHAPE depends only on temperature. Wien\'s displacement law states that the wavelength of peak emission is inversely proportional to temperature: λ_max · T = b, where b = 2.898 × 10⁻³ m·K (Wien\'s constant). Hotter means bluer (shorter peak wavelength); cooler means redder. This is why a star\'s color is a direct thermometer: red Betelgeuse (~3,500 K) peaks in the infrared, the yellow-white Sun (~5,772 K) peaks in the green-visible, and blue Rigel (~12,000 K) peaks in the ultraviolet. The total energy radiated per unit area also rises steeply with temperature via the Stefan–Boltzmann law (∝ T⁴), so hotter stars are dramatically more luminous per unit surface. Wien\'s and Stefan–Boltzmann\'s laws together let astronomers read a star\'s temperature and, combined with size, its luminosity, straight from its light.',
              },
              {
                heading: 'The atmosphere fights back: why we launch telescopes',
                body: 'Earth\'s atmosphere is opaque to most of the spectrum, transmitting well only in two "windows": the optical/near-infrared and the radio. It blocks nearly all UV (fortunately, for life), X-rays, and gamma rays, and absorbs much of the infrared via water vapor. This is why entire branches of astronomy are space-based: the Hubble Space Telescope (optical/UV, launched 1990), the Chandra X-ray Observatory (1999), the Fermi Gamma-ray Space Telescope (2008), and the James Webb Space Telescope (infrared, 2021) all fly above the atmosphere to see wavelengths the ground cannot. Radio astronomy, by contrast, thrives on the ground (Arecibo, the VLA, ALMA) because the radio window is wide open. Knowing which band your target emits in — and whether that band even reaches the ground — is the first practical question in designing an observation.',
              },
            ],
            workedExample: 'A student measures the spectrum of a star and finds its blackbody emission peaks at λ_max = 500 nm (green light). What is the star\'s surface temperature? Wien\'s law says λ_max · T = 2.898 × 10⁻³ m·K, so T = 2.898 × 10⁻³ / λ_max. Converting the peak wavelength to meters: 500 nm = 5.00 × 10⁻⁷ m. Then T = 2.898 × 10⁻³ / 5.00 × 10⁻⁷ = 5,796 K — almost exactly the Sun\'s ~5,772 K, which is no accident, since the Sun peaks near green. Now suppose a second, redder star peaks at λ_max = 1,000 nm (near-infrared). Its temperature is 2.898 × 10⁻³ / 1.00 × 10⁻⁶ = 2,898 K — half the temperature, because doubling the peak wavelength halves the temperature (the inverse relationship). The student has turned a spectral measurement into a thermometer reading with a single equation.',
            judgeFraming: 'Judges ask "what does the color or peak wavelength of your source tell you?" because Wien\'s law is the cleanest example of extracting physics from light, and a student who can compute a temperature from a peak wavelength demonstrates they understand emission is not arbitrary. Expect a follow-up on why a project chose a particular band — "why infrared for dust, or X-ray for hot gas?" — and, for any observational project, whether the target\'s wavelength even penetrates the atmosphere. A student who says "I used the radio window because X-rays never reach the ground" shows they grasped the practical geography of the spectrum, not just its ordering.',
            checkpoint: {
              questions: [
                {
                  kind: 'ordering',
                  id: 'q1',
                  prompt: 'Order these bands of the electromagnetic spectrum from LONGEST wavelength (lowest energy) to SHORTEST (highest energy).',
                  items: [
                    { id: 'radio', text: 'Radio' },
                    { id: 'infrared', text: 'Infrared' },
                    { id: 'visible', text: 'Visible' },
                    { id: 'uv', text: 'Ultraviolet' },
                    { id: 'gamma', text: 'Gamma-ray' },
                  ],
                  correctOrder: ['radio', 'infrared', 'visible', 'uv', 'gamma'],
                  explanation: 'Wavelength decreases (and photon energy increases) in the order radio → infrared → visible → ultraviolet → X-ray → gamma-ray; of the five listed, radio is longest-wavelength/lowest-energy and gamma-ray is shortest/highest.',
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'A blackbody\'s emission peaks at 725 nm (deep red). Using Wien\'s law (λ_max·T = 2.898 × 10⁻³ m·K), its temperature is approximately:',
                  options: [
                    { id: 'a', text: 'About 400 K' },
                    { id: 'b', text: 'About 4,000 K' },
                    { id: 'c', text: 'About 40,000 K' },
                    { id: 'd', text: 'About 6,000 K' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: '400 K would peak far in the infrared (~7,200 nm), not the deep red; this is off by a factor of ten.',
                    b: 'Correct — T = 2.898 × 10⁻³ / 7.25 × 10⁻⁷ ≈ 3,997 K, a cool red star.',
                    c: '40,000 K would peak deep in the ultraviolet (~72 nm), not the red.',
                    d: '~6,000 K peaks near green (~480–500 nm), which looks yellow-white, not deep red.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'Why must X-ray and gamma-ray telescopes (like Chandra and Fermi) be placed in space?',
                  options: [
                    { id: 'a', text: 'Because those wavelengths are too dim to detect from the ground' },
                    { id: 'b', text: 'Because Earth\'s atmosphere is opaque to X-rays and gamma rays, absorbing them before they reach the ground' },
                    { id: 'c', text: 'Because space is colder, reducing thermal noise' },
                    { id: 'd', text: 'Because the radio window only opens above the atmosphere' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'The problem is not intrinsic dimness but that the atmosphere blocks these photons entirely, so none arrive to be detected.',
                    b: 'Correct — the atmosphere is opaque to X-rays and gamma rays (and most UV), so these observatories must fly above it to receive the photons at all.',
                    c: 'Cooling detectors matters for some instruments, but the decisive reason for X/gamma telescopes is atmospheric opacity, not temperature.',
                    d: 'The radio window is on the GROUND — radio astronomy is done from Earth; this reverses the situation.',
                  },
                },
                {
                  kind: 'matching',
                  id: 'q4',
                  prompt: 'Match each astronomical source to the wavelength band in which it is most characteristically studied.',
                  left: [
                    { id: 'cmb', text: 'Cosmic microwave background (2.7 K relic of the Big Bang)' },
                    { id: 'dust', text: 'Warm dust and star-forming regions' },
                    { id: 'hotgas', text: 'Million-degree gas around black holes / supernova remnants' },
                    { id: 'pulsar', text: 'Cold neutral hydrogen gas and pulsars' },
                  ],
                  right: [
                    { id: 'micro', text: 'Microwave' },
                    { id: 'ir', text: 'Infrared' },
                    { id: 'xray', text: 'X-ray' },
                    { id: 'radioband', text: 'Radio' },
                  ],
                  correctPairs: [
                    ['cmb', 'micro'],
                    ['dust', 'ir'],
                    ['hotgas', 'xray'],
                    ['pulsar', 'radioband'],
                  ],
                  explanation: 'The 2.7 K cosmic microwave background peaks in the microwave; warm dust and forming stars glow in the infrared; million-degree gas around black holes and in supernova remnants radiates X-rays; cold hydrogen (21 cm line) and pulsars are radio sources.',
                },
              ],
            },
          },

          // ─── Lesson 5 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-sky-census-of-the-universe',
            label: 'A Census of the Universe: Stars, Clusters, Galaxies, and More',
            readingMinutes: 5,
            sections: [
              {
                heading: 'Stars and their groupings: from singles to clusters',
                body: 'Stars are self-gravitating balls of plasma fusing hydrogen (and later heavier elements) in their cores; the Sun is a middling one. Most stars are not solitary — more than half of Sun-like stars have at least one companion in a binary or multiple system, and vast numbers form together in clusters. Two kinds of star cluster matter for a census: OPEN CLUSTERS are loose, young groups of hundreds to a few thousand stars in the galactic disk (the Pleiades, ~440 ly away, ~100 million years old, is the classic example); GLOBULAR CLUSTERS are dense, spherical swarms of hundreds of thousands to over a million ancient stars orbiting in the galactic halo (like M13 in Hercules), typically ~12–13 billion years old — nearly as old as the universe itself. Because globulars are so old and their stars formed together, they are cornerstone laboratories for stellar evolution and for dating the Galaxy.',
              },
              {
                heading: 'Galaxies: the islands of stars, and Hubble\'s taxonomy',
                body: 'A GALAXY is a gravitationally bound system of stars, gas, dust, and dark matter — the Milky Way holds a few hundred billion stars. That galaxies are separate "island universes" rather than nebulae within our own was only settled in the 1920s: in the 1920 "Great Debate," Harlow Shapley argued the Milky Way was the whole universe while Heber Curtis argued the spiral nebulae were distant galaxies; Edwin Hubble settled it by identifying Cepheid variables in the Andromeda "nebula" in 1923 and announcing the result in 1925, using the Leavitt Law to prove it lay far beyond the Milky Way. Hubble also gave us the morphological classification still used today — the "tuning-fork" diagram: ELLIPTICALS (E0–E7, smooth featureless blobs of mostly old stars), SPIRALS (Sa–Sc, disks with arms and ongoing star formation, like ours), BARRED SPIRALS (SBa–SBc), and IRREGULARS (chaotic, gas-rich, often small). Morphology correlates with content: ellipticals are "red and dead" (little gas, old stars), spirals are "blue and star-forming."',
              },
              {
                heading: 'The rest of the census: nebulae, compact objects, and the dark budget',
                body: 'Beyond stars and galaxies, the census includes NEBULAE (interstellar clouds of gas and dust — emission nebulae like the Orion Nebula glow where hot young stars ionize hydrogen; planetary nebulae are shells cast off by dying Sun-like stars; supernova remnants are the wreckage of exploded massive stars), and the COMPACT OBJECTS stellar death leaves behind: white dwarfs (Earth-sized cinders), neutron stars (city-sized, incredibly dense, often seen as pulsars), and black holes. Zooming out, galaxies themselves cluster into groups and clusters, which string along filaments and sheets around vast voids — the "cosmic web." And the biggest surprise of the modern census is that ordinary matter (everything above) is a minority: the universe is roughly 5% ordinary matter, 27% dark matter (unseen, inferred from gravity), and 68% dark energy (driving accelerating expansion). The visible sky is the small, luminous tip of a mostly dark iceberg.',
              },
            ],
            workedExample: 'A student building a "cosmic census" poster needs to order objects by physical scale and place them correctly. They reason through the hierarchy: a single STAR (the Sun, ~1.4 million km across) sits inside a STAR CLUSTER (an open cluster like the Pleiades spans ~40 light-years and holds ~1,000 stars), which sits inside a GALAXY (the Milky Way, ~100,000 light-years across, a few hundred billion stars), which belongs to a GALAXY GROUP/CLUSTER (our Local Group spans ~10 million light-years and contains ~80 galaxies), which threads the COSMIC WEB of filaments and voids spanning hundreds of millions of light-years. They avoid the classic trap of confusing a globular cluster (hundreds of thousands of gravitationally bound stars, a sub-galactic object) with a galaxy (billions of stars plus dark matter) — the key discriminators being star count, the presence of dark matter, and whether the system is a component of a galaxy or a galaxy in its own right.',
            judgeFraming: 'Judges use the census to check whether a student has an accurate mental map of scale and category, because misplacing objects — calling a globular cluster a galaxy, or a nebula a "solar system" — signals a shaky foundation. Expect "what is the difference between an open and a globular cluster?" (age, star count, location in disk vs. halo) or "how do we know galaxies are separate from the Milky Way?" (Hubble\'s Cepheids in Andromeda, ending the Great Debate). A student who can also note that ordinary matter is only ~5% of the universe shows awareness that the visible census is not the whole story — a sophistication judges reward.',
            checkpoint: {
              questions: [
                {
                  kind: 'ordering',
                  id: 'q1',
                  prompt: 'Order these structures from SMALLEST physical scale to LARGEST.',
                  items: [
                    { id: 'star', text: 'A single star' },
                    { id: 'cluster', text: 'An open star cluster' },
                    { id: 'galaxy', text: 'A galaxy' },
                    { id: 'group', text: 'A galaxy group (e.g., the Local Group)' },
                    { id: 'web', text: 'The cosmic web of filaments and voids' },
                  ],
                  correctOrder: ['star', 'cluster', 'galaxy', 'group', 'web'],
                  explanation: 'Scale increases from a single star (~million km) → an open cluster (~tens of light-years) → a galaxy (~100,000 ly) → a galaxy group (~millions of ly) → the cosmic web (hundreds of millions of ly).',
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'Which statement correctly distinguishes a globular cluster from an open cluster?',
                  options: [
                    { id: 'a', text: 'Globular clusters are young, sparse, and in the disk; open clusters are old and in the halo' },
                    { id: 'b', text: 'Globular clusters are old (~12–13 Gyr), dense swarms of 10⁵–10⁶ stars in the halo; open clusters are young, looser groups of hundreds–thousands in the disk' },
                    { id: 'c', text: 'They are the same thing viewed at different distances' },
                    { id: 'd', text: 'Globular clusters contain dark matter and are actually small galaxies' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'This reverses the two: globulars are the old, dense, halo objects; open clusters are the young, loose, disk objects.',
                    b: 'Correct — globular clusters are ancient, extremely dense spherical swarms in the galactic halo; open clusters are younger, sparser groupings in the disk.',
                    c: 'They are physically distinct classes differing in age, density, star count, and galactic location — not a distance illusion.',
                    d: 'Globular clusters are essentially dark-matter-free and are components OF a galaxy, not galaxies themselves.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'How did Edwin Hubble settle the 1920 "Great Debate" by proving Andromeda is a separate galaxy?',
                  options: [
                    { id: 'a', text: 'By measuring its X-ray emission from space' },
                    { id: 'b', text: 'By finding Cepheid variable stars in it and using the period-luminosity (Leavitt) relation to show it lay far beyond the Milky Way' },
                    { id: 'c', text: 'By detecting its radio pulsars' },
                    { id: 'd', text: 'By observing its redshift alone' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'X-ray astronomy did not exist in the 1920s and played no role; this is anachronistic.',
                    b: 'Correct — Hubble identified Cepheids in Andromeda in 1923 and announced the result in 1925, using Leavitt\'s period-luminosity relation as a standard candle to derive a distance far outside the Milky Way, proving it was a separate galaxy.',
                    c: 'Pulsars were not discovered until 1967 and were irrelevant to the Great Debate.',
                    d: 'Redshift shows recession but not, by itself, that Andromeda lies outside the Galaxy; Andromeda is in fact blueshifted (approaching). The distance came from Cepheids.',
                  },
                },
                {
                  kind: 'matching',
                  id: 'q4',
                  prompt: 'Match each object or component to its correct description.',
                  left: [
                    { id: 'elliptical', text: 'Elliptical galaxy' },
                    { id: 'spiral', text: 'Spiral galaxy' },
                    { id: 'neutron', text: 'Neutron star' },
                    { id: 'darkenergy', text: 'Dark energy' },
                  ],
                  right: [
                    { id: 'reddead', text: 'Smooth, gas-poor system of mostly old stars ("red and dead")' },
                    { id: 'bluearms', text: 'Disk with arms, gas, and ongoing star formation ("blue and star-forming")' },
                    { id: 'citysized', text: 'City-sized, ultra-dense stellar remnant, often seen as a pulsar' },
                    { id: 'accel', text: '~68% of the universe, driving its accelerating expansion' },
                  ],
                  correctPairs: [
                    ['elliptical', 'reddead'],
                    ['spiral', 'bluearms'],
                    ['neutron', 'citysized'],
                    ['darkenergy', 'accel'],
                  ],
                  explanation: 'Ellipticals are smooth, gas-poor, old-star systems ("red and dead"); spirals are star-forming disks with arms ("blue and star-forming"); a neutron star is a city-sized ultra-dense remnant often observed as a pulsar; dark energy is ~68% of the universe\'s content and drives accelerating expansion.',
                },
              ],
            },
          },

          // ─── Lesson 6 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-sky-angular-size-parallax',
            label: 'Angular Size, Parallax, and Measuring the Sky',
            readingMinutes: 6,
            sections: [
              {
                heading: 'Angular size: the sky is measured in angles, not lengths',
                body: 'You cannot directly measure how big or far a star is with a ruler; you can only measure ANGLES on the sky. Angular size is the angle an object subtends at your eye, in degrees, arcminutes (1° = 60′), and arcseconds (1′ = 60″, so 1° = 3,600″). The full Moon and the Sun both span about 0.5° (30′) — a coincidence that makes total solar eclipses possible. A key relationship, the small-angle approximation, links angular size θ (in radians) to an object\'s true diameter D and distance d: θ ≈ D / d, valid when θ is small (which it always is for astronomical objects). Rearranged, D ≈ θ · d — so if you know an object\'s distance and measure its angular size, you get its physical size. To convert arcseconds to radians, multiply by π/(180 × 3600) = 1/206,265; the number 206,265 (arcseconds per radian) recurs constantly in astronomy.',
              },
              {
                heading: 'Parallax: the first rung of the distance ladder',
                body: 'The most direct distance measurement is trigonometric PARALLAX — the tiny apparent shift of a nearby star against the distant background as Earth orbits the Sun. Over six months Earth moves 2 AU across its orbit, and a nearby star appears to shift; the PARALLAX ANGLE (p) is defined as HALF that annual shift, corresponding to the 1 AU Earth–Sun baseline. This definition gives astronomy\'s most elegant unit: the PARSEC (parsec = "parallax-second"), defined as the distance at which a star shows a parallax of exactly 1 arcsecond. The whole relationship collapses to d (in parsecs) = 1 / p (in arcseconds). A star with a parallax of 0.1″ is 10 parsecs away; one with 0.01″ is 100 parsecs away. One parsec is 3.26 light-years = 3.086 × 10¹⁶ m. The catch is that parallax angles are minuscule — even the nearest star, Proxima Centauri, has a parallax of only 0.77″ — so ground-based measurement is hard; the Gaia spacecraft has measured parallaxes for over a billion stars to microarcsecond precision.',
              },
              {
                heading: 'Why parallax is only the first rung, and what comes after',
                body: 'Parallax is the gold standard because it is pure geometry — no assumptions about the star\'s nature. But its precision degrades with distance: the farther the star, the smaller the parallax, until it drowns in measurement error. Even Gaia\'s superb precision runs out around tens of thousands of parsecs, a fraction of the way across our own Galaxy. So parallax forms the FIRST RUNG of the "cosmic distance ladder": it calibrates nearby standard candles (like Cepheid variables), whose luminosity is then used via the inverse-square law to reach more distant galaxies, which in turn calibrate brighter standard candles (Type Ia supernovae) to reach across the observable universe. Each rung is calibrated by the one below it, which is why an error in the parallax "bottom rung" propagates all the way up — and why Gaia\'s precise parallaxes have tightened distance estimates throughout cosmology, including the ongoing debate over the exact value of the Hubble constant.',
              },
            ],
            workedExample: 'Two measurements, chained. First, a distance from parallax: a star is measured to have a parallax angle of p = 0.025 arcseconds. Its distance is simply d = 1/p = 1/0.025 = 40 parsecs, which is 40 × 3.26 = 130.4 light-years. Second, a physical size from angular size: the same reasoning applied to a nearby galaxy. Suppose a galaxy at a distance d = 20 megaparsecs subtends an angular size of θ = 6 arcminutes. Convert the angle to radians: 6′ = 360″, and 360 / 206,265 = 1.745 × 10⁻³ radians. Then its true diameter D ≈ θ · d = 1.745 × 10⁻³ × 20 Mpc = 0.0349 Mpc = 34.9 kiloparsecs ≈ 114,000 light-years — comparable to the Milky Way. The student has used one geometric idea (angles relate size and distance) to get a distance from parallax and a physical size from angular size, with no assumption about the objects\' brightness at all.',
            judgeFraming: 'Judges probe parallax because it is the cleanest, most assumption-free distance method and the literal foundation of every larger distance in astronomy. Expect "how would you measure the distance to a nearby star, and why is it the bottom of the distance ladder?" The winning answer states d = 1/p (parsecs from arcseconds), explains the 1-AU baseline definition, and notes that parallax gets harder with distance, forcing a hand-off to standard candles for farther objects. A student who can also convert an angular size and distance into a physical size shows they grasp that the sky is fundamentally an angle-measuring instrument — the conceptual key to the whole lesson.',
            checkpoint: {
              questions: [
                {
                  kind: 'mc',
                  id: 'q1',
                  prompt: 'A star has a measured trigonometric parallax of 0.05 arcseconds. How far away is it?',
                  options: [
                    { id: 'a', text: '0.05 parsecs' },
                    { id: 'b', text: '5 parsecs' },
                    { id: 'c', text: '20 parsecs' },
                    { id: 'd', text: '50 parsecs' },
                  ],
                  answerId: 'c',
                  explanations: {
                    a: '0.05 pc would require a huge parallax of 20″; the relationship is d = 1/p, not d = p.',
                    b: '5 pc corresponds to a parallax of 0.2″, four times larger than measured.',
                    c: 'Correct — d (parsecs) = 1 / p (arcseconds) = 1 / 0.05 = 20 parsecs.',
                    d: '50 pc would correspond to a parallax of 0.02″, not 0.05″.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'One parsec is defined as the distance at which a star shows a parallax of:',
                  options: [
                    { id: 'a', text: '1 degree' },
                    { id: 'b', text: '1 arcminute' },
                    { id: 'c', text: '1 arcsecond' },
                    { id: 'd', text: '1 radian' },
                  ],
                  answerId: 'c',
                  explanations: {
                    a: '1 degree is enormous on the sky; no star shows a parallax remotely that large.',
                    b: '1 arcminute is still far too large; the definition uses the much smaller arcsecond.',
                    c: 'Correct — a parsec ("parallax-second") is the distance yielding a parallax of exactly 1 arcsecond against the 1-AU baseline; it equals 3.26 light-years.',
                    d: 'A radian is ~206,265 arcseconds — vastly too large a parallax to correspond to any real distance.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'A nearby galaxy at distance d = 10 Mpc subtends an angular size of 3 arcminutes. Using D ≈ θ·d (θ in radians), its physical diameter is approximately:',
                  options: [
                    { id: 'a', text: 'About 8.7 kiloparsecs' },
                    { id: 'b', text: 'About 30 megaparsecs' },
                    { id: 'c', text: 'About 3 megaparsecs' },
                    { id: 'd', text: 'About 180 kiloparsecs' },
                  ],
                  answerId: 'a',
                  explanations: {
                    a: 'Correct — 3′ = 180″; 180/206,265 = 8.73 × 10⁻⁴ rad; D = θ·d = 8.73 × 10⁻⁴ × 10 Mpc = 8.73 × 10⁻³ Mpc = 8.7 kpc.',
                    b: 'This treats the angle as if it were in radians directly (3 → but even so scaled wrong); the arcminutes must be converted to radians first, giving a far smaller value.',
                    c: 'This forgets to convert arcminutes to radians; the tiny radian value makes the true size a small fraction of the distance.',
                    d: '180 is the number of arcseconds, not the answer; it must still be divided by 206,265 to reach radians.',
                  },
                },
                {
                  kind: 'ordering',
                  id: 'q4',
                  prompt: 'Order the rungs of the cosmic distance ladder from the one used for the NEAREST objects to the one used for the FARTHEST.',
                  items: [
                    { id: 'parallax', text: 'Trigonometric parallax (nearby stars)' },
                    { id: 'cepheid', text: 'Cepheid variables (nearby galaxies)' },
                    { id: 'sne', text: 'Type Ia supernovae (distant galaxies)' },
                  ],
                  correctOrder: ['parallax', 'cepheid', 'sne'],
                  explanation: 'Parallax (pure geometry) measures the nearest stars and calibrates Cepheid variables; Cepheids reach nearby galaxies and calibrate the far brighter Type Ia supernovae, which reach the most distant galaxies. Each rung is calibrated by the one below it.',
                },
                {
                  kind: 'matching',
                  id: 'q5',
                  prompt: 'Match each quantity or term to its correct value or meaning.',
                  left: [
                    { id: 'parsec', text: '1 parsec' },
                    { id: 'moon', text: 'Angular diameter of the full Moon' },
                    { id: 'radconv', text: 'Arcseconds in one radian' },
                    { id: 'smallangle', text: 'Small-angle relation' },
                  ],
                  right: [
                    { id: 'ly', text: '3.26 light-years (3.086 × 10¹⁶ m)' },
                    { id: 'halfdeg', text: 'About 0.5° (30 arcminutes)' },
                    { id: 'twoosix', text: '206,265' },
                    { id: 'theta', text: 'θ ≈ D / d (θ in radians): links true size, distance, and angle' },
                  ],
                  correctPairs: [
                    ['parsec', 'ly'],
                    ['moon', 'halfdeg'],
                    ['radconv', 'twoosix'],
                    ['smallangle', 'theta'],
                  ],
                  explanation: 'One parsec is 3.26 light-years (3.086 × 10¹⁶ m); the full Moon spans ~0.5° (30′); there are 206,265 arcseconds in a radian; and the small-angle relation θ ≈ D/d (θ in radians) ties an object\'s true size, distance, and measured angle together.',
                },
              ],
            },
          },
        ],
      },
      {
        id: 'astro-core-light',
        label: 'Light as Data',
        lessons: [
          // ─── Lesson 1 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-light-blackbody-wien-temperature',
            label: 'Blackbody Radiation, Wien’s Law, and Stellar Temperature',
            readingMinutes: 5,
            sections: [
              {
                heading: 'A star is (almost) a blackbody, and that is why its color encodes temperature',
                body: 'A blackbody is an idealized object that absorbs every photon that hits it and re-emits energy purely as a function of its temperature — nothing about its chemistry or shape survives in the shape of the emitted spectrum, only T. Stars are not perfect blackbodies (their outer layers absorb specific lines, and they are not in perfect thermal equilibrium), but the continuous background of a star’s light is close enough that treating the photosphere as a blackbody at an "effective temperature" is the workhorse first approximation of stellar astrophysics. The practical consequence is enormous: because the continuous spectrum depends only on temperature, a star’s color is a thermometer. A cool star peaks in the red and looks reddish (Betelgeuse, ~3,500 K); a hot star peaks in the blue-UV and looks blue-white (Rigel, roughly 11,000–12,000 K); the Sun at ~5,800 K peaks in the green-yellow but reads as white. The blackbody curve is the reason "what color is it?" is a physics question, not an aesthetic one.',
              },
              {
                heading: 'Wien’s displacement law: the peak wavelength moves inversely with temperature',
                body: 'Wien’s displacement law makes the color–temperature link quantitative: the wavelength at which a blackbody emits most intensely obeys λ_max · T = b, where b = 2.898 × 10⁻³ m·K (Wien’s constant). Because the product is constant, λ_max and T are inversely proportional — double the temperature and the peak wavelength halves, shifting the light bluer. Wilhelm Wien derived this in 1893, before quantum mechanics existed; it earned him the 1911 Nobel Prize. Crucially, the classical physics of the day could not explain the FULL curve — the "ultraviolet catastrophe" (the Rayleigh–Jeans law predicting infinite emission at short wavelengths) was only resolved in 1900 when Max Planck quantized the emission, and Wien’s law falls out of Planck’s law as the location of its peak. So Wien’s law is both a usable field tool and a historical fingerprint of the birth of quantum theory.',
              },
              {
                heading: 'Watch the units: peak wavelength is not peak frequency',
                body: 'A subtle trap: the wavelength at which the spectrum peaks is NOT the same physical point as the frequency at which it peaks, because converting a "per-unit-wavelength" spectrum to a "per-unit-frequency" spectrum stretches the axis non-linearly. The frequency form of Wien’s law uses a different constant (ν_max = 5.879 × 10¹⁰ Hz/K × T), and λ_max · ν_max does NOT equal the speed of light. For a science-fair project this means: state which form you are using, keep T in kelvin (never Celsius), and keep λ in meters when using b = 2.898 × 10⁻³ m·K. Reporting a peak in nanometers is fine as long as you converted consistently. This is exactly the kind of unit discipline a judge will test by asking you to redo the arithmetic out loud.',
              },
            ],
            workedExample: 'Suppose you image a star and find its continuous spectrum peaks at λ_max = 500 nm (green — this is roughly the Sun). Convert to meters: 500 nm = 5.00 × 10⁻⁷ m. Wien’s law gives T = b / λ_max = (2.898 × 10⁻³ m·K) / (5.00 × 10⁻⁷ m) = 5,796 K ≈ 5,800 K — the Sun’s effective temperature, recovered from color alone. Now flip it: a red giant peaks at λ_max = 850 nm = 8.50 × 10⁻⁷ m, giving T = 2.898 × 10⁻³ / 8.50 × 10⁻⁷ = 3,409 K ≈ 3,400 K, consistent with a cool M-type star. Note the inverse scaling: the red giant’s peak is 1.7× longer than the Sun’s, so its temperature is 1.7× lower. A common error is plugging T in Celsius (5,800°C would be 6,073 K) or leaving λ in nanometers (giving a nonsensical 5.8 × 10⁶ K) — both change the answer by a factor that a judge will catch instantly.',
            judgeFraming: 'Judges ask "how do you know that star’s temperature?" because it separates students who understand that color is a physical measurement from those who read a number off a catalog without knowing where it came from. The tell is being able to state Wien’s law as an inverse relationship (hotter → bluer → shorter λ_max) and to do the kelvin/meter unit conversion cleanly on demand. If you can say "I measured the peak at 500 nm, so T = b/λ = 5,800 K, and here’s why it’s kelvin not Celsius," you have shown you own the measurement rather than borrowing it.',
            checkpoint: {
              questions: [
                {
                  kind: 'mc',
                  id: 'q1',
                  prompt: 'Star A peaks at 400 nm and Star B peaks at 800 nm. What can you conclude about their temperatures?',
                  options: [
                    { id: 'a', text: 'Star A is twice as hot as Star B' },
                    { id: 'b', text: 'Star B is twice as hot as Star A' },
                    { id: 'c', text: 'They have the same temperature; only brightness differs' },
                    { id: 'd', text: 'Star A is four times as hot as Star B' },
                  ],
                  answerId: 'a',
                  explanations: {
                    a: 'Correct — Wien’s law makes λ_max and T inversely proportional (λ_max · T = constant). Star A’s peak is half the wavelength of Star B’s, so Star A is twice as hot.',
                    b: 'This inverts the relationship — the star with the SHORTER (bluer) peak wavelength is the hotter one, and that is Star A, not Star B.',
                    c: 'Peak wavelength depends only on temperature for a blackbody, so different peaks mean different temperatures, not merely different brightness.',
                    d: 'The relationship is inversely proportional (a factor of 2 in wavelength), not inverse-square; halving the wavelength doubles the temperature, it does not quadruple it.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'A star’s continuous spectrum peaks at 725 nm. Using λ_max · T = 2.898 × 10⁻³ m·K, its effective temperature is closest to:',
                  options: [
                    { id: 'a', text: '~2,000 K' },
                    { id: 'b', text: '~4,000 K' },
                    { id: 'c', text: '~7,250 K' },
                    { id: 'd', text: '~14,000 K' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: '~2,000 K would peak near 1,450 nm (deep infrared); 725 nm is far bluer than that, implying a hotter star.',
                    b: 'Correct — T = 2.898 × 10⁻³ / (7.25 × 10⁻⁷) = 3,997 K ≈ 4,000 K, a cool orange K-type star.',
                    c: 'This mistakenly reads "725" as a temperature; you must divide Wien’s constant by the wavelength in meters, not equate them.',
                    d: '~14,000 K would peak near 207 nm (ultraviolet); a 725 nm peak is red, far too cool for that.',
                  },
                },
                {
                  kind: 'matching',
                  id: 'q3',
                  prompt: 'Match each star to its approximate peak-wavelength color, given its temperature.',
                  left: [
                    { id: 'hot', text: 'Rigel, ~12,000 K' },
                    { id: 'sun', text: 'The Sun, ~5,800 K' },
                    { id: 'cool', text: 'Betelgeuse, ~3,500 K' },
                  ],
                  right: [
                    { id: 'blue', text: 'Peak in the blue/UV (~240 nm)' },
                    { id: 'green', text: 'Peak in the green-yellow (~500 nm)' },
                    { id: 'red', text: 'Peak in the red/near-IR (~830 nm)' },
                  ],
                  correctPairs: [
                    ['hot', 'blue'],
                    ['sun', 'green'],
                    ['cool', 'red'],
                  ],
                  explanation: 'By Wien’s law λ_max = b/T: 12,000 K → ~242 nm (blue/UV), 5,800 K → ~500 nm (green-yellow, though the Sun looks white overall), and 3,500 K → ~828 nm (red/near-IR). Hotter always means a shorter, bluer peak.',
                },
                {
                  kind: 'mc',
                  id: 'q4',
                  prompt: 'Why is treating a star as a blackbody a good FIRST approximation but not exact?',
                  options: [
                    { id: 'a', text: 'Stars emit no continuous spectrum at all, only lines' },
                    { id: 'b', text: 'The continuous spectrum is near-blackbody, but the star’s atmosphere superimposes absorption lines and the gas is not in perfect thermal equilibrium' },
                    { id: 'c', text: 'Blackbody radiation depends on the star’s chemical composition, which varies' },
                    { id: 'd', text: 'Real stars are colder than any blackbody can be' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Stars very much emit a continuous spectrum — it is the near-blackbody background on which absorption lines are carved.',
                    b: 'Correct — the continuum is close to blackbody, but real photospheres imprint absorption lines and depart slightly from perfect equilibrium, so "effective temperature" is a best-fit, not an exact identity.',
                    c: 'A true blackbody spectrum depends ONLY on temperature, not composition — that independence is precisely what makes it useful; composition shows up in the lines, not the continuum shape.',
                    d: 'Temperature is not the issue; the approximation breaks because of lines and non-equilibrium effects, not because stars are impossibly cold.',
                  },
                },
              ],
            },
          },

          // ─── Lesson 2 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-light-stefan-boltzmann-luminosity',
            label: 'The Stefan–Boltzmann Law and Stellar Luminosity',
            readingMinutes: 6,
            sections: [
              {
                heading: 'Luminosity vs. flux vs. apparent brightness: three different things',
                body: 'The single most common confusion in observational astronomy is conflating how much energy a star actually emits with how bright it looks from Earth. LUMINOSITY (L) is the total power a star radiates in all directions, measured in watts — an intrinsic property of the star. FLUX (F) is the power crossing one square meter, and APPARENT BRIGHTNESS is flux as received at a detector. A dim-looking star may be intrinsically enormous but far away; a bright-looking one may be a modest star nearby. The bridge between them is the inverse-square law: as light spreads over an expanding sphere, the flux you receive falls as F = L / (4πd²), where d is your distance from the star. The 4πd² is the surface area of the sphere the light has spread across. Move twice as far away and the flux drops to one-quarter; ten times as far, one-hundredth.',
              },
              {
                heading: 'The Stefan–Boltzmann law ties luminosity to temperature and size',
                body: 'The Stefan–Boltzmann law states that the power radiated per unit area of a blackbody is σT⁴, where σ = 5.67 × 10⁻⁸ W·m⁻²·K⁻⁴ (the Stefan–Boltzmann constant) and T is the surface temperature in kelvin. Multiplying by a star’s total surface area 4πR² gives its full luminosity: L = 4πR²σT⁴. Two dependences matter enormously. First, the T⁴ term is ferocious: double a star’s temperature and, at fixed size, it radiates 2⁴ = 16 times more power. Second, luminosity scales with R² (surface area). This is why a red giant can be cool (~3,500 K) yet outshine the Sun by thousands of times — its radius is hundreds of times larger, and R² overwhelms the low T⁴. Conversely a white dwarf can be blistering hot (~25,000 K) yet dim, because it is Earth-sized: tiny R². Josef Stefan found the law empirically in 1879; Ludwig Boltzmann derived it thermodynamically in 1884.',
              },
              {
                heading: 'The magnitude scale: logarithmic AND inverted',
                body: 'Astronomers report apparent brightness on the magnitude scale, a system inherited from Hipparchus (~2nd century BC) that has two features students constantly get backwards. First, it is INVERTED: smaller (or negative) magnitudes are BRIGHTER. The Sun is magnitude −26.7, Sirius −1.4, a faint naked-eye star +6. Second, it is LOGARITHMIC: a difference of 5 magnitudes corresponds to a factor of exactly 100 in flux (a convention fixed by Norman Pogson in 1856). So each single magnitude step is a factor of 100^(1/5) ≈ 2.512 in brightness. The relation is m₁ − m₂ = −2.5 log₁₀(F₁/F₂). Absolute magnitude (M) is defined as the apparent magnitude a star WOULD have at a standard distance of 10 parsecs, which turns the scale into a luminosity measure once distance is known. Forgetting either the inversion or the log factor is the fastest way to get a brightness answer exactly backwards.',
              },
            ],
            workedExample: 'Star X and Star Y have the same surface temperature, but Star X has 3 times the radius of Star Y. Since L = 4πR²σT⁴ and T is equal, luminosity scales as R²: L_X / L_Y = 3² = 9, so Star X is 9 times more luminous. Now add temperature: suppose Star X is also twice as hot. Then L_X / L_Y = (R_X/R_Y)² × (T_X/T_Y)⁴ = 9 × 2⁴ = 9 × 16 = 144 times more luminous. Separately, consider the inverse-square law: if two IDENTICAL stars are at 10 pc and 40 pc, the far one is 4× more distant, so its flux is (1/4)² = 1/16 of the near one’s — a difference of −2.5 log₁₀(16) ≈ −3.0 magnitudes, i.e. the far star appears about 3 magnitudes FAINTER (a larger magnitude number). Watch the sign: because the scale is inverted, "fainter" means the magnitude goes UP.',
            judgeFraming: 'Judges probe the luminosity/flux/brightness distinction because it is where students reveal whether they understand that "how bright it looks" is not "how much it emits." The clean tells are: quoting L = 4πR²σT⁴ and explaining why a cool giant outshines the hot Sun (R² beats T⁴), and correctly stating that the magnitude scale is both inverted and logarithmic. A student who says "magnitude −1 is brighter than +6, and every 5 magnitudes is a factor of 100" has internalized the scale; one who thinks bigger magnitude means brighter will get every downstream number backwards.',
            checkpoint: {
              questions: [
                {
                  kind: 'mc',
                  id: 'q1',
                  prompt: 'Two stars have the SAME temperature, but Star A has 4 times the radius of Star B. How do their luminosities compare?',
                  options: [
                    { id: 'a', text: 'Star A is 4 times more luminous' },
                    { id: 'b', text: 'Star A is 8 times more luminous' },
                    { id: 'c', text: 'Star A is 16 times more luminous' },
                    { id: 'd', text: 'They are equally luminous, since temperature is the same' },
                  ],
                  answerId: 'c',
                  explanations: {
                    a: 'This treats luminosity as linear in radius, but L ∝ R² (surface area), so a factor of 4 in R gives 4² = 16, not 4.',
                    b: 'A factor of 8 would be R³ (volume) scaling; luminosity depends on surface area R², not volume.',
                    c: 'Correct — L = 4πR²σT⁴, so at equal temperature L ∝ R², and 4² = 16.',
                    d: 'Temperature is equal, but size is not — the larger surface area of Star A means it radiates from 16 times more area.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'A red giant is much COOLER than the Sun yet thousands of times more luminous. The best explanation is:',
                  options: [
                    { id: 'a', text: 'The Stefan–Boltzmann law does not apply to giant stars' },
                    { id: 'b', text: 'Its enormous radius makes R² dominate over the lower T⁴' },
                    { id: 'c', text: 'Cooler stars are always more luminous than hot ones' },
                    { id: 'd', text: 'Its high temperature offsets its small size' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'The Stefan–Boltzmann law applies to all blackbody-like stars; it is exactly what explains the giant’s luminosity.',
                    b: 'Correct — in L = 4πR²σT⁴, a radius hundreds of times the Sun’s makes the R² term huge, overwhelming the reduced T⁴ from its cooler surface.',
                    c: 'False in general — for a fixed size, hotter stars are far MORE luminous (T⁴); the giant wins only because it is enormous.',
                    d: 'This is backwards: the giant is cooler and larger, so it is size, not temperature, that drives its high luminosity.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'Star P has apparent magnitude +2 and Star Q has apparent magnitude +7. Which is brighter as seen from Earth, and by how much in flux?',
                  options: [
                    { id: 'a', text: 'Star Q is brighter, by a factor of 100' },
                    { id: 'b', text: 'Star P is brighter, by a factor of 100' },
                    { id: 'c', text: 'Star P is brighter, by a factor of 5' },
                    { id: 'd', text: 'Star Q is brighter, by a factor of 2.5' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'This gets the inversion backwards — the LARGER magnitude (+7) is the FAINTER star, so Q is not the brighter one.',
                    b: 'Correct — smaller magnitude is brighter, so P (+2) beats Q (+7); a 5-magnitude difference is defined as exactly a factor of 100 in flux.',
                    c: 'A factor of 5 confuses the magnitude difference (5) with the flux ratio; 5 magnitudes means 100×, not 5×.',
                    d: '2.512 is the flux ratio for ONE magnitude, not five; five magnitudes compounds to 2.512⁵ = 100.',
                  },
                },
                {
                  kind: 'ordering',
                  id: 'q4',
                  prompt: 'Order these objects from BRIGHTEST-appearing to FAINTEST-appearing as seen from Earth, by apparent magnitude.',
                  items: [
                    { id: 'sun', text: 'The Sun (m = −26.7)' },
                    { id: 'sirius', text: 'Sirius (m = −1.4)' },
                    { id: 'vega', text: 'Vega (m = 0.0)' },
                    { id: 'faint', text: 'A faint naked-eye star (m = +6.0)' },
                  ],
                  correctOrder: ['sun', 'sirius', 'vega', 'faint'],
                  explanation: 'The magnitude scale is inverted: smaller/more-negative magnitudes are brighter. So the order from brightest to faintest is the Sun (−26.7) → Sirius (−1.4) → Vega (0.0) → the faint star (+6.0).',
                },
              ],
            },
          },

          // ─── Lesson 3 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-light-kirchhoff-emission-absorption',
            label: 'Emission, Absorption, and Kirchhoff’s Laws',
            readingMinutes: 5,
            sections: [
              {
                heading: 'Three kinds of spectrum, three physical situations',
                body: 'In 1859–60 Gustav Kirchhoff (with chemist Robert Bunsen) formulated three empirical laws that map the KIND of spectrum you see onto the physical arrangement producing it. (1) A hot, dense object — a solid, liquid, or dense gas — produces a CONTINUOUS spectrum: an unbroken rainbow with no gaps (this is the blackbody continuum of Lesson 1). (2) A hot, low-density (rarefied) gas produces an EMISSION-LINE spectrum: bright lines at specific wavelengths on an otherwise dark background — the gas glows only at the discrete wavelengths its atoms can emit. (3) A cool, low-density gas in FRONT of a hotter continuous source produces an ABSORPTION-LINE spectrum: the full rainbow minus dark gaps where the intervening gas has removed light at exactly the wavelengths it would otherwise emit. These three cases are the decoder ring for essentially every astronomical spectrum.',
              },
              {
                heading: 'Why the same gas both emits and absorbs at the same wavelengths',
                body: 'The deep point, which Kirchhoff established, is that a gas absorbs and emits at the SAME set of wavelengths, because both processes involve the same atomic energy-level jumps. An electron in an atom can only occupy discrete energy levels. To absorb light, an electron must catch a photon whose energy exactly equals the gap between two levels (E = hν); it jumps up. When it falls back down, it emits a photon of exactly that same energy — hence the same wavelength. So hydrogen’s bright emission lines and its dark absorption lines sit at identical wavelengths (the Balmer series at 656.3, 486.1, 434.0 nm, etc.). Whether you see them bright or dark depends only on geometry: is the gas hotter than the background (emission) or cooler and backlit (absorption)? This is why the same fingerprint identifies an element whether you catch it glowing or silhouetted.',
              },
              {
                heading: 'A star’s spectrum is case 3 — and that is a gift',
                body: 'A star shows an absorption-line spectrum: the hot dense photosphere makes a continuous blackbody rainbow, and the cooler, thinner gas of the star’s upper atmosphere sits in front of it, carving dark absorption lines. Joseph von Fraunhofer had mapped 574 such dark lines in the solar spectrum in 1814–15 (labeling the strongest A, B, C, D…) decades before anyone knew what they were; Kirchhoff and Bunsen later showed the D lines matched sodium’s emission, cracking the code that the Sun’s atmosphere contains sodium. This is the entire basis of stellar spectroscopy: the continuum gives temperature (Wien), while the pattern of absorption lines carved into it reveals the composition, temperature, pressure, and motion of the gas — the subject of the next several lessons.',
              },
            ],
            workedExample: 'Imagine a lab demo you could actually run at a fair. You point a spectrometer at three sources. (1) An incandescent bulb (a hot dense filament) shows a smooth continuous rainbow — Kirchhoff’s first law. (2) A hydrogen gas-discharge tube (hot rarefied gas) shows a black background with a few bright lines, most obviously the red H-alpha line at 656.3 nm — Kirchhoff’s second law, an emission spectrum. (3) Now place a flask of cool sodium-vapor between the incandescent bulb and the spectrometer: the continuous rainbow reappears but with a dark notch at 589 nm (the sodium D lines) where the cool sodium absorbed the backlight — Kirchhoff’s third law. The punchline: light the sodium flask on its own from the side and it GLOWS at exactly 589 nm. Same atom, same wavelength, emission or absorption set purely by whether it is hotter or cooler than what is behind it.',
            judgeFraming: 'Judges ask "why does a star show DARK lines, not bright ones?" because it tests whether a student understands the geometry behind Kirchhoff’s laws rather than just memorizing "stars have absorption lines." The strong answer names the arrangement: a hot dense photosphere (continuous source) seen THROUGH the cooler thin overlying atmosphere (the absorber), so the atmosphere subtracts light at its characteristic wavelengths. Bonus credit for noting the same gas would EMIT those wavelengths if it were the hotter component — showing you grasp that emission and absorption are two views of one atomic process.',
            checkpoint: {
              questions: [
                {
                  kind: 'matching',
                  id: 'q1',
                  prompt: 'Match each physical situation to the type of spectrum it produces (Kirchhoff’s laws).',
                  left: [
                    { id: 'dense', text: 'Hot, dense object (solid or dense gas)' },
                    { id: 'thin', text: 'Hot, low-density gas' },
                    { id: 'backlit', text: 'Cool, low-density gas in front of a hotter continuous source' },
                  ],
                  right: [
                    { id: 'continuous', text: 'Continuous spectrum (unbroken rainbow)' },
                    { id: 'emission', text: 'Emission-line spectrum (bright lines on dark background)' },
                    { id: 'absorption', text: 'Absorption-line spectrum (dark lines on a rainbow)' },
                  ],
                  correctPairs: [
                    ['dense', 'continuous'],
                    ['thin', 'emission'],
                    ['backlit', 'absorption'],
                  ],
                  explanation: 'Kirchhoff’s three laws: a hot dense object gives a continuous blackbody spectrum; a hot rarefied gas glows only at its discrete wavelengths (emission lines); and a cool gas backlit by a hotter continuous source carves dark absorption lines at those same wavelengths.',
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'Hydrogen’s emission lines and absorption lines appear at the SAME wavelengths because:',
                  options: [
                    { id: 'a', text: 'Emission and absorption involve the same discrete atomic energy-level transitions, run in opposite directions' },
                    { id: 'b', text: 'It is a coincidence of hydrogen specifically' },
                    { id: 'c', text: 'Absorption lines are always slightly shifted from emission lines' },
                    { id: 'd', text: 'Both are produced only by ionized hydrogen at one fixed energy' },
                  ],
                  answerId: 'a',
                  explanations: {
                    a: 'Correct — absorbing a photon lifts an electron across an energy gap; emitting one drops it back across the SAME gap, so E = hν is identical and the wavelengths match.',
                    b: 'It is not a coincidence and not unique to hydrogen — every element’s emission and absorption wavelengths coincide for the same reason.',
                    c: 'They are at the same wavelengths; any apparent shift comes from motion (Doppler), not from a difference between emission and absorption.',
                    d: 'The lines arise from bound-electron transitions between discrete levels, not from a single fixed energy of ionized hydrogen.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'A star’s spectrum is a continuous rainbow with dark lines cut into it. Which arrangement produces this?',
                  options: [
                    { id: 'a', text: 'A cool thin gas with nothing behind it' },
                    { id: 'b', text: 'A hot dense photosphere seen through the cooler, thinner overlying stellar atmosphere' },
                    { id: 'c', text: 'Only ionized gas at millions of kelvin' },
                    { id: 'd', text: 'A perfect blackbody with no surrounding gas at all' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'A cool thin gas alone (no hot backlight) would show emission lines, not dark absorption lines on a rainbow.',
                    b: 'Correct — the hot dense photosphere makes the continuous rainbow, and the cooler thin atmosphere in front of it removes light at its characteristic wavelengths, producing dark absorption lines (Kirchhoff’s third law).',
                    c: 'Extremely hot ionized gas would tend to emit; the dark-line pattern specifically requires a cooler absorber in front of a hotter continuous source.',
                    d: 'A pure blackbody with no overlying gas would show a smooth continuum with NO lines at all.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q4',
                  prompt: 'Fraunhofer mapped hundreds of dark lines in the solar spectrum in 1814 without knowing their cause. What did Kirchhoff and Bunsen later reveal about the "D" lines?',
                  options: [
                    { id: 'a', text: 'They were flaws in Fraunhofer’s prism' },
                    { id: 'b', text: 'They matched sodium’s emission wavelengths, showing the Sun’s atmosphere contains sodium' },
                    { id: 'c', text: 'They were caused by Earth’s atmosphere alone, not the Sun' },
                    { id: 'd', text: 'They proved the Sun emits no continuous spectrum' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'The lines are real solar features, not instrument flaws — they reappear with any good spectrograph.',
                    b: 'Correct — the solar D lines coincide with sodium’s bright emission lines, so cool sodium in the Sun’s atmosphere is absorbing at those wavelengths; this founded astronomical chemical analysis.',
                    c: 'While some lines (telluric lines) do come from Earth’s air, the sodium D lines are solar, produced in the Sun’s own atmosphere.',
                    d: 'The Sun clearly shows a continuous spectrum; the D lines are absorption features carved INTO that continuum.',
                  },
                },
              ],
            },
          },

          // ─── Lesson 4 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-light-spectral-lines-composition',
            label: 'Spectral Lines: Reading a Star’s Composition',
            readingMinutes: 6,
            sections: [
              {
                heading: 'Every element has a unique barcode of lines',
                body: 'Because each element has a distinct set of electron energy levels, it produces a unique, reproducible pattern of spectral lines — a barcode. Hydrogen shows the Balmer series in the visible (H-alpha 656.3 nm, H-beta 486.1 nm, H-gamma 434.0 nm, converging toward the Balmer limit at 364.6 nm); sodium shows its D doublet near 589 nm; calcium shows the strong H and K lines at 393.4 and 396.8 nm; helium was actually DISCOVERED in the Sun’s spectrum in 1868 (by Janssen and Lockyer) as an unidentified yellow line before it was ever found on Earth — hence its name, from Greek helios. To read composition you match the observed line wavelengths against laboratory reference wavelengths. A line present means the element is present in the light’s path; the line’s STRENGTH (depth and width) encodes how much of that element is there and under what conditions.',
              },
              {
                heading: 'Line strength depends on temperature, not just abundance',
                body: 'A crucial subtlety, worked out by Cecilia Payne in her landmark 1925 PhD thesis, is that a line’s strength is NOT a direct readout of abundance — it is filtered through temperature. An atom can only absorb a given line if its electrons are in the right starting energy level and the atom is in the right ionization state, and BOTH depend on temperature (governed by the Boltzmann and Saha equations). Hydrogen’s Balmer lines, for example, peak in strength around 10,000 K (A-type stars): cooler and most hydrogen atoms are in the ground state and cannot make Balmer absorptions; hotter and hydrogen is ionized, with no bound electron to absorb at all. So a star with weak hydrogen lines is not necessarily hydrogen-poor. Payne used exactly this reasoning to show that stars — and the Sun — are overwhelmingly hydrogen and helium, not iron-rich like Earth, a conclusion so at odds with orthodoxy that she was pressured to hedge it; she was later vindicated and it is now foundational.',
              },
              {
                heading: 'Spectral classification: the OBAFGKM sequence is a temperature sequence',
                body: 'Stars are sorted into spectral classes O, B, A, F, G, K, M (mnemonic: "Oh Be A Fine Girl/Guy, Kiss Me"), running from hottest (O, >30,000 K, blue) to coolest (M, ~3,000 K, red), with each class subdivided 0–9. This sequence, refined by Annie Jump Cannon at Harvard (who classified over 350,000 stars), was originally lettered by the strength of hydrogen lines (A had the strongest) — which is why the letters are out of alphabetical order once Cannon reordered them by temperature. Understanding that the classification is fundamentally a TEMPERATURE ladder, not a composition ladder, is the payoff of Payne’s insight: an O star and an M star can have nearly identical composition but wildly different spectra, purely because temperature governs which lines are excited. The Sun is a G2 star.',
              },
            ],
            workedExample: 'You take a spectrum of an unknown star and measure dark absorption lines at 656.3 nm, 486.1 nm, and 434.0 nm, all strong. Matching against reference tables: 656.3 = H-alpha, 486.1 = H-beta, 434.0 = H-gamma — the Balmer series of hydrogen. Their great strength tells you two things. First, hydrogen is present (true of essentially all stars). Second, and more diagnostically, Balmer lines are strongest near 10,000 K, so this is likely an A-type star — you have estimated its temperature from line strengths, independent of Wien’s law, and the two methods should agree. Now suppose you ALSO see strong Ca II H and K lines (393.4, 396.8 nm) and weak metal lines: strong Balmer plus emerging calcium points toward late-A or early-F. The lesson: do not report "this star is mostly hydrogen because its hydrogen lines are strongest" — line strength is a temperature diagnostic first, and abundance must be inferred through the Saha/Boltzmann correction Payne pioneered.',
            judgeFraming: 'Judges love to ask "so this star has strong hydrogen lines — is it hydrogen-rich?" because it is a trap that catches students who equate line strength with abundance. The sophisticated answer cites Payne: line strength is set by temperature (which levels are populated, which ionization state dominates), so Balmer lines peak near 10,000 K regardless of how much hydrogen is present. A student who says "strong Balmer lines mean it’s roughly A-type at ~10,000 K, and abundance needs a temperature correction" demonstrates the single most important conceptual leap in stellar spectroscopy.',
            checkpoint: {
              questions: [
                {
                  kind: 'ordering',
                  id: 'q1',
                  prompt: 'Order the spectral classes from HOTTEST to COOLEST.',
                  items: [
                    { id: 'o', text: 'O (blue)' },
                    { id: 'a', text: 'A (blue-white)' },
                    { id: 'g', text: 'G (yellow, like the Sun)' },
                    { id: 'm', text: 'M (red)' },
                  ],
                  correctOrder: ['o', 'a', 'g', 'm'],
                  explanation: 'The full sequence O B A F G K M runs hottest-to-coolest. Of the four shown, O (>30,000 K) is hottest, then A (~10,000 K), then G (~5,800 K, the Sun), then M (~3,000 K), the coolest.',
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'A star shows unusually WEAK hydrogen (Balmer) lines. Why is it wrong to conclude it must be hydrogen-poor?',
                  options: [
                    { id: 'a', text: 'Balmer lines have nothing to do with hydrogen' },
                    { id: 'b', text: 'Line strength depends on temperature (which levels/ionization states are populated), so weak Balmer lines can mean the star is too hot or too cool to excite them, not that hydrogen is scarce' },
                    { id: 'c', text: 'Weak lines always indicate a measurement error' },
                    { id: 'd', text: 'Hydrogen never produces visible absorption lines' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Balmer lines ARE hydrogen lines (transitions from the n=2 level); the point is about temperature, not identity.',
                    b: 'Correct — Payne showed line strength is filtered through temperature via the Boltzmann and Saha equations; Balmer lines peak near 10,000 K and weaken if the star is much hotter (hydrogen ionized) or much cooler (electrons stuck in the ground state).',
                    c: 'Weak lines are a real physical signal, not necessarily an error — very hot or very cool stars genuinely show weak Balmer lines despite abundant hydrogen.',
                    d: 'Hydrogen produces prominent visible Balmer absorption lines; H-alpha at 656.3 nm is one of the most famous lines in astronomy.',
                  },
                },
                {
                  kind: 'matching',
                  id: 'q3',
                  prompt: 'Match each spectral feature to the element it identifies.',
                  left: [
                    { id: 'balmer', text: 'Lines at 656.3, 486.1, 434.0 nm' },
                    { id: 'd', text: 'Doublet near 589 nm' },
                    { id: 'hk', text: 'Strong H and K lines at 393.4, 396.8 nm' },
                  ],
                  right: [
                    { id: 'hydrogen', text: 'Hydrogen (Balmer series)' },
                    { id: 'sodium', text: 'Sodium (D lines)' },
                    { id: 'calcium', text: 'Ionized calcium (Ca II)' },
                  ],
                  correctPairs: [
                    ['balmer', 'hydrogen'],
                    ['d', 'sodium'],
                    ['hk', 'calcium'],
                  ],
                  explanation: 'The 656.3/486.1/434.0 nm set is hydrogen’s Balmer series (H-alpha, H-beta, H-gamma); the ~589 nm doublet is sodium’s D lines; and the 393.4/396.8 nm pair are the Ca II H and K lines of ionized calcium.',
                },
                {
                  kind: 'mc',
                  id: 'q4',
                  prompt: 'Cecilia Payne’s 1925 thesis reached what conclusion that initially met resistance?',
                  options: [
                    { id: 'a', text: 'That the Sun has the same iron-rich composition as Earth' },
                    { id: 'b', text: 'That stars, including the Sun, are overwhelmingly hydrogen and helium' },
                    { id: 'c', text: 'That spectral lines are unrelated to temperature' },
                    { id: 'd', text: 'That helium does not exist in stars' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'This was the ORTHODOX (and wrong) view Payne overturned; she showed stars are NOT Earth-like in composition.',
                    b: 'Correct — by correcting line strengths for temperature (Saha/Boltzmann), Payne concluded stars are mostly hydrogen and helium, a result so radical she was pressured to soften it before later being vindicated.',
                    c: 'The opposite — Payne’s entire method rested on the fact that line strength IS governed by temperature.',
                    d: 'Helium had already been found in the Sun’s spectrum in 1868; Payne’s finding was about the dominance of hydrogen and helium, not their absence.',
                  },
                },
              ],
            },
          },

          // ─── Lesson 5 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-light-doppler-radial-velocity',
            label: 'The Doppler Effect and Radial Velocity',
            readingMinutes: 5,
            sections: [
              {
                heading: 'Motion along the line of sight shifts every line by the same fractional amount',
                body: 'When a light source moves toward or away from you, its wavelengths are compressed or stretched — the optical Doppler effect. Motion TOWARD you (approach) shortens wavelengths, shifting lines toward the blue (BLUESHIFT); motion AWAY (recession) lengthens them, shifting toward the red (REDSHIFT). The key quantitative fact for non-relativistic speeds (v much less than c) is the Doppler formula Δλ/λ₀ = v_r / c, where λ₀ is the rest (laboratory) wavelength, Δλ = λ_observed − λ₀ is the shift, v_r is the RADIAL velocity (the line-of-sight component only), and c is the speed of light. Because the shift is a FRACTION of wavelength, every line in the spectrum moves by the same fractional amount — which is exactly how you recognize a Doppler shift and distinguish it from something intrinsic: the whole barcode slides coherently, keeping its spacing ratios, rather than one line moving on its own.',
              },
              {
                heading: 'It measures only the line-of-sight component',
                body: 'A critical limitation: the Doppler effect responds ONLY to the radial (line-of-sight) component of velocity. A star moving purely across your field of view (tangential motion) produces NO Doppler shift, no matter how fast it goes; a star moving purely toward or away shows the full effect. A star moving at an angle shows only v_r = v · cosθ, the projection onto the line of sight. This is why radial velocity and proper motion (the tangential drift measured as angular motion on the sky over years) are two separate, complementary measurements — together they give the full 3-D space velocity, but each alone captures only one component. For a science-fair project this means: a Doppler measurement gives you the approaching/receding speed and nothing about sideways motion.',
              },
              {
                heading: 'Why radial velocity is one of astronomy’s most powerful tools',
                body: 'Radial-velocity spectroscopy underlies a huge swath of modern astrophysics. It reveals binary stars (whose lines shift back and forth periodically as the pair orbits), it powered the first wave of exoplanet discovery (a planet tugs its star into a tiny wobble; Mayor and Queloz detected 51 Pegasi b this way in 1995, work honored with the 2019 Nobel Prize — the star’s reflex velocity was only ~59 m/s), and it maps the rotation of galaxies (one edge approaches, the other recedes). Modern spectrographs like HARPS reach sub-meter-per-second precision, sensitive enough to feel the pull of an Earth-mass planet. The same Δλ/λ = v/c that a student can apply to a single line shift scales all the way up to the instruments hunting habitable worlds.',
              },
            ],
            workedExample: 'You observe a star and find its hydrogen H-alpha line, whose rest wavelength is λ₀ = 656.3 nm, appears at λ_observed = 656.6 nm. The shift is Δλ = 656.6 − 656.3 = +0.3 nm (positive, so redshifted → the star is receding). Apply the Doppler formula: v_r = c · (Δλ/λ₀) = (3.0 × 10⁵ km/s) × (0.3 / 656.3) = (3.0 × 10⁵) × (4.57 × 10⁻⁴) = 137 km/s. So the star is receding at about 137 km/s along your line of sight. Check the logic: the shift is toward LONGER wavelength (red), so the sign is recession — consistent with the positive Δλ. Note v_r/c = 4.57 × 10⁻⁴ is tiny (0.046% of light speed), so the simple non-relativistic formula is fully justified; you would only need the relativistic version if v approached a substantial fraction of c. And remember: this 137 km/s is only the line-of-sight component — the star could also be sweeping sideways at any speed, invisible to this measurement.',
            judgeFraming: 'Judges ask "what does your Doppler measurement actually tell you — and what does it NOT?" to see if a student knows the method’s blind spot. The strong answer states two things: the sign convention (redshift = receding, blueshift = approaching) and the radial-only limitation (tangential motion is invisible; you measured v_r = v cosθ, not the full speed). A student who reports "137 km/s receding, but that’s only the line-of-sight component" shows a maturity that a student who claims to have measured "the star’s speed" lacks.',
            checkpoint: {
              questions: [
                {
                  kind: 'mc',
                  id: 'q1',
                  prompt: 'A star’s spectral lines are all shifted toward LONGER wavelengths (redward) by the same fraction. What does this indicate?',
                  options: [
                    { id: 'a', text: 'The star is moving toward us' },
                    { id: 'b', text: 'The star is moving away from us (receding)' },
                    { id: 'c', text: 'The star is moving purely sideways (tangentially)' },
                    { id: 'd', text: 'The star is heating up' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Motion toward us COMPRESSES wavelengths (blueshift, shorter λ); a redshift means the opposite.',
                    b: 'Correct — a redshift (lines stretched to longer wavelength) indicates recession, and the fact that all lines shift by the same fraction confirms it is a Doppler effect.',
                    c: 'Purely tangential motion produces NO Doppler shift at all; a shift requires a line-of-sight component.',
                    d: 'Heating changes line strengths and the continuum peak (Wien), not a coherent fractional shift of every line — that is motion.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'The Ca II K line has rest wavelength 393.4 nm and is observed at 393.6 nm. Using Δλ/λ₀ = v_r/c with c = 3.0 × 10⁵ km/s, the radial velocity is closest to:',
                  options: [
                    { id: 'a', text: '~15 km/s, approaching' },
                    { id: 'b', text: '~150 km/s, receding' },
                    { id: 'c', text: '~1,500 km/s, receding' },
                    { id: 'd', text: '~150 km/s, approaching' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'The shift is to LONGER wavelength (393.4 → 393.6), so the star recedes, not approaches, and the magnitude is ~150 km/s, not ~15.',
                    b: 'Correct — Δλ = +0.2 nm, so v_r = c × (0.2/393.4) = 3.0 × 10⁵ × 5.08 × 10⁻⁴ ≈ 152 km/s, and the redward shift means receding.',
                    c: 'This is off by a factor of 10 — check the arithmetic: 0.2/393.4 ≈ 5.1 × 10⁻⁴, giving ~150 km/s, not 1,500.',
                    d: 'The magnitude (~150 km/s) is right but the direction is wrong: a shift to longer wavelength is recession, not approach.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'A star moving at 200 km/s directly ACROSS your line of sight (purely tangential) will show what Doppler shift?',
                  options: [
                    { id: 'a', text: 'A large redshift' },
                    { id: 'b', text: 'A large blueshift' },
                    { id: 'c', text: 'No Doppler shift, because there is no line-of-sight velocity component' },
                    { id: 'd', text: 'A shift proportional to the full 200 km/s' },
                  ],
                  answerId: 'c',
                  explanations: {
                    a: 'A redshift requires recession (a line-of-sight component); purely tangential motion has none.',
                    b: 'A blueshift requires approach along the line of sight; sideways motion produces no such component.',
                    c: 'Correct — the Doppler effect responds only to the radial component (v_r = v cosθ), and for purely tangential motion θ = 90°, so cosθ = 0 and there is no shift.',
                    d: 'The shift depends only on the radial projection, not the full speed; tangential motion contributes nothing.',
                  },
                },
                {
                  kind: 'matching',
                  id: 'q4',
                  prompt: 'Match each observation to the motion it implies.',
                  left: [
                    { id: 'blue', text: 'All lines shifted to shorter wavelengths' },
                    { id: 'red', text: 'All lines shifted to longer wavelengths' },
                    { id: 'periodic', text: 'Lines shifting blue then red then blue, repeating' },
                  ],
                  right: [
                    { id: 'approach', text: 'Source approaching (blueshift)' },
                    { id: 'recede', text: 'Source receding (redshift)' },
                    { id: 'orbit', text: 'Orbital motion, e.g. a binary star or a planet-tugged star' },
                  ],
                  correctPairs: [
                    ['blue', 'approach'],
                    ['red', 'recede'],
                    ['periodic', 'orbit'],
                  ],
                  explanation: 'A blueshift (shorter λ) means approach; a redshift (longer λ) means recession; a periodic back-and-forth shift signals orbital motion, as a star and its companion (a second star or a planet) alternately swing toward and away from us.',
                },
              ],
            },
          },

          // ─── Lesson 6 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-light-redshift-cosmic-expansion',
            label: 'Redshift: From Motion to Cosmic Expansion',
            readingMinutes: 6,
            sections: [
              {
                heading: 'Redshift as a number, z, and its ordinary (Doppler) meaning',
                body: 'Astronomers quantify a shift with the dimensionless redshift z = Δλ/λ₀ = (λ_observed − λ_rest)/λ_rest. For a nearby object whose shift comes from ordinary motion, z is just the fractional Doppler shift, so at low speed v = cz reproduces the radial-velocity formula from Lesson 5. A positive z is a redshift (receding / expansion); a negative z is a blueshift (approaching — the Andromeda galaxy, notably, is BLUEshifted, approaching the Milky Way at ~110 km/s, one of the few large galaxies that is). The number z is the universal currency of extragalactic astronomy: it is what you measure directly from a spectrum, and everything else — velocity, distance, look-back time — is derived from it through a model.',
              },
              {
                heading: 'Hubble’s law: distant galaxies recede faster, and the redshift is cosmological',
                body: 'In 1929 Edwin Hubble (building on Vesto Slipher’s redshift measurements and Henrietta Leavitt’s period–luminosity distance calibration) found that the recession velocity of galaxies is proportional to their distance: v = H₀ · d, where H₀ is the Hubble constant (currently measured near 70 km/s per megaparsec, with a persistent ~67 vs ~73 "Hubble tension" between early-universe and local measurements that is a live research controversy today). The profound modern interpretation, from general relativity, is that cosmological redshift is NOT an ordinary Doppler shift of galaxies flying through space — it is space ITSELF expanding, stretching the wavelength of light in transit. The galaxies are not moving through space so much as being carried apart by the growing scale of space. This is why "what is everything expanding into?" is a category error: it is the scale factor of space that grows, with no center and no edge.',
              },
              {
                heading: 'The distance ladder: how redshift becomes a distance',
                body: 'Turning a redshift into a distance requires the cosmic distance ladder, a chain of overlapping methods each calibrating the next. The bottom rung is PARALLAX: a nearby star’s apparent shift against the background as Earth orbits the Sun gives distance directly, with d(parsecs) = 1/p(arcseconds) — by definition a star with a parallax of one arcsecond is one parsec away (about 3.26 light-years). Parallax reaches only thousands of parsecs in the modern (Gaia) era — pre-Gaia, ground-based parallax was limited to about 100 pc — so the next rung uses STANDARD CANDLES: objects of known intrinsic luminosity, so their apparent brightness gives distance via the inverse-square law. Cepheid variable stars (Leavitt’s period–luminosity relation) extend to nearby galaxies; Type Ia supernovae (uniform peak luminosity) reach across the observable universe and, in 1998, revealed the ACCELERATING expansion attributed to dark energy. Only once these rungs pin down distances to galaxies could Hubble’s law itself be calibrated — after which redshift becomes a distance estimator for objects far too remote for any other method.',
              },
            ],
            workedExample: 'A galaxy’s spectrum shows the Ca II K line (rest λ₀ = 393.4 nm) observed at 401.3 nm. First the redshift: z = Δλ/λ₀ = (401.3 − 393.4)/393.4 = 7.9/393.4 = 0.0201. Since z is small, the recession velocity is v ≈ cz = (3.0 × 10⁵ km/s)(0.0201) = 6,030 km/s. Now apply Hubble’s law to get distance: d = v/H₀ = 6,030 / 70 = 86 megaparsecs ≈ 280 million light-years. Separately, to see the bottom rung of the ladder that calibrates all this: a star with a measured parallax of p = 0.05 arcseconds is at d = 1/p = 1/0.05 = 20 parsecs (≈65 light-years) — no ladder needed, pure geometry. The chain of the lesson: parallax fixes nearby distances geometrically → standard candles extend the scale → those calibrate Hubble’s constant → a galaxy’s measured z then yields its distance. A common error is jumping straight from z to distance with Hubble’s law while forgetting that H₀ itself only exists because parallax and standard candles calibrated it first.',
            judgeFraming: 'Judges ask "how do you get from a redshift to a distance?" to see whether a student understands the distance ladder as a calibrated CHAIN rather than a single magic formula. The strong answer walks the rungs — parallax (d = 1/p, pure geometry) calibrates standard candles (Cepheids, Type Ia supernovae via inverse-square), which calibrate Hubble’s constant, which finally converts a galaxy’s z into a distance. Bonus insight: distinguishing cosmological redshift (stretching space) from an ordinary Doppler shift, and knowing the Hubble tension is an unsettled measurement, signals a student tracking real, current astrophysics rather than a textbook frozen in time.',
            checkpoint: {
              questions: [
                {
                  kind: 'ordering',
                  id: 'q1',
                  prompt: 'Order the rungs of the cosmic distance ladder from the CLOSEST-reaching (bottom) to the FARTHEST-reaching (top).',
                  items: [
                    { id: 'parallax', text: 'Stellar parallax (d = 1/p)' },
                    { id: 'cepheid', text: 'Cepheid variables (period–luminosity)' },
                    { id: 'sn', text: 'Type Ia supernovae (standard candles)' },
                    { id: 'hubble', text: 'Hubble’s law (redshift → distance)' },
                  ],
                  correctOrder: ['parallax', 'cepheid', 'sn', 'hubble'],
                  explanation: 'Parallax works geometrically only for relatively nearby stars (thousands of parsecs). Cepheids extend to nearby galaxies; Type Ia supernovae reach across the observable universe; and Hubble’s law (using redshift, calibrated by the lower rungs) reaches the most distant galaxies of all. Each rung calibrates the next.',
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'A star has a measured parallax of 0.02 arcseconds. Its distance is:',
                  options: [
                    { id: 'a', text: '0.02 parsecs' },
                    { id: 'b', text: '2 parsecs' },
                    { id: 'c', text: '50 parsecs' },
                    { id: 'd', text: '500 parsecs' },
                  ],
                  answerId: 'c',
                  explanations: {
                    a: 'This mistakenly uses the parallax AS the distance; you must invert it (d = 1/p).',
                    b: 'This is off — 1/0.02 = 50, not 2; check the decimal.',
                    c: 'Correct — by definition d(parsecs) = 1/p(arcseconds) = 1/0.02 = 50 parsecs (about 163 light-years).',
                    d: 'This is a factor of 10 too large; 1/0.02 = 50, not 500.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'The modern interpretation of the COSMOLOGICAL redshift of distant galaxies is that:',
                  options: [
                    { id: 'a', text: 'Galaxies are flying outward through static space from a central explosion point' },
                    { id: 'b', text: 'Space itself is expanding, stretching the wavelength of light as it travels' },
                    { id: 'c', text: 'The light is tired and loses energy over distance' },
                    { id: 'd', text: 'Distant galaxies are simply hotter and emit redder light' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'There is no central point — the expansion has no center or edge; galaxies are not flying through pre-existing static space from an explosion site.',
                    b: 'Correct — in general relativity the cosmological redshift arises because the scale of space itself grows, stretching in-transit light to longer wavelengths; galaxies are carried apart rather than moving through space.',
                    c: 'The "tired light" idea is a discredited alternative that fails multiple observational tests (e.g. time-dilation of distant supernova light curves).',
                    d: 'Redshift is a coherent stretching of all wavelengths by the same factor (1+z), not a temperature effect on the continuum peak.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q4',
                  prompt: 'A galaxy shows a redshift z = 0.03. Using v ≈ cz and H₀ = 70 km/s/Mpc, its approximate distance is:',
                  options: [
                    { id: 'a', text: '~13 Mpc' },
                    { id: 'b', text: '~130 Mpc' },
                    { id: 'c', text: '~1,300 Mpc' },
                    { id: 'd', text: '~9,000 Mpc' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'This is off by a factor of 10 — recompute: v = cz = 9,000 km/s, and 9,000/70 ≈ 129 Mpc.',
                    b: 'Correct — v ≈ cz = (3.0 × 10⁵ km/s)(0.03) = 9,000 km/s, then d = v/H₀ = 9,000/70 ≈ 129 ≈ 130 Mpc.',
                    c: 'This is a factor of 10 too large; 9,000/70 is about 130, not 1,300.',
                    d: '9,000 is the recession velocity in km/s, not the distance in Mpc — you still must divide by H₀ = 70.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q5',
                  prompt: 'The Andromeda galaxy (M31) is BLUEshifted, not redshifted. What does this tell us?',
                  options: [
                    { id: 'a', text: 'Hubble’s law is wrong' },
                    { id: 'b', text: 'M31 is approaching the Milky Way; local gravitational motion can exceed the cosmological expansion for nearby galaxies' },
                    { id: 'c', text: 'M31 is the closest object in the universe' },
                    { id: 'd', text: 'Blueshift proves the universe is contracting' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Hubble’s law describes the average expansion over large distances; it is not violated by a nearby galaxy whose local motion dominates.',
                    b: 'Correct — Andromeda is close enough that gravitational attraction within the Local Group overwhelms the cosmological expansion, so it is actually approaching (~110 km/s) and appears blueshifted.',
                    c: 'M31 is relatively near (~0.78 Mpc) but far from the closest object; its blueshift is about motion, not a distance record.',
                    d: 'One nearby blueshifted galaxy reflects local gravity, not global contraction; on large scales the universe is unambiguously expanding.',
                  },
                },
              ],
            },
          },
        ],
      },
      {
        id: 'astro-core-telescopes',
        label: 'Telescopes and Detectors',
        lessons: [
          // ─── Lesson 1 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-tel-refractors-reflectors-light-gathering',
            label: 'Refractors, Reflectors, and Light-Gathering Power',
            readingMinutes: 5,
            sections: [
              {
                heading: 'The telescope is a light bucket first, a magnifier second',
                body: 'The most common student misconception is that a telescope is fundamentally a magnifier. For astronomy it is not — the single most important property of a telescope is its aperture, the diameter of its primary lens or mirror, because that sets how much light it collects. Stars are so far away they remain point sources no matter the magnification; you cannot "zoom in" to see a disk. What a bigger aperture buys you is more photons per second, which lets you see fainter objects and record cleaner spectra. Light-gathering power scales with the collecting AREA, so it goes as the square of the aperture diameter (area = π(D/2)²). A 200 mm telescope gathers (200/100)² = 4× the light of a 100 mm one, and a 10 m mirror gathers (10/0.1)² = 10,000× the light of a 100 mm amateur scope. This is why the field keeps building bigger mirrors: the 8.4 m mirrors of the Vera Rubin Observatory or the planned 39 m Extremely Large Telescope exist to catch photons, not to magnify.',
              },
              {
                heading: 'Refractors bend light; reflectors bounce it',
                body: 'A refractor uses a lens (an objective) at the front to bend and focus incoming light, the design Galileo and Kepler used in the early 1600s. Its fatal flaw at large sizes is chromatic aberration: a simple lens bends blue light more than red, so different colors focus at different points, smearing star images into colored halos. This can be partly corrected with multi-element "achromatic" and "apochromatic" lenses, but large lenses also sag under their own weight (they can only be supported at the edges) and absorb light. The largest refractor ever built, the 1897 Yerkes 40-inch (1.02 m), is essentially the practical ceiling for the design. A reflector instead uses a curved MIRROR to fold light to a focus — Newton\'s 1668 design. Mirrors have no chromatic aberration (reflection is color-independent), can be supported across their whole back surface, and only one surface must be figured. Every major research telescope built in the last century is a reflector for these reasons.',
              },
              {
                heading: 'Reflector layouts and the secondary mirror',
                body: 'Because a mirror focuses light back toward the sky, real reflectors use a small secondary mirror to redirect the beam somewhere usable. In a Newtonian, a flat secondary at 45° kicks the light out the side of the tube to an eyepiece. In a Cassegrain — the layout of most professional telescopes and the Hubble Space Telescope — a convex secondary sends the light back down through a hole in the primary, giving a long effective focal length in a short, stiff tube. The secondary and its support vanes do block a little light and cause diffraction spikes (the cross-shaped flares you see on bright stars in images), but the loss is small: a secondary blocking 30% of the diameter blocks only 0.3² = 9% of the area. The trade is well worth the compact, achromatic, scalable design that lets us build 8–40 m apertures no lens ever could.',
              },
            ],
            workedExample: 'A student wants to compare their 130 mm backyard reflector to a research telescope. Light-gathering power scales as aperture squared. Against the 8.1 m Gemini North mirror the ratio is (8100 mm / 130 mm)² = (62.3)² ≈ 3,880 — Gemini collects nearly 3,900× more light per second, so an object that takes Gemini one second to record cleanly would take the backyard scope over an hour of accumulated exposure to match (ignoring sky background and read noise). The student also computes the effect of the backyard scope\'s 40 mm secondary obstruction: it blocks (40/130)² = 0.095, about 9.5% of the collecting area, a minor penalty next to the 3,880× aperture gap. The takeaway they write up: their project\'s limiting factor is photons collected, set almost entirely by aperture, not magnification.',
            judgeFraming: 'Judges ask "why does aperture matter more than magnification?" to catch the students who think a telescope is a zoom lens. The tell of real understanding is stating that light-gathering power scales with the SQUARE of aperture and connecting it to what actually limited their observations — faint-object detection or spectrum signal-to-noise — rather than saying they "zoomed in more." A student who can explain why every big observatory is a reflector, not a refractor, has understood the design constraints instead of memorizing names.',
            checkpoint: {
              questions: [
                {
                  kind: 'mc',
                  id: 'q1',
                  prompt: 'A 400 mm telescope gathers how much more light than a 100 mm telescope?',
                  options: [
                    { id: 'a', text: '4 times as much' },
                    { id: 'b', text: '16 times as much' },
                    { id: 'c', text: '8 times as much' },
                    { id: 'd', text: '2 times as much' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'This is the ratio of diameters (400/100 = 4), but light-gathering power depends on collecting AREA, not diameter.',
                    b: 'Correct — collecting area scales with the square of the diameter, so the ratio is (400/100)² = 4² = 16.',
                    c: 'This is neither the diameter ratio nor its square; light-gathering scales as diameter squared, giving 16.',
                    d: 'This would be the ratio if power scaled with the square root of area; it does not — it scales with area, giving 16.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'Why are all large research telescopes reflectors rather than refractors?',
                  options: [
                    { id: 'a', text: 'Mirrors magnify more than lenses' },
                    { id: 'b', text: 'Mirrors have no chromatic aberration, can be supported across their whole back, and only one surface must be figured' },
                    { id: 'c', text: 'Lenses cannot focus starlight' },
                    { id: 'd', text: 'Reflectors are cheaper at every size' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Magnification is not the issue and is unrelated to lens-vs-mirror; aperture and image quality are what drive the choice.',
                    b: 'Correct — reflection is color-independent (no chromatic aberration), a mirror can be supported over its entire back surface rather than only at the edges, and only one optical surface needs figuring, so mirrors scale to many meters where large lenses sag and smear color.',
                    c: 'Lenses focus starlight fine (that is what a refractor does); the problem is chromatic aberration and sag at large sizes, not an inability to focus.',
                    d: 'Cost is not the fundamental reason and small refractors can be cheap; the physical limits on large lenses are what force the choice.',
                  },
                },
                {
                  kind: 'matching',
                  id: 'q3',
                  prompt: 'Match each telescope design feature to its correct description.',
                  left: [
                    { id: 'aperture', text: 'Aperture' },
                    { id: 'chromatic', text: 'Chromatic aberration' },
                    { id: 'cassegrain', text: 'Cassegrain layout' },
                    { id: 'obstruction', text: 'Secondary obstruction' },
                  ],
                  right: [
                    { id: 'diam', text: 'The diameter of the primary lens/mirror; sets light-gathering power' },
                    { id: 'color', text: 'A lens focusing different colors at different points, smearing images' },
                    { id: 'hole', text: 'Light folded back through a hole in the primary for a compact tube' },
                    { id: 'block', text: 'The small central area of the mirror blocked by the secondary' },
                  ],
                  correctPairs: [
                    ['aperture', 'diam'],
                    ['chromatic', 'color'],
                    ['cassegrain', 'hole'],
                    ['obstruction', 'block'],
                  ],
                  explanation: 'Aperture is the primary diameter and sets how much light is collected; chromatic aberration is a lens defect where colors focus at different depths; a Cassegrain sends light back through a hole in the primary for a short, stiff tube; the secondary obstruction is the central area the secondary mirror blocks (small, since it scales with the square of the small secondary diameter).',
                },
                {
                  kind: 'mc',
                  id: 'q4',
                  prompt: 'A reflector has a secondary mirror blocking 25% of the aperture DIAMETER. What fraction of the collecting AREA is lost?',
                  options: [
                    { id: 'a', text: '25%' },
                    { id: 'b', text: 'About 6%' },
                    { id: 'c', text: '50%' },
                    { id: 'd', text: 'About 12.5%' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: '25% is the diameter fraction, but the blocked area scales with the square of the diameter fraction, not the diameter itself.',
                    b: 'Correct — area lost = (0.25)² = 0.0625, about 6%, so even a fairly large central obstruction removes only a small fraction of the collecting area.',
                    c: 'Halving the area would require blocking about 71% of the diameter (√0.5 ≈ 0.71), not 25%.',
                    d: '12.5% is half of 25%, but the relationship is the square of the diameter fraction, giving about 6%.',
                  },
                },
              ],
            },
          },

          // ─── Lesson 2 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-tel-angular-resolution-diffraction-limit',
            label: 'Angular Resolution and the Diffraction Limit',
            readingMinutes: 6,
            sections: [
              {
                heading: 'Resolution is the ability to separate two close things, and it is set by physics',
                body: 'Angular resolution is the smallest angular separation at which a telescope can distinguish two objects as separate rather than a single blur — measured as an angle (arcseconds), because in astronomy everything on the sky is measured as an angle. Even a perfect, flawless telescope cannot resolve arbitrarily fine detail, because light is a wave and diffracts when it passes through the finite opening of the aperture. A point source therefore never images to a true point; it spreads into a central bright disk surrounded by faint rings, called the Airy pattern after George Airy who described it in 1835. The size of that Airy disk is what fundamentally limits how close two stars can be before their blurs merge. This is a hard physical floor: no amount of image processing or magnification beats it, which is why "empty magnification" — cranking up magnification past what the aperture can resolve — just gives a bigger blurry image, not more detail.',
              },
              {
                heading: 'The diffraction-limit formula: bigger aperture, shorter wavelength, finer detail',
                body: 'The Rayleigh criterion gives the diffraction limit as θ = 1.22 λ / D, where θ is the minimum resolvable angle in radians, λ is the wavelength of light, and D is the aperture diameter. Two lessons fall straight out of this. First, resolution improves (θ gets smaller) as D gets bigger — a second, independent reason to build large apertures beyond light-gathering. Second, resolution is wavelength-dependent: longer wavelengths diffract more and give coarser resolution for the same dish. This is exactly why radio telescopes must be enormous — a radio wave is roughly a million times longer than visible light, so a radio dish needs to be roughly a million times bigger than an optical mirror to match its resolution, which is impossible for a single dish and drives the whole strategy of interferometry (linking many dishes to synthesize a huge effective aperture). A handy visible-light rule of thumb, folding in λ ≈ 550 nm, is θ ≈ 138 / D arcseconds with D in millimeters — so a 138 mm aperture has a ~1 arcsecond diffraction limit.',
              },
              {
                heading: 'On the ground, the atmosphere usually wins first',
                body: 'Here is the twist that trips up students: for large ground-based optical telescopes, the diffraction limit is almost never what actually limits the images. A 4 m telescope has a diffraction limit around 0.03 arcseconds, but turbulence in Earth\'s atmosphere blurs star images to roughly 0.5–1.5 arcseconds at a good site — ten to fifty times worse. So a 10 m telescope on the ground does NOT resolve ten times finer detail than a 1 m telescope; without correction they deliver similar image sharpness, both capped by the atmosphere. This is precisely why the diffraction-limited-in-space Hubble (2.4 m) outperformed much larger ground telescopes on fine detail for decades, and why adaptive optics (next lesson) exists — to claw back the diffraction limit on the ground. The distinction between the theoretical diffraction limit and the achieved "seeing"-limited resolution is one of the most important in observational astronomy.',
              },
            ],
            workedExample: 'A student computes the diffraction limit of the 2.4 m Hubble Space Telescope in visible light. Using θ = 1.22 λ / D with λ = 550 nm = 5.5×10⁻⁷ m and D = 2.4 m: θ = 1.22 × (5.5×10⁻⁷) / 2.4 = 2.80×10⁻⁷ radians. Converting to arcseconds (1 radian = 206,265 arcsec): θ = 2.80×10⁻⁷ × 206,265 ≈ 0.058 arcseconds. They sanity-check with the shortcut θ ≈ 138 / D(mm) = 138 / 2400 = 0.0575 arcsec — a match. Then they contrast: a good ground site delivers ~0.7 arcsec seeing, about 12× coarser, so Hubble\'s advantage was never its size (many ground scopes are far larger) but being above the atmosphere so it actually reaches its diffraction limit. They conclude that for their own backyard 130 mm scope, θ ≈ 138/130 ≈ 1.06 arcsec — meaning the atmosphere and the optics land in the same ballpark, so a bigger backyard aperture would be seeing-limited, not diffraction-limited.',
            judgeFraming: 'Judges probe resolution because it separates students who understand that image sharpness has a physical cause from those who think "more magnification = more detail." The strong answer states θ = 1.22 λ/D, notes resolution improves with larger D and shorter λ, AND recognizes that on the ground the atmosphere usually dominates so the diffraction limit is not the achieved resolution. A student who explains why Hubble beat bigger ground telescopes — being in space, not being large — has grasped the diffraction-vs-seeing distinction that judges specifically listen for.',
            checkpoint: {
              questions: [
                {
                  kind: 'mc',
                  id: 'q1',
                  prompt: 'According to θ = 1.22 λ/D, how do you improve (make smaller) a telescope\'s diffraction-limited angular resolution?',
                  options: [
                    { id: 'a', text: 'Use a smaller aperture and observe at longer wavelengths' },
                    { id: 'b', text: 'Use a larger aperture and observe at shorter wavelengths' },
                    { id: 'c', text: 'Increase the magnification of the eyepiece' },
                    { id: 'd', text: 'Use a larger aperture and observe at longer wavelengths' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Both changes make θ larger (worse): smaller D increases the ratio and longer λ increases the numerator.',
                    b: 'Correct — θ = 1.22 λ/D shrinks (better resolution) when D grows and λ shrinks, since θ is proportional to λ and inversely proportional to D.',
                    c: 'Magnification does not change the diffraction limit; past a point it is "empty magnification" that just enlarges the blur.',
                    d: 'A larger aperture helps, but longer wavelengths make θ worse; you want shorter wavelengths for finer resolution.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'Why must radio telescopes be enormous (tens of meters or linked across kilometers) to achieve good resolution?',
                  options: [
                    { id: 'a', text: 'Radio waves are very weak and need huge dishes just to be detected' },
                    { id: 'b', text: 'Radio wavelengths are roughly a million times longer than visible light, so θ = 1.22 λ/D demands a proportionally larger D for the same resolution' },
                    { id: 'c', text: 'Radio telescopes cannot use mirrors, only large flat plates' },
                    { id: 'd', text: 'Larger dishes are needed because radio waves travel slower than light' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'While large dishes do help collect faint radio signals, the driving reason for the SIZE relative to optical telescopes is resolution, set by the long wavelength in θ = 1.22 λ/D.',
                    b: 'Correct — because θ scales with λ, and radio λ is ~10⁶× longer than visible, matching optical resolution would need a dish ~10⁶× larger; a single dish cannot do this, which drives interferometry to synthesize huge effective apertures.',
                    c: 'Radio dishes are curved reflectors much like optical mirrors; the shape is not the issue.',
                    d: 'All electromagnetic waves travel at the speed of light; radio does not travel slower. The issue is wavelength.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'A 4 m ground-based optical telescope has a diffraction limit near 0.03 arcsec, yet its images are typically blurred to ~0.7 arcsec. Why?',
                  options: [
                    { id: 'a', text: 'The mirror is not polished well enough' },
                    { id: 'b', text: 'Atmospheric turbulence ("seeing") blurs the image far more than diffraction does, so seeing sets the achieved resolution' },
                    { id: 'c', text: 'The telescope is too large to focus properly' },
                    { id: 'd', text: 'Diffraction gets worse for larger telescopes' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'A modern 4 m mirror is figured far better than 0.7 arcsec; the dominant blur is the atmosphere, not the optics.',
                    b: 'Correct — turbulence in Earth\'s atmosphere smears point sources to ~0.5–1.5 arcsec at good sites, which is much larger than the 0.03 arcsec diffraction limit, so seeing (not diffraction) sets the achieved resolution without adaptive optics.',
                    c: 'Large telescopes focus fine; size is not the cause of the blur.',
                    d: 'Diffraction actually gets BETTER (smaller θ) for larger apertures; the blur here is atmospheric, not diffractive.',
                  },
                },
                {
                  kind: 'ordering',
                  id: 'q4',
                  prompt: 'Order these telescopes from FINEST (smallest θ) to COARSEST diffraction-limited resolution at a fixed visible wavelength, based on aperture: 39 m ELT, 2.4 m Hubble, 0.13 m backyard scope, 100 m single radio dish (at radio wavelengths).',
                  items: [
                    { id: 'elt', text: '39 m Extremely Large Telescope (visible)' },
                    { id: 'hst', text: '2.4 m Hubble (visible)' },
                    { id: 'yard', text: '0.13 m backyard scope (visible)' },
                    { id: 'radio', text: '100 m single radio dish (radio wavelengths)' },
                  ],
                  correctOrder: ['elt', 'hst', 'yard', 'radio'],
                  explanation: 'At the same visible wavelength, θ ∝ 1/D, so the 39 m ELT is finest, then the 2.4 m Hubble, then the 0.13 m backyard scope. The 100 m radio dish, despite its huge diameter, observes at wavelengths ~10⁶× longer, so its θ = 1.22 λ/D is by far the coarsest — a striking demonstration that wavelength dominates: a giant dish at long wavelengths resolves worse than a tiny telescope in visible light.',
                },
              ],
            },
          },

          // ─── Lesson 3 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-tel-atmospheric-seeing-adaptive-optics',
            label: 'Atmospheric Seeing and Adaptive Optics',
            readingMinutes: 5,
            sections: [
              {
                heading: 'What "seeing" is: the atmosphere as a churning bad lens',
                body: 'Starlight arrives at the top of the atmosphere as flat, parallel wavefronts, but the last ~10–20 km of air is turbulent, with pockets of slightly different temperature and therefore slightly different refractive index. Each pocket bends light a little differently, and because the pockets move and reshuffle on millisecond timescales, the wavefront reaching the telescope is crinkled and constantly changing. The visible result is twinkling (scintillation) for the naked eye, and for a telescope it is a star image that boils and smears into a blob typically 0.5–1.5 arcseconds across. Astronomers call this blur the "seeing," quantified as the full width of that blob. Crucially, seeing is a property of the SITE and NIGHT, not the telescope — which is why observatories are placed on high, dry, stable peaks like Mauna Kea (Hawaii, ~0.4–0.6 arcsec median), the Chilean Atacama, or the Canary Islands, where the air above is thinner and less turbulent. Site selection is worth as much as aperture for image sharpness.',
              },
              {
                heading: 'Adaptive optics: measure the wavefront, then bend a mirror to cancel the distortion',
                body: 'Adaptive optics (AO) fixes seeing in real time. The idea, proposed by Horace Babcock in 1953 but only made practical in the 1990s, is to measure how the incoming wavefront is distorted and then physically deform a small mirror to apply the exact opposite distortion, flattening the wavefront before it forms the image. A wavefront sensor (often a Shack-Hartmann sensor, a grid of tiny lenslets) reads the wavefront hundreds to thousands of times per second; a computer calculates the correction; and a deformable mirror with dozens to thousands of actuators reshapes its surface to match, faster than the atmosphere changes. Done well, AO can drive a large ground telescope from ~0.7 arcsec seeing down toward its diffraction limit of a few hundredths of an arcsecond — a Hubble-class sharpness on the ground, at a fraction of the cost. AO is now standard on the Keck, VLT, Gemini and other 8–10 m telescopes and is baked into the design of the coming 30–40 m giants.',
              },
              {
                heading: 'The guide-star problem and laser beacons',
                body: 'AO needs a bright reference point of known shape near the target to measure the wavefront against — a "guide star." The catch is that a natural star bright enough and close enough on the sky exists for only a small fraction of targets, so early AO could correct only a sliver of the sky. The solution, now routine, is the laser guide star: a powerful laser tuned to ~589 nm excites sodium atoms in a layer ~90 km up, making an artificial glowing spot the AO system can use as its reference anywhere it points. (Those eerie orange beams shooting from Keck or the VLT in photos are exactly this.) One limitation remains: a laser cannot sense overall image tip-tilt (the whole image shifting), because the laser light traverses the same atmosphere twice, so a faint natural star is still needed for that one correction — but a much fainter, more common one than full AO would require. AO also works over only a small patch of sky at once (the "isoplanatic patch"), which is why "multi-conjugate" AO with several lasers is an active frontier.',
              },
            ],
            workedExample: 'A team observing with an 8.2 m VLT unit wants to quantify what adaptive optics buys them. Without AO the site seeing is 0.8 arcsec. The diffraction limit at near-infrared 2.2 µm (where AO works best, because longer wavelengths are easier to correct) is θ = 1.22 λ/D = 1.22 × (2.2×10⁻⁶)/8.2 = 3.27×10⁻⁷ rad × 206,265 = 0.067 arcsec. So AO can in principle sharpen the image from 0.8 arcsec to ~0.067 arcsec — about a 12× gain in linear resolution, meaning roughly 12² ≈ 140× more detail elements packed into the same blob. They note AO performs far better at 2.2 µm than in visible light: correction difficulty scales steeply with shorter wavelength, so an 8 m telescope routinely reaches its diffraction limit in the infrared but only partially in the visible. This is why AO-fed instruments (and the imaging of the Galactic-center stars orbiting Sgr A*, the 2020 Nobel-winning work) operate in the infrared.',
            judgeFraming: 'Judges ask about seeing and AO to test whether a student understands that a ground telescope\'s real-world sharpness is a battle against the atmosphere, not a fixed property of the glass. A strong answer defines seeing as a site/night property (~0.5–1.5 arcsec), explains AO as measuring and canceling wavefront distortion with a deformable mirror in real time, and can say why observatories sit on high dry peaks and why AO works best in the infrared. If a student used any ground image, a judge may ask whether seeing limited their resolution — and the informed answer names it explicitly rather than blaming the telescope.',
            checkpoint: {
              questions: [
                {
                  kind: 'mc',
                  id: 'q1',
                  prompt: 'Astronomical "seeing" of ~1 arcsecond is caused by:',
                  options: [
                    { id: 'a', text: 'Imperfections in the telescope mirror' },
                    { id: 'b', text: 'Turbulent pockets of air with varying refractive index distorting the incoming wavefront' },
                    { id: 'c', text: 'The diffraction limit of the telescope aperture' },
                    { id: 'd', text: 'Light pollution from nearby cities' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Modern mirrors are figured far better than 1 arcsec; the blur is atmospheric, not from the optics.',
                    b: 'Correct — the last ~10–20 km of atmosphere contains turbulent cells of differing temperature/refractive index that bend light unevenly and reshuffle every few milliseconds, smearing star images to ~0.5–1.5 arcsec.',
                    c: 'The diffraction limit of a large telescope is far finer (hundredths of an arcsec); seeing is much larger and dominates unless corrected.',
                    d: 'Light pollution raises the sky background (hurting faint-object detection) but does not blur point sources to 1 arcsec; that is turbulence.',
                  },
                },
                {
                  kind: 'ordering',
                  id: 'q2',
                  prompt: 'Put the steps of an adaptive-optics correction loop in the order they occur.',
                  items: [
                    { id: 'measure', text: 'A wavefront sensor measures the distortion of the incoming wavefront' },
                    { id: 'compute', text: 'A computer calculates the shape correction needed' },
                    { id: 'deform', text: 'The deformable mirror reshapes to apply the opposite distortion' },
                    { id: 'image', text: 'A flattened wavefront forms a sharp image; the loop repeats hundreds of times per second' },
                  ],
                  correctOrder: ['measure', 'compute', 'deform', 'image'],
                  explanation: 'AO runs a real-time loop: sense the wavefront distortion (Shack-Hartmann sensor), compute the required correction, command the deformable mirror to apply the opposite shape, and the now-flattened wavefront forms a sharp image — then the whole loop repeats hundreds to thousands of times per second to keep up with the fast-changing atmosphere.',
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'What is the purpose of a laser guide star in an adaptive-optics system?',
                  options: [
                    { id: 'a', text: 'To add extra light to faint target galaxies so they can be seen' },
                    { id: 'b', text: 'To create an artificial reference point (by exciting sodium ~90 km up) for measuring wavefront distortion anywhere on the sky' },
                    { id: 'c', text: 'To heat the air and reduce turbulence above the telescope' },
                    { id: 'd', text: 'To magnify the target using laser light' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'The laser is a wavefront reference, not illumination for the science target; it does not brighten galaxies.',
                    b: 'Correct — a ~589 nm laser excites the sodium layer ~90 km up to make an artificial glowing spot, providing the bright, well-placed reference the wavefront sensor needs for targets that lack a suitable natural guide star.',
                    c: 'The laser does not measurably heat or calm the atmosphere; it provides a reference beacon.',
                    d: 'Lasers do not magnify; AO corrects distortion, it does not change magnification.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q4',
                  prompt: 'Why is adaptive optics much more effective in the near-infrared (e.g. 2.2 µm) than in visible light for the same telescope?',
                  options: [
                    { id: 'a', text: 'Infrared light does not pass through the atmosphere' },
                    { id: 'b', text: 'Longer wavelengths are less severely distorted by turbulence and thus easier to correct, so an 8 m telescope more readily reaches its diffraction limit in the infrared' },
                    { id: 'c', text: 'Detectors only work in the infrared' },
                    { id: 'd', text: 'The diffraction limit is finer in the infrared than the visible' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Much of the near-infrared does pass through the atmosphere (in specific windows); the point is that correction is easier there, not that IR skips the air.',
                    b: 'Correct — the wavefront distortion to correct is a smaller fraction of the longer wavelength, so AO correction is far easier in the IR, letting large telescopes reach their (IR) diffraction limit routinely while visible correction is only partial.',
                    c: 'Detectors work across many bands; this is not why AO favors the infrared.',
                    d: 'The diffraction limit is actually COARSER at longer wavelengths (θ ∝ λ); AO still wins in the IR because correction is easier, despite the coarser theoretical limit.',
                  },
                },
              ],
            },
          },

          // ─── Lesson 4 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-tel-ccds-quantum-efficiency-detectors',
            label: 'CCDs, Quantum Efficiency, and Digital Detectors',
            readingMinutes: 6,
            sections: [
              {
                heading: 'From the eye and photographic plate to the silicon detector',
                body: 'For most of astronomy\'s history the detector was the human eye (which integrates for only ~0.1 s and cannot accumulate faint light) or, from the mid-1800s, the photographic plate. Plates could integrate for hours, opening up faint objects, but they were brutally inefficient — a good plate captured only about 1–2% of the photons that hit it, and their response to light was nonlinear, so measuring true brightness was hard. Everything changed with the charge-coupled device (CCD), invented at Bell Labs in 1969 by Willard Boyle and George Smith (a 2009 Nobel Prize) and adopted by astronomy in the late 1970s. A CCD is a grid of silicon pixels; when a photon strikes a pixel, the photoelectric effect knocks loose an electron that is trapped in that pixel\'s potential well. The number of electrons collected is proportional to the number of photons — a LINEAR response — and at readout the charge is shuffled pixel-to-pixel to an amplifier that counts it. Linearity is the quiet superpower: it means the digital count is directly proportional to brightness, so photometry (measuring how bright things are) becomes simple arithmetic.',
              },
              {
                heading: 'Quantum efficiency: the fraction of photons you actually catch',
                body: 'Quantum efficiency (QE) is the fraction of incident photons a detector converts into a detected signal. This is where CCDs crushed the competition: where a photographic plate managed ~1–2% and the dark-adapted eye maybe a few percent, a modern back-illuminated CCD reaches 80–95% QE across much of the visible band. Catching 90% instead of 1% of your photons is like a 90× jump in effective telescope area for free — a bigger real-world gain for faint-object work than most aperture upgrades. QE is wavelength-dependent: silicon is nearly blind to light beyond ~1.1 µm (photons with too little energy to lift an electron across silicon\'s bandgap), so near-infrared astronomy needs different detector materials (like HgCdTe arrays), and it falls off in the blue/UV, which "back-illuminated" thinning and special coatings are designed to recover. When comparing detectors or planning an exposure, QE at your specific wavelength is the number that matters, not a single headline figure.',
              },
              {
                heading: 'Noise: why real exposures are a signal-to-noise problem',
                body: 'A CCD image is never clean; three noise sources set how faint you can go. Read noise is the uncertainty the amplifier adds each time a pixel is read out (a few electrons per pixel for a good chip) — a fixed cost per readout, which is why you take fewer long exposures rather than many short ones. Dark current is electrons generated thermally even in the dark, which piles up over time; it is fought by cooling the CCD, often to around -100°C with liquid nitrogen, roughly halving dark current for every ~6–7°C drop. And photon (shot) noise is the fundamental statistical scatter of counting photons: if you collect N photons the uncertainty is √N, so signal-to-noise from the source alone grows as N/√N = √N — meaning to double your S/N you must quadruple your exposure time. This √N law is the reason faint astronomy is so expensive in telescope time and why detector QE (which multiplies N) is so valuable: doubling QE doubles N, improving S/N by √2 for the same exposure.',
              },
            ],
            workedExample: 'A student plans an exposure and reasons about signal-to-noise in the photon-limited regime, where noise ≈ √N. Their target delivers 100 detected electrons in a 10-second exposure, so S/N = 100/√100 = 100/10 = 10. They want S/N = 20 — double. Because S/N grows as √N, and N grows linearly with time, doubling S/N needs 2² = 4× the photons, i.e. a 40-second exposure (N = 400, S/N = 400/√400 = 400/20 = 20). They then compare two cameras: an old one at 40% QE and a new back-illuminated one at 90% QE. Swapping to the new detector multiplies N by 90/40 = 2.25 for the SAME exposure, improving S/N by √2.25 = 1.5× — equivalent to 2.25× longer exposures on the old camera. The lesson they write up: QE and exposure time both feed N, and because S/N only grows as √N, faint-object work is punishingly time-hungry, so a higher-QE detector is often the cheapest way to gain depth.',
            judgeFraming: 'Judges ask about detectors and signal-to-noise to see whether a student who "took images" understands what set the quality of their data. The strong signals are: naming linearity as why CCD counts map directly to brightness, citing QE as the fraction of photons caught (and that modern CCDs reach ~90% vs ~1% for old plates), and — above all — invoking the √N photon-noise law to explain why doubling their S/N required quadrupling exposure time. A student who says "I just took a longer exposure until it looked good" has not grasped that S/N is a calculable quantity a judge can and will interrogate.',
            checkpoint: {
              questions: [
                {
                  kind: 'mc',
                  id: 'q1',
                  prompt: 'Why is the LINEAR response of a CCD so valuable for astronomy compared to a photographic plate?',
                  options: [
                    { id: 'a', text: 'It makes the images look more colorful' },
                    { id: 'b', text: 'The digital count is directly proportional to the number of photons (brightness), so photometry becomes simple and accurate' },
                    { id: 'c', text: 'It lets the CCD collect light faster than the speed of light' },
                    { id: 'd', text: 'It eliminates all noise from the image' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Linearity is about the proportionality of signal to light, not color appearance.',
                    b: 'Correct — because collected electrons are proportional to incident photons, the recorded count maps directly and linearly to brightness, making quantitative photometry straightforward, unlike a plate\'s nonlinear response.',
                    c: 'Nothing collects light faster than light travels; linearity is about signal-vs-brightness proportionality.',
                    d: 'CCDs still have read noise, dark current, and photon noise; linearity does not remove noise.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'A modern back-illuminated CCD has ~90% quantum efficiency; an old photographic plate had ~1–2%. What does this mean?',
                  options: [
                    { id: 'a', text: 'The CCD magnifies the image 90 times more than the plate' },
                    { id: 'b', text: 'The CCD detects about 90% of incident photons versus ~1–2% for the plate, a roughly 45–90× gain in photons caught' },
                    { id: 'c', text: 'The CCD is 90% cheaper than a plate' },
                    { id: 'd', text: 'The CCD resolves 90% finer detail than a plate' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'QE has nothing to do with magnification; it is the fraction of photons converted to signal.',
                    b: 'Correct — QE is the fraction of incident photons detected, so catching ~90% instead of ~1–2% means roughly 45–90× more photons recorded, an enormous effective sensitivity gain for the same telescope.',
                    c: 'QE is a physics quantity (photons detected), not a statement about cost.',
                    d: 'Resolution is set by aperture and seeing, not by QE; QE is about sensitivity, not sharpness.',
                  },
                },
                {
                  kind: 'matching',
                  id: 'q3',
                  prompt: 'Match each CCD noise source to how it behaves or is mitigated.',
                  left: [
                    { id: 'read', text: 'Read noise' },
                    { id: 'dark', text: 'Dark current' },
                    { id: 'shot', text: 'Photon (shot) noise' },
                  ],
                  right: [
                    { id: 'perread', text: 'A fixed cost added each readout; favor fewer, longer exposures' },
                    { id: 'cool', text: 'Thermal electrons that accumulate over time; reduced by cooling the chip' },
                    { id: 'sqrtn', text: 'Fundamental √N statistical scatter of counting photons' },
                  ],
                  correctPairs: [
                    ['read', 'perread'],
                    ['dark', 'cool'],
                    ['shot', 'sqrtn'],
                  ],
                  explanation: 'Read noise is added once per readout (so many short exposures pay it repeatedly — favor fewer long ones); dark current is thermally generated charge that grows with time and is suppressed by cooling the CCD; photon/shot noise is the irreducible √N scatter of counting a finite number of photons.',
                },
                {
                  kind: 'mc',
                  id: 'q4',
                  prompt: 'In the photon-limited regime, a 10 s exposure gives signal-to-noise of 10. Roughly how long an exposure is needed to reach S/N = 20?',
                  options: [
                    { id: 'a', text: '20 s' },
                    { id: 'b', text: '40 s' },
                    { id: 'c', text: '15 s' },
                    { id: 'd', text: '100 s' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Doubling the time only doubles N, which raises S/N by √2 ≈ 1.4×, not 2×; 20 s gives S/N ≈ 14, not 20.',
                    b: 'Correct — S/N grows as √N and N grows with time, so doubling S/N needs 2² = 4× the photons, i.e. 4 × 10 s = 40 s (N goes 100→400, S/N goes 10→20).',
                    c: '15 s is only a small increase; it would give S/N ≈ 10 × √1.5 ≈ 12, far short of 20.',
                    d: '100 s is 10× the time, giving S/N ≈ 10 × √10 ≈ 32 — more than needed; the requirement is 4× the time, or 40 s.',
                  },
                },
              ],
            },
          },

          // ─── Lesson 5 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-tel-observing-across-spectrum-radio-xray',
            label: 'Observing Across the Spectrum: Radio to X-ray',
            readingMinutes: 6,
            sections: [
              {
                heading: 'Different wavelengths reveal different physics — and demand different telescopes',
                body: 'Visible light is a thin slice of the electromagnetic spectrum, and each band shows a different physical process, so multi-wavelength astronomy is not optional decoration — it is how you see the whole object. Cold gas and dust (tens of kelvin) glow in the infrared and radio; warm stars peak in the visible; hot young stars and interstellar gas emit in the ultraviolet; and violently hot, energetic matter — million-degree gas, black-hole accretion disks, supernova shocks — radiates X-rays and gamma rays. A galaxy imaged only in visible light hides its cold star-forming clouds (infrared), its relativistic jets (radio), and its hot halo (X-ray). Because the telescope\'s job is to focus light of a given wavelength, and wavelengths span a factor of ~10¹² from radio to gamma, the hardware is radically different band to band — you cannot point a backyard optical scope at the radio sky.',
              },
              {
                heading: 'Radio and interferometry: synthesizing a giant aperture',
                body: 'Radio waves (millimeters to meters) pass freely through the atmosphere and even clouds, so radio astronomy works day and night in any weather — but the long wavelength wrecks resolution (θ = 1.22 λ/D again), so a single dish, even the 100 m Green Bank Telescope, gives poor angular resolution. The escape is interferometry: link many separated dishes and combine their signals so the array resolves as if it were a single dish as wide as the largest separation (the "baseline"). The Very Large Array spreads 27 dishes over 36 km; ALMA in Chile uses 66 dishes at millimeter wavelengths; and the Event Horizon Telescope combined dishes across the whole Earth to reach the resolution needed to image the shadow of the M87 and Milky Way black holes in 2019 and 2022. Interferometry is the single most important idea in high-resolution astronomy: resolution is set by baseline, light-gathering by total collecting area, and the two are decoupled.',
              },
              {
                heading: 'The high-energy end: why X-rays need grazing mirrors and space',
                body: 'X-rays carry so much energy that they punch straight through or are absorbed by an ordinary mirror rather than reflecting — so you cannot focus them with a normal dish. X-ray telescopes instead use grazing-incidence optics: nested, barely-tilted mirror shells that let X-rays skip off the surface at a shallow angle like a stone skipping on water, gradually funneling them to a focus (NASA\'s Chandra, launched 1999, is the flagship). Two more facts define high-energy astronomy. First, the atmosphere is opaque to X-rays and gamma rays (and most UV and much infrared) — those photons never reach the ground, so these telescopes MUST be in space. Second, detection at these energies often means counting individual photons and even measuring each one\'s energy, because sources are faint and every photon is information-rich. The lesson for a student: the band you choose dictates whether you can observe from the ground at all, what optics are even possible, and how you detect the light.',
              },
            ],
            workedExample: 'A student estimates the resolution advantage of interferometry. A single ALMA dish is 12 m across; observing at λ = 1 mm, its diffraction limit is θ = 1.22 λ/D = 1.22 × (10⁻³)/12 = 1.02×10⁻⁴ rad × 206,265 = 21 arcsec — worse than the naked eye. Now spread the array to a maximum baseline of 16 km: the effective D becomes 16,000 m, so θ = 1.22 × (10⁻³)/16000 = 7.6×10⁻⁸ rad × 206,265 = 0.016 arcsec — a ~1,300× improvement, sharper than Hubble. The student notes the crucial split: resolution came from the 16 km BASELINE, while sensitivity (light gathered) still comes only from the total collecting area of the 66 dishes, not from the baseline. They contrast this with the Event Horizon Telescope, whose Earth-sized ~10,000 km baseline at 1.3 mm yields θ ≈ 1.22 × (1.3×10⁻³)/10⁷ = 1.59×10⁻¹⁰ rad × 206,265 ≈ 33 microarcseconds by the full Rayleigh criterion (dropping the 1.22 factor to use θ ≈ λ/D, as EHT papers do for an idealized array, gives ≈ 25 microarcseconds) — either way fine enough to resolve a black hole\'s shadow.',
            judgeFraming: 'Judges use multi-wavelength questions to test whether a student understands that the choice of band is a physics decision, not a preference. The strong answer connects a wavelength to the process it reveals (X-ray = hot/energetic, infrared = cold gas and dust, radio = jets and cold hydrogen), explains that the atmosphere blocks X-ray/gamma/most-UV so those observatories must be in space, and can articulate why interferometry decouples resolution (set by baseline) from sensitivity (set by total area). A student who treats "which telescope" as interchangeable has missed that each band needs fundamentally different optics and detection.',
            checkpoint: {
              questions: [
                {
                  kind: 'matching',
                  id: 'q1',
                  prompt: 'Match each wavelength band to the physical process it best reveals.',
                  left: [
                    { id: 'xray', text: 'X-ray' },
                    { id: 'ir', text: 'Infrared' },
                    { id: 'radio', text: 'Radio' },
                    { id: 'uv', text: 'Ultraviolet' },
                  ],
                  right: [
                    { id: 'hot', text: 'Million-degree gas, black-hole accretion, supernova shocks' },
                    { id: 'cold', text: 'Cold dust and star-forming clouds (tens of kelvin)' },
                    { id: 'jets', text: 'Relativistic jets and cold neutral hydrogen' },
                    { id: 'young', text: 'Hot, massive young stars and ionized gas' },
                  ],
                  correctPairs: [
                    ['xray', 'hot'],
                    ['ir', 'cold'],
                    ['radio', 'jets'],
                    ['uv', 'young'],
                  ],
                  explanation: 'Higher photon energy traces hotter/more energetic matter: X-rays reveal million-degree gas and accretion/shocks; the infrared reveals cold dust and star-forming clouds; radio reveals relativistic jets and cold neutral hydrogen (the 21 cm line); and the ultraviolet traces hot, massive young stars and the ionized gas they light up.',
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'How does radio interferometry (e.g. the VLA, ALMA, the Event Horizon Telescope) achieve high angular resolution despite long wavelengths?',
                  options: [
                    { id: 'a', text: 'By cooling the dishes to reduce noise' },
                    { id: 'b', text: 'By linking widely separated dishes so the array resolves as if it were a single dish as large as the maximum baseline' },
                    { id: 'c', text: 'By using much shorter wavelengths than optical telescopes' },
                    { id: 'd', text: 'By magnifying the radio signal electronically' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Cooling reduces noise (helping sensitivity) but does nothing for angular resolution.',
                    b: 'Correct — combining signals from separated dishes synthesizes an effective aperture equal to the largest separation (baseline), so θ = 1.22 λ/D uses that huge D; the Event Horizon Telescope\'s Earth-sized baseline is how it resolved a black-hole shadow.',
                    c: 'Radio wavelengths are much LONGER than optical, which is the problem interferometry solves; it does not shorten them.',
                    d: 'Electronic amplification does not improve angular resolution; the long baseline does.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'Why must X-ray telescopes like Chandra use grazing-incidence optics AND operate from space?',
                  options: [
                    { id: 'a', text: 'X-rays are too dim to focus with normal mirrors, and space is darker' },
                    { id: 'b', text: 'X-rays pass through or are absorbed by normal mirrors (so they need shallow-angle grazing reflection), and the atmosphere is opaque to X-rays (so they never reach the ground)' },
                    { id: 'c', text: 'X-rays travel faster than visible light, requiring special optics and altitude' },
                    { id: 'd', text: 'Grazing optics magnify more, and space removes gravity' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'The issue is not dimness: X-rays physically penetrate or get absorbed by ordinary mirror surfaces at normal incidence, and the atmosphere blocks them regardless of how dark the site is.',
                    b: 'Correct — X-rays only reflect at very shallow (grazing) angles, so nested barely-tilted shells funnel them to a focus; and because the atmosphere absorbs X-rays entirely, such telescopes must be above it in space.',
                    c: 'All electromagnetic radiation travels at the same speed; X-rays are not faster.',
                    d: 'Grazing optics are about the reflection physics, not magnification, and the reason for space is atmospheric opacity, not gravity.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q4',
                  prompt: 'In a radio interferometer, angular resolution and light-gathering (sensitivity) are set by, respectively:',
                  options: [
                    { id: 'a', text: 'The total collecting area, and the maximum baseline' },
                    { id: 'b', text: 'The maximum baseline, and the total collecting area of all the dishes' },
                    { id: 'c', text: 'Both by the total collecting area' },
                    { id: 'd', text: 'Both by the maximum baseline' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'This has the two backwards: baseline sets resolution and area sets sensitivity, not the other way around.',
                    b: 'Correct — resolution follows θ = 1.22 λ/D with D = the largest baseline (dish separation), while sensitivity/light-gathering depends on the total collecting area of all the dishes combined; the two are decoupled.',
                    c: 'Total area sets sensitivity but not resolution; resolution comes from the baseline.',
                    d: 'The baseline sets resolution but not sensitivity; adding more/larger dishes (area) is what improves faint-signal detection.',
                  },
                },
              ],
            },
          },

          // ─── Lesson 6 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-tel-why-telescopes-in-space',
            label: 'Why We Put Telescopes in Space',
            readingMinutes: 5,
            sections: [
              {
                heading: 'The atmosphere blocks, blurs, and glows',
                body: 'The atmosphere sabotages ground-based astronomy in three distinct ways, and space fixes all three. First, it BLOCKS whole wavebands: it is essentially opaque to gamma rays, X-rays, most ultraviolet, and large stretches of infrared, so those photons never reach the ground at all — the only way to observe them is from above the air. Second, it BLURS: turbulence limits ground images to ~0.5–1.5 arcsec seeing (Lesson 3) unless adaptive optics claws it back, whereas a space telescope reaches its full diffraction limit continuously. Third, it GLOWS: the night sky is not black — airglow (molecules high in the atmosphere emitting faint light), scattered moonlight, and thermal infrared emission from the warm atmosphere itself all add a background that swamps the faintest sources. Space removes the blocking and the blurring outright and slashes the background, which is why the deepest images ever taken (the Hubble and JWST deep fields) come from space.',
              },
              {
                heading: 'The trade-offs: space is not a free win',
                body: 'Space is transformative but brutally expensive and constrained. A space telescope\'s aperture is capped by what a rocket fairing can hold: Hubble\'s 2.4 m mirror was sized to fit the Space Shuttle bay, and JWST\'s 6.5 m mirror had to be built in segments that folded up for launch and unfolded in space — an engineering gamble with hundreds of single-point failures. Once up, most space telescopes cannot be serviced (Hubble in low Earth orbit was the rare exception, repaired five times by shuttle crews; JWST, a million miles away at the Sun-Earth L2 point, cannot be reached). They carry finite coolant and fuel, so their lifetimes are bounded. And the cost is staggering — JWST ran about US$10 billion. Meanwhile ground telescopes keep getting bigger and cheaper per square meter, and adaptive optics narrows the sharpness gap in the infrared. So the real question is never "space or ground" but "which does this science NEED": if the target radiates in a blocked band or demands the darkest possible sky, it must go to space; if it is a bright optical or radio target, the ground is far more cost-effective.',
              },
              {
                heading: 'Choosing the orbit — and why JWST hides at L2 and stays cold',
                body: 'Where you park a space telescope is itself a physics decision. Hubble sits in low Earth orbit (~540 km), close enough to service but circling the planet every ~95 minutes, so Earth repeatedly blocks its view. JWST instead orbits the Sun-Earth Lagrange point L2, ~1.5 million km out on the night side, where the Sun, Earth, and Moon all lie in roughly the same direction, letting a single tennis-court-sized sunshield block all three at once. That matters because JWST is an infrared telescope, and infrared astronomy is ruined by heat: a warm telescope glows in its own infrared band, drowning the faint cosmic signal. So JWST\'s sunshield keeps its mirror below ~50 K (about -223°C) passively, and its coldest detectors are cooled further still. The design lesson is that for infrared, "get to space" is not enough — you must also get COLD and stay pointed away from every warm body, which L2 makes possible. This is the same theme as Lesson 4\'s cooled CCDs, scaled up to an entire observatory.',
              },
            ],
            workedExample: 'A student decides whether their science question needs a space telescope by working through the three atmospheric problems for a specific target: the hot X-ray gas in a galaxy cluster. Blocking — the atmosphere is completely opaque to X-rays, so the target is invisible from the ground at any aperture; this alone forces a space mission (Chandra or XMM-Newton). They contrast a second target: a bright, nearby optical variable star. It radiates in the visible (not blocked), it is bright so sky glow is not the limiter, and it does not need sub-arcsecond sharpness — so a modest ground telescope is entirely adequate and vastly cheaper. Finally they consider a faint high-redshift galaxy whose light has been stretched into the infrared: not fully blocked, but the ground\'s thermal-infrared airglow would swamp it, so JWST in space — cold, dark, and above the airglow — is the right tool. Their write-up: the decision rule is "identify the wavelength and the limiting problem (blocked / blurred / glow), then pick the cheapest platform that solves it."',
            judgeFraming: 'Judges ask "why not just build a bigger telescope on the ground?" to test whether a student can reason about the space-versus-ground trade rather than assuming space is always better. The winning answer names the three atmospheric problems (blocks certain bands, blurs via seeing, glows with background) and then explains the cost: capped aperture set by the rocket fairing, no servicing, finite coolant, and a price in the billions. A student who can say "my target radiates in a band the atmosphere blocks, so it HAD to be space" — or conversely "mine is a bright optical target, so the ground was the right, cheaper choice" — has understood that the platform is a science-driven decision, exactly what a judge probes.',
            checkpoint: {
              questions: [
                {
                  kind: 'matching',
                  id: 'q1',
                  prompt: 'Match each atmospheric problem to how a space telescope addresses it.',
                  left: [
                    { id: 'blocks', text: 'Blocks whole wavebands' },
                    { id: 'blurs', text: 'Blurs images (seeing)' },
                    { id: 'glows', text: 'Glows with background light' },
                  ],
                  right: [
                    { id: 'bands', text: 'Above the air, blocked bands (X-ray, UV, much IR) become observable' },
                    { id: 'diff', text: 'No turbulence, so the telescope reaches its full diffraction limit continuously' },
                    { id: 'dark', text: 'Far less airglow and scattered light, so much fainter sources are reachable' },
                  ],
                  correctPairs: [
                    ['blocks', 'bands'],
                    ['blurs', 'diff'],
                    ['glows', 'dark'],
                  ],
                  explanation: 'Space fixes all three atmospheric problems: getting above the air makes blocked bands (X-ray, gamma, most UV, much IR) observable; the absence of turbulence lets the telescope reach its diffraction limit continuously instead of being seeing-limited; and removing airglow, scattered moonlight, and atmospheric thermal emission gives a far darker background for faint-object work.',
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'What primarily caps the maximum aperture of a space telescope?',
                  options: [
                    { id: 'a', text: 'The diffraction limit prevents large mirrors from working in space' },
                    { id: 'b', text: 'The size that fits in a rocket fairing (which is why JWST\'s 6.5 m mirror had to fold for launch)' },
                    { id: 'c', text: 'Mirrors cannot be made larger than about 3 m anywhere' },
                    { id: 'd', text: 'There is no gravity in space to hold a large mirror together' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'The diffraction limit actually improves with a larger mirror; it is not a cap. Larger space apertures are desirable, just hard to launch.',
                    b: 'Correct — a space telescope must fit inside a rocket\'s fairing, so Hubble\'s 2.4 m was sized to the Shuttle bay and JWST\'s 6.5 m had to be built as folding segments that deployed in space.',
                    c: 'Ground telescopes already exceed 8 m and 30–40 m are being built; the ~3 m figure is not a physical mirror limit.',
                    d: 'Lack of gravity does not prevent large mirrors; if anything it eases some support issues. The constraint is launch volume/mass.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'Why does JWST orbit the Sun-Earth L2 point and carry a giant sunshield, keeping its mirror below ~50 K?',
                  options: [
                    { id: 'a', text: 'To be close to Earth for easy servicing' },
                    { id: 'b', text: 'As an infrared telescope, it must stay extremely cold or its own heat would glow in the infrared and swamp the faint signal; at L2 a single sunshield blocks the Sun, Earth, and Moon at once' },
                    { id: 'c', text: 'L2 is the only place with no sunlight at all' },
                    { id: 'd', text: 'To be closer to distant galaxies it observes' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'L2 is ~1.5 million km away and canNOT be serviced; that is the opposite of Hubble\'s serviceable low Earth orbit.',
                    b: 'Correct — an infrared telescope that is warm glows in its own band, so JWST must stay very cold; at L2 the Sun, Earth, and Moon lie in nearly the same direction, so one sunshield can block all three, letting the mirror cool passively below ~50 K.',
                    c: 'L2 is sunlit; the sunshield is what creates the cold, dark environment, not an absence of sunlight there.',
                    d: '1.5 million km is negligible compared to intergalactic distances; proximity to galaxies is not the reason.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q4',
                  prompt: 'A student\'s target is a bright, nearby optical variable star. Based on the space-versus-ground trade, what is the best-justified choice?',
                  options: [
                    { id: 'a', text: 'A space telescope, because space is always sharper and better' },
                    { id: 'b', text: 'A ground telescope, because the target radiates in an unblocked band and is bright, so the far cheaper ground platform is adequate' },
                    { id: 'c', text: 'A space X-ray telescope, to be safe' },
                    { id: 'd', text: 'It cannot be observed at all without JWST' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Space is not "always better" — it is far costlier, aperture-capped, and unserviceable; for a bright optical target it is unjustified overkill.',
                    b: 'Correct — a bright optical target is not in a blocked band, is bright enough that sky glow is not the limiter, and needs no extreme sharpness, so a modest, much cheaper ground telescope is the right, well-justified choice.',
                    c: 'An optical star is not an X-ray source of interest here, and choosing an X-ray mission for optical light is a wavelength mismatch.',
                    d: 'A bright optical star is easily observed from the ground; JWST is unnecessary and wrong for the band.',
                  },
                },
              ],
            },
          },
        ],
      },
      {
        id: 'astro-core-photometry',
        label: 'Photometry and Spectroscopy',
        lessons: [
          // ─── Lesson 1 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-phot-aperture-photometry',
            label: 'Aperture Photometry: Measuring Brightness',
            readingMinutes: 5,
            sections: [
              {
                heading: 'Counting photons in a circle',
                body: 'Aperture photometry is the workhorse method for measuring how bright a star is in an image. A CCD or CMOS detector records, in each pixel, a number of counts (also called ADU, analog-to-digital units) roughly proportional to the number of photons that landed there during the exposure. To measure a star you sum the counts inside a small circular aperture centered on it, then subtract the sky background — the diffuse glow from moonlight, airglow, and light pollution — estimated in an annulus (a ring) drawn around the star but outside its light. The background-subtracted sum is the star\'s instrumental flux. The key subtlety is that a star is not a point in the image: the atmosphere and telescope smear it into a blob called the point-spread function (PSF), typically a few arcseconds wide, whose width is the "seeing." A good aperture is wide enough to catch most of that blurred light but not so wide that it swallows extra sky noise or a neighboring star.',
              },
              {
                heading: 'The magnitude scale: logarithmic and backwards',
                body: 'Astronomers report brightness in magnitudes, a scale inherited from Hipparchus (2nd century BCE), who ranked naked-eye stars from 1st magnitude (brightest) to 6th (faintest). In 1856 Norman Pogson made it precise: a difference of 5 magnitudes is defined as exactly a factor of 100 in flux, so one magnitude step is the fifth root of 100 ≈ 2.512 in flux. Two features trip up newcomers. First, the scale is inverted — brighter objects have smaller (even negative) magnitudes; the Sun is about −26.7, Sirius −1.46, the faintest Hubble detections near +30. Second, it is logarithmic: m = −2.5·log10(F/F_ref). Because of the minus sign and the log, a star that is 2.5 magnitudes fainter than another is 10× fainter in flux (10^(2.5/2.5) = 10), and 5 magnitudes fainter is 100× fainter.',
              },
              {
                heading: 'Why the aperture and the noise both matter',
                body: 'The precision of a brightness measurement is limited by noise, and the dominant source for faint stars is photon (shot) noise, which follows Poisson statistics: if you collect N photons, the uncertainty is √N, so the signal-to-noise ratio (SNR) grows as √N. Doubling the exposure time quadratically improves... no — it collects twice the photons, improving SNR by √2. Sky background adds its own Poisson noise, which is why a large aperture over a bright sky can hurt: you add sky noise faster than star signal. This trade-off is why professional pipelines often fit the PSF model instead of using a fixed aperture, and why "curve-of-growth" analysis — plotting measured flux versus aperture radius until it plateaus — is used to pick the aperture that captures the star\'s total light with the least added noise.',
              },
            ],
            workedExample: 'You image two stars in the same frame. Star A is measured at 12,000 background-subtracted counts; Star B at 1,200 counts. Their flux ratio is 12,000 / 1,200 = 10. The magnitude difference is m_B − m_A = −2.5·log10(F_B/F_A) = −2.5·log10(1,200/12,000) = −2.5·log10(0.1) = −2.5·(−1) = +2.5. So Star B is 2.5 magnitudes fainter than Star A — consistent with the rule that a 10× flux drop equals 2.5 magnitudes. If Star A\'s known apparent magnitude is 9.00, then Star B is at 9.00 + 2.50 = 11.50 mag. Note we only got a magnitude *difference* from raw counts; turning it into a real apparent magnitude needed one star with a known catalog magnitude — the seed of calibration (Lesson 2).',
            judgeFraming: 'Judges press on brightness measurement because the magnitude scale is where confident-sounding students most often reveal a shallow understanding. A student who says "my target was magnitude 8, so it\'s dimmer than the magnitude-2 star" has it backwards; one who explains that magnitudes are inverted and logarithmic — and that they chose their aperture from a curve-of-growth to balance captured light against sky noise — signals they actually did photometry rather than eyeballing pixel values.',
            checkpoint: {
              questions: [
                {
                  kind: 'mc',
                  id: 'q1',
                  prompt: 'Star X has apparent magnitude 6.0 and Star Y has apparent magnitude 11.0. How do their fluxes compare?',
                  options: [
                    { id: 'a', text: 'Star X is 5 times brighter than Star Y' },
                    { id: 'b', text: 'Star X is 100 times brighter than Star Y' },
                    { id: 'c', text: 'Star Y is 100 times brighter than Star X' },
                    { id: 'd', text: 'They have equal flux; magnitude is just a label' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'This treats the magnitude difference as linear. A 5-magnitude difference is defined as exactly 100× in flux, not 5×.',
                    b: 'Correct — a difference of 5 magnitudes equals exactly a factor of 100 in flux (Pogson\'s definition), and the smaller magnitude (6.0) is the brighter star, so X is 100× brighter than Y.',
                    c: 'The direction is reversed: the scale is inverted, so the smaller magnitude (X at 6.0) is brighter, not fainter.',
                    d: 'Magnitude directly encodes flux logarithmically; a 5-magnitude gap is a real 100× flux difference.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'Why is the sky background estimated in an annulus around the star rather than assumed to be zero?',
                  options: [
                    { id: 'a', text: 'The annulus makes the star appear brighter' },
                    { id: 'b', text: 'Moonlight, airglow, and light pollution add counts to every pixel, including those inside the star aperture, and must be subtracted' },
                    { id: 'c', text: 'CCDs cannot record any signal without an annulus' },
                    { id: 'd', text: 'The annulus corrects for the inverted magnitude scale' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'The annulus is used to *subtract* background, which lowers the measured star counts, not raise them.',
                    b: 'Correct — every pixel carries a diffuse sky signal; the annulus samples that sky just outside the star so it can be subtracted from the aperture sum to isolate the star\'s own flux.',
                    c: 'CCDs record signal regardless; the annulus is an analysis step, not a hardware requirement.',
                    d: 'The magnitude scale\'s inversion is a definition, unrelated to background subtraction.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'A faint star yields 400 photons in its aperture. Approximately what is the photon-noise-limited signal-to-noise ratio?',
                  options: [
                    { id: 'a', text: 'About 400' },
                    { id: 'b', text: 'About 20' },
                    { id: 'c', text: 'About 2' },
                    { id: 'd', text: 'About 160,000' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'That would be the signal (N), not the SNR; noise is √N, so SNR = N/√N = √N, not N.',
                    b: 'Correct — for Poisson (shot) noise, SNR = N/√N = √N, and √400 = 20.',
                    c: 'That underestimates it; √400 = 20, not 2.',
                    d: 'That is N², not the SNR; SNR = √N = 20.',
                  },
                },
                {
                  kind: 'ordering',
                  id: 'q4',
                  prompt: 'Order the steps of aperture photometry on a single star.',
                  items: [
                    { id: 'center', text: 'Center a circular aperture on the star' },
                    { id: 'sum', text: 'Sum the counts inside the aperture' },
                    { id: 'sky', text: 'Estimate the sky level per pixel from the surrounding annulus' },
                    { id: 'subtract', text: 'Subtract the scaled sky from the aperture sum to get instrumental flux' },
                  ],
                  correctOrder: ['center', 'sum', 'sky', 'subtract'],
                  explanation: 'You first center the aperture on the star, sum the counts it contains, separately measure the per-pixel sky in the annulus, then subtract that sky (scaled to the aperture\'s pixel count) from the sum to recover the star\'s background-subtracted flux.',
                },
              ],
            },
          },

          // ─── Lesson 2 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-phot-calibration-standard-stars',
            label: 'Photometric Calibration and Standard Stars',
            readingMinutes: 5,
            sections: [
              {
                heading: 'From instrumental to apparent magnitude',
                body: 'The counts your detector records depend on your telescope\'s aperture, your filter, your exposure time, the detector\'s quantum efficiency, and the atmosphere — none of which another observer shares. So raw "instrumental magnitudes" (m_inst = −2.5·log10(counts/second)) are only internally comparable. To place a star on the standard system everyone else uses, you observe stars of known, catalogued magnitude in the same frame or same night and solve for the offset. The simplest relation is m_std = m_inst + ZP, where ZP (the zero point) folds together the telescope throughput and unit conventions. The zero point is essentially the instrumental magnitude a star of standard magnitude 0 would produce in one second — a single number that transfers your whole frame onto the real scale.',
              },
              {
                heading: 'Standard stars and photometric systems',
                body: 'Calibration rests on networks of standard stars whose magnitudes and colors have been measured painstakingly over decades. Arlo Landolt\'s equatorial standard-star fields (published across the 1970s–1990s) anchor the Johnson–Cousins UBVRI system, the most widely used broadband set: U (ultraviolet, ~365 nm), B (blue, ~445 nm), V (visual/green, ~551 nm), R (red), I (near-infrared). The Sloan Digital Sky Survey introduced its own ugriz system with different band edges. Two zero-point conventions coexist: the Vega system defines the star Vega to have magnitude ~0 in all bands, while the AB system (Oke) ties magnitudes to an absolute flux in physical units (its zero point was set so that a flat 3631-jansky source is AB = 0, fixed by Oke & Gunn 1983). A student must state which system they used — a V magnitude and an AB g magnitude are not interchangeable.',
              },
              {
                heading: 'Airmass and atmospheric extinction',
                body: 'The atmosphere dims starlight, and it dims it more when the star is lower in the sky because the light traverses more air. This path length is quantified by airmass X, which is ≈1 at the zenith (straight up) and ≈sec(z) for a zenith angle z, so a star 60° from the zenith has X ≈ 2. Extinction follows m_observed = m_true + k·X, where k is the extinction coefficient (magnitudes lost per unit airmass, larger in bluer bands because blue light scatters more — the same Rayleigh scattering that reddens sunsets). Serious calibration observes standards across a range of airmasses to fit k, then extrapolates each measurement to "above the atmosphere" (X = 0). Ignoring extinction can bias magnitudes by several tenths — enough to ruin a variable-star light curve taken as the target sets toward the horizon.',
              },
            ],
            workedExample: 'You image a Landolt standard of known V = 11.20. In a 30-second exposure it yields 45,000 counts, so its instrumental magnitude is m_inst = −2.5·log10(45,000 / 30) = −2.5·log10(1,500) = −2.5·(3.176) = −7.94. The zero point is ZP = m_std − m_inst = 11.20 − (−7.94) = 19.14. Now your unknown target in the same frame gives 9,000 counts in 30 s: m_inst = −2.5·log10(9,000/30) = −2.5·log10(300) = −2.5·(2.477) = −6.19, so its calibrated V = m_inst + ZP = −6.19 + 19.14 = 12.95. If the target sat at airmass X = 1.8 with a V-band extinction k = 0.15 mag/airmass, correcting toward the standard\'s airmass matters — but if both stars share the frame at the same airmass, the extinction cancels in the differential comparison, one reason same-frame calibration is so robust.',
            judgeFraming: 'Judges ask "how do you know your magnitude is right?" to separate students who reported a number their software printed from those who understand it is a *transferred* measurement. The strong answer names a specific calibrator — "I used Landolt standard SA 104-428 in the same frame" — states the photometric system (Johnson V vs. Sloan g), and mentions handling airmass. A team that can\'t say what their magnitude is calibrated *against* has essentially reported instrumental counts dressed up as science.',
            checkpoint: {
              questions: [
                {
                  kind: 'mc',
                  id: 'q1',
                  prompt: 'Why can\'t you report a star\'s apparent magnitude directly from your raw instrumental counts without a standard star?',
                  options: [
                    { id: 'a', text: 'Counts are always exactly equal to magnitude' },
                    { id: 'b', text: 'Instrumental counts depend on your telescope, filter, exposure, and atmosphere, so they need a known reference to transfer onto the standard scale' },
                    { id: 'c', text: 'Raw counts are negative and cannot be logged' },
                    { id: 'd', text: 'Magnitudes only exist for stars brighter than the Sun' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Counts and magnitude are not equal; magnitude is −2.5·log of a flux ratio, and the conversion needs a zero point.',
                    b: 'Correct — instrumental counts are specific to your setup and sky; a standard star of known magnitude in the same conditions fixes the zero point that maps counts onto the universal scale.',
                    c: 'Counts are positive; the log is taken of counts per second, which is fine.',
                    d: 'Magnitudes are defined for every luminous object, far fainter than the Sun included.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'A star is observed at airmass X = 2 in a band with extinction coefficient k = 0.20 mag/airmass. How much fainter does the atmosphere make it appear compared to above the atmosphere?',
                  options: [
                    { id: 'a', text: '0.20 magnitudes' },
                    { id: 'b', text: '0.40 magnitudes' },
                    { id: 'c', text: '2.0 magnitudes' },
                    { id: 'd', text: '0.10 magnitudes' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'That is k for one airmass; here the star is at X = 2, so the loss is k·X = 0.20 × 2.',
                    b: 'Correct — extinction dims by k·X = 0.20 × 2 = 0.40 magnitudes.',
                    c: 'That confuses the airmass value (2) with the magnitude loss; the loss is k·X = 0.40.',
                    d: 'That would be k·X with X = 0.5; here X = 2, giving 0.40.',
                  },
                },
                {
                  kind: 'matching',
                  id: 'q3',
                  prompt: 'Match each calibration concept to its correct description.',
                  left: [
                    { id: 'zp', text: 'Zero point (ZP)' },
                    { id: 'airmass', text: 'Airmass (X)' },
                    { id: 'landolt', text: 'Landolt standards' },
                    { id: 'ab', text: 'AB magnitude system' },
                  ],
                  right: [
                    { id: 'offset', text: 'The additive offset converting instrumental to standard magnitude' },
                    { id: 'path', text: 'Relative atmospheric path length, ≈1 at zenith, ≈2 at 60° zenith angle' },
                    { id: 'catalog', text: 'Catalogued equatorial reference stars anchoring the UBVRI system' },
                    { id: 'flux', text: 'System tied to absolute flux, where a 3631-Jy source is magnitude 0' },
                  ],
                  correctPairs: [
                    ['zp', 'offset'],
                    ['airmass', 'path'],
                    ['landolt', 'catalog'],
                    ['ab', 'flux'],
                  ],
                  explanation: 'The zero point is the additive offset that maps instrumental to standard magnitudes; airmass is the relative atmospheric path length (≈1 overhead, ≈2 at 60° from zenith); Landolt standards are the catalogued reference stars anchoring UBVRI; the AB system ties magnitudes to absolute flux with 3631 Jy defined as AB = 0.',
                },
                {
                  kind: 'mc',
                  id: 'q4',
                  prompt: 'Extinction coefficients k are generally larger in the B (blue) band than in the R (red) band because:',
                  options: [
                    { id: 'a', text: 'Blue detectors are less sensitive' },
                    { id: 'b', text: 'Blue light is scattered more strongly by the atmosphere (Rayleigh scattering), the same effect that reddens sunsets' },
                    { id: 'c', text: 'Red stars are intrinsically brighter' },
                    { id: 'd', text: 'The magnitude scale is inverted' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Detector sensitivity is handled separately in the zero point; extinction is an atmospheric effect on the light itself.',
                    b: 'Correct — Rayleigh scattering scales steeply with wavelength (∝ λ⁻⁴), so shorter-wavelength blue light is scattered out of the beam more, giving larger k; the same physics reddens the low Sun at sunset.',
                    c: 'Intrinsic stellar brightness has nothing to do with per-airmass atmospheric extinction.',
                    d: 'The inversion of the magnitude scale is a definitional convention, unrelated to wavelength-dependent scattering.',
                  },
                },
              ],
            },
          },

          // ─── Lesson 3 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-phot-color-indices',
            label: 'Color Indices and What They Reveal',
            readingMinutes: 5,
            sections: [
              {
                heading: 'A color is a magnitude difference',
                body: 'A "color index" in astronomy is simply the difference between a star\'s magnitude measured in two filters, most commonly B − V (blue minus visual). Because magnitudes are logarithmic flux ratios, subtracting two of them gives the log of the *ratio* of blue to green flux — a measure of the slope of the star\'s spectrum, i.e. its color. And because the scale is inverted, a *smaller* (bluer) B − V means the star is relatively brighter in blue, hence hotter; a *larger* B − V means it is relatively brighter in red, hence cooler. Vega, an A0 star, is defined near B − V = 0.00; the Sun (a G2 star) sits at B − V ≈ 0.65; a cool red M dwarf can exceed B − V = 1.5. The power of a color is that it is a *difference*, so it is independent of distance — a hot star looks the same color whether it is near or far (before reddening), even though its apparent magnitude changes with distance.',
              },
              {
                heading: 'Color as a thermometer',
                body: 'To first order a star radiates like a blackbody, so its color encodes its surface temperature via the shape of the Planck curve (the peak-wavelength connection is Wien\'s law, Lesson 4). Empirically calibrated relations convert B − V to effective temperature; for example, B − V ≈ 0.65 corresponds to roughly 5,800 K (solar), while B − V ≈ 0.00 corresponds to about 10,000 K. This is why a two-filter photometric survey can estimate temperatures for millions of stars far too faint for spectroscopy — the ESA Gaia mission does exactly this at billion-star scale. Color is cheaper than a spectrum but coarser: it collapses the whole spectral energy distribution into one number and cannot see individual absorption lines.',
              },
              {
                heading: 'Reddening: the trap in every color measurement',
                body: 'Interstellar dust between us and a star scatters and absorbs blue light more than red — the same wavelength dependence as atmospheric extinction — so a star seen through dust looks both fainter and *redder* than it truly is. This "interstellar reddening" makes the observed B − V larger than the intrinsic value. The excess is the color excess, E(B−V) = (B−V)_observed − (B−V)_intrinsic, and total dust extinction in V is roughly A_V ≈ 3.1·E(B−V) for typical Milky Way dust (the ratio R_V ≈ 3.1). A team estimating temperature from color without correcting for reddening will systematically infer stars *cooler* than they are, especially toward the crowded, dusty Galactic plane. Distinguishing a genuinely cool red star from a hot star reddened by dust is a classic degeneracy that a single color cannot fully break.',
              },
            ],
            workedExample: 'You measure a star at B = 13.42 and V = 12.70 in the same calibrated frame. Its color index is B − V = 13.42 − 12.70 = +0.72 — slightly redder than the Sun\'s 0.65, suggesting a surface temperature a little below 5,800 K if there were no dust. But suppose independent evidence (its spectral type, or a reddening map) says the *intrinsic* color should be (B−V)_0 = 0.52. Then the color excess is E(B−V) = 0.72 − 0.52 = 0.20, implying V-band extinction A_V ≈ 3.1 × 0.20 = 0.62 magnitudes of dust dimming. Correcting, the star is intrinsically bluer (hotter) than the raw color implied, and 0.62 mag brighter in V than observed — a correction big enough to matter for any distance or luminosity you compute downstream.',
            judgeFraming: 'Judges probe color indices because "I measured the star\'s color to get its temperature" is a claim with a famous failure mode: interstellar reddening. A student who reports B − V and stops has done half the job; one who says "I checked a dust map, estimated E(B−V), and de-reddened before converting to temperature" shows they know a raw color can lie. The reddening-vs-cool-star degeneracy is exactly the kind of confound judges love to test, because it distinguishes rote measurement from physical reasoning.',
            checkpoint: {
              questions: [
                {
                  kind: 'mc',
                  id: 'q1',
                  prompt: 'Two stars are measured. Star P has B − V = 0.10 and Star Q has B − V = 1.30. Which is hotter, and why?',
                  options: [
                    { id: 'a', text: 'Star Q, because a larger B − V means hotter' },
                    { id: 'b', text: 'Star P, because a smaller (bluer) B − V means relatively more blue flux, indicating a hotter surface' },
                    { id: 'c', text: 'They are the same temperature; color says nothing about temperature' },
                    { id: 'd', text: 'Star Q, because it is brighter' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'This reverses the relation; a larger B − V means the star is relatively brighter in red, i.e. cooler, not hotter.',
                    b: 'Correct — a smaller/bluer B − V (Star P, 0.10) indicates relatively more blue flux and thus a hotter surface; Q at 1.30 is cool and red.',
                    c: 'Color is a direct temperature proxy through the blackbody spectral slope; it says a great deal about temperature.',
                    d: 'Color index is a magnitude *difference*, independent of overall brightness; B − V alone tells you nothing about which is brighter.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'Why is a color index (like B − V) independent of the star\'s distance (ignoring dust)?',
                  options: [
                    { id: 'a', text: 'Because distance does not affect brightness at all' },
                    { id: 'b', text: 'Because both filters\' apparent magnitudes dim by the same amount with distance, so the difference cancels' },
                    { id: 'c', text: 'Because color is measured in physical units, not magnitudes' },
                    { id: 'd', text: 'Because closer stars are always bluer' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Distance strongly affects apparent brightness via the inverse-square law; that is not the reason.',
                    b: 'Correct — moving a star farther dims B and V by the same number of magnitudes (the inverse-square law is achromatic), so the difference B − V is unchanged.',
                    c: 'A color index is precisely a difference of magnitudes, not a physical-unit quantity.',
                    d: 'Proximity does not change intrinsic color; that statement is false.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'Interstellar reddening causes an observed color index to be:',
                  options: [
                    { id: 'a', text: 'Smaller (bluer) than the intrinsic color' },
                    { id: 'b', text: 'Larger (redder) than the intrinsic color, because dust removes blue light more than red' },
                    { id: 'c', text: 'Unchanged, because dust affects all wavelengths equally' },
                    { id: 'd', text: 'Negative, always' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Reddening moves color the other way — toward redder (larger) values, not bluer.',
                    b: 'Correct — dust scatters/absorbs blue more than red, so it removes blue flux preferentially, making the observed B − V larger (redder) than intrinsic.',
                    c: 'Dust extinction is strongly wavelength-dependent (stronger in the blue); that is the whole cause of reddening.',
                    d: 'Color indices can be positive or negative; reddening simply increases the value, not forces a sign.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q4',
                  prompt: 'A star\'s observed color is B − V = 0.90 but its intrinsic color is 0.60. Using R_V = 3.1, estimate the V-band dust extinction A_V.',
                  options: [
                    { id: 'a', text: 'About 0.30 mag' },
                    { id: 'b', text: 'About 0.93 mag' },
                    { id: 'c', text: 'About 1.50 mag' },
                    { id: 'd', text: 'About 3.10 mag' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: '0.30 is the color excess E(B−V) = 0.90 − 0.60, not A_V; you still multiply by R_V.',
                    b: 'Correct — E(B−V) = 0.90 − 0.60 = 0.30, and A_V ≈ R_V·E(B−V) = 3.1 × 0.30 = 0.93 mag.',
                    c: 'That would require E(B−V) ≈ 0.48; here E(B−V) is 0.30, giving 0.93.',
                    d: 'That is R_V itself (the ratio), applied as if E(B−V) were 1.0; here E(B−V) = 0.30.',
                  },
                },
              ],
            },
          },

          // ─── Lesson 4 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-phot-building-reading-spectrum',
            label: 'Building and Reading a Spectrum',
            readingMinutes: 6,
            sections: [
              {
                heading: 'Dispersing light into a spectrum',
                body: 'A spectrum is starlight spread out by wavelength so you can see how much energy arrives at each color. A prism does this by refraction; a diffraction grating — the modern workhorse — does it by interference from thousands of finely ruled lines, obeying the grating equation d·sin θ = m·λ, where d is the line spacing, θ the diffraction angle, m the order, and λ the wavelength. The result is a plot of flux (or counts) versus wavelength. Its "resolving power" R = λ/Δλ measures how finely it separates close wavelengths: a low-resolution R ≈ 100 school spectrograph can show broad features and the continuum shape, while R ≈ 40,000 professional echelle spectrographs resolve individual narrow lines and their velocity shifts. You cannot see a feature narrower than your resolution — a real limit on what a given instrument can claim.',
              },
              {
                heading: 'Continuum, emission lines, and absorption lines',
                body: 'Kirchhoff\'s three laws (1859) organize what you see. A hot dense object (like a star\'s deep interior seen through its photosphere) emits a smooth continuum — a near-blackbody curve. A hot thin gas emits light only at discrete wavelengths, producing bright emission lines (a neon sign, a nebula). A cool thin gas in front of a continuum source absorbs those same discrete wavelengths, producing dark absorption lines. A stellar spectrum is mostly the third case: the continuum from the dense photosphere, crossed by dark absorption lines where cooler gas in the star\'s upper atmosphere removed photons at the transition energies of its atoms. Each line sits at a wavelength set by quantum energy levels — the hydrogen Balmer series (Hα at 656.3 nm, Hβ at 486.1 nm), the sodium D doublet near 589 nm, ionized calcium H and K near 393–397 nm — so the *pattern* of lines fingerprints which elements and ions are present.',
              },
              {
                heading: 'The temperature clue in the continuum: Wien\'s law',
                body: 'Before reading individual lines, the overall *shape* of the continuum already gives temperature. A blackbody\'s spectrum peaks at a wavelength set by Wien\'s displacement law: λ_max · T = 2.898 × 10⁻³ m·K (i.e. 2.898 × 10⁶ nm·K). Hotter stars peak at shorter (bluer) wavelengths; cooler stars peak in the red or infrared. The Sun (5,772 K) peaks near 502 nm, in the green — a nice reminder that "peak" and "perceived color" differ, since the Sun looks white/yellow. Wien\'s law is the physical engine behind the color-temperature link of Lesson 3: the same rising-then-falling Planck curve that shifts B − V also shifts the spectral peak. Reading a spectrum thus works on two levels at once — the smooth continuum for temperature, and the sharp lines for composition and motion.',
              },
              {
                heading: 'Doppler shift: lines that move',
                body: 'The wavelengths of spectral lines are laboratory constants, so any shift of a whole line pattern encodes motion along the line of sight. The non-relativistic Doppler relation is Δλ/λ_rest = v/c, where v is the radial velocity (positive = receding = redshift, toward longer wavelength; negative = approaching = blueshift). This is how Vera Rubin measured galaxy rotation, how exoplanets are found by the wobble they induce on their star, and how cosmological redshift reveals the expanding universe. For distant galaxies the redshift z ≡ Δλ/λ_rest becomes large and the full relativistic formula is needed, but for stars and nearby motions the simple ratio holds. Crucially, a Doppler shift moves the *whole* line pattern together, which is how it is distinguished from a change in composition (which would move or add individual lines).',
              },
            ],
            workedExample: 'You take a spectrum of a star and find the hydrogen Hα line, whose rest wavelength is 656.28 nm, appears instead at 656.50 nm. The shift is Δλ = 656.50 − 656.28 = +0.22 nm. The radial velocity is v = c·(Δλ/λ_rest) = (3.00 × 10⁵ km/s) × (0.22 / 656.28) = (3.00 × 10⁵) × (3.35 × 10⁻⁴) ≈ +100 km/s. The positive sign (line shifted to longer wavelength) means redshift — the star is receding at about 100 km/s. Separately, if this star\'s continuum peaks at λ_max ≈ 580 nm, Wien\'s law gives T = 2.898 × 10⁶ nm·K / 580 nm ≈ 5,000 K, cooler than the Sun. Two independent facts — a recession velocity and a temperature — from one spectrum: shift for motion, continuum shape for temperature.',
            judgeFraming: 'Judges lean on spectra because they force the distinction between the two things a spectrum tells you: the continuum shape (temperature) and the line positions (composition and velocity). A student who confuses "the star is red" (a color/temperature statement) with "the lines are redshifted" (a motion statement) reveals a fundamental gap. Being able to say "I got temperature from the continuum peak via Wien\'s law and velocity from the Hα line shift" demonstrates a student reads a spectrum on both levels rather than as a single squiggle.',
            checkpoint: {
              questions: [
                {
                  kind: 'matching',
                  id: 'q1',
                  prompt: 'Match each Kirchhoff-law scenario to the spectrum it produces.',
                  left: [
                    { id: 'dense', text: 'Hot, dense object (stellar photosphere continuum)' },
                    { id: 'thingas', text: 'Hot, thin gas (an emission nebula)' },
                    { id: 'coolfront', text: 'Cool thin gas in front of a continuum source' },
                  ],
                  right: [
                    { id: 'continuum', text: 'A smooth, near-blackbody continuum' },
                    { id: 'emission', text: 'Bright emission lines at discrete wavelengths' },
                    { id: 'absorption', text: 'Dark absorption lines cut into a continuum' },
                  ],
                  correctPairs: [
                    ['dense', 'continuum'],
                    ['thingas', 'emission'],
                    ['coolfront', 'absorption'],
                  ],
                  explanation: 'Kirchhoff\'s laws: a hot dense body emits a smooth continuum; a hot thin gas emits bright discrete emission lines; a cool thin gas in front of a continuum source absorbs those same wavelengths, producing dark absorption lines — the dominant case in stellar spectra.',
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'A star\'s continuum peaks at λ_max ≈ 290 nm. Using Wien\'s law (λ_max·T = 2.898 × 10⁶ nm·K), what is its approximate surface temperature?',
                  options: [
                    { id: 'a', text: 'About 5,000 K' },
                    { id: 'b', text: 'About 10,000 K' },
                    { id: 'c', text: 'About 100,000 K' },
                    { id: 'd', text: 'About 2,900 K' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: '5,000 K would peak near 580 nm; a 290 nm peak is far bluer and hotter.',
                    b: 'Correct — T = 2.898 × 10⁶ nm·K / 290 nm ≈ 10,000 K, a hot blue-white star peaking in the ultraviolet.',
                    c: 'That would require a peak near 29 nm (extreme UV); 290 nm gives ~10,000 K.',
                    d: 'That inverts the relation; a cool 2,900 K star peaks around 1,000 nm (infrared), not 290 nm.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'The Hβ line (rest 486.1 nm) is observed at 485.4 nm. What does this indicate?',
                  options: [
                    { id: 'a', text: 'The star is receding (redshift)' },
                    { id: 'b', text: 'The star is approaching (blueshift), moving toward us along the line of sight' },
                    { id: 'c', text: 'The star has lost its hydrogen' },
                    { id: 'd', text: 'The spectrograph resolution is too low to say anything' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'A shift to *shorter* wavelength (486.1 → 485.4 nm) is a blueshift, the opposite of redshift/recession.',
                    b: 'Correct — the line moved to shorter wavelength (Δλ = −0.7 nm), a blueshift, meaning the star approaches us; v = c·Δλ/λ ≈ −430 km/s.',
                    c: 'The line is still present, just shifted; a shift is about motion, not composition.',
                    d: 'A 0.7 nm shift on a 486 nm line is easily measurable at modest resolution; the shift is real and interpretable.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q4',
                  prompt: 'What distinguishes a Doppler shift from a change in the star\'s chemical composition in a spectrum?',
                  options: [
                    { id: 'a', text: 'A Doppler shift changes the continuum peak but never the lines' },
                    { id: 'b', text: 'A Doppler shift moves the entire line pattern together by the same fractional amount, whereas composition changes add, remove, or alter individual lines' },
                    { id: 'c', text: 'A Doppler shift only affects emission lines, never absorption lines' },
                    { id: 'd', text: 'There is no way to tell them apart' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'A Doppler shift moves the lines (by Δλ/λ = v/c) as well as the continuum; it does not leave lines untouched.',
                    b: 'Correct — a radial velocity shifts every line by the same fractional Δλ/λ, preserving the pattern, while composition changes alter which lines are present or how strong they are.',
                    c: 'The Doppler effect shifts both emission and absorption lines equally; it is not selective.',
                    d: 'They are readily distinguished: a uniform pattern-wide shift is motion; a change in specific lines is composition.',
                  },
                },
              ],
            },
          },

          // ─── Lesson 5 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-phot-spectral-classification-obafgkm',
            label: 'Spectral Classification: The OBAFGKM Sequence',
            readingMinutes: 6,
            sections: [
              {
                heading: 'From alphabet soup to a temperature sequence',
                body: 'Stellar spectra are sorted into classes O, B, A, F, G, K, M — a sequence of decreasing surface temperature. The odd ordering is historical: Williamina Fleming and colleagues at Harvard first classified stars A, B, C… by the strength of their hydrogen lines. Antonia Maury and especially Annie Jump Cannon (who classified over 350,000 stellar spectra by eye) reordered and merged the classes into the temperature sequence we use, and it was Cecilia Payne-Gaposchkin\'s 1925 PhD thesis that showed the *reason*: the changing line strengths reflect temperature-driven ionization, not composition — stars are overwhelmingly hydrogen and helium. Each class is subdivided 0–9 (the Sun is G2), and the classic mnemonic "Oh Be A Fine Guy/Girl, Kiss Me" preserves the order. O stars exceed ~30,000 K and glow blue; M stars are ~2,500–3,900 K and glow red.',
              },
              {
                heading: 'Why the same element makes different lines at different temperatures',
                body: 'The great insight of the sequence is that a spectral class is set by *temperature*, not by which elements a star contains. Hydrogen (Balmer) absorption lines are strongest around class A (~9,000–10,000 K): hotter O/B stars have so much energy that hydrogen is largely ionized (no electron to absorb Balmer photons), while cooler K/M stars have too few atoms in the n=2 level needed to absorb Balmer lines. So hydrogen lines peak in the middle and fade both ways — a purely temperature effect governed by the Saha ionization equation and Boltzmann level populations. Hotter stars instead show lines of ionized helium (He II, only in O stars); cooler stars show neutral metals and, in the coolest M stars, broad molecular bands of titanium oxide (TiO) that only survive at low temperature. Reading which lines are strong is therefore reading temperature.',
              },
              {
                heading: 'Luminosity class: the second dimension',
                body: 'Temperature alone does not pin a star on the Hertzsprung–Russell diagram, because two stars of the same temperature can differ enormously in size and luminosity — a red giant versus a red dwarf are both "M" but one is thousands of times more luminous. The Morgan–Keenan (MK) system adds a Roman-numeral luminosity class from I (supergiants) through III (giants) to V (main-sequence dwarfs). The clue is line *width*: a dwarf\'s dense, high-pressure atmosphere broadens lines through pressure (collisional) broadening, while a giant\'s tenuous, low-gravity atmosphere yields narrow, sharp lines. So the Sun\'s full type is G2V — a G2 (temperature) main-sequence (luminosity) star — and Betelgeuse is M2Ia, a cool red supergiant. Two letters/numbers thus locate a star in both temperature and size.',
              },
            ],
            workedExample: 'You are handed three spectra to classify. Spectrum 1 shows strong He II absorption and a continuum peaking in the ultraviolet — only the hottest stars singly ionize helium (producing He II lines), so this is an O star, T > 30,000 K. Spectrum 2 shows the strongest hydrogen Balmer lines of the three and weak metal lines, with a continuum peaking near 300 nm — hydrogen lines peak near class A, so this is roughly A0, T ≈ 10,000 K (Wien: 2.898 × 10⁶ / 300 ≈ 9,700 K in the continuum, consistent with an A0 star peaking in the near-ultraviolet). Spectrum 3 shows broad TiO molecular bands and a red continuum — molecules survive only in cool atmospheres, so this is an M star, T ≈ 3,000 K. Ordered hottest to coolest: O (Spectrum 1), A (Spectrum 2), M (Spectrum 3) — the OBAFGKM logic applied from line diagnostics alone.',
            judgeFraming: 'Judges test spectral classification because the deepest, most Nobel-adjacent idea in stellar spectroscopy is counterintuitive: the classes track temperature, not composition (Payne-Gaposchkin). A student who says "class M stars are made of different stuff than class O stars" has missed the entire point; one who explains that hydrogen lines peak at class A because ionization and level populations are temperature-driven — and who can add a luminosity class from line width — shows genuine command of why the spectral sequence exists.',
            checkpoint: {
              questions: [
                {
                  kind: 'ordering',
                  id: 'q1',
                  prompt: 'Order these spectral classes from HOTTEST to COOLEST surface temperature.',
                  items: [
                    { id: 'o', text: 'O (blue, He II lines)' },
                    { id: 'a', text: 'A (strong hydrogen Balmer lines)' },
                    { id: 'g', text: 'G (Sun-like, many metal lines)' },
                    { id: 'm', text: 'M (red, TiO molecular bands)' },
                  ],
                  correctOrder: ['o', 'a', 'g', 'm'],
                  explanation: 'The OBAFGKM sequence runs from hottest to coolest: O (>30,000 K), then A (~10,000 K), then G (~5,800 K, solar), then M (~3,000 K). B, F, and K fall between them; here O > A > G > M.',
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'Hydrogen Balmer absorption lines are strongest in class A stars (~10,000 K) rather than in the much hotter O stars. Why?',
                  options: [
                    { id: 'a', text: 'O stars contain no hydrogen' },
                    { id: 'b', text: 'In O stars hydrogen is largely ionized, so few atoms remain to absorb Balmer photons; class A hits the temperature that best populates the absorbing level' },
                    { id: 'c', text: 'Balmer lines are an instrumental artifact absent in hot stars' },
                    { id: 'd', text: 'O stars are too far away to show lines' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'O stars are mostly hydrogen like other stars; the difference is ionization state, not abundance.',
                    b: 'Correct — Balmer absorption needs neutral hydrogen with electrons in the n=2 level; O stars ionize hydrogen away, cool stars under-populate n=2, so line strength peaks at the intermediate temperature of class A.',
                    c: 'Balmer lines are real atomic transitions, not artifacts; they are genuinely weaker in O stars due to ionization.',
                    d: 'Distance affects brightness, not the relative strength of lines within a spectrum.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'Cecilia Payne-Gaposchkin\'s key 1925 discovery from stellar spectra was that:',
                  options: [
                    { id: 'a', text: 'Different spectral classes are made of chemically different material' },
                    { id: 'b', text: 'The spectral sequence reflects temperature-driven ionization, and stars are overwhelmingly hydrogen and helium' },
                    { id: 'c', text: 'Stars are made mostly of iron, like the Earth' },
                    { id: 'd', text: 'Spectral lines are caused by the Doppler effect only' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'This is the misconception she overturned; the classes differ in temperature, not bulk composition.',
                    b: 'Correct — Payne-Gaposchkin showed the varying line strengths across OBAFGKM are an ionization/temperature effect, and that hydrogen and helium vastly dominate stellar composition.',
                    c: 'Stars are dominated by hydrogen and helium, not iron; the terrestrial analogy is wrong for stars.',
                    d: 'Absorption lines arise from atomic transitions; the Doppler effect only shifts their positions, it does not create them.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q4',
                  prompt: 'In the MK system, two stars are both class M, but one is labeled M2Ia (supergiant) and the other M2V (dwarf). What spectral clue most directly separates the luminosity classes?',
                  options: [
                    { id: 'a', text: 'The color of the continuum' },
                    { id: 'b', text: 'The width of the spectral lines — dwarfs show pressure-broadened (wider) lines, giants/supergiants show narrow, sharp lines' },
                    { id: 'c', text: 'The presence of hydrogen' },
                    { id: 'd', text: 'The star\'s apparent magnitude' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Both are M2, so their continuum colors (temperatures) are essentially the same; color cannot separate them.',
                    b: 'Correct — line width encodes atmospheric pressure/gravity: a dwarf\'s dense high-gravity atmosphere pressure-broadens lines, while a supergiant\'s tenuous low-gravity atmosphere gives narrow lines.',
                    c: 'Both M stars contain hydrogen; its presence does not distinguish luminosity class.',
                    d: 'Apparent magnitude depends on distance and is not a direct spectroscopic luminosity-class indicator.',
                  },
                },
              ],
            },
          },

          // ─── Lesson 6 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-phot-raw-frames-bias-dark-flat',
            label: 'From Raw Frames to Calibrated Data (Bias, Dark, Flat)',
            readingMinutes: 5,
            sections: [
              {
                heading: 'What a raw frame actually contains',
                body: 'A raw image off a CCD or CMOS sensor is not clean starlight — it is starlight plus several instrumental signals stacked on top. There is a bias: a fixed electronic offset added to every pixel so the readout never goes negative. There is dark current: thermally generated electrons that accumulate over time even with the shutter closed, worse when the sensor is warm (which is why research cameras are cooled). There is flat-field response: pixels differ in sensitivity, the optics vignette (dim toward the edges), and dust on the window casts doughnut-shaped shadows, so a uniformly lit scene does not read uniformly. And there is read noise, added fresh each time the chip is read out. Calibration is the disciplined removal of the first three (which are repeatable) so that what remains is proportional to the true sky.',
              },
              {
                heading: 'Bias, dark, and flat frames — and the order that matters',
                body: 'Each additive/multiplicative artifact is measured with its own calibration frame. A bias frame is a zero-second exposure capturing the offset (and read noise) alone. A dark frame is a shutter-closed exposure of the *same duration and temperature* as your science image, capturing bias plus dark current. A flat frame is an image of a uniformly illuminated surface (twilight sky or an illuminated panel) capturing the pixel-to-pixel and optical response. The reduction has a required order because the effects combine differently: you *subtract* the (bias-and-dark) signal — additive contamination — then *divide* by the normalized flat — multiplicative response. Getting this backwards, e.g. dividing before subtracting the dark, propagates the dark current through the flat and corrupts the result.',
              },
              {
                heading: 'The master-frame recipe and why stacking helps',
                body: 'Because every frame carries random read and shot noise, you never calibrate with a single bias/dark/flat — you take many (often 10–30) and median-combine them into a "master" frame. Medianing rejects cosmic-ray hits and lowers the calibration noise by roughly √N, so a master flat from 16 flats has ~4× less noise than one flat. The canonical formula for a calibrated science pixel is: calibrated = (raw − master_dark) / (master_flat_normalized), where the master dark already contains the bias (so a separate bias subtraction is folded in when darks match the science exposure time). The same median-stacking idea then applies to the science frames themselves: aligning and stacking many exposures of a faint target beats down noise and reveals detail no single sub-exposure shows — the reason deep astrophotos are hours of stacked subframes, not one long shot.',
              },
            ],
            workedExample: 'Consider one pixel. Your raw science frame reads 2,450 ADU there. Your master dark (matched exposure and temperature, bias included) reads 210 ADU at that pixel. Subtracting gives 2,450 − 210 = 2,240 ADU of real signal-plus-sky. Now the flat: your master flat, normalized to a mean of 1.0, reads 0.80 at this pixel (it sits in a vignetted, slightly dust-shadowed region that receives 80% of average illumination). Dividing corrects for that lost sensitivity: calibrated = 2,240 / 0.80 = 2,800 ADU. Had you skipped the flat, you would have under-counted this star by 20% — and had you divided by the flat *before* subtracting the dark, you would have computed 2,450/0.80 − 210 = 2,853 ADU, wrongly propagating the dark through the flat. Order matters: subtract the additive dark, then divide by the multiplicative flat.',
            judgeFraming: 'Judges ask about calibration frames because it is the clearest line between an astrophotography hobby snapshot and a measurement. "I took bias, dark, and flat frames and reduced in that order" tells a judge the student knows their raw pixels contain instrument signature, not pure sky. The order — subtract darks (additive), then divide by flats (multiplicative) — and the reason for median-stacking many calibration frames are exactly the specifics a judge probes to see whether a team understands *why* each step is done, not just that a software wizard did it.',
            checkpoint: {
              questions: [
                {
                  kind: 'ordering',
                  id: 'q1',
                  prompt: 'Order the standard CCD reduction steps applied to a raw science frame.',
                  items: [
                    { id: 'masters', text: 'Median-combine many bias/dark/flat frames into master calibration frames' },
                    { id: 'subdark', text: 'Subtract the master dark (bias included) from the raw science frame' },
                    { id: 'divflat', text: 'Divide the dark-subtracted frame by the normalized master flat' },
                    { id: 'stack', text: 'Align and stack the calibrated science subframes' },
                  ],
                  correctOrder: ['masters', 'subdark', 'divflat', 'stack'],
                  explanation: 'First build low-noise master calibration frames by median-combining many exposures; then subtract the additive master dark; then divide by the multiplicative normalized flat; finally align and stack the calibrated science frames to beat down noise.',
                },
                {
                  kind: 'matching',
                  id: 'q2',
                  prompt: 'Match each calibration frame to the instrumental artifact it removes.',
                  left: [
                    { id: 'bias', text: 'Bias frame (zero-second exposure)' },
                    { id: 'dark', text: 'Dark frame (shutter closed, matched exposure/temp)' },
                    { id: 'flat', text: 'Flat frame (uniform illumination)' },
                  ],
                  right: [
                    { id: 'offset', text: 'Fixed electronic readout offset' },
                    { id: 'thermal', text: 'Thermally generated dark current accumulated over the exposure' },
                    { id: 'response', text: 'Pixel-to-pixel sensitivity, vignetting, and dust shadows' },
                  ],
                  correctPairs: [
                    ['bias', 'offset'],
                    ['dark', 'thermal'],
                    ['flat', 'response'],
                  ],
                  explanation: 'The bias frame captures the fixed electronic offset; the dark frame (matched in time and temperature) captures thermal dark current; the flat frame captures multiplicative optical/sensor response — pixel sensitivity variations, vignetting, and dust shadows.',
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'Why must you SUBTRACT the dark but DIVIDE by the flat, rather than treating both the same way?',
                  options: [
                    { id: 'a', text: 'It is an arbitrary convention with no physical basis' },
                    { id: 'b', text: 'Dark current and bias are additive contamination (extra counts added), while the flat encodes a multiplicative sensitivity factor, so each is undone by the inverse operation' },
                    { id: 'c', text: 'Because the flat frame is always brighter than the dark frame' },
                    { id: 'd', text: 'Because subtraction and division give the same answer anyway' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'The operations follow directly from the physics of how each artifact combines with the signal; they are not arbitrary.',
                    b: 'Correct — dark and bias add a fixed number of counts to each pixel (removed by subtraction), while the flat scales each pixel\'s response multiplicatively (removed by division by the normalized flat).',
                    c: 'Relative brightness of the frames is irrelevant; the operation is set by whether the artifact adds or multiplies.',
                    d: 'Subtraction and division give very different results; using the wrong one corrupts the calibration.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q4',
                  prompt: 'A team median-combines 16 dark frames into a master dark instead of using a single dark. The main benefit is:',
                  options: [
                    { id: 'a', text: 'It increases the dark current so it is easier to see' },
                    { id: 'b', text: 'It lowers the calibration noise by roughly √16 = 4× and rejects cosmic-ray hits' },
                    { id: 'c', text: 'It changes the exposure time of the science frame' },
                    { id: 'd', text: 'It eliminates the need for flat frames' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Combining frames averages down noise; it does not (and should not) increase the dark-current signal you are trying to remove.',
                    b: 'Correct — median-combining N frames reduces random read/shot noise by roughly √N (√16 = 4×) and the median rejects transient cosmic-ray spikes.',
                    c: 'The science-frame exposure time is set at capture and is unaffected by how you combine darks.',
                    d: 'Darks and flats remove different artifacts (additive vs. multiplicative); a master dark never replaces flats.',
                  },
                },
              ],
            },
          },
        ],
      },
      {
        id: 'astro-core-plots',
        label: 'Reading the Diagnostic Plots',
        lessons: [
          // ─── Lesson 1 — The Hertzsprung-Russell Diagram ─────────────────────────
          {
            id: 'astronomy-core-plots-hr-diagram',
            label: 'The Hertzsprung-Russell Diagram',
            readingMinutes: 6,
            sections: [
              {
                heading: 'A scatter plot that became the periodic table of stars',
                body: 'Around 1910-1913, working independently, the Danish astronomer Ejnar Hertzsprung and the American Henry Norris Russell each plotted stars with luminosity (intrinsic brightness) on the vertical axis against spectral type or temperature on the horizontal axis — and discovered that stars do not fill the plane at random. Instead they crowd onto a few narrow regions. Roughly 90% of nearby stars fall on a diagonal band running from hot-and-bright (top left) to cool-and-faint (bottom right) called the main sequence. Above and to the right sit the giants and supergiants (cool but very luminous, so they must be enormous), and down at the bottom left a sparse population of hot-but-faint white dwarfs. The H-R diagram is the single most important diagnostic plot in stellar astrophysics: where a star sits encodes its mass, its evolutionary stage, and often its age.',
              },
              {
                heading: 'Reading the axes correctly — temperature runs backwards',
                body: 'Two axis conventions trip up every beginner. First, the temperature axis is plotted hot-on-the-left, cool-on-the-right — the reverse of a normal number line — a historical accident of ordering the spectral classes O, B, A, F, G, K, M (hottest to coolest, roughly 30,000 K down to 3,000 K). Second, the brightness axis is usually absolute magnitude, which is logarithmic AND inverted: smaller (even negative) magnitudes are brighter, and each 5 magnitudes is a factor of exactly 100 in luminosity (so one magnitude is a factor of 100^(1/5) ~ 2.512). So the intuitive "up and to the left is powerful, hot stars" only works once you internalize that both axes run opposite to naive expectation. When luminosity is plotted directly in solar units it spans an enormous range — the main sequence alone covers roughly 10^-4 to 10^6 solar luminosities — which is why the vertical axis is logarithmic.',
              },
              {
                heading: 'Why the main sequence exists — and why position means mass',
                body: 'The main sequence is not a track a star slides along; it is the locus of stars in the long, stable core-hydrogen-burning phase of their lives, which is where stars spend ~90% of their existence (hence 90% of stars are found there at any snapshot). A star\'s position along the main sequence is set almost entirely by its mass: a 20-solar-mass O star sits hot and luminous at the top, a 0.3-solar-mass M dwarf sits cool and dim at the bottom. Because luminosity scales steeply with mass (roughly L proportional to M^3.5 on the upper main sequence), massive stars are prodigiously bright and burn out fast, while low-mass red dwarfs sip their fuel for hundreds of billions of years. When a star exhausts core hydrogen it leaves the main sequence, swelling into the giant branch — the physical basis for using cluster diagrams to measure ages, covered in the next lesson.',
              },
            ],
            workedExample: 'You measure a star to be about the same temperature as the Sun (a G-type star, ~5,800 K) but find it is 100 times more luminous than the Sun. On the H-R diagram, same temperature means the same horizontal position as the Sun, but 100x luminosity places it 5 magnitudes higher on the vertical axis — well ABOVE the main sequence. That off-main-sequence position at solar temperature is the signature of a giant. You can even estimate its size: luminosity L = 4*pi*R^2 * sigma*T^4, and since T matches the Sun, L proportional to R^2. So R = sqrt(100) = 10 solar radii. A star at the Sun\'s temperature but 100x brighter must be about 10 times the Sun\'s radius — a red-giant-scale object, not a main-sequence star.',
            judgeFraming: 'Judges ask students to point to where their star sits on an H-R diagram because it instantly reveals whether they understand what luminosity, temperature, and radius have to do with each other. A student who can say "same temperature but far brighter than the main sequence means it must be physically bigger — a giant" has grasped the Stefan-Boltzmann link (L ~ R^2 T^4). The classic tell of confusion is a student who reads the inverted axes backwards and calls a hot blue star "cool" or a bright star "high magnitude" — getting the sign of the magnitude scale wrong is the fastest way to lose a judge\'s confidence.',
            checkpoint: {
              questions: [
                {
                  kind: 'mc',
                  id: 'q1',
                  prompt: 'On a standard H-R diagram, where do the hottest, most luminous stars appear?',
                  options: [
                    { id: 'a', text: 'Bottom right' },
                    { id: 'b', text: 'Top left' },
                    { id: 'c', text: 'Top right' },
                    { id: 'd', text: 'Bottom left' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Bottom right is where cool, faint stars (red dwarfs) sit — the opposite corner.',
                    b: 'Correct — the temperature axis runs hot-on-the-left, and luminosity increases upward, so hot-and-luminous stars are in the top-left corner.',
                    c: 'Top right is high luminosity but cool temperature — that is where giants and supergiants live, not the hottest stars.',
                    d: 'Bottom left is hot but faint — the white-dwarf region, not the most luminous stars.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'Two stars have the same temperature, but star A is 100 times more luminous than star B. How do their radii compare?',
                  options: [
                    { id: 'a', text: 'Star A has 100 times the radius of star B' },
                    { id: 'b', text: 'Star A has 10 times the radius of star B' },
                    { id: 'c', text: 'The radii are equal, since temperature is the same' },
                    { id: 'd', text: 'Star A has 1/10 the radius of star B' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'This treats L as proportional to R, but luminosity goes as R^2 at fixed temperature, so a 100x luminosity ratio is only a 10x radius ratio.',
                    b: 'Correct — with L = 4*pi*R^2*sigma*T^4 and equal T, L is proportional to R^2, so R_A/R_B = sqrt(100) = 10.',
                    c: 'Equal temperature fixes the horizontal position, but luminosity still depends on surface area (radius), so a brighter star at the same T must be bigger.',
                    d: 'This has the relationship inverted; the more luminous star at equal temperature must be larger, not smaller.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'Why are roughly 90% of stars found on the main sequence at any given moment?',
                  options: [
                    { id: 'a', text: 'The main sequence is where stars are born and they never leave it' },
                    { id: 'b', text: 'Core hydrogen burning is the longest, most stable phase of a star\'s life, so most stars are caught in it' },
                    { id: 'c', text: 'Only massive stars can leave the main sequence, and massive stars are rare' },
                    { id: 'd', text: 'Instruments are biased toward detecting main-sequence stars' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Stars do leave the main sequence when they exhaust core hydrogen and become giants; it is not a permanent home.',
                    b: 'Correct — stars spend about 90% of their lifetimes fusing hydrogen in their cores, so a snapshot of a population catches most of them in that phase.',
                    c: 'All stars eventually leave the main sequence; it is not restricted to massive stars, and the 90% figure is about time spent, not detectability.',
                    d: 'The dominance of the main sequence is physical (time spent in that phase), not an instrumental selection effect.',
                  },
                },
                {
                  kind: 'matching',
                  id: 'q4',
                  prompt: 'Match each region of the H-R diagram to the stars found there.',
                  left: [
                    { id: 'ms', text: 'Main sequence' },
                    { id: 'giants', text: 'Upper right' },
                    { id: 'wd', text: 'Lower left' },
                  ],
                  right: [
                    { id: 'coreH', text: 'Core-hydrogen-burning stars, ~90% of all stars' },
                    { id: 'bigcool', text: 'Cool but very luminous — giants and supergiants' },
                    { id: 'hotfaint', text: 'Hot but faint, tiny dense remnants — white dwarfs' },
                  ],
                  correctPairs: [
                    ['ms', 'coreH'],
                    ['giants', 'bigcool'],
                    ['wd', 'hotfaint'],
                  ],
                  explanation: 'The diagonal main sequence is the core-hydrogen-burning band holding ~90% of stars; the upper-right region holds cool-but-luminous (therefore large) giants and supergiants; the lower-left holds hot-but-faint white dwarfs, which are hot because they are exposed cores but faint because they are Earth-sized.',
                },
              ],
            },
          },

          // ─── Lesson 2 — Color-Magnitude Diagrams and Dating Star Clusters ───────
          {
            id: 'astronomy-core-plots-cmd-cluster-ages',
            label: 'Color-Magnitude Diagrams and Dating Star Clusters',
            readingMinutes: 6,
            sections: [
              {
                heading: 'The observer\'s H-R diagram: color instead of temperature',
                body: 'Astronomers rarely take a spectrum of every star in a field — it is far cheaper to image the same stars through two filters (say blue B and visual V) and measure the difference in magnitude, the color index B-V. Because a hot star radiates relatively more blue light and a cool star more red, B-V is a clean proxy for temperature: a hot O/B star has B-V near -0.3, the Sun near +0.65, a cool M star near +1.4. Plotting apparent magnitude (vertical, inverted as always) against B-V (horizontal) gives a color-magnitude diagram (CMD) — the practical, photometric cousin of the H-R diagram. For a star CLUSTER this is especially powerful: every star sits at essentially the same distance, so apparent magnitude differences are real luminosity differences, and no distance correction is needed to see the shape.',
              },
              {
                heading: 'The main-sequence turnoff is a clock',
                body: 'All the stars in a cluster formed at roughly the same time out of the same cloud, so they share an age and composition but span a huge range of masses. Massive stars burn out fastest, so as a cluster ages the top of its main sequence "peels off" from the hot end downward: the most massive stars leave first, then progressively lower-mass stars. The point where the cluster\'s main sequence bends toward the giant branch — the main-sequence turnoff — corresponds to the mass of star just now exhausting its core hydrogen. Because stellar lifetime is a known function of mass (roughly t proportional to M/L ~ M^-2.5, so lifetime falls steeply with mass), the turnoff mass tells you the cluster\'s age. A young open cluster like the Pleiades (~100 million years) still has hot blue stars near the top; an ancient globular cluster like M13 (~12 billion years) has turned off all the way down to ~0.8 solar masses, leaving only a stubby main sequence below a prominent giant branch.',
              },
              {
                heading: 'Isochrones and what the method assumes',
                body: 'In practice astronomers overlay theoretical isochrones — model curves showing where stars of a single age but many masses should lie on the CMD — and slide them until one matches the observed turnoff and giant branch. The best-fit isochrone age is the cluster\'s age. The method is only as good as its assumptions: it requires that the stars really are coeval and chemically uniform, and it needs corrections for reddening (interstellar dust makes stars look redder and fainter, shifting them down and to the right) and for metallicity (metal-poor stars sit slightly bluer and to the left). Globular-cluster ages derived this way are how we set a hard lower bound on the age of the universe: the oldest clusters come out around 12-13 billion years, consistent with — and historically a check on — the ~13.8-billion-year age from cosmology.',
              },
            ],
            workedExample: 'You image two clusters. Cluster A\'s main sequence extends up to B-V ~ -0.2 (hot blue stars still present); Cluster B\'s hottest surviving main-sequence stars are at B-V ~ +0.6, similar to the Sun. Which is older? In Cluster B, every star more massive than roughly a solar mass has already left the main sequence and died — that takes billions of years, since a 1-solar-mass star lives ~10 billion years. In Cluster A, stars far more massive than the Sun still survive on the main sequence; a star at B-V ~ -0.2 might be ~5 solar masses with a lifetime of only ~100 million years, so the cluster must be YOUNGER than that. Cluster A is roughly 10^8 years old; Cluster B is roughly 10^10 years old — a hundredfold age difference read straight off the turnoff color, with no distance measurement required.',
            judgeFraming: 'Judges love asking "how do you know how old a star cluster is?" because the honest answer — the main-sequence turnoff — forces a student to connect stellar mass, lifetime, and the CMD in one breath. The confident answer is "the higher (bluer/hotter) the turnoff, the younger the cluster, because only a young cluster still has its short-lived massive stars." A weak answer treats age as something you just look up, or confuses the turnoff (an age clock) with the tip of the giant branch (a distance/luminosity marker). Bonus credit goes to a student who names reddening or metallicity as a correction that must be applied first.',
            checkpoint: {
              questions: [
                {
                  kind: 'mc',
                  id: 'q1',
                  prompt: 'What does the color index B-V primarily tell you about a star?',
                  options: [
                    { id: 'a', text: 'Its distance from Earth' },
                    { id: 'b', text: 'Its surface temperature' },
                    { id: 'c', text: 'Its chemical age' },
                    { id: 'd', text: 'Its rotational speed' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Distance affects apparent magnitude (how bright it looks), not the color index, which compares brightness in two filters at the same distance.',
                    b: 'Correct — hot stars are relatively brighter in blue (smaller/negative B-V) and cool stars relatively brighter in red (larger positive B-V), so B-V is a temperature proxy.',
                    c: 'Color reflects temperature, not age directly; age is inferred at the cluster level from the turnoff, not from a single star\'s color.',
                    d: 'Rotation has only subtle effects on broadband color; B-V is dominated by temperature.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'A cluster whose main-sequence turnoff is at a hotter (bluer) color than another cluster is:',
                  options: [
                    { id: 'a', text: 'Older, because hot stars live longest' },
                    { id: 'b', text: 'Younger, because it still retains short-lived massive stars on the main sequence' },
                    { id: 'c', text: 'The same age but closer to Earth' },
                    { id: 'd', text: 'Older, because bluer means more evolved' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Hot massive stars live the SHORTEST lives, so a hot turnoff means young, not old.',
                    b: 'Correct — a bluer/hotter turnoff means massive, short-lived stars are still burning hydrogen, which only happens in a young cluster.',
                    c: 'Distance affects apparent brightness, not turnoff color; the turnoff color is a genuine age indicator.',
                    d: 'Bluer at the turnoff means the massive stars have NOT yet evolved off, i.e. younger.',
                  },
                },
                {
                  kind: 'ordering',
                  id: 'q3',
                  prompt: 'Order these steps for estimating a cluster\'s age from a color-magnitude diagram.',
                  items: [
                    { id: 'photo', text: 'Photometer every star through two filters and compute B-V and apparent magnitude' },
                    { id: 'correct', text: 'Correct the data for reddening (dust) and adopt a metallicity' },
                    { id: 'plot', text: 'Plot the CMD and locate the main-sequence turnoff' },
                    { id: 'iso', text: 'Overlay theoretical isochrones and read off the best-fit age' },
                  ],
                  correctOrder: ['photo', 'correct', 'plot', 'iso'],
                  explanation: 'You first measure two-filter photometry to get colors and magnitudes, then correct for dust reddening and set the metallicity, then plot the CMD and find the turnoff, and finally fit isochrones to convert the turnoff into an age.',
                },
                {
                  kind: 'mc',
                  id: 'q4',
                  prompt: 'Why is a star cluster an ideal target for a color-magnitude diagram?',
                  options: [
                    { id: 'a', text: 'All the stars have the same mass' },
                    { id: 'b', text: 'All the stars are at essentially the same distance, so apparent-magnitude differences are real luminosity differences' },
                    { id: 'c', text: 'Clusters contain only main-sequence stars' },
                    { id: 'd', text: 'Clusters are close enough to measure parallax for every star' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Cluster stars share an age and composition but span a wide range of masses — that mass spread is exactly what makes the turnoff useful.',
                    b: 'Correct — a common distance means you can compare apparent magnitudes directly without individual distance corrections, so the CMD shape is physically meaningful.',
                    c: 'Clusters contain giants and (in old clusters) white dwarfs too; that is part of why the diagram is informative.',
                    d: 'Most clusters are far too distant for per-star parallax; the common-distance advantage does not depend on parallax.',
                  },
                },
              ],
            },
          },

          // ─── Lesson 3 — Light Curves: Variables, Eclipses, and Transits ─────────
          {
            id: 'astronomy-core-plots-light-curves',
            label: 'Light Curves: Variables, Eclipses, and Transits',
            readingMinutes: 5,
            sections: [
              {
                heading: 'Brightness versus time — the shape carries the physics',
                body: 'A light curve plots an object\'s brightness (flux or magnitude) against time. Its SHAPE, not just its average, is the data: a smooth sinusoid, a sharp periodic dip, a slow sawtooth, and a single explosive spike each point to a different physical cause. Because you can measure the brightness of a point of light very precisely and repeatedly, light curves are one of the highest-information, lowest-cost tools in astronomy — a backyard telescope with a CCD can produce a publishable one. The three families a student is most likely to meet are intrinsic variables (the star itself pulsates or erupts), eclipsing binaries (two stars periodically block each other), and exoplanet transits (a planet crosses its star).',
              },
              {
                heading: 'Eclipsing binaries: two dips, two stars',
                body: 'When two stars orbit in a plane nearly edge-on to us, each passes in front of the other once per orbit, producing a light curve with two dips per cycle. The deeper (primary) minimum occurs when the hotter star is hidden behind the cooler one — you lose more light blocking the hot star\'s bright surface. Algol (Beta Persei) is the textbook case: every 2.87 days it drops by more than a magnitude over roughly ten hours as its dimmer companion eclipses the bright primary; ancient observers noticed the "Demon Star" winking and Goodricke correctly proposed an eclipsing companion in 1783. Eclipsing binaries are precious because the eclipse timing and depth, combined with the stars\' velocities, let you solve for stellar masses and radii directly — some of the only model-independent stellar masses we have.',
              },
              {
                heading: 'Transits: a tiny box-shaped dip',
                body: 'An exoplanet transit is a shallow, flat-bottomed, U- or box-shaped dip repeating on the planet\'s orbital period. The depth is the key number: the fractional drop in brightness equals the ratio of areas, (R_planet / R_star)^2. A Jupiter-sized planet (~1/10 the Sun\'s radius) crossing a Sun-like star dims it by about (0.1)^2 = 1%, while an Earth-sized planet dims it by only ~(0.009)^2 ~ 0.008%, or 84 parts per million — which is why detecting Earth analogs needs space photometry as precise as Kepler\'s. The transit method has found the majority of known exoplanets. Crucially it gives the planet\'s SIZE (from depth) and orbital period (from spacing), but not its mass — for that you need the radial-velocity method of the next lesson, and combining the two yields the planet\'s density.',
              },
            ],
            workedExample: 'A ground-based telescope monitors a Sun-like star and records a repeating 1.0% dip lasting a few hours every 3.5 days. Read the physics straight off the curve: depth = (R_p/R_star)^2 = 0.010, so R_p/R_star = sqrt(0.010) = 0.10. With R_star ~ 1 solar radius ~ 7.0e5 km, the planet\'s radius is ~7.0e4 km — essentially Jupiter (R_Jup ~ 7.1e4 km). The 3.5-day repeat is the orbital period. So from a single brightness-vs-time plot you have found a hot Jupiter: a Jupiter-sized planet on a 3.5-day orbit. What you CANNOT get is its mass — the transit tells you how big it is and how often it orbits, but you need a radial-velocity follow-up to weigh it and decide whether it is a puffy gas giant or a dense object.',
            judgeFraming: 'Judges ask "what does the depth of your transit tell you, and what does it NOT tell you?" to check that a student understands the (R_p/R_star)^2 relationship and its limits. The strong answer nails the ratio-of-areas and immediately adds "depth gives size, not mass — I would need radial velocities to get mass and hence density." Students often overclaim, announcing they "discovered a planet" and its properties from a single dip; a judge will press on how they ruled out an eclipsing binary or a starspot, and whether they folded multiple transits to confirm the period.',
            checkpoint: {
              questions: [
                {
                  kind: 'mc',
                  id: 'q1',
                  prompt: 'A planet transiting its star produces a 1% dip in brightness. What is the ratio of the planet\'s radius to the star\'s radius?',
                  options: [
                    { id: 'a', text: '0.01' },
                    { id: 'b', text: '0.10' },
                    { id: 'c', text: '0.5' },
                    { id: 'd', text: '1.0' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: '0.01 is the depth itself; the radius ratio is the square root of the depth, not the depth.',
                    b: 'Correct — transit depth = (R_p/R_star)^2, so R_p/R_star = sqrt(0.01) = 0.10.',
                    c: '0.5 would give a depth of 0.25 (25%), an enormous eclipse, not a 1% planetary transit.',
                    d: 'A ratio of 1.0 would mean the planet is as big as the star and would block all its light, not 1%.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'What can a transit light curve alone NOT determine about a planet?',
                  options: [
                    { id: 'a', text: 'Its orbital period' },
                    { id: 'b', text: 'Its radius relative to the star' },
                    { id: 'c', text: 'Its mass' },
                    { id: 'd', text: 'How often it passes in front of the star' },
                  ],
                  answerId: 'c',
                  explanations: {
                    a: 'The period is read directly from the spacing between repeated dips.',
                    b: 'The radius ratio comes from the transit depth, sqrt(depth).',
                    c: 'Correct — a transit gives size and period but not mass; you need radial velocities (the star\'s wobble) to weigh the planet.',
                    d: 'That IS the orbital period, which the light curve gives directly.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'In an eclipsing binary, why is the primary (deeper) minimum usually deeper than the secondary?',
                  options: [
                    { id: 'a', text: 'The larger star is being eclipsed' },
                    { id: 'b', text: 'The hotter, brighter star is being blocked, so more light is lost' },
                    { id: 'c', text: 'The stars are closest together at that moment' },
                    { id: 'd', text: 'Interstellar dust absorbs more light at that phase' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'It is about surface brightness (temperature), not size — blocking the hotter surface removes more flux per unit area.',
                    b: 'Correct — the deeper minimum occurs when the hotter star is hidden, because its high surface brightness means covering it removes the most light.',
                    c: 'Orbital separation does not change the eclipse depth in this way; depth is set by which surface is covered.',
                    d: 'Dust is not the cause; the depth difference is intrinsic to which star is eclipsed.',
                  },
                },
                {
                  kind: 'matching',
                  id: 'q4',
                  prompt: 'Match each light-curve shape to its cause.',
                  left: [
                    { id: 'twodips', text: 'Two dips of different depth per period' },
                    { id: 'box', text: 'A single shallow flat-bottomed dip, repeating' },
                    { id: 'spike', text: 'A one-time sharp rise then slow fade' },
                  ],
                  right: [
                    { id: 'eb', text: 'Eclipsing binary (two stars alternately eclipse)' },
                    { id: 'transit', text: 'Exoplanet transit' },
                    { id: 'nova', text: 'A nova or supernova eruption' },
                  ],
                  correctPairs: [
                    ['twodips', 'eb'],
                    ['box', 'transit'],
                    ['spike', 'nova'],
                  ],
                  explanation: 'Two unequal dips per cycle are the signature of an eclipsing binary (each star eclipses the other); a single shallow flat-bottomed repeating dip is a planetary transit; a one-time sharp brightening followed by a fade is an eruptive event such as a nova or supernova.',
                },
              ],
            },
          },

          // ─── Lesson 4 — Radial-Velocity Curves and Orbits ───────────────────────
          {
            id: 'astronomy-core-plots-radial-velocity',
            label: 'Radial-Velocity Curves and Orbits',
            readingMinutes: 6,
            sections: [
              {
                heading: 'The Doppler wobble: turning a spectrum into a velocity',
                body: 'A star with an orbiting companion does not sit still — both bodies orbit their common center of mass, so the star traces a small circle and its line-of-sight velocity oscillates. We cannot see the wobble as motion, but we can measure it through the Doppler effect: when the star moves toward us its spectral lines shift to shorter (bluer) wavelengths, and when it moves away they shift redder. The shift is delta-lambda / lambda_rest = v / c for speeds far below light. Plotting that inferred radial velocity against time gives a radial-velocity curve — for a circular orbit, a clean sinusoid. Its PERIOD is the orbital period, and its AMPLITUDE (the semi-amplitude K, half the peak-to-trough swing) encodes how hard the companion is tugging the star, and hence the companion\'s mass.',
              },
              {
                heading: 'What the curve measures — and the sin i ambiguity',
                body: 'The 1995 discovery of 51 Pegasi b by Michel Mayor and Didier Queloz (Nobel Prize 2019) was a radial-velocity detection: a Sun-like star wobbling by ~59 m/s every 4.2 days, revealing a Jupiter-mass planet skimming its star. But radial velocity has a fundamental limit — it only senses the line-of-sight component of the star\'s motion. If the orbit is tilted by inclination i to our line of sight, we see only v*sin(i), so the method yields M*sin(i), a LOWER limit on the companion\'s mass, not the mass itself. A face-on orbit (i near 0) produces no radial-velocity signal at all. This is exactly why radial velocity and transits are such a powerful pair: a transiting planet must be seen nearly edge-on (i near 90 degrees, so sin i near 1), which pins down the inclination and turns the radial-velocity M*sin(i) into a true mass — and combined with the transit radius, a density.',
              },
              {
                heading: 'The shape of the curve tells you the orbit shape',
                body: 'A perfectly circular orbit gives a symmetric sine wave. An eccentric (elongated) orbit distorts it into a skewed, sawtooth-like curve, because the star whips through periastron (closest approach) fast and dawdles through apastron. Reading eccentricity off the curve shape matters: many of the first "hot Jupiters" and later planets showed surprisingly eccentric orbits, which challenged models that assumed planets form on near-circular paths and forced theorists to invoke planet-planet scattering and migration. The same technique scales up: measuring the radial-velocity amplitudes of BOTH stars in a double-lined spectroscopic binary gives their mass ratio directly, and with an inclination from eclipses you recover both stellar masses — the gold-standard route to fundamental stellar masses.',
              },
            ],
            workedExample: 'A spectral line with rest wavelength lambda_rest = 656.30 nm (hydrogen-alpha) is seen to oscillate, reaching a maximum redshift of lambda_obs = 656.3013 nm at one phase. The shift is delta-lambda = 0.0013 nm, so the line-of-sight speed is v = c * (delta-lambda/lambda) = (3.0e5 km/s) * (0.0013 / 656.30) = 3.0e5 * 1.98e-6 ~ 0.59 km/s = 590 m/s. If the trough is a symmetric blueshift of equal size, the semi-amplitude K ~ 590 m/s. A wobble of hundreds of m/s on a Sun-like star is far too large for a planet — it points to a stellar or brown-dwarf companion. (For contrast, 51 Peg b\'s planet produced only ~59 m/s, ten times smaller.) And remember: whatever mass you derive is M*sin(i), a lower bound, unless a transit or eclipse fixes the inclination.',
            judgeFraming: 'Judges probe the radial-velocity method with "so you measured the mass?" precisely to see whether a student knows it is M*sin(i) — a lower limit — not the mass. The sophisticated answer explains that only the line-of-sight velocity is observable, so an unknown orbital tilt leaves a sin i degeneracy, and that a transit (edge-on geometry) is what removes it. A student who quotes a definite planet mass from radial velocity alone, with no mention of inclination, has missed the single most important caveat of the technique — and a judge will catch it.',
            checkpoint: {
              questions: [
                {
                  kind: 'mc',
                  id: 'q1',
                  prompt: 'A star\'s spectral lines shift redward. What is the star doing at that moment?',
                  options: [
                    { id: 'a', text: 'Moving toward us along the line of sight' },
                    { id: 'b', text: 'Moving away from us along the line of sight' },
                    { id: 'c', text: 'Moving across our line of sight (tangentially)' },
                    { id: 'd', text: 'Heating up' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Motion toward us produces a blueshift (shorter wavelengths), not a redshift.',
                    b: 'Correct — recession stretches the wavelengths to the red, with delta-lambda/lambda = v/c.',
                    c: 'Purely tangential motion produces no first-order Doppler shift; only the line-of-sight component shifts the lines.',
                    d: 'Temperature broadens and changes line strengths but does not systematically shift line centers the way bulk motion does.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'Why does the radial-velocity method yield only M*sin(i), a lower limit on the companion mass?',
                  options: [
                    { id: 'a', text: 'Because the spectrograph is not precise enough to get the true mass' },
                    { id: 'b', text: 'Because only the line-of-sight component of the star\'s velocity is observable, so an unknown orbital inclination scales the signal by sin(i)' },
                    { id: 'c', text: 'Because the star\'s own mass is unknown' },
                    { id: 'd', text: 'Because redshift and blueshift partially cancel' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'The limit is geometric, not instrumental; even a perfect spectrograph sees only the line-of-sight velocity.',
                    b: 'Correct — we measure v*sin(i), so the derived mass is M*sin(i); the true mass is larger unless the inclination is known.',
                    c: 'The host star\'s mass is estimated separately (e.g. from its spectral type); it is not the source of the sin i degeneracy.',
                    d: 'Redshift and blueshift are the two halves of the oscillation and define the amplitude; they do not cancel the inclination effect.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'A spectral line at rest wavelength 656.30 nm is observed at 656.3013 nm at maximum. What is the approximate line-of-sight speed? (c = 3.0e5 km/s)',
                  options: [
                    { id: 'a', text: 'About 0.06 km/s' },
                    { id: 'b', text: 'About 0.6 km/s' },
                    { id: 'c', text: 'About 6 km/s' },
                    { id: 'd', text: 'About 60 km/s' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'This is ten times too small; delta-lambda/lambda = 0.0013/656.30 ~ 2.0e-6, giving ~0.6 km/s.',
                    b: 'Correct — v = c * (delta-lambda/lambda) = 3.0e5 * (0.0013/656.30) ~ 3.0e5 * 2.0e-6 ~ 0.6 km/s.',
                    c: 'This is ten times too large; check the ratio 0.0013/656.30 ~ 2.0e-6, not 2.0e-5.',
                    d: 'Off by a factor of 100; recompute delta-lambda/lambda carefully.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q4',
                  prompt: 'Combining a transit with a radial-velocity curve is powerful because:',
                  options: [
                    { id: 'a', text: 'The transit gives the mass and the radial velocity gives the radius' },
                    { id: 'b', text: 'The transit fixes the near-edge-on inclination (sin i ~ 1), converting the radial-velocity M*sin(i) into a true mass, and together they yield density' },
                    { id: 'c', text: 'Both methods measure the same quantity, so the result is more precise' },
                    { id: 'd', text: 'The transit removes the need to know the star\'s distance' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'It is the reverse: the transit gives the radius (from depth) and the radial velocity gives the mass (once inclination is known).',
                    b: 'Correct — a transiting system is nearly edge-on, so sin i ~ 1 turns M*sin(i) into a real mass, and mass plus transit radius gives the planet\'s density.',
                    c: 'They measure complementary quantities (radius vs mass), not the same one; the power is in combining different information.',
                    d: 'Distance is not the issue; the synergy is about breaking the inclination degeneracy and getting density.',
                  },
                },
              ],
            },
          },

          // ─── Lesson 5 — Galaxy Rotation Curves ──────────────────────────────────
          {
            id: 'astronomy-core-plots-rotation-curves',
            label: 'Galaxy Rotation Curves',
            readingMinutes: 6,
            sections: [
              {
                heading: 'Orbital speed versus radius — what Newton predicts',
                body: 'A galaxy rotation curve plots the orbital speed of gas and stars against their distance from the galactic center. Newtonian gravity makes a sharp prediction for the outer galaxy, where most of the VISIBLE mass (the bright central bulge and disk) lies interior to the orbit: just as the outer planets move slower than the inner ones, a test object at radius r should orbit with v = sqrt(G*M(<r)/r). Once you are outside the bulk of the luminous matter, M(<r) stops growing much, so the speed should fall off as v proportional to 1/sqrt(r) — a Keplerian decline. That is the null hypothesis every rotation curve tests.',
              },
              {
                heading: 'The curves are flat — the evidence for dark matter',
                body: 'They do not decline. In galaxy after galaxy the rotation curve rises in the inner region and then stays FLAT far beyond the visible edge — orbital speeds of ~200 km/s persisting where Kepler predicted a fall. Vera Rubin and Kent Ford established this in the 1970s using optical spectra of spiral galaxies, and 21-cm radio observations of neutral hydrogen extended the flat curves even further out. A flat curve means v is constant, so from v = sqrt(G*M(<r)/r) the enclosed mass must keep GROWING linearly with radius, M(<r) proportional to r, even where there is almost no light. The inescapable conclusion: galaxies are embedded in massive, roughly spherical halos of unseen "dark" matter that outweighs the stars several-fold. Rotation curves are the cleanest single-galaxy evidence for dark matter, complementing gravitational lensing and the cosmic microwave background.',
              },
              {
                heading: 'The competing interpretation, and why the plot is decisive',
                body: 'Not everyone reads the flat curve as new matter. Modified Newtonian Dynamics (MOND), proposed by Mordehai Milgrom in 1983, instead tweaks the law of gravity at very low accelerations so that flat curves emerge without dark matter, and it fits many individual galaxy rotation curves impressively well with a single tuned constant. The mainstream view still favors dark matter, because it also explains galaxy-cluster dynamics, lensing, structure formation, and the CMB — arenas where MOND struggles — but rotation curves remain the arena where MOND is most competitive, which is why the debate is worth understanding rather than dismissing. Either way, the DATA is not in dispute: the curves are flat, and any correct physics must reproduce that flatness. That is the mark of a great diagnostic plot — its shape constrains theories regardless of interpretation.',
              },
            ],
            workedExample: 'Suppose all of a galaxy\'s mass were in its luminous inner region. A cloud of hydrogen orbits at r1 = 10 kpc with speed v1 = 200 km/s. Newton then predicts the speed at r2 = 40 kpc (four times farther, outside the mass) as v proportional to 1/sqrt(r): v2 = v1 * sqrt(r1/r2) = 200 * sqrt(10/40) = 200 * sqrt(0.25) = 200 * 0.5 = 100 km/s. So a purely luminous galaxy should show the gas at 40 kpc orbiting at only ~100 km/s. But real 21-cm observations find it still moving at ~200 km/s. To hold gas at 200 km/s out at 40 kpc, the enclosed mass must be four times what it was at 10 kpc (since M proportional to v^2 * r and v is unchanged) — yet there is little extra light out there. That missing factor of four is the gravitational fingerprint of the dark-matter halo.',
            judgeFraming: 'Judges bring up rotation curves to see whether a student can distinguish DATA from INTERPRETATION. The strong move is to state the Keplerian prediction (v should fall as 1/sqrt(r) beyond the light), report that observed curves are flat instead, and only THEN name dark matter as the leading explanation — while acknowledging MOND as a live alternative on this particular plot. A student who blurts "dark matter" as if the plot directly shows it, without the Newtonian prediction it violates, has skipped the reasoning that makes the evidence compelling — and a sharp judge will ask "compared to what did you expect?"',
            checkpoint: {
              questions: [
                {
                  kind: 'mc',
                  id: 'q1',
                  prompt: 'For orbits outside most of a galaxy\'s visible mass, what does simple Newtonian gravity predict for how orbital speed changes with radius?',
                  options: [
                    { id: 'a', text: 'Speed stays constant (a flat curve)' },
                    { id: 'b', text: 'Speed falls off as 1/sqrt(r), a Keplerian decline' },
                    { id: 'c', text: 'Speed increases without limit' },
                    { id: 'd', text: 'Speed falls off as 1/r' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'A flat curve is what is OBSERVED, and it is exactly what Newton with only visible matter does NOT predict.',
                    b: 'Correct — with enclosed mass roughly constant outside the light, v = sqrt(GM/r) declines as 1/sqrt(r).',
                    c: 'Speed should decrease, not increase, once you are beyond the bulk of the mass.',
                    d: 'The dependence is 1/sqrt(r), not 1/r; v goes as the square root of M/r.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'Observed rotation curves stay flat at large radii. What must the enclosed mass M(<r) do to keep v constant?',
                  options: [
                    { id: 'a', text: 'Stay constant with radius' },
                    { id: 'b', text: 'Grow linearly with radius, M proportional to r' },
                    { id: 'c', text: 'Decrease with radius' },
                    { id: 'd', text: 'Grow as r^2' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'If M stayed constant, v would fall as 1/sqrt(r); constant M cannot produce a flat curve.',
                    b: 'Correct — from v = sqrt(GM/r), holding v constant requires M proportional to r, so mass keeps accumulating with radius even where there is no light.',
                    c: 'Decreasing mass would make v fall even faster, the opposite of a flat curve.',
                    d: 'M proportional to r^2 would make v rise as sqrt(r); flatness requires exactly M proportional to r.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'Gas at 10 kpc orbits at 200 km/s. If a galaxy had only its luminous inner mass, what speed does Newton predict at 40 kpc?',
                  options: [
                    { id: 'a', text: '200 km/s' },
                    { id: 'b', text: '100 km/s' },
                    { id: 'c', text: '400 km/s' },
                    { id: 'd', text: '50 km/s' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: '200 km/s is what is actually OBSERVED (the flat curve); it is not the Newtonian prediction for a purely luminous galaxy.',
                    b: 'Correct — v proportional to 1/sqrt(r), so v = 200 * sqrt(10/40) = 200 * 0.5 = 100 km/s.',
                    c: 'Speed should drop with radius, not double; 400 km/s is going the wrong way.',
                    d: 'That would require v proportional to 1/r; the correct scaling is 1/sqrt(r), giving 100 km/s.',
                  },
                },
                {
                  kind: 'matching',
                  id: 'q4',
                  prompt: 'Match each item to its correct role in the rotation-curve story.',
                  left: [
                    { id: 'flat', text: 'The observed flat rotation curve' },
                    { id: 'dm', text: 'Dark-matter halo' },
                    { id: 'mond', text: 'MOND (Milgrom, 1983)' },
                  ],
                  right: [
                    { id: 'data', text: 'The DATA every theory must reproduce' },
                    { id: 'mainstream', text: 'The mainstream explanation: unseen mass in a halo' },
                    { id: 'alt', text: 'A competing explanation that modifies gravity at low acceleration' },
                  ],
                  correctPairs: [
                    ['flat', 'data'],
                    ['dm', 'mainstream'],
                    ['mond', 'alt'],
                  ],
                  explanation: 'The flat curve is the observation (the data) that any correct physics must reproduce; the dark-matter halo is the mainstream interpretation invoking unseen mass; MOND is the competing alternative that instead modifies Newtonian gravity at very low accelerations.',
                },
              ],
            },
          },

          // ─── Lesson 6 — The Period-Luminosity Relation and Standard Candles ─────
          {
            id: 'astronomy-core-plots-period-luminosity',
            label: 'The Period-Luminosity Relation and Standard Candles',
            readingMinutes: 6,
            sections: [
              {
                heading: 'Standard candles and the inverse-square law',
                body: 'The whole game of measuring cosmic distances rests on one idea: if you know an object\'s true luminosity L (a "standard candle"), you can get its distance from how bright it LOOKS, because flux dims with the square of distance, F = L / (4*pi*d^2). Solve for d and you have a distance. The nearest rung of the distance ladder needs no candle at all — trigonometric parallax measures the tiny annual shift in a star\'s position as Earth orbits the Sun, and by definition a star with a parallax of 1 arcsecond sits at 1 parsec (3.26 light-years); distance in parsecs = 1 / parallax in arcseconds. But parallax fades below usable precision past a few thousand parsecs even with Gaia, so to reach other galaxies you need a bright object of known luminosity — and the best one is a special pulsating star.',
              },
              {
                heading: 'Cepheids and Leavitt\'s law',
                body: 'In 1908-1912 Henrietta Swan Leavitt, studying thousands of Cepheid variable stars in the Small Magellanic Cloud at Harvard College Observatory, noticed that the brighter Cepheids pulsated more slowly: there is a tight relation between a Cepheid\'s pulsation PERIOD (days) and its intrinsic LUMINOSITY. Because all the stars she studied sat at essentially the same distance (the SMC), their apparent brightnesses ranked their true luminosities directly. This period-luminosity relation — Leavitt\'s law — is transformative: measure a Cepheid\'s period just by timing its light curve (periods of days to ~100 days), read off its true luminosity from the relation, compare to how bright it appears, and get its distance. Cepheids are luminous enough to be seen in nearby galaxies, so Leavitt\'s law is the rung that Edwin Hubble used in the 1920s to prove the "spiral nebulae" were external galaxies and, soon after, to establish that the universe is expanding.',
              },
              {
                heading: 'Building the ladder rung by rung',
                body: 'No single method spans the whole distance range, so cosmic distances are measured with a LADDER, each rung calibrated by the one below it. Parallax calibrates the true luminosities of nearby Cepheids and main-sequence stars. Cepheids then reach out to ~30 million parsecs and, crucially, calibrate the peak brightness of Type Ia supernovae found in the same galaxies. Type Ia supernovae — the thermonuclear detonation of a white dwarf near the Chandrasekhar mass of ~1.4 solar masses — all reach nearly the same peak luminosity, making them the brightest reliable standard candle, visible across billions of parsecs. They carry the ladder into the smooth Hubble flow, where recession velocity is proportional to distance (v = H0 * d), and it was Type Ia supernovae as standard candles that revealed in 1998 that the expansion is ACCELERATING (dark energy). Every rung inherits the uncertainties of the ones beneath it, which is why the ~1-parsec foundation of parallax being wrong would ripple all the way up.',
              },
            ],
            workedExample: 'Two ways to see the ladder in numbers. (1) Parallax: a star shows an annual parallax of p = 0.05 arcseconds. Its distance is d = 1/p = 1/0.05 = 20 parsecs (~65 light-years) — no candle needed, pure geometry. (2) Cepheid: you find a Cepheid in a distant galaxy with a 30-day period. Leavitt\'s law says a 30-day classical Cepheid has an absolute magnitude around M ~ -5.3 (very luminous — the standard V-band period-luminosity calibration puts a 30-day Cepheid near -5.3 to -5.5). You measure its apparent magnitude as m ~ +21. The distance modulus m - M = 21 - (-5.3) = 26.3, and distance follows from m - M = 5*log10(d/10 pc): 26.3 = 5*log10(d/10), so log10(d/10) = 5.26, d/10 = 10^5.26 ~ 1.82e5, giving d ~ 1.82e6 parsecs — about 1.8 megaparsecs, safely intergalactic and utterly beyond parallax\'s reach. The period, timed off a light curve, unlocked a distance a thousand times past the geometric rung.',
            judgeFraming: 'Judges ask "how would you actually measure the distance to that?" to see if a student knows which RUNG of the ladder applies and why you cannot use one tool everywhere. The impressive answer matches the object to the method — parallax for nearby stars, Cepheids for nearby galaxies, Type Ia supernovae for the far universe — and explains that each rung calibrates the next, so errors propagate upward. Naming Leavitt\'s law and the inverse-square/parallax formulas (d = 1/p; F = L/4*pi*d^2) signals real command. The weak answer treats "parallax" as a universal distance tool, unaware it runs out past a few kiloparsecs.',
            checkpoint: {
              questions: [
                {
                  kind: 'mc',
                  id: 'q1',
                  prompt: 'A star has a measured parallax of 0.05 arcseconds. How far away is it?',
                  options: [
                    { id: 'a', text: '0.05 parsecs' },
                    { id: 'b', text: '5 parsecs' },
                    { id: 'c', text: '20 parsecs' },
                    { id: 'd', text: '50 parsecs' },
                  ],
                  answerId: 'c',
                  explanations: {
                    a: 'This is the parallax value itself, not the distance; distance is the reciprocal.',
                    b: 'This would be the answer for a parallax of 0.2 arcsec; recompute 1/0.05.',
                    c: 'Correct — distance in parsecs = 1 / (parallax in arcseconds) = 1/0.05 = 20 parsecs.',
                    d: 'This inverts incorrectly; 1/0.05 = 20, not 50.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'Why is a Cepheid variable a useful standard candle?',
                  options: [
                    { id: 'a', text: 'All Cepheids have exactly the same brightness' },
                    { id: 'b', text: 'Its pulsation period reveals its true luminosity via Leavitt\'s period-luminosity law, so comparing true to apparent brightness gives a distance' },
                    { id: 'c', text: 'Cepheids are close enough to measure by parallax directly' },
                    { id: 'd', text: 'Cepheids do not change in brightness, making them easy to measure' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Cepheids span a range of luminosities; the point is that the PERIOD tells you which luminosity a given Cepheid has.',
                    b: 'Correct — timing the pulsation gives the period, Leavitt\'s law converts period to true luminosity, and the inverse-square law then gives distance.',
                    c: 'Most Cepheids useful for extragalactic distances are far beyond parallax range; that is exactly why the period-luminosity relation is needed.',
                    d: 'Cepheids DO vary in brightness — that pulsation, and its period, is the whole basis of the method.',
                  },
                },
                {
                  kind: 'ordering',
                  id: 'q3',
                  prompt: 'Order the rungs of the cosmic distance ladder from nearest/most direct to farthest.',
                  items: [
                    { id: 'parallax', text: 'Trigonometric parallax (nearby stars)' },
                    { id: 'cepheid', text: 'Cepheid period-luminosity relation (nearby galaxies)' },
                    { id: 'sneia', text: 'Type Ia supernovae (distant galaxies)' },
                    { id: 'hubble', text: 'Hubble flow, v = H0 * d (the far universe)' },
                  ],
                  correctOrder: ['parallax', 'cepheid', 'sneia', 'hubble'],
                  explanation: 'Parallax is the direct geometric foundation for nearby stars; Cepheids, calibrated by parallax, reach nearby galaxies; Type Ia supernovae, calibrated by Cepheids, reach distant galaxies; and the Hubble flow relation extends distances across the far universe.',
                },
                {
                  kind: 'mc',
                  id: 'q4',
                  prompt: 'If a standard candle looks four times fainter (in flux) than an identical one, how much farther away is it?',
                  options: [
                    { id: 'a', text: 'Four times farther' },
                    { id: 'b', text: 'Two times farther' },
                    { id: 'c', text: 'Sixteen times farther' },
                    { id: 'd', text: 'The same distance, it is just dimmer intrinsically' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'This assumes flux falls linearly with distance, but flux falls as 1/d^2, so a factor of 4 in flux is only a factor of 2 in distance.',
                    b: 'Correct — F proportional to 1/d^2, so flux 1/4 as bright means distance sqrt(4) = 2 times greater.',
                    c: 'Sixteen times farther would make it 1/256 as bright, far more than a factor of 4.',
                    d: 'By definition standard candles have the same true luminosity, so a fainter flux must be a distance effect, not an intrinsic one.',
                  },
                },
              ],
            },
          },
        ],
      },
      {
        id: 'astro-core-inference',
        label: 'From Signal to Claim: Distance, Error, and Inference',
        lessons: [
          // ─── Lesson 1 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-inf-cosmic-distance-ladder',
            label: 'The Cosmic Distance Ladder',
            readingMinutes: 5,
            sections: [
              {
                heading: 'Why distance is astronomy’s hardest measurement',
                body: 'Almost everything an astronomer wants to know — how luminous a star truly is, how massive a galaxy is, how fast the universe expands — depends on knowing how far away the object is. But the sky is a flat projection: a faint dot could be a dim star nearby or a brilliant one far away, and a photograph cannot tell you which. This is the central problem the "cosmic distance ladder" exists to solve. The ladder is a chain of methods, each calibrated by the one below it, that carries distance measurement from our own solar system out to the edge of the observable universe. No single technique works across that whole range — each "rung" has a limited reach, and its job is to hand off a calibration to the next rung before its own precision runs out.',
              },
              {
                heading: 'The rungs, in order of increasing reach',
                body: 'The bottom rung is radar and direct geometry inside the solar system — bouncing radio off Venus fixes the astronomical unit (1 AU ≈ 1.496 × 10⁸ km) to extraordinary precision. The next rung is stellar parallax: the tiny apparent shift of nearby stars as Earth orbits the Sun, a purely geometric method good out to a few thousand parsecs with modern satellites. Beyond parallax’s reach, "standard candles" take over — objects of known intrinsic luminosity (Cepheid variable stars, then Type Ia supernovae) whose apparent brightness reveals distance via the inverse-square law. At the largest scales, the redshift of galaxies combined with Hubble’s law gives distance. Crucially, each rung is calibrated using the rung beneath it: parallax measures the distance to nearby Cepheids, which fixes the Cepheid luminosity relation, which is then used to calibrate Type Ia supernovae in the same galaxies, which finally anchor the cosmic expansion. An error low on the ladder propagates all the way up.',
              },
              {
                heading: 'The ladder’s fragility — and why it still matters today',
                body: 'Because calibrations chain, a systematic error in one rung does not average out — it shifts everything above it. This is not a historical curiosity: the current "Hubble tension" (a persistent ∼9% disagreement between the local, ladder-based expansion rate of ≈73 km/s/Mpc measured by the SH0ES team and the ≈67 km/s/Mpc inferred from the cosmic microwave background) is partly an argument about whether some rung of the ladder hides an unaccounted systematic. Henrietta Leavitt’s 1908–1912 discovery of the Cepheid period–luminosity relation and Edwin Hubble’s 1929 use of Cepheids to prove galaxies lie far outside the Milky Way are the historical foundation — and the same logic, refined, still sits at the heart of one of cosmology’s biggest open questions.',
              },
            ],
            workedExample: 'A team wants to know the distance to a galaxy 20 million parsecs away — far too distant for parallax, whose reach is only a few thousand parsecs. They trace the ladder: parallax (from the Gaia satellite) directly measures distances to Cepheids within a few thousand parsecs, pinning down the Cepheid period–luminosity relation. They then find Cepheids in a nearer galaxy that ALSO hosts a Type Ia supernova, using the calibrated relation to get that galaxy’s distance and hence the supernova’s true luminosity. Finally they observe a Type Ia supernova in the 20-Mpc target galaxy; because all Type Ia supernovae peak at nearly the same luminosity, its apparent brightness gives the distance. Notice that a 5% error in the parallax calibration at the bottom becomes a 5% error in the Cepheid luminosities, which becomes a 5% error in the supernova calibration, which becomes a 5% error in the final 20-Mpc distance — the errors do not cancel, they carry straight up.',
            judgeFraming: 'Judges ask "how do you actually KNOW that distance?" because a distance is never measured directly at galactic scales — it is inferred through a chain, and a strong student can name which rung their claim rests on and what calibrates it. Saying "the ladder" is not enough; the give-away of real understanding is explaining that each rung is calibrated by the one below, so a student who used a redshift distance can trace it back through supernovae and Cepheids to parallax, and can say honestly where the largest uncertainty enters.',
            checkpoint: {
              questions: [
                {
                  kind: 'ordering',
                  id: 'q1',
                  prompt: 'Order these distance-ladder rungs from shortest reach (used first, closest) to longest reach (used last, farthest).',
                  items: [
                    { id: 'radar', text: 'Radar ranging inside the solar system' },
                    { id: 'parallax', text: 'Stellar parallax' },
                    { id: 'cepheid', text: 'Cepheid variable standard candles' },
                    { id: 'sn', text: 'Type Ia supernova standard candles' },
                    { id: 'hubble', text: 'Redshift – Hubble’s law' },
                  ],
                  correctOrder: ['radar', 'parallax', 'cepheid', 'sn', 'hubble'],
                  explanation: 'Radar fixes the AU inside the solar system; parallax reaches a few thousand parsecs; Cepheids extend to nearby galaxies and calibrate Type Ia supernovae, which reach hundreds of Mpc; at the largest scales redshift with Hubble’s law takes over. Each rung calibrates the next.',
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'Why is the distance ladder called a "ladder" rather than a set of independent methods?',
                  options: [
                    { id: 'a', text: 'Because each method is equally accurate at all distances' },
                    { id: 'b', text: 'Because each rung is calibrated using the rung below it, so distances chain and errors propagate upward' },
                    { id: 'c', text: 'Because astronomers physically climb to observatories' },
                    { id: 'd', text: 'Because only the top rung gives real distances and the rest are decorative' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'No single method works at all distances — each rung has a limited reach, which is exactly why a chain is needed.',
                    b: 'Correct — parallax calibrates Cepheids, Cepheids calibrate Type Ia supernovae, and supernovae anchor the Hubble expansion, so a systematic error low on the ladder shifts everything above it.',
                    c: 'The name is a metaphor for calibration hand-offs, not about physically climbing anything.',
                    d: 'Every rung yields genuine distances; the lower rungs are what make the upper rungs trustworthy.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'A team measures a galaxy’s distance from the redshift of its light (Hubble’s law). If the parallax measurements at the BOTTOM of the ladder were systematically 5% too small, what happens to their final distance?',
                  options: [
                    { id: 'a', text: 'Nothing — redshift is independent of parallax' },
                    { id: 'b', text: 'It is thrown off, because the parallax error propagates up through the Cepheid and supernova calibrations' },
                    { id: 'c', text: 'It becomes exactly 5% too large, and no other quantity is affected' },
                    { id: 'd', text: 'Only Cepheid-based distances are affected, never redshift distances' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Redshift distances depend on the Hubble constant, which is itself calibrated up the ladder from parallax — so they are not independent.',
                    b: 'Correct — a systematic parallax error shifts the Cepheid luminosities, then the supernova calibration, then the inferred Hubble constant, and finally the redshift-based distance.',
                    c: 'The sign propagates but the effect is not "only 5% and nothing else" — it contaminates every calibrated quantity along the chain, including the Hubble constant.',
                    d: 'Redshift distances rely on a Hubble constant calibrated through Cepheids and supernovae, so they inherit the same error.',
                  },
                },
                {
                  kind: 'matching',
                  id: 'q4',
                  prompt: 'Match each distance method to the physical principle it relies on.',
                  left: [
                    { id: 'radar', text: 'Radar ranging' },
                    { id: 'parallax', text: 'Stellar parallax' },
                    { id: 'candle', text: 'Standard candles (Cepheids, Type Ia SNe)' },
                    { id: 'redshift', text: 'Redshift – Hubble’s law' },
                  ],
                  right: [
                    { id: 'time', text: 'Round-trip light travel time of a radio pulse' },
                    { id: 'geo', text: 'Geometric angular shift from Earth’s orbital baseline' },
                    { id: 'flux', text: 'Known luminosity + inverse-square law on apparent brightness' },
                    { id: 'expand', text: 'Recession velocity from cosmic expansion' },
                  ],
                  correctPairs: [
                    ['radar', 'time'],
                    ['parallax', 'geo'],
                    ['candle', 'flux'],
                    ['redshift', 'expand'],
                  ],
                  explanation: 'Radar uses the light-travel time of a bounced radio pulse; parallax is pure geometry from Earth’s orbital baseline; standard candles use a known intrinsic luminosity with the inverse-square law; and redshift converts to distance through the recession velocity of cosmic expansion.',
                },
              ],
            },
          },

          // ─── Lesson 2 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-inf-stellar-parallax-parsec',
            label: 'Stellar Parallax and the Parsec',
            readingMinutes: 5,
            sections: [
              {
                heading: 'The geometry: a triangle with a 1-AU baseline',
                body: 'Hold a finger at arm’s length and blink between your eyes — the finger appears to jump against the background. Stellar parallax is the same effect, but the "two eyes" are Earth’s position six months apart on opposite sides of its orbit, a baseline of 2 AU. A nearby star appears to shift against the far-background stars, and the parallax angle p is defined as HALF that total shift — the angle subtended by 1 AU (the orbital radius) at the star’s distance. It is a right-triangle problem: the opposite side is 1 AU, the angle is p, and the hypotenuse (essentially the adjacent side, since p is tiny) is the distance d. For such minuscule angles, tan(p) ≈ p, so d = 1 AU / p when p is in radians. The angles are extraordinarily small — the nearest star, Proxima Centauri, has a parallax of only 0.7687 arcseconds, less than a millionth of a degree.',
              },
              {
                heading: 'The parsec: a unit built to make the arithmetic vanish',
                body: 'Because parallax angles are always tiny, astronomers invented a distance unit that turns the calculation into a reciprocal. One PARSEC (the name is a contraction of "parallax of one arcSECond") is the distance at which a star shows a parallax of exactly 1 arcsecond. With that definition the relation becomes beautifully simple: d (in parsecs) = 1 / p (in arcseconds). A star with p = 0.1 arcsec is 10 pc away; p = 0.01 arcsec means 100 pc. One parsec equals about 3.26 light-years, or 3.086 × 10¹³ km. This inverse relationship is the single most important formula in the lesson, and its shape carries a warning: as distance grows, the parallax shrinks toward zero, so measuring far stars means measuring ever-smaller angles — which is where the method eventually breaks down.',
              },
              {
                heading: 'The reach and the history — from Bessel to Gaia',
                body: 'Friedrich Bessel made the first successful stellar parallax measurement in 1838, finding 61 Cygni at about 0.29 arcsec (∼3.5 pc), the first direct proof of a star’s distance and, by extension, the vast scale of the galaxy. From the ground, atmospheric blurring limits parallax to nearby stars within ∼100 pc. The Hipparcos satellite (1989–1993) pushed reliable parallaxes to milliarcsecond precision, and the Gaia mission (launched 2013) reached microarcsecond precision, measuring parallaxes for over a billion stars out to several thousand parsecs. The fundamental limit is always the same: precision is set by how small an angle you can measure, and because d = 1/p, a fixed angular error becomes a rapidly growing distance error as stars get farther away. That is exactly why parallax must hand off to standard candles beyond a few thousand parsecs.',
              },
            ],
            workedExample: 'A student observes a star and measures its parallax angle as p = 0.025 arcseconds. Using the parsec relation d = 1 / p, the distance is d = 1 / 0.025 = 40 parsecs. To convert: 40 pc × 3.26 ly/pc = 130.4 light-years. Now suppose the measurement has an uncertainty of ±0.005 arcsec. The distance for p = 0.020 is 1/0.020 = 50 pc and for p = 0.030 is 1/0.030 = 33.3 pc — so the distance is roughly 33 to 50 pc. Notice the uncertainty is NOT symmetric around 40 pc: because d = 1/p is a reciprocal, a symmetric error in the angle produces an asymmetric error in distance, and it blows up as p shrinks. If the same ±0.005 arcsec error hit a star with p = 0.010, the distance would range from 1/0.015 = 67 pc to 1/0.005 = 200 pc — a threefold spread. This is the mathematical reason parallax becomes useless at large distances.',
            judgeFraming: 'Judges probe parallax because it is the one rung of the ladder a high-schooler can compute from raw geometry, and the reciprocal d = 1/p is a favorite check: a student who confidently converts 0.025 arcsec to 40 pc, and then explains WHY the distance error grows so fast for distant stars (because 1/p amplifies small-angle errors), has shown they understand not just the formula but its limits. A student who quotes a parallax distance to five significant figures for a very faint, distant star is signaling they do not grasp where the method fails.',
            checkpoint: {
              questions: [
                {
                  kind: 'mc',
                  id: 'q1',
                  prompt: 'A star has a measured parallax of 0.05 arcseconds. What is its distance?',
                  options: [
                    { id: 'a', text: '0.05 parsecs' },
                    { id: 'b', text: '5 parsecs' },
                    { id: 'c', text: '20 parsecs' },
                    { id: 'd', text: '50 parsecs' },
                  ],
                  answerId: 'c',
                  explanations: {
                    a: 'This just repeats the parallax value; distance is the RECIPROCAL of the parallax, not the parallax itself.',
                    b: 'This would be the answer for a parallax of 0.2 arcsec (1/0.2 = 5), not 0.05.',
                    c: 'Correct — d (pc) = 1 / p (arcsec) = 1 / 0.05 = 20 parsecs.',
                    d: 'This would require p = 0.02 arcsec (1/0.02 = 50); 1/0.05 is 20, not 50.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'One parsec is defined as the distance at which:',
                  options: [
                    { id: 'a', text: 'A star’s parallax angle equals exactly 1 arcsecond' },
                    { id: 'b', text: 'Light takes exactly one year to travel' },
                    { id: 'c', text: 'A star’s parallax angle equals exactly 1 degree' },
                    { id: 'd', text: 'A star lies exactly 1 AU from the Sun' },
                  ],
                  answerId: 'a',
                  explanations: {
                    a: 'Correct — "parsec" is literally "parallax of one arcsecond": the distance giving a 1-arcsec parallax, which makes d = 1/p exact when p is in arcseconds.',
                    b: 'That defines the light-year, a different unit; one parsec is about 3.26 light-years.',
                    c: 'A 1-degree parallax would be an absurdly close object — parallax angles are always tiny fractions of an arcsecond, hence the arcsecond definition.',
                    d: '1 AU is the Earth–Sun distance and the baseline for the measurement, not the parsec itself.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'Why does the parallax method lose precision rapidly for very distant stars?',
                  options: [
                    { id: 'a', text: 'Distant stars are always intrinsically dimmer, so they cannot be seen' },
                    { id: 'b', text: 'Because d = 1/p, a fixed error in the tiny angle p produces a distance error that grows fast as p shrinks toward zero' },
                    { id: 'c', text: 'Because distant stars move too quickly across the sky' },
                    { id: 'd', text: 'Because Earth’s orbit changes size over the year' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Intrinsic brightness varies, and even bright distant stars have vanishingly small parallaxes — the limit is angular, not just brightness.',
                    b: 'Correct — the reciprocal relation means a symmetric angular error becomes an ever-larger and asymmetric distance error as p gets smaller, so far stars have huge distance uncertainties.',
                    c: 'Proper motion is a separate effect and is not the reason parallax precision degrades with distance.',
                    d: 'Earth’s orbit has an essentially fixed 1-AU radius; the baseline does not shrink with the target’s distance.',
                  },
                },
                {
                  kind: 'ordering',
                  id: 'q4',
                  prompt: 'Order these instruments/measurements by increasing parallax reach (nearest capability first, farthest last).',
                  items: [
                    { id: 'bessel', text: 'Bessel’s 1838 ground telescope (61 Cygni, ∼3.5 pc)' },
                    { id: 'ground', text: 'Modern ground-based parallax (∼100 pc limit)' },
                    { id: 'hipparcos', text: 'Hipparcos satellite (milliarcsecond)' },
                    { id: 'gaia', text: 'Gaia satellite (microarcsecond, several thousand pc)' },
                  ],
                  correctOrder: ['bessel', 'ground', 'hipparcos', 'gaia'],
                  explanation: 'Bessel first reached only the very nearest stars in 1838; ground-based work is capped near 100 pc by the atmosphere; Hipparcos (milliarcsecond) reached farther; and Gaia (microarcsecond) reaches several thousand parsecs — each improvement is a smaller measurable angle, hence a longer reach.',
                },
              ],
            },
          },

          // ─── Lesson 3 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-inf-standard-candles',
            label: 'Standard Candles: Cepheids and Type Ia Supernovae',
            readingMinutes: 6,
            sections: [
              {
                heading: 'The core idea and the inverse-square law',
                body: 'A "standard candle" is any object whose true intrinsic luminosity L (energy emitted per second, in watts) is known. If you know L and you MEASURE the apparent brightness — the flux F reaching your detector (watts per square meter) — then distance follows from the inverse-square law: F = L / (4πd²). Light spreads over the surface of an expanding sphere of area 4πd², so a source twice as far delivers one-quarter the flux. Solving for distance gives d = √(L / (4πF)). The whole game of standard candles is therefore: find a class of objects whose L you can pin down independently, measure how faint they LOOK, and back out how far they must be. This is why the inverse-square law, not any exotic physics, is the workhorse of the upper distance ladder.',
              },
              {
                heading: 'Cepheids: Leavitt’s period–luminosity law',
                body: 'Cepheid variable stars pulse in brightness with a regular period of days to weeks. In 1908–1912, Henrietta Leavitt, studying Cepheids in the Small Magellanic Cloud (all at essentially the same distance), discovered that a Cepheid’s pulsation PERIOD is tightly correlated with its intrinsic LUMINOSITY: longer-period Cepheids are more luminous. Because the period is easy to time and unaffected by distance, this period–luminosity relation turns a Cepheid into a standard candle — measure the period, read off the true luminosity, compare to apparent brightness, get the distance. Leavitt’s law is what let Hubble in 1923–1929 measure the distance to the Andromeda "nebula," prove it was a separate galaxy far beyond the Milky Way, and overturn the idea that our galaxy was the entire universe. Cepheids reach out to roughly 20–40 million parsecs with modern telescopes — far enough to reach galaxies hosting supernovae.',
              },
              {
                heading: 'Type Ia supernovae: the brightest standardizable candle',
                body: 'A Type Ia supernova occurs when a white dwarf accreting matter from a companion approaches the Chandrasekhar mass limit (≈1.4 solar masses) and detonates. Because the trigger mass is nearly the same every time, Type Ia supernovae reach nearly the same peak luminosity — about 5 billion times the Sun’s — making them superb standard candles. They are not perfectly identical, but the Phillips relationship (1993) showed that intrinsically brighter ones fade more slowly, so the light-curve shape "standardizes" them to a few-percent luminosity scatter. Being so bright, they are visible across billions of parsecs, letting them probe cosmic expansion itself. The 1998 discovery that distant Type Ia supernovae were FAINTER (hence farther) than expected revealed the accelerating expansion of the universe and dark energy — the work that won the 2011 Nobel Prize in Physics (Perlmutter, Schmidt, Riess). This is the standard candle that turned distance measurement into cosmology.',
              },
            ],
            workedExample: 'A Cepheid is observed with a pulsation period that its period–luminosity relation says corresponds to a true luminosity L = 1.0 × 10³⁰ W (about 2,600 times the Sun’s 3.8 × 10²⁶ W). Its measured flux at Earth is F = 2.0 × 10⁻¹⁴ W/m². Apply the inverse-square law solved for distance: d = √(L / (4πF)) = √(1.0 × 10³⁰ / (4π × 2.0 × 10⁻¹⁴)). The denominator is 4π × 2.0 × 10⁻¹⁴ = 2.51 × 10⁻¹³. So d² = 1.0 × 10³⁰ / 2.51 × 10⁻¹³ = 3.98 × 10⁴² m², giving d = 2.0 × 10²¹ m. Converting (1 pc = 3.086 × 10¹⁶ m): d = 2.0 × 10²¹ / 3.086 × 10¹⁶ ≈ 64,600 pc, about 65 kpc. (Sanity check: ~65 kpc places the Cepheid within a Magellanic-Cloud-scale distance, which is physically reasonable for so faint a flux; a nearby ~6.5 kpc would be implausible.) The only inputs were a known luminosity (from Leavitt’s law) and a measured flux — the inverse-square law did all the work.',
            judgeFraming: 'Judges ask "how can you possibly know that galaxy’s distance?" precisely to see whether a student grasps that a standard candle converts a KNOWN luminosity plus a MEASURED brightness into a distance via the inverse-square law. The strong answer names the candle (Cepheid via Leavitt’s period–luminosity law, or Type Ia via the Chandrasekhar-limit near-uniform peak) and states the inverse-square dependence explicitly. A student who says "brighter means closer" without the 1/d² relation, or who cannot say WHY that class of object has a knowable luminosity, has only half the idea.',
            checkpoint: {
              questions: [
                {
                  kind: 'mc',
                  id: 'q1',
                  prompt: 'A standard candle lets you find distance because you know its intrinsic luminosity and measure its apparent flux. Which relation connects them?',
                  options: [
                    { id: 'a', text: 'F = L × d² (flux increases with distance squared)' },
                    { id: 'b', text: 'F = L / (4πd²) (flux falls off as the inverse square of distance)' },
                    { id: 'c', text: 'F = L / d (flux falls off linearly with distance)' },
                    { id: 'd', text: 'F = 4πL d² (flux grows with distance)' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'This has the dependence backwards — more distant objects look FAINTER, so flux must DECREASE with distance, not increase.',
                    b: 'Correct — light spreads over a sphere of area 4πd², so flux is F = L/(4πd²); doubling the distance quarters the flux, and solving gives d = √(L/(4πF)).',
                    c: 'A 1/d falloff would be true if light spread over a circle, but it spreads over a sphere’s surface area (∝ d²), so the falloff is 1/d².',
                    d: 'Flux does not grow with distance; distant sources are dimmer, and the 4πd² belongs in the denominator.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'What makes a Cepheid variable usable as a standard candle (Leavitt’s discovery)?',
                  options: [
                    { id: 'a', text: 'All Cepheids have exactly the same brightness' },
                    { id: 'b', text: 'A Cepheid’s pulsation period is tightly correlated with its intrinsic luminosity, so timing the period reveals the true luminosity' },
                    { id: 'c', text: 'Cepheids never change in brightness, so they are easy to measure' },
                    { id: 'd', text: 'Cepheids are all located at the same distance from Earth' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Cepheids differ in luminosity — that is the point; it is the PERIOD that tells you which luminosity a given Cepheid has.',
                    b: 'Correct — Leavitt found longer-period Cepheids are more luminous, and since period is distance-independent, measuring it yields the intrinsic luminosity needed for the inverse-square law.',
                    c: 'Cepheids are defined by their regular pulsation — they DO change in brightness; that periodic change is what encodes the luminosity.',
                    d: 'Leavitt’s SAMPLE happened to be at one distance (the SMC), which is how she found the relation, but real Cepheids used as candles are scattered across many galaxies.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'Why do Type Ia supernovae make excellent standard candles?',
                  options: [
                    { id: 'a', text: 'They explode at random luminosities, so averaging many gives a distance' },
                    { id: 'b', text: 'They detonate near the Chandrasekhar mass limit (≈1.4 solar masses), so their peak luminosity is nearly uniform and can be standardized by light-curve shape' },
                    { id: 'c', text: 'They are the dimmest objects in the sky, so they are easy to isolate' },
                    { id: 'd', text: 'Their brightness depends only on the host galaxy’s distance' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'They are not random — the near-uniform trigger mass is exactly what gives them a repeatable peak luminosity.',
                    b: 'Correct — the white dwarf detonates near the same Chandrasekhar mass every time, giving a nearly standard peak (≈5 billion Suns), and the Phillips relation tightens it further via light-curve shape.',
                    c: 'They are among the BRIGHTEST events in the universe, which is why they are visible across billions of parsecs.',
                    d: 'Their intrinsic peak luminosity is set by the explosion physics, not by distance; distance is what you INFER from the apparent brightness.',
                  },
                },
                {
                  kind: 'matching',
                  id: 'q4',
                  prompt: 'Match each standard candle or concept to its defining fact.',
                  left: [
                    { id: 'cepheid', text: 'Cepheid variable' },
                    { id: 'tia', text: 'Type Ia supernova' },
                    { id: 'invsq', text: 'Inverse-square law' },
                    { id: 'phillips', text: 'Phillips relationship' },
                  ],
                  right: [
                    { id: 'plr', text: 'Period–luminosity relation (Leavitt, 1908–1912)' },
                    { id: 'chandra', text: 'Detonation near the Chandrasekhar limit ≈ 1.4 M☉' },
                    { id: 'sphere', text: 'Flux ∝ 1/d² because light spreads over 4πd²' },
                    { id: 'decline', text: 'Brighter supernovae fade more slowly (standardizes peak)' },
                  ],
                  correctPairs: [
                    ['cepheid', 'plr'],
                    ['tia', 'chandra'],
                    ['invsq', 'sphere'],
                    ['phillips', 'decline'],
                  ],
                  explanation: 'Cepheids work via Leavitt’s period–luminosity relation; Type Ia supernovae because they detonate near the Chandrasekhar limit; the inverse-square law gives flux ∝ 1/d² from light spreading over a sphere; and the Phillips relationship standardizes Type Ia peaks by tying brightness to decline rate.',
                },
              ],
            },
          },

          // ─── Lesson 4 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-inf-error-bars-snr-significance',
            label: 'Error Bars, Signal-to-Noise, and Significance',
            readingMinutes: 5,
            sections: [
              {
                heading: 'Every measurement is a number with an uncertainty',
                body: 'In astronomy a measurement without an error bar is not a measurement — it is a rumor. An error bar states the range within which the true value is likely to lie, usually one standard deviation (1σ) around the best estimate. When you count photons, the noise is fundamentally statistical: photon arrivals follow Poisson statistics, so if you collect N photons the random uncertainty is √N. This is why longer exposures matter — collect 100 photons and your noise is √100 = 10 (a 10% uncertainty); collect 10,000 photons and the noise is √10,000 = 100, but that is only a 1% uncertainty. The signal grows linearly with N while the noise grows only as √N, so precision improves as the square root of exposure time. A student who reports a brightness "to three decimals" from a 2-second phone exposure has ignored the physics of counting statistics.',
              },
              {
                heading: 'Signal-to-noise ratio: is there anything there at all?',
                body: 'The signal-to-noise ratio (SNR or S/N) is the single most useful number for judging whether a detection is real: it is the size of the signal divided by the size of the noise. For a photon-counting measurement dominated by the source, S/N ≈ N / √N = √N. A source detected at S/N = 2 is barely distinguishable from noise — it could easily be a random fluctuation. At S/N = 5 the detection is solid; astronomers conventionally call a 5σ result (signal five times the noise) a confident detection because the probability of a pure-noise fluctuation reaching 5σ is under one in a million. Doubling your S/N from 5 to 10 requires collecting FOUR times as many photons (since S/N ∝ √N), which is why chasing faint objects gets expensive fast — telescope time scales with the square of the precision you want.',
              },
              {
                heading: 'Significance: distinguishing a signal from a fluctuation',
                body: 'The whole point of an error bar is to answer "could this just be noise?" A measured difference is only meaningful if it is large compared with its uncertainty. If Galaxy A’s rotation speed is 210 ± 15 km/s and Galaxy B’s is 220 ± 15 km/s, the 10 km/s difference is smaller than the error bars — the two are consistent, and claiming B rotates faster is unsupported. Astronomers quantify this in "sigmas": a result 3σ from the null (a 3-in-a-thousand chance of being a fluke) is "evidence," while 5σ is the discovery threshold used, for example, in the 2012 detection of the Higgs boson and in gravitational-wave detections by LIGO. The mirror-image error is common in student projects: reporting two overlapping error bars as if they proved a difference, or hiding a null result. Overlapping error bars mean "we cannot tell these apart," which is itself a legitimate and honest finding.',
              },
            ],
            workedExample: 'A student images a faint asteroid and their software reports it collected N = 400 photons from the object above the background. The Poisson noise is √N = √400 = 20 photons, so the signal-to-noise ratio is S/N = 400 / 20 = 20 — a strong detection (well above the 5σ threshold). They report the brightness with a 1σ uncertainty of 1/20 = 5%. Next night the asteroid is fainter and only N = 25 photons are collected: noise = √25 = 5, so S/N = 25/5 = 5 — right at the confident-detection edge, with a 20% uncertainty. To reach the SAME 5% precision (S/N = 20) on the faint night, they would need S/N = 20, i.e. √N = 20 so N = 400 photons — sixteen times more than the 25 they got, meaning roughly sixteen times the exposure. This is the square-root law in action: quadrupling exposure only doubles the S/N.',
            judgeFraming: 'Judges immediately look for error bars, and a project without them reads as un-quantified. The deeper probe is "is that difference significant?" — a student who can say "the error bars overlap, so I cannot claim a real difference" earns far more credibility than one who over-claims from noisy data. Understanding that S/N ∝ √N, and that a 5σ detection is the discovery standard, signals a student who thinks about whether their signal is real rather than just plotting the first bump they see.',
            checkpoint: {
              questions: [
                {
                  kind: 'mc',
                  id: 'q1',
                  prompt: 'A detector collects N = 900 photons from a star. What is the approximate Poisson (statistical) noise and the signal-to-noise ratio?',
                  options: [
                    { id: 'a', text: 'Noise = 900, S/N = 1' },
                    { id: 'b', text: 'Noise = 30, S/N = 30' },
                    { id: 'c', text: 'Noise = 450, S/N = 2' },
                    { id: 'd', text: 'Noise = 90, S/N = 10' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'The noise is not equal to N; for Poisson counting it is √N = √900 = 30, not 900.',
                    b: 'Correct — Poisson noise is √N = √900 = 30, so S/N = N/√N = 900/30 = 30, a very strong detection.',
                    c: 'Noise is √N = 30, not N/2; halving N is not how counting statistics work.',
                    d: 'This would be the answer for N = 8,100 (√8100 = 90); for N = 900 the noise is 30.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'You want to double your signal-to-noise ratio. Since S/N ∝ √N, how many more photons must you collect?',
                  options: [
                    { id: 'a', text: 'Twice as many' },
                    { id: 'b', text: 'Four times as many' },
                    { id: 'c', text: 'The same number, but for twice as long spatially' },
                    { id: 'd', text: 'Half as many' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Doubling N only raises S/N by √2 ≈ 1.4×, not 2×, because S/N grows as the square root of N.',
                    b: 'Correct — since S/N ∝ √N, doubling S/N requires (2)² = 4 times as many photons, which is why faint targets get expensive fast.',
                    c: 'S/N depends on the number of photons collected, not on a "spatial" duration; you need 4× the photons.',
                    d: 'Fewer photons would DECREASE S/N; you need more, specifically four times more.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'Galaxy A rotates at 210 ± 15 km/s and Galaxy B at 220 ± 15 km/s. What is the correct conclusion?',
                  options: [
                    { id: 'a', text: 'B definitely rotates faster than A' },
                    { id: 'b', text: 'The 10 km/s difference is smaller than the error bars, so the two are consistent and no real difference is established' },
                    { id: 'c', text: 'A rotates faster because it has the smaller central value' },
                    { id: 'd', text: 'The error bars are irrelevant once you have the central values' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'The 10 km/s gap is smaller than the ±15 km/s uncertainties, so this over-claims a difference the data cannot support.',
                    b: 'Correct — when the difference is smaller than the combined uncertainty, the measurements overlap and are statistically consistent; "we cannot tell them apart" is the honest finding.',
                    c: 'A has the LOWER central value (210 < 220), and in any case the difference is not significant given the error bars.',
                    d: 'Error bars are the whole point — they are what tell you whether a difference is real or just noise.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q4',
                  prompt: 'Why do astronomers use a 5σ threshold to claim a "discovery"?',
                  options: [
                    { id: 'a', text: 'Because 5 is an arbitrary round number with no statistical meaning' },
                    { id: 'b', text: 'Because the chance of a pure-noise fluctuation reaching 5σ is under one in a million, making a false claim very unlikely' },
                    { id: 'c', text: 'Because 5σ means the measurement has zero uncertainty' },
                    { id: 'd', text: 'Because detectors can only measure in multiples of five' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'It is not arbitrary — 5σ corresponds to a specific, extremely small false-positive probability.',
                    b: 'Correct — a 5σ result has under a one-in-a-million chance of being a random fluctuation, which is why it is the discovery standard (used for the Higgs boson and LIGO detections).',
                    c: 'No measurement has zero uncertainty; 5σ means the signal is five times its uncertainty, not that the uncertainty vanished.',
                    d: 'Detector readout has nothing to do with the choice; 5σ is a statistical significance level.',
                  },
                },
              ],
            },
          },

          // ─── Lesson 5 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-inf-systematic-vs-random-error',
            label: 'Systematic vs Random Error in Astronomy',
            readingMinutes: 5,
            sections: [
              {
                heading: 'Two fundamentally different kinds of error',
                body: 'Random error scatters measurements symmetrically around the true value — the Poisson photon noise from the previous lesson is the classic example. Repeat the measurement many times and random errors average out: the mean converges on the truth, and the uncertainty shrinks as 1/√N. Systematic error is the dangerous cousin: it shifts EVERY measurement in the same direction by roughly the same amount, so averaging does NOT help — you just get a very precise wrong answer. A miscalibrated ruler that reads 2 mm long makes every length too big no matter how many times you measure. The target analogy is standard: random error is a loose grouping of shots scattered around the bullseye; systematic error is a tight grouping consistently off to one side. You can have high PRECISION (tight grouping) with terrible ACCURACY (wrong center) — and systematic error is exactly what breaks accuracy while leaving precision looking deceptively good.',
              },
              {
                heading: 'Where systematics hide in real astronomy',
                body: 'Astronomy is riddled with systematics because you cannot go touch your target. Interstellar dust dims and reddens starlight (extinction), so an uncorrected star looks fainter and therefore falsely FARTHER via the inverse-square law — a systematic that pushed early distance estimates wrong for decades. Detector nonlinearity, an imperfect flux calibration ("zero-point" error), atmospheric absorption, and the assumption that all Type Ia supernovae are truly identical are all systematics that shift results one way. The most famous cautionary tale is Hubble’s original 1929 constant of ≈500 km/s/Mpc — roughly seven times today’s value — because his Cepheid calibration was systematically off (he had confused two different types of variable star and underestimated distances). No amount of extra data would have fixed it; only finding the calibration flaw did. That is the signature of a systematic: more data makes the error bar smaller but leaves the answer wrong.',
              },
              {
                heading: 'Fighting systematics — and the live example of the Hubble tension',
                body: 'You cannot beat a systematic by collecting more of the same data; you beat it by independent cross-checks. Measure the same distance two completely different ways (parallax vs. a physical model), calibrate against a known standard, quantify the dust, or have a rival team with different instruments repeat the work. The Hubble tension is the field’s current stress-test of exactly this discipline: the local distance-ladder value (≈73 km/s/Mpc) and the cosmic-microwave-background value (≈67 km/s/Mpc) disagree by far more than either team’s RANDOM error bars, so if one is wrong it must be a hidden SYSTEMATIC — or the disagreement is real new physics. Teams have spent years hunting for a systematic in the Cepheid calibration, the supernova standardization, or the CMB analysis. The lesson for any researcher: a result whose error bar is tiny is not necessarily correct, and the honest move is to look for what could be shifting it, not to celebrate the small error bar.',
              },
            ],
            workedExample: 'A student measures the brightness of a star five times and gets fluxes (in arbitrary units) of 98, 102, 101, 99, 100 — a mean of 100 with a scatter of about ±2, classic RANDOM error that averages toward the true value. But unknown to them, interstellar dust between us and the star dims it by 20%, so the TRUE flux is 125 and every one of their five readings is systematically low. Averaging their five numbers gives 100 with a tiny ±0.9 uncertainty on the mean — a precise answer that is 20% wrong. If they then use the inverse-square law d = √(L/(4πF)) with the too-low flux, the star comes out √(125/100) = 1.12 times too FAR — 12% overestimated — no matter how many times they repeat the reading. The only fix is to correct for extinction (measure the reddening and subtract the dust dimming), not to take more exposures.',
            judgeFraming: 'Judges love to ask "what could make your result wrong even if your error bars are small?" because it separates students who understand accuracy from those who only chase precision. The winning answer names a specific systematic in the actual experiment — dust extinction, a calibration offset, an untested assumption — and explains that MORE data would not fix it, only an independent cross-check or a correction would. A student who conflates a small random error bar with being right, or who cannot name a single systematic in their own setup, reveals the exact blind spot that produced Hubble’s sevenfold-wrong 1929 constant.',
            checkpoint: {
              questions: [
                {
                  kind: 'matching',
                  id: 'q1',
                  prompt: 'Match each error type or concept to its defining property.',
                  left: [
                    { id: 'random', text: 'Random error' },
                    { id: 'systematic', text: 'Systematic error' },
                    { id: 'precision', text: 'Precision' },
                    { id: 'accuracy', text: 'Accuracy' },
                  ],
                  right: [
                    { id: 'scatter', text: 'Scatters symmetrically; averages out as 1/√N with more data' },
                    { id: 'shift', text: 'Shifts every measurement the same way; averaging does NOT help' },
                    { id: 'tight', text: 'How tightly repeated measurements cluster together' },
                    { id: 'true', text: 'How close the measurement center is to the true value' },
                  ],
                  correctPairs: [
                    ['random', 'scatter'],
                    ['systematic', 'shift'],
                    ['precision', 'tight'],
                    ['accuracy', 'true'],
                  ],
                  explanation: 'Random error scatters and averages out (1/√N); systematic error shifts everything one way and cannot be averaged away; precision is the tightness of the grouping; accuracy is closeness to the true value. Systematics destroy accuracy while leaving precision intact.',
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'You repeat a measurement 10,000 times and the error bar becomes tiny, but the answer is still wrong. This is the signature of:',
                  options: [
                    { id: 'a', text: 'Random error, which more data fixes' },
                    { id: 'b', text: 'A systematic error, which shifts every measurement the same way so averaging cannot remove it' },
                    { id: 'c', text: 'Poisson noise, which vanishes with more photons' },
                    { id: 'd', text: 'A perfectly correct measurement' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Random error DOES shrink with more data — if the answer stays wrong despite a tiny error bar, it is not random error.',
                    b: 'Correct — a systematic biases every measurement identically, so the mean converges on a precise but WRONG value; only a cross-check or correction fixes it.',
                    c: 'Poisson noise is a random error that averages down; if the answer is still wrong, the problem is systematic, not Poisson.',
                    d: 'A tiny error bar with a wrong answer is the opposite of correct — it is precisely the trap systematics set.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'Uncorrected interstellar dust dims a star. Using the inverse-square law, how does this bias the inferred distance?',
                  options: [
                    { id: 'a', text: 'The star looks fainter, so it is inferred to be systematically too FAR away' },
                    { id: 'b', text: 'The star looks brighter, so it is inferred to be too close' },
                    { id: 'c', text: 'Dust has no effect on inferred distance' },
                    { id: 'd', text: 'The distance is randomly scattered but unbiased' },
                  ],
                  answerId: 'a',
                  explanations: {
                    a: 'Correct — dust reduces the measured flux; since d = √(L/(4πF)), a lower F yields a larger d, so the star is systematically placed too far away.',
                    b: 'Dust DIMS starlight (lowers flux), it does not brighten it, so the bias is toward too far, not too close.',
                    c: 'Dust extinction directly lowers the flux, which directly changes the inverse-square distance — it is one of astronomy’s classic systematics.',
                    d: 'Dust biases the flux in ONE direction (always dimmer), so the distance error is systematic, not random and unbiased.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q4',
                  prompt: 'The Hubble tension (local ≈73 vs. CMB ≈67 km/s/Mpc) is significant because:',
                  options: [
                    { id: 'a', text: 'The two values agree well within their error bars' },
                    { id: 'b', text: 'They disagree by more than either team’s random error bars, so the cause must be a hidden systematic or new physics' },
                    { id: 'c', text: 'One team simply used a broken telescope' },
                    { id: 'd', text: 'Collecting more data would obviously resolve it' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'They do NOT agree within the error bars — that disagreement is the entire tension.',
                    b: 'Correct — the gap exceeds the RANDOM uncertainties, so it points to an unidentified systematic in one of the methods, or to genuinely new physics.',
                    c: 'Both measurements come from careful, well-checked instruments; a broken telescope is not the explanation being investigated.',
                    d: 'More of the same data shrinks random error but cannot resolve a systematic — which is exactly why the tension persists despite excellent data.',
                  },
                },
              ],
            },
          },

          // ─── Lesson 6 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-inf-photons-to-conclusions',
            label: 'Thinking Like an Astronomer: From Photons to Conclusions',
            readingMinutes: 6,
            sections: [
              {
                heading: 'Astronomy as inference under constraint',
                body: 'Unlike a chemist who can heat a beaker or a biologist who can run a controlled trial, an astronomer cannot touch, move, or repeat the experiment on the target. Every conclusion about a star, galaxy, or the whole universe is INFERRED from the photons that happen to arrive at a detector. That is the defining epistemic constraint of the field, and it makes astronomy a masterclass in inference: from a spectrum you read temperature (Wien’s law), composition (spectral lines), motion (Doppler shift), and distance (standard candles) — none measured directly, all deduced from the properties of the light. The skill this whole unit builds is the ability to trace a claim ("that galaxy is 20 Mpc away and receding at 1,500 km/s") back through every inferential step to the raw photons, and to know the uncertainty at each step.',
              },
              {
                heading: 'Reading physics off a spectrum: Wien’s law and the Doppler shift',
                body: 'Two of the most powerful inferences come from a spectrum. First, temperature: a hot object radiates as a blackbody whose peak wavelength moves inversely with temperature — Wien’s displacement law, λ_max × T = 2.898 × 10⁻³ m·K. A bluer peak means a hotter star; a redder peak means a cooler one. Second, motion: the wavelength of a known spectral line is stretched (redshifted) if the source recedes and compressed (blueshifted) if it approaches, by the fraction Δλ/λ₀ = v/c for speeds well below light. A hydrogen line whose laboratory wavelength is known but appears shifted tells you the line-of-sight velocity directly. Combine the redshift with Hubble’s law (v = H₀ × d) and the velocity even yields a distance at cosmological scales. Every one of these is an INFERENCE from light — you never see the temperature or the velocity, you deduce them from where the photons land in wavelength.',
              },
              {
                heading: 'Assembling a defensible conclusion',
                body: 'Thinking like an astronomer means chaining these tools honestly: measure the flux and its Poisson error, correct for known systematics (dust, calibration), infer the physical quantity through the right law, propagate the uncertainty, and state the result WITH its error bar and the assumptions behind it. The magnitude scale — astronomy’s brightness ruler — is a trap for the careless: it is LOGARITHMIC and INVERTED, so a SMALLER magnitude means a BRIGHTER object, and a difference of 5 magnitudes is exactly a factor of 100 in flux (each magnitude ≈ 2.512×). A student who forgets the inversion will call the brightest star the faintest. The mark of real astronomical thinking is not any single formula but the habit of asking, at every rung: what did I actually measure, what did I infer, what could systematically bias it, and how big is my uncertainty? A conclusion that survives those four questions is a scientific claim; one that skips them is a guess dressed as data.',
              },
            ],
            workedExample: 'A student observes a star and measures its blackbody peak at λ_max = 580 nm. Applying Wien’s law, T = 2.898 × 10⁻³ / λ_max = 2.898 × 10⁻³ / (580 × 10⁻⁹) = 4,997 K — about 5,000 K, a yellowish star like the Sun. In the same spectrum they find a hydrogen line whose laboratory wavelength is λ₀ = 656.3 nm but which appears at 659.3 nm, a shift of Δλ = +3.0 nm. The redshift gives velocity v = c × Δλ/λ₀ = (3.0 × 10⁵ km/s) × (3.0/656.3) = 1,371 km/s of recession (positive shift = moving away). If this were a galaxy, Hubble’s law d = v/H₀ with H₀ ≈ 70 km/s/Mpc gives d = 1,371/70 ≈ 20 Mpc. From a single spectrum the student has inferred temperature, velocity, and distance — not one of them measured directly, every one deduced from where the photons landed in wavelength, each carrying its own uncertainty.',
            judgeFraming: 'Judges use "walk me from your raw data to your conclusion" as the ultimate test, because it exposes whether a student understands astronomy as inference or just parrots results. The strongest students name each transformation — photons to flux, flux to temperature via Wien, line shift to velocity via Doppler, velocity to distance via Hubble — and flag the systematic and the uncertainty at each hop. Getting the magnitude scale right (smaller = brighter, 5 mag = 100×, logarithmic) is a classic trip-wire; a student who says "the object with the larger magnitude is brighter" has inverted the field’s core brightness ruler and undercut every brightness-based claim.',
            checkpoint: {
              questions: [
                {
                  kind: 'mc',
                  id: 'q1',
                  prompt: 'A star’s blackbody spectrum peaks at λ_max = 725 nm. Using Wien’s law (λ_max × T = 2.898 × 10⁻³ m·K), its surface temperature is about:',
                  options: [
                    { id: 'a', text: '≈ 4,000 K' },
                    { id: 'b', text: '≈ 2,100 K' },
                    { id: 'c', text: '≈ 10,000 K' },
                    { id: 'd', text: '≈ 725 K' },
                  ],
                  answerId: 'a',
                  explanations: {
                    a: 'Correct — T = 2.898 × 10⁻³ / (725 × 10⁻⁹) = 3,997 K ≈ 4,000 K, a cool reddish star.',
                    b: 'This would require a peak near 1,380 nm; a 725 nm peak gives ≈4,000 K, not 2,100 K.',
                    c: 'A 10,000 K star peaks near 290 nm (bluer/ultraviolet), not at 725 nm in the red.',
                    d: 'The temperature is not the wavelength value; you must divide Wien’s constant by λ_max in meters, giving ≈4,000 K.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'A spectral line with laboratory wavelength 500.0 nm is observed at 502.0 nm. What does this tell you?',
                  options: [
                    { id: 'a', text: 'The source is approaching (blueshift), because the wavelength increased' },
                    { id: 'b', text: 'The source is receding (redshift) at v = c × Δλ/λ₀ ≈ 1,200 km/s' },
                    { id: 'c', text: 'The source is not moving; wavelength shifts are always instrumental' },
                    { id: 'd', text: 'The source is receding at exactly the speed of light' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'An INCREASE in wavelength is a REDshift, which means receding, not approaching — blueshift is a DECREASE in wavelength.',
                    b: 'Correct — Δλ/λ₀ = 2.0/500.0 = 0.004, so v = 0.004 × 3.0 × 10⁵ km/s = 1,200 km/s of recession (positive shift = moving away).',
                    c: 'A real wavelength shift of a known line encodes line-of-sight velocity via the Doppler effect; it is not merely instrumental.',
                    d: 'The shift is only 0.4% of the wavelength, giving v = 0.004c, nowhere near the speed of light.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'On the magnitude scale, which statement is correct?',
                  options: [
                    { id: 'a', text: 'A larger (more positive) magnitude means a brighter object' },
                    { id: 'b', text: 'The scale is logarithmic and inverted: a SMALLER magnitude is BRIGHTER, and a 5-magnitude difference is a factor of 100 in flux' },
                    { id: 'c', text: 'The scale is linear: magnitude 4 is twice as bright as magnitude 2' },
                    { id: 'd', text: 'Magnitude measures distance, not brightness' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'This is the classic inversion mistake — a larger magnitude means a FAINTER object, not a brighter one.',
                    b: 'Correct — the magnitude scale is logarithmic and inverted; smaller magnitude = brighter, and each 5 magnitudes is exactly a 100× flux ratio (≈2.512× per magnitude).',
                    c: 'The scale is logarithmic, not linear, and inverted — magnitude 4 is FAINTER than magnitude 2, by about 6.3×, not brighter.',
                    d: 'Magnitude measures brightness (apparent or absolute), not distance directly, though comparing the two magnitudes yields distance.',
                  },
                },
                {
                  kind: 'ordering',
                  id: 'q4',
                  prompt: 'Order the inference chain an astronomer follows to reach a galaxy’s distance from a spectrum.',
                  items: [
                    { id: 'photons', text: 'Collect photons on the detector' },
                    { id: 'flux', text: 'Measure flux and identify spectral lines' },
                    { id: 'velocity', text: 'Compute recession velocity from the line’s redshift' },
                    { id: 'distance', text: 'Apply Hubble’s law (d = v / H₀) to get distance' },
                  ],
                  correctOrder: ['photons', 'flux', 'velocity', 'distance'],
                  explanation: 'The chain runs from raw photons → measured flux and identified lines → recession velocity from the redshift (Δλ/λ₀ = v/c) → distance via Hubble’s law (d = v/H₀). Each step is an inference from the light, never a direct measurement of the physical quantity.',
                },
                {
                  kind: 'mc',
                  id: 'q5',
                  prompt: 'What single question best captures "thinking like an astronomer" at every step of an analysis?',
                  options: [
                    { id: 'a', text: '"What is the smallest error bar I can report?"' },
                    { id: 'b', text: '"What did I actually measure, what did I infer, what could systematically bias it, and how big is my uncertainty?"' },
                    { id: 'c', text: '"How can I make the result look like previous studies?"' },
                    { id: 'd', text: '"Which single measurement can I trust completely without any error bar?"' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Chasing the smallest error bar ignores accuracy — a tiny error bar can hide a large systematic, as the Hubble tension shows.',
                    b: 'Correct — separating measurement from inference, hunting for systematics, and propagating uncertainty at every step is exactly the disciplined habit that makes a conclusion defensible.',
                    c: 'Forcing agreement with prior work is confirmation bias, the opposite of honest inference.',
                    d: 'No measurement is trustworthy without an error bar; the whole discipline rests on quantifying uncertainty, not ignoring it.',
                  },
                },
              ],
            },
          },
        ],
      },
      {
        id: 'astro-core-landmark-debates',
        label: 'Landmark Work and Open Debates',
        lessons: [
          // ─── Lesson 1 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-landmark-great-debate-shapley-curtis',
            label: 'The Great Debate: Shapley vs Curtis on the Scale of the Universe (1920)',
            readingMinutes: 6,
            sections: [
              {
                heading: 'One galaxy, or an "island universe" of many?',
                body: 'On 26 April 1920, at the National Museum of Natural History (Smithsonian) in Washington, Harlow Shapley and Heber Curtis presented opposing views on "The Scale of the Universe" — an event later named the Great Debate. The core question was whether the Milky Way IS the entire universe, or whether the faint spiral "nebulae" (like the object in Andromeda, then called the Andromeda Nebula) are separate star systems — "island universes" — far outside it. Shapley argued for a single enormous Milky Way that contained everything, including the spirals. Curtis argued that the spirals were distant galaxies in their own right, comparable to our own. The debate mattered because the answer changed the size of the known universe by orders of magnitude and set the stage for modern cosmology.',
              },
              {
                heading: 'Shapley\'s case: a giant Milky Way, spirals inside it',
                body: 'Shapley had done real, careful work. Using RR Lyrae and Cepheid variable stars (period-luminosity distances — see the next lesson) to map globular clusters, he found the clusters were distributed around a center tens of thousands of light-years away in the direction of Sagittarius, not around the Sun. This correctly dethroned the Sun from the center of the galaxy — a genuine landmark result. But Shapley overestimated the Milky Way\'s size (he put it at roughly 300,000 light-years across), and reasoned that if the galaxy was already that colossal, the spiral nebulae must be relatively nearby gas clouds within or near it, not separate universes. He also leaned on a flawed piece of evidence: Adriaan van Maanen\'s claimed measurement of rotation in spiral nebulae over a few years. If a spiral visibly rotated on that timescale, it had to be small and close — no distant galaxy could show measurable rotation in a decade. Van Maanen\'s measurements later proved spurious.',
              },
              {
                heading: 'Curtis\'s case: spirals are distant galaxies',
                body: 'Curtis marshaled the opposing evidence. Spiral nebulae show dark dust lanes and a spectrum like combined starlight, consistent with them being systems of stars. Novae observed in spirals appeared far fainter than novae in the Milky Way, implying the spirals were enormously distant — if a nova is the same intrinsic brightness everywhere, its apparent faintness places it far away by the inverse-square law. Curtis also argued the "zone of avoidance" (the band near the Milky Way\'s plane where few spirals are seen) was caused by obscuring dust in our own galaxy blocking the view, not by the spirals genuinely avoiding that region. On the big question — are spirals separate galaxies? — Curtis was right. On other points each man was partly wrong: Shapley was right that the Sun is not central and the galaxy is large; Curtis kept a too-small Milky Way. The debate was genuinely unsettled in 1920 and was only resolved a few years later.',
              },
              {
                heading: 'The resolution: Hubble\'s Cepheid in Andromeda (1923–1925)',
                body: 'The Great Debate was decided not by rhetoric but by a distance. In 1923 Edwin Hubble, using the 100-inch Hooker Telescope at Mount Wilson, identified a Cepheid variable star in the Andromeda Nebula (M31). Applying Leavitt\'s period-luminosity relation to that Cepheid gave a distance far beyond any plausible size of the Milky Way — placing M31 as a separate galaxy. (Hubble\'s first value, near 900,000 light-years, was itself too small because of a later-discovered calibration error between two Cepheid populations; the modern distance to Andromeda is about 2.5 million light-years — but even his underestimate was already far outside the Milky Way.) This settled the island-universe question in Curtis\'s favor and inaugurated extragalactic astronomy: the universe is a vast collection of galaxies, and the Milky Way is just one.',
              },
            ],
            workedExample: 'How does an apparently faint nova argue for great distance? Suppose novae reach roughly the same peak intrinsic luminosity everywhere. Flux falls as F = L / (4πd²), so for a fixed L the flux ratio between a nearby (Milky Way) nova and a distant (spiral) nova is F_near / F_far = (d_far / d_near)². Curtis noted novae in spirals looked about 10 magnitudes fainter than typical Milky Way novae. On the magnitude scale a difference of 10 magnitudes is a flux ratio of 100^(10/5) = 10^4 = 10,000× fainter. Since flux scales as 1/d², a 10,000× drop in flux means the distance is √10,000 = 100× greater. If a bright Milky Way nova sits a few thousand light-years off, a spiral nova 100× farther is hundreds of thousands of light-years away — far outside any reasonable Milky Way. That inverse-square reasoning, applied to a "standard-brightness" object, is exactly the logic the whole distance ladder is built on.',
            judgeFraming: 'Judges use the Great Debate to test whether a student understands that scientific controversies are resolved by measurement, not authority — and that a famous scientist (Shapley) can be right on one claim (the Sun is off-center) and wrong on another (spirals are local). If your project cites a "settled fact," a judge may probe how it was settled. Being able to say "the island-universe question was open in 1920 and closed by Hubble measuring a Cepheid distance to Andromeda in 1923–25" shows you grasp that a single decisive distance measurement can overturn a debate, and that both debaters held a mix of correct and incorrect subclaims.',
            checkpoint: {
              questions: [
                {
                  kind: 'mc',
                  id: 'q1',
                  prompt: 'What was the central question of the 1920 Shapley–Curtis "Great Debate"?',
                  options: [
                    { id: 'a', text: 'Whether the Sun or the Earth is the center of the solar system' },
                    { id: 'b', text: 'Whether the spiral nebulae are separate galaxies ("island universes") or objects within a single Milky Way that IS the whole universe' },
                    { id: 'c', text: 'Whether the universe is expanding or static' },
                    { id: 'd', text: 'Whether dark matter exists in galaxy clusters' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'That is the Copernican question, settled centuries earlier — not the 1920 debate.',
                    b: 'Correct — Shapley held the Milky Way was the entire universe with spirals inside it; Curtis held the spirals were distant separate galaxies. The debate was about the scale of the universe.',
                    c: 'Cosmic expansion was Hubble\'s later (1929) result, not the subject of the 1920 debate.',
                    d: 'Dark matter (Zwicky 1933, Rubin 1970s) came later and was not the debate\'s topic.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'On which major point was Shapley CORRECT, even though he was wrong about the spirals?',
                  options: [
                    { id: 'a', text: 'That the Sun sits at the exact center of the Milky Way' },
                    { id: 'b', text: 'That the Sun is NOT at the center of the Milky Way — the galactic center lies far away toward Sagittarius' },
                    { id: 'c', text: 'That the Milky Way is only a few thousand light-years across' },
                    { id: 'd', text: 'That van Maanen\'s spiral-rotation measurements were reliable' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'The opposite — Shapley\'s globular-cluster mapping showed the Sun is off-center, dethroning it from the center.',
                    b: 'Correct — Shapley\'s distances to globular clusters (via variable stars) correctly placed the galactic center tens of thousands of light-years away toward Sagittarius, a genuine landmark result.',
                    c: 'Shapley actually OVERestimated the galaxy\'s size (~300,000 ly), which pushed him toward thinking spirals must be inside it.',
                    d: 'Van Maanen\'s rotation measurements were later shown to be spurious; relying on them was one of Shapley\'s errors, not a correct point.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'How was the Great Debate ultimately RESOLVED?',
                  options: [
                    { id: 'a', text: 'By a vote of the American Astronomical Society' },
                    { id: 'b', text: 'Edwin Hubble identified a Cepheid variable in the Andromeda Nebula (1923–25) and used the period-luminosity relation to show it lies far outside the Milky Way' },
                    { id: 'c', text: 'Curtis discovered dark matter in Andromeda' },
                    { id: 'd', text: 'By the discovery of the cosmic microwave background' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'The debate was settled by a measurement, not a vote.',
                    b: 'Correct — Hubble\'s Cepheid in M31, dated by Leavitt\'s period-luminosity law, yielded a distance far beyond the Milky Way, proving spirals are separate galaxies and founding extragalactic astronomy.',
                    c: 'Dark matter was not involved; the resolving evidence was a Cepheid distance.',
                    d: 'The CMB (1965) is a much later discovery, unrelated to resolving the island-universe question.',
                  },
                },
                {
                  kind: 'matching',
                  id: 'q4',
                  prompt: 'Match each figure/idea to their position or role in the debate.',
                  left: [
                    { id: 'shapley', text: 'Harlow Shapley' },
                    { id: 'curtis', text: 'Heber Curtis' },
                    { id: 'vanmaanen', text: 'Adriaan van Maanen' },
                    { id: 'hubble', text: 'Edwin Hubble' },
                  ],
                  right: [
                    { id: 'onegalaxy', text: 'One giant Milky Way that IS the whole universe; spirals are inside it' },
                    { id: 'islands', text: 'Spirals are distant separate galaxies ("island universes")' },
                    { id: 'rotation', text: 'Reported (spurious) spiral-nebula rotation used to argue spirals must be nearby' },
                    { id: 'resolved', text: 'Resolved the debate by measuring a Cepheid distance to Andromeda' },
                  ],
                  correctPairs: [
                    ['shapley', 'onegalaxy'],
                    ['curtis', 'islands'],
                    ['vanmaanen', 'rotation'],
                    ['hubble', 'resolved'],
                  ],
                  explanation: 'Shapley argued for a single all-encompassing Milky Way; Curtis argued the spirals were distant galaxies (island universes) and was ultimately right. Van Maanen\'s later-discredited spiral-rotation measurements were used to support the "spirals are nearby" view. Hubble resolved the debate by identifying a Cepheid in Andromeda and applying the period-luminosity relation.',
                },
              ],
            },
          },

          // ─── Lesson 2 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-landmark-leavitt-period-luminosity',
            label: 'Henrietta Leavitt and the Period-Luminosity Law',
            readingMinutes: 5,
            sections: [
              {
                heading: 'The problem: brightness alone cannot give distance',
                body: 'A star\'s apparent brightness (flux) depends on both its true luminosity and its distance, through the inverse-square law F = L / (4πd²). A faint-looking star could be intrinsically dim and near, or intrinsically brilliant and far. To turn apparent brightness into a distance you need an independent handle on the star\'s true luminosity — a "standard candle." Before 1908 there was essentially no reliable standard candle beyond the few hundred nearest stars measurable by parallax. Henrietta Swan Leavitt, working at Harvard College Observatory as one of the "computers" (women hired to measure and catalog photographic plates), found the standard candle that unlocked the cosmic distance ladder.',
              },
              {
                heading: 'Leavitt\'s discovery: pulsation period tracks luminosity',
                body: 'Studying Cepheid variable stars — stars that pulse in brightness with regular periods — on photographic plates of the Small Magellanic Cloud, Leavitt noticed in 1908, and established quantitatively in 1912, that the brighter Cepheids had longer periods. Crucially, all the Cepheids in the Small Magellanic Cloud are at essentially the same distance from us (the cloud is far away and compact relative to that distance), so differences in their apparent brightness reflect differences in their TRUE luminosity, not distance. That controlled setup let her isolate a clean relationship: the period-luminosity relation. A Cepheid\'s pulsation period — something you measure just by timing the light curve, with no distance needed — tells you its intrinsic luminosity. Once you know the luminosity and measure the apparent flux, the inverse-square law gives the distance.',
              },
              {
                heading: 'Calibration and the ladder it built',
                body: 'Leavitt\'s relation gave RELATIVE luminosities; to get absolute distances someone had to calibrate the zero point — pin down the true luminosity for at least one Cepheid of known distance (via parallax or cluster methods). Ejnar Hertzsprung and Shapley did early calibrations. A later complication: there are actually two types of Cepheids (classical Population I and the fainter Population II / W Virginis stars) obeying different period-luminosity relations, and conflating them caused systematic distance errors — this is part of why Hubble\'s early galaxy distances were too small and were revised (by Walter Baade in the 1950s). Despite these calibration subtleties, Leavitt\'s law is the foundational rung of the cosmic distance ladder: parallax calibrates Cepheids, Cepheids calibrate more distant standard candles (like Type Ia supernovae), and those reach across the observable universe. Hubble\'s resolution of the Great Debate and his expansion law both rode on Leavitt\'s Cepheids.',
              },
            ],
            workedExample: 'A Cepheid is observed to pulse with a period of 10 days. A calibrated period-luminosity relation says a 10-day Cepheid has absolute magnitude M ≈ −4.0 (very luminous — remember the magnitude scale is inverted, so more negative = brighter). You measure its apparent magnitude as m = +16.0. Use the distance-modulus relation m − M = 5·log₁₀(d/10 pc). Then m − M = 16.0 − (−4.0) = 20.0, so 5·log₁₀(d/10 pc) = 20.0 → log₁₀(d/10 pc) = 4.0 → d/10 pc = 10⁴ → d = 10⁵ pc = 100,000 pc = 100 kpc. That places the star well outside the Milky Way (~30 kpc across), in a satellite galaxy or beyond. The whole chain used only a measured period (→ M) and a measured apparent magnitude (→ m); the pulsation timing supplied the intrinsic luminosity that flux alone never could.',
            judgeFraming: 'Judges probe standard candles because they separate students who understand WHY a distance is trustworthy from those who quote a number. If your project uses any distance beyond the solar neighborhood, expect "how do we know that distance?" Naming Leavitt\'s period-luminosity relation — and explaining that all the SMC Cepheids sat at one common distance, which is what let her isolate luminosity from distance — shows you understand the logic of a controlled calibration. Bonus credit for knowing the relation gives luminosity, and that the inverse-square law converts luminosity plus apparent brightness into distance.',
            checkpoint: {
              questions: [
                {
                  kind: 'mc',
                  id: 'q1',
                  prompt: 'What did Henrietta Leavitt discover about Cepheid variable stars?',
                  options: [
                    { id: 'a', text: 'That their color determines their temperature' },
                    { id: 'b', text: 'That their pulsation PERIOD is tightly related to their intrinsic LUMINOSITY, making them standard candles' },
                    { id: 'c', text: 'That they are all exactly the same brightness' },
                    { id: 'd', text: 'That their redshift measures distance' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'The color–temperature relation (blackbody/Wien\'s law) is a different result and not Leavitt\'s discovery.',
                    b: 'Correct — Leavitt found (1908, quantified 1912) that longer-period Cepheids are more luminous, so a measured period yields the true luminosity, the basis for using them as standard candles.',
                    c: 'They are NOT all the same brightness — the whole point is that period tells you HOW luminous each one is.',
                    d: 'Redshift-based distance (Hubble\'s law) is a different, later tool; Leavitt\'s method uses pulsation period and the inverse-square law.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'Why was studying Cepheids in the Small Magellanic Cloud the key that let Leavitt isolate the period-luminosity relation?',
                  options: [
                    { id: 'a', text: 'The SMC is the closest object to Earth, so parallax was easy' },
                    { id: 'b', text: 'All the SMC Cepheids are at essentially the SAME distance, so differences in apparent brightness reflect true differences in luminosity, not distance' },
                    { id: 'c', text: 'The SMC has no dust, so no light is absorbed' },
                    { id: 'd', text: 'The SMC Cepheids all have the same period' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'The SMC is a distant satellite galaxy, not the closest object, and parallax to it is not feasible; that is not why it helped.',
                    b: 'Correct — because the SMC stars share (to good approximation) one common distance, apparent-brightness differences among them map directly to luminosity differences, letting her tie luminosity to period cleanly.',
                    c: 'Dust is not the reason; the controlled common distance is what matters, and dust corrections are a separate concern.',
                    d: 'They have a RANGE of periods — that range, plotted against brightness, is exactly what revealed the relation.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'To turn Leavitt\'s relation into actual distances in parsecs, what additional step is required?',
                  options: [
                    { id: 'a', text: 'Nothing — the period alone gives the distance directly' },
                    { id: 'b', text: 'Calibrating the zero point: pinning the absolute luminosity for at least one Cepheid of independently known distance (e.g., by parallax)' },
                    { id: 'c', text: 'Measuring the star\'s radial velocity' },
                    { id: 'd', text: 'Waiting for the star to go supernova' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Period gives RELATIVE luminosity; without a calibrated zero point you cannot convert to absolute distances.',
                    b: 'Correct — the relation must be anchored by an independently-known distance (parallax or cluster) to set the absolute luminosity scale; Hertzsprung and Shapley did early calibrations.',
                    c: 'Radial velocity is unrelated to a Cepheid\'s luminosity calibration.',
                    d: 'Cepheids are pulsating stars used as candles while stable; a supernova is a different distance indicator entirely.',
                  },
                },
                {
                  kind: 'ordering',
                  id: 'q4',
                  prompt: 'Put the steps of using a Cepheid to find its distance in the correct order.',
                  items: [
                    { id: 'period', text: 'Time the light curve to measure the pulsation period' },
                    { id: 'lum', text: 'Use the calibrated period-luminosity relation to get the intrinsic luminosity (absolute magnitude)' },
                    { id: 'flux', text: 'Measure the apparent brightness (apparent magnitude)' },
                    { id: 'dist', text: 'Apply the inverse-square law / distance modulus to solve for distance' },
                  ],
                  correctOrder: ['period', 'lum', 'flux', 'dist'],
                  explanation: 'First measure the period from the light curve; the period-luminosity relation converts that to intrinsic luminosity (absolute magnitude); separately measure the apparent brightness; then combine the two via the inverse-square law (distance modulus m − M = 5·log₁₀(d/10 pc)) to solve for distance.',
                },
              ],
            },
          },

          // ─── Lesson 3 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-landmark-hubble-expanding-universe',
            label: 'Hubble and the Expanding Universe',
            readingMinutes: 6,
            sections: [
              {
                heading: 'Slipher\'s redshifts and Hubble\'s distances',
                body: 'Two ingredients came together around 1929. First, Vesto Slipher at Lowell Observatory had spent the 1910s measuring the spectra of spiral nebulae and found that most were redshifted — their spectral lines shifted toward longer (redder) wavelengths, indicating they were moving away from us, some at hundreds of km/s. Second, Edwin Hubble (with assistant Milton Humason) had, by using Cepheids and other indicators, measured distances to a set of those galaxies. In 1929 Hubble plotted recession velocity against distance and reported a roughly linear relation: more distant galaxies recede faster. This is Hubble\'s law, v = H₀·d, where H₀ (the Hubble constant) is the slope. The Belgian priest-physicist Georges Lemaître had derived essentially the same relation from Einstein\'s general relativity in 1927, two years earlier — so the underlying law is sometimes called the Hubble–Lemaître law.',
              },
              {
                heading: 'What redshift is — and what it is not',
                body: 'The cosmological redshift is quantified as z = (λ_observed − λ_emitted) / λ_emitted, the fractional stretch of a spectral line\'s wavelength. For small z the recession velocity is v ≈ cz. Critically, cosmological redshift is not a classical Doppler shift of galaxies flying through static space; in general relativity it is the STRETCHING OF SPACE ITSELF between us and the galaxy as the universe expands — the light wave is stretched along with the expanding space during its journey. A common misconception is that there is a center from which everything flies away, or that the Milky Way is special. In fact an observer in ANY galaxy sees all others receding with the same v = H₀·d relation; the expansion has no center within the universe, like dots on the surface of an inflating balloon all moving apart from each other.',
              },
              {
                heading: 'Why the expanding universe was a landmark — and its live descendant',
                body: 'Hubble\'s result transformed cosmology from static to dynamic. Einstein had earlier inserted a "cosmological constant" (Λ) into his equations specifically to keep the universe static, and reportedly regarded that fudge as a blunder once expansion was observed (the constant would return in a very different role decades later — see the dark-energy lesson). Run the expansion backward and everything was once compressed together: this is the conceptual root of the Big Bang model, with Lemaître\'s "primeval atom." The Hubble constant H₀ also sets a rough timescale: 1/H₀ is the Hubble time, an order-of-magnitude estimate for the age of the universe. Hubble\'s own H₀ was far too large (about 500 km/s/Mpc) because of his miscalibrated Cepheid distances, implying a Hubble time of only ~2 billion years, in tension with the age of the Earth — a discrepancy resolved only when the distance scale was corrected. The precise value of H₀ is still debated today (the "Hubble tension," the unit\'s final lesson).',
              },
            ],
            workedExample: 'A galaxy\'s spectrum shows a hydrogen line normally at rest wavelength λ_emitted = 656.3 nm (Hα) observed instead at λ_observed = 662.9 nm. The redshift is z = (662.9 − 656.3) / 656.3 = 6.6 / 656.3 ≈ 0.01006. For this small z the recession velocity is v ≈ c·z = (3.0×10⁵ km/s)(0.01006) ≈ 3.0×10³ km/s = 3000 km/s. Now apply Hubble\'s law with a modern H₀ ≈ 70 km/s/Mpc to estimate distance: d = v / H₀ = 3000 / 70 ≈ 43 Mpc (about 140 million light-years). Notice the whole distance came from a wavelength shift plus a value of H₀ — which is exactly why pinning down H₀ matters so much: change H₀ from 67 to 73 and every Hubble-law distance (and the inferred age of the universe) shifts with it.',
            judgeFraming: 'Judges ask about the expanding universe to check for two specific misconceptions. First, that redshift equals a galaxy Doppler-shifting through fixed space — the deeper (and correct) picture is space itself stretching, so a strong answer distinguishes cosmological redshift from ordinary Doppler. Second, the "center of expansion" trap — a student who says "everything flies away from us because we\'re at the center" reveals a gap; the balloon analogy (every observer sees the same recession, no center) shows real understanding. If your project uses any redshift-based distance, be ready to write v = H₀·d and explain that its accuracy is only as good as H₀.',
            checkpoint: {
              questions: [
                {
                  kind: 'mc',
                  id: 'q1',
                  prompt: 'Hubble\'s law states that a galaxy\'s recession velocity v is related to its distance d by:',
                  options: [
                    { id: 'a', text: 'v = H₀ / d (velocity inversely proportional to distance)' },
                    { id: 'b', text: 'v = H₀ · d (velocity proportional to distance — more distant galaxies recede faster)' },
                    { id: 'c', text: 'v = H₀ · d² (velocity proportional to distance squared)' },
                    { id: 'd', text: 'v = c (all galaxies recede at the speed of light)' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Inverse proportionality is wrong — nearer galaxies recede SLOWER, not faster.',
                    b: 'Correct — Hubble\'s (Hubble–Lemaître) law is linear: v = H₀·d, so recession speed grows in proportion to distance.',
                    c: 'The relation is linear in d, not quadratic.',
                    d: 'Recession velocity varies with distance and is generally far below c for nearby galaxies; it is not a fixed value.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'In modern cosmology, the cosmological redshift of a distant galaxy is best understood as:',
                  options: [
                    { id: 'a', text: 'A classical Doppler shift from the galaxy moving through fixed, static space' },
                    { id: 'b', text: 'The stretching of space itself between us and the galaxy as the universe expands, which stretches the light\'s wavelength' },
                    { id: 'c', text: 'Light losing energy as it "tires" over long distances' },
                    { id: 'd', text: 'A shift caused by the galaxy\'s strong magnetic field' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Cosmological redshift is not a motion-through-static-space Doppler effect; treating it that way is the common misconception.',
                    b: 'Correct — in general relativity the expansion stretches space between source and observer, stretching the light\'s wavelength during transit; this is distinct from a classical Doppler shift.',
                    c: '"Tired light" is a discredited alternative that fails many tests (e.g., time-dilation of supernova light curves).',
                    d: 'Magnetic fields do not produce the systematic cosmological redshift; expansion does.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'A student says, "Since all galaxies recede from us, the Milky Way must be at the center of the universe." What is the correct response?',
                  options: [
                    { id: 'a', text: 'Correct — the Milky Way is at the center of cosmic expansion' },
                    { id: 'b', text: 'Incorrect — in a uniformly expanding universe, an observer in ANY galaxy sees all others receding by the same v = H₀·d law; there is no center' },
                    { id: 'c', text: 'Correct — only the Milky Way is stationary while all others move' },
                    { id: 'd', text: 'Incorrect — actually all galaxies are moving TOWARD us' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'This is the classic "center of expansion" misconception; uniform expansion has no special center.',
                    b: 'Correct — like dots on an inflating balloon, every observer sees the same recession relation; the expansion has no center within the universe.',
                    c: 'The Milky Way is not uniquely stationary; the pattern is symmetric for every observer.',
                    d: 'Distant galaxies recede (redshift), they do not approach; only a few nearby ones (e.g., Andromeda) are bound and blueshifted.',
                  },
                },
                {
                  kind: 'matching',
                  id: 'q4',
                  prompt: 'Match each contributor/quantity to its role in the expanding-universe picture.',
                  left: [
                    { id: 'slipher', text: 'Vesto Slipher' },
                    { id: 'lemaitre', text: 'Georges Lemaître' },
                    { id: 'hubble', text: 'Edwin Hubble' },
                    { id: 'h0', text: 'The Hubble constant H₀' },
                  ],
                  right: [
                    { id: 'spectra', text: 'Measured the redshifts (spectra) of spiral nebulae in the 1910s' },
                    { id: 'theory', text: 'Derived the velocity–distance relation from general relativity (1927) — the "primeval atom"' },
                    { id: 'plot', text: 'Plotted velocity vs. distance in 1929, establishing the observed linear law' },
                    { id: 'slope', text: 'The slope of the velocity–distance line; its inverse sets the Hubble time' },
                  ],
                  correctPairs: [
                    ['slipher', 'spectra'],
                    ['lemaitre', 'theory'],
                    ['hubble', 'plot'],
                    ['h0', 'slope'],
                  ],
                  explanation: 'Slipher supplied the galaxy redshifts; Lemaître derived the velocity–distance relation from general relativity in 1927 (hence Hubble–Lemaître law); Hubble published the observed linear velocity–distance plot in 1929; H₀ is the slope of that line, and 1/H₀ (the Hubble time) sets a rough age of the universe.',
                },
              ],
            },
          },

          // ─── Lesson 4 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-landmark-dark-matter-zwicky-rubin',
            label: 'Dark Matter: Zwicky, Rubin, and Galaxy Rotation Curves',
            readingMinutes: 6,
            sections: [
              {
                heading: 'Zwicky 1933: the Coma cluster weighs too much',
                body: 'The first strong hint of dark matter came from Fritz Zwicky in 1933, studying the Coma galaxy cluster. Zwicky measured the velocities of galaxies moving within the cluster and applied the virial theorem, which relates the average kinetic energy of a bound, gravitationally-relaxed system to its total mass: for a stable cluster, the galaxies\' speeds imply how much mass must be present to hold them together gravitationally. The velocities he found were far too high — the visible galaxies did not supply nearly enough gravitational mass to keep the cluster bound at those speeds. He concluded there must be a large amount of unseen "dunkle Materie" (dark matter) providing the missing gravity. The discrepancy was enormous, but Zwicky\'s result was largely set aside for decades, partly due to uncertainties in cluster distances and his own contentious reputation.',
              },
              {
                heading: 'Keplerian expectation vs. flat rotation curves',
                body: 'The decisive evidence came from Vera Rubin and Kent Ford in the 1970s, measuring how fast stars and gas orbit within individual spiral galaxies as a function of radius — the rotation curve. Newtonian gravity makes a clear prediction: if most of a galaxy\'s mass is concentrated in its luminous central bulge, then a star far out in the disk should orbit like a planet far from the Sun, with orbital speed FALLING as v ∝ 1/√r (Keplerian decline) — because at large radius the enclosed mass M(r) is essentially constant and v = √(GM/r). Instead, Rubin found that rotation curves stay FLAT: orbital speed remains roughly constant out to the largest measurable radii, well beyond where the visible light fades. A flat v(r) requires the enclosed mass M(r) to keep growing linearly with radius (M ∝ r, so that v = √(GM/r) stays constant), meaning there is a large, extended halo of unseen mass surrounding the visible galaxy.',
              },
              {
                heading: 'The modern picture and the live debate',
                body: 'Rubin\'s rotation curves, measured across dozens of galaxies, turned dark matter from Zwicky\'s isolated anomaly into a pervasive, hard-to-dismiss phenomenon. Independent lines now converge: gravitational lensing (light bending around unseen mass, e.g., the Bullet Cluster where the lensing mass is offset from the visible hot gas), the cosmic microwave background\'s acoustic peaks, and large-scale structure formation all require non-luminous, non-baryonic matter — roughly 27% of the universe\'s energy density, versus about 5% ordinary matter. Yet WHAT dark matter is remains genuinely open: leading candidates are WIMPs (weakly interacting massive particles) and axions, but decades of direct-detection experiments have not found a particle. A minority view, Modified Newtonian Dynamics (MOND), proposes altering the gravitational law at low accelerations instead of adding unseen mass; MOND fits many individual galaxy rotation curves elegantly but struggles with clusters and the CMB, where particle dark matter fits better. So the EVIDENCE for missing gravity is overwhelming; its IDENTITY is one of the biggest open problems in physics.',
              },
            ],
            workedExample: 'Consider a star orbiting at radius r = 20 kpc in a spiral galaxy, observed to move at v = 200 km/s (a typical flat-rotation-curve value). The mass enclosed within its orbit is M = v²r / G. Converting: v = 2.0×10⁵ m/s, r = 20 kpc = 20 × 3.086×10¹⁹ m = 6.17×10²⁰ m, G = 6.674×10⁻¹¹ N·m²/kg². Then M = (2.0×10⁵)² × 6.17×10²⁰ / 6.674×10⁻¹¹ = (4.0×10¹⁰)(6.17×10²⁰) / 6.674×10⁻¹¹ ≈ 3.7×10⁴¹ kg. Dividing by the Sun\'s mass (1.99×10³⁰ kg) gives ≈ 1.9×10¹¹ solar masses enclosed within 20 kpc. The key point: the galaxy\'s starlight at 20 kpc has all but vanished, yet the dynamics demand ~10¹¹ M☉ of enclosed mass out there — and because v stays flat as r grows, M keeps rising with r. The stars you can see cannot account for it; the rest is dark.',
            judgeFraming: 'Judges probe dark matter to see whether a student can distinguish EVIDENCE from IDENTITY. A weak answer treats "dark matter" as a known substance; a strong one says the evidence (flat rotation curves, cluster velocities, lensing) robustly shows missing GRAVITY, while the particle identity (WIMP? axion? or is gravity modified, à la MOND?) is still unresolved. If your project touches galactic dynamics, expect "why not just unseen ordinary stars or gas?" — the answer is that the amount required, and the CMB/nucleosynthesis constraints on ordinary (baryonic) matter, rule that out. Naming Zwicky (1933, clusters) and Rubin (1970s, rotation curves) as the two landmark strands shows historical grounding.',
            checkpoint: {
              questions: [
                {
                  kind: 'mc',
                  id: 'q1',
                  prompt: 'What did Vera Rubin\'s galaxy rotation curves show that pointed to dark matter?',
                  options: [
                    { id: 'a', text: 'Orbital speeds fall off as 1/√r far from the center, exactly as Newtonian gravity predicts for visible mass' },
                    { id: 'b', text: 'Orbital speeds stay roughly FLAT (constant) out to large radii, far beyond the visible light, requiring extra unseen mass' },
                    { id: 'c', text: 'Galaxies do not rotate at all' },
                    { id: 'd', text: 'Stars near the center orbit slower than stars far out' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'A Keplerian 1/√r decline is what visible mass alone WOULD predict; Rubin found this did NOT happen — that is the whole surprise.',
                    b: 'Correct — flat rotation curves out past the luminous disk require the enclosed mass to keep growing (M ∝ r), implying an extended dark halo.',
                    c: 'Galaxies clearly rotate; the point is HOW their orbital speed varies with radius.',
                    d: 'This is not the finding; the striking result is that outer speeds stay high (flat), not a simple inner-slow/outer-fast rule.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'For a flat rotation curve where orbital speed v is constant with radius r, how must the enclosed mass M(r) behave? (Use v = √(GM/r).)',
                  options: [
                    { id: 'a', text: 'M(r) must be constant with radius' },
                    { id: 'b', text: 'M(r) must grow linearly with radius, M ∝ r' },
                    { id: 'c', text: 'M(r) must fall as 1/r' },
                    { id: 'd', text: 'M(r) must grow as r²' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'If M were constant, v = √(GM/r) would DECLINE as 1/√r — a Keplerian curve, not a flat one.',
                    b: 'Correct — solving v = √(GM/r) for constant v gives M = v²r/G, so M grows linearly with r; the mass keeps accumulating in an extended halo.',
                    c: 'M falling as 1/r would make v drop even faster than Keplerian, contradicting a flat curve.',
                    d: 'M ∝ r² would make v RISE with radius, which is not what is observed.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'Who first inferred large amounts of unseen mass, and from what observation, in 1933?',
                  options: [
                    { id: 'a', text: 'Edwin Hubble, from galaxy redshifts' },
                    { id: 'b', text: 'Fritz Zwicky, from the high velocities of galaxies in the Coma cluster (via the virial theorem)' },
                    { id: 'c', text: 'Vera Rubin, from spiral-galaxy rotation curves' },
                    { id: 'd', text: 'Henrietta Leavitt, from Cepheid periods' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Hubble\'s redshift work established cosmic expansion, not dark matter.',
                    b: 'Correct — Zwicky applied the virial theorem to the Coma cluster in 1933 and found the galaxies moved too fast to be bound by the visible mass, coining "dark matter."',
                    c: 'Rubin\'s rotation-curve work came in the 1970s — decades later and on individual galaxies, not clusters.',
                    d: 'Leavitt\'s Cepheid work was about distances, not dark matter.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q4',
                  prompt: 'What is the current scientific status of dark matter?',
                  options: [
                    { id: 'a', text: 'The evidence for extra gravitating mass is weak and most astronomers doubt it' },
                    { id: 'b', text: 'The evidence for missing gravity is overwhelming and convergent, but the IDENTITY of dark matter (e.g., WIMPs, axions) is still unknown, and a minority argues gravity itself is modified (MOND)' },
                    { id: 'c', text: 'Dark matter has been directly detected in the laboratory and identified as a specific particle' },
                    { id: 'd', text: 'Dark matter turned out to be ordinary faint stars, fully accounting for the discrepancy' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'The evidence (rotation curves, cluster dynamics, lensing, the CMB) is strong and convergent, not weak.',
                    b: 'Correct — multiple independent lines robustly require unseen mass (~27% of the energy density), but its particle identity is unconfirmed and MOND remains a minority alternative that struggles with clusters and the CMB.',
                    c: 'No dark-matter particle has been confirmed by direct detection despite decades of searching.',
                    d: 'Ordinary (baryonic) matter, including faint stars, is ruled out by CMB and nucleosynthesis constraints from accounting for the full discrepancy.',
                  },
                },
              ],
            },
          },

          // ─── Lesson 5 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-landmark-accelerating-universe-dark-energy',
            label: 'The Accelerating Universe and Dark Energy (1998, Nobel 2011)',
            readingMinutes: 6,
            sections: [
              {
                heading: 'The expectation: gravity should be slowing the expansion',
                body: 'Through the 1990s cosmologists expected the universe\'s expansion to be DECELERATING. The reasoning was simple: the universe is full of matter, matter gravitates, and gravity is attractive, so the mutual pull of all that matter should be gradually braking the cosmic expansion Hubble had discovered. The open question was only HOW MUCH it was slowing — enough to eventually halt and recollapse (a "Big Crunch"), or just enough to coast to a stop, or not quite enough (expand forever). To measure the deceleration you need to compare the expansion rate long ago with the rate now, which means measuring precise distances to very distant (hence very ancient) objects and comparing them to their redshifts.',
              },
              {
                heading: 'Type Ia supernovae as the deep standard candle',
                body: 'The tool that made this possible was the Type Ia supernova. A Type Ia occurs when a white dwarf in a binary system accretes matter and approaches the Chandrasekhar mass limit (about 1.4 solar masses), triggering a thermonuclear detonation. Because this happens at a characteristic mass, Type Ia supernovae reach a remarkably consistent peak luminosity — and after a standardizing correction using the light-curve decline rate (the Phillips relation: brighter Type Ia\'s fade more slowly), they become superb standard candles bright enough to be seen billions of light-years away. Two teams — the Supernova Cosmology Project (led by Saul Perlmutter) and the High-z Supernova Search Team (Brian Schmidt and Adam Riess) — raced to measure distant Type Ia\'s to chart the expansion history.',
              },
              {
                heading: 'The 1998 shock: the expansion is speeding up',
                body: 'In 1998 both teams reported the same startling result: the distant supernovae were FAINTER than expected — meaning they were FARTHER away than a decelerating (or even coasting) universe predicted for their redshift. The only consistent interpretation was that the expansion of the universe is ACCELERATING, not slowing. Something with repulsive gravitational effect — a negative-pressure component dubbed dark energy — is driving space apart faster over time and now dominates the cosmic energy budget (about 68%). The simplest description resurrects Einstein\'s cosmological constant Λ (the term he had abandoned) as the energy of empty space itself, giving the standard ΛCDM model (Lambda-Cold-Dark-Matter). Perlmutter, Schmidt, and Riess shared the 2011 Nobel Prize in Physics for the discovery.',
              },
              {
                heading: 'Why it is still an open debate',
                body: 'Dark energy is a description, not an explanation. The cosmological-constant interpretation runs into the notorious "cosmological constant problem": naive quantum-field-theory estimates of the vacuum energy density exceed the observed value by many tens of orders of magnitude — one of the worst quantitative mismatches in physics. Alternatives are actively studied: "quintessence" (a dynamical field whose energy density evolves, so the equation-of-state parameter w need not equal exactly −1), or modifications to general relativity on cosmic scales. Distinguishing a true constant (w = −1) from an evolving dark energy (w ≠ −1) is a central goal of surveys like DESI and the Euclid and Roman missions. So the OBSERVATION (acceleration) is firmly established and Nobel-honored; the NATURE of what causes it is wide open.',
              },
            ],
            workedExample: 'Why does "fainter than expected" imply acceleration? A Type Ia at redshift z has a predicted apparent brightness that depends on how far its light has traveled, which depends on the expansion history. Suppose a decelerating-universe model predicts a supernova at z = 0.5 should appear at apparent magnitude m = 22.0. The teams instead measured it at about m = 22.2 — roughly 0.2 mag fainter. Since flux ratio = 100^(Δm/5) = 100^(0.2/5) = 100^0.04 ≈ 1.20, it is about 20% fainter, i.e. its luminosity distance is √1.20 ≈ 1.10, about 10% FARTHER than the decelerating model allowed. Extra distance for a given redshift means the universe expanded MORE between then and now than deceleration permits — the expansion sped up. It is a small photometric offset (tenths of a magnitude) across many supernovae that carries this enormous conclusion, which is why the standard-candle calibration had to be so careful.',
            judgeFraming: 'Judges use dark energy to test whether a student separates a robust observation from an unexplained cause — and whether they know it is the Type Ia standard candle that made the measurement possible. The classic probe is "how do we know the expansion accelerates?": a strong answer is "distant Type Ia supernovae are fainter, hence farther, than a decelerating universe predicts for their redshift." Expect a follow-up on WHY Type Ia\'s are standard candles (the Chandrasekhar-mass detonation, standardized by the Phillips light-curve relation). Being able to name Perlmutter, Schmidt, and Riess (1998; Nobel 2011) and note that the CAUSE is unknown shows the right blend of fact and humility.',
            checkpoint: {
              questions: [
                {
                  kind: 'mc',
                  id: 'q1',
                  prompt: 'What did the 1998 supernova observations reveal about the expansion of the universe?',
                  options: [
                    { id: 'a', text: 'It is decelerating and will soon recollapse in a Big Crunch' },
                    { id: 'b', text: 'It is ACCELERATING — distant Type Ia supernovae appear fainter (farther) than a decelerating universe predicts for their redshift' },
                    { id: 'c', text: 'It has completely stopped' },
                    { id: 'd', text: 'It is expanding at a perfectly constant, unchanging rate' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'The teams expected deceleration but found the opposite; there is no evidence for imminent recollapse.',
                    b: 'Correct — the distant Type Ia\'s were fainter than a decelerating model predicted, implying they are farther away and the expansion has been speeding up.',
                    c: 'The universe is expanding faster over time, not stopped.',
                    d: 'A constant rate would still be a surprise, but the data specifically show ACCELERATION (increasing rate), not a steady one.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'Why are Type Ia supernovae good "standard candles" for measuring cosmic distances?',
                  options: [
                    { id: 'a', text: 'They all have exactly the same color' },
                    { id: 'b', text: 'They detonate near the Chandrasekhar mass (~1.4 M☉), giving a consistent peak luminosity that can be standardized via the light-curve decline rate (Phillips relation)' },
                    { id: 'c', text: 'They are the closest supernovae to Earth' },
                    { id: 'd', text: 'Their redshift directly equals their distance without any calibration' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Color is not the basis; the consistent peak luminosity from a characteristic detonation mass is.',
                    b: 'Correct — the white dwarf detonates near the Chandrasekhar limit, yielding a repeatable peak brightness, further standardized by the Phillips relation (brighter Ia\'s fade more slowly), making them reliable candles at cosmological distances.',
                    c: 'Type Ia\'s are useful precisely because they are luminous enough to be seen at great distances, not because they are nearby.',
                    d: 'Redshift alone does not give distance without a candle to break the luminosity–distance degeneracy; that is what the Ia provides.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'Which term captures the CURRENT scientific status of dark energy?',
                  options: [
                    { id: 'a', text: 'A fully explained substance whose particle has been detected' },
                    { id: 'b', text: 'A well-established OBSERVATION (accelerating expansion, ~68% of the energy budget) with an UNKNOWN cause — described by the cosmological constant Λ but not explained by it' },
                    { id: 'c', text: 'A discredited idea no longer taken seriously' },
                    { id: 'd', text: 'Simply another name for dark matter' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'No dark-energy "particle" has been detected; it is not a fully explained substance.',
                    b: 'Correct — acceleration is firmly established (and Nobel-honored), dark energy is ~68% of the energy density, but whether it is a true cosmological constant, quintessence, or modified gravity is unresolved (note the cosmological-constant problem).',
                    c: 'It is a mainstream, Nobel-recognized result, not discredited.',
                    d: 'Dark energy (drives acceleration, negative pressure) is distinct from dark matter (extra gravitating mass); they are not the same thing.',
                  },
                },
                {
                  kind: 'matching',
                  id: 'q4',
                  prompt: 'Match each item to its correct description in the dark-energy story.',
                  left: [
                    { id: 'teams', text: 'Perlmutter, Schmidt & Riess' },
                    { id: 'candle', text: 'Type Ia supernova' },
                    { id: 'lambda', text: 'Cosmological constant Λ' },
                    { id: 'lcdm', text: 'ΛCDM model' },
                  ],
                  right: [
                    { id: 'nobel', text: 'Led the two teams; shared the 2011 Nobel Prize for discovering the accelerating expansion (1998)' },
                    { id: 'chandra', text: 'White-dwarf thermonuclear detonation near ~1.4 M☉; the standardizable deep-space standard candle' },
                    { id: 'einstein', text: 'Einstein\'s once-abandoned term, revived as the simplest description of dark energy (energy of empty space)' },
                    { id: 'standard', text: 'The standard cosmological model: cold dark matter plus a cosmological constant' },
                  ],
                  correctPairs: [
                    ['teams', 'nobel'],
                    ['candle', 'chandra'],
                    ['lambda', 'einstein'],
                    ['lcdm', 'standard'],
                  ],
                  explanation: 'Perlmutter (Supernova Cosmology Project) and Schmidt & Riess (High-z team) shared the 2011 Nobel for the 1998 acceleration discovery; the Type Ia is a white-dwarf detonation near the Chandrasekhar mass used as a standardizable candle; Λ is Einstein\'s revived cosmological constant, the simplest description of dark energy; and ΛCDM (cold dark matter + Λ) is today\'s standard cosmological model.',
                },
              ],
            },
          },

          // ─── Lesson 6 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-landmark-hubble-tension',
            label: 'The Hubble Tension: A Crisis in Cosmology?',
            readingMinutes: 6,
            sections: [
              {
                heading: 'Two ways to measure the same constant — and they disagree',
                body: 'The Hubble constant H₀ can be measured two independent ways, and around the mid-2010s they stopped agreeing. The "late-universe" or distance-ladder route builds up from nearby, direct measurements: parallax calibrates Cepheid variables, Cepheids calibrate Type Ia supernovae in nearby galaxies, and the supernovae extend into the Hubble flow — the SH0ES team (led by Adam Riess) gets H₀ ≈ 73 km/s/Mpc, with quoted uncertainties near ±1. The "early-universe" route instead takes the physics of the cosmic microwave background (the relic light from 380,000 years after the Big Bang) and, assuming the standard ΛCDM model, extrapolates forward to predict today\'s expansion rate: the Planck satellite gives H₀ ≈ 67.4 km/s/Mpc, also with small uncertainty. The two values differ by roughly 8–9%, and because both are so precise, the gap is a statistically significant discrepancy — commonly quoted at the 4–6σ level — not something explainable by ordinary error bars overlapping.',
              },
              {
                heading: 'Why ~67 vs ~73 is a big deal',
                body: 'A few km/s/Mpc might sound trivial, but the significance comes from the PRECISION. Decades ago H₀ was uncertain by a factor of two (Hubble\'s own ~500, then debates between ~50 and ~100 in the late 20th century). Today each method claims percent-level precision, so a persistent 8–9% offset between two high-precision methods cannot be shrugged off. If real, it means the standard ΛCDM model — which is what lets you extrapolate the CMB forward to predict H₀ — is missing something: the early-universe prediction and the late-universe measurement of the SAME quantity would be genuinely inconsistent. That is why it is called a "tension" and, if it holds, potentially a crisis: it could point to new physics in the early universe (e.g., "early dark energy" that briefly acts before recombination and shrinks the sound horizon), extra relativistic species, or a departure from the simplest dark-energy assumption.',
              },
              {
                heading: 'Systematics vs. new physics — the live argument',
                body: 'The debate splits into two camps. One holds that the tension is a SYSTEMATIC error hiding in one of the measurements — for instance, subtle problems in the Cepheid calibration, crowding of stars in distant galaxies, dust, or the anchoring of the distance ladder. The strongest response to this has been cross-checks: the JWST has re-observed Cepheids and confirmed the SH0ES Cepheid photometry, and an INDEPENDENT ladder using the tip of the red-giant branch (TRGB) instead of Cepheids gives an intermediate value (roughly 70), keeping the question genuinely unsettled. The other camp argues the measurements are sound and the resolution is NEW PHYSICS beyond ΛCDM. As of the mid-2020s neither camp has won: the tension has survived numerous cross-checks and independent methods (including gravitational-wave "standard sirens," which offer a third, ladder-free route as data accumulate). It stands as one of the most important open problems in modern cosmology.',
              },
            ],
            workedExample: 'How much does the H₀ disagreement change a derived distance? Take a galaxy in the smooth Hubble flow with recession velocity v = 7000 km/s. Using the early-universe value, d = v/H₀ = 7000 / 67.4 ≈ 103.9 Mpc. Using the late-universe value, d = 7000 / 73.0 ≈ 95.9 Mpc. The two distances differ by (103.9 − 95.9)/95.9 ≈ 8.3% — the same ~8% as the H₀ gap, because distance scales as 1/H₀. The same 8% propagates to the inferred age of the universe (roughly ∝ 1/H₀): a higher H₀ implies a somewhat YOUNGER universe. So the tension is not an abstract slope dispute — it shifts every Hubble-flow distance and the cosmic age by ~8%, which is why cosmologists cannot simply average the two and move on.',
            judgeFraming: 'The Hubble tension is a gift for judges because it lets a student demonstrate that science has genuine, current open problems — not just settled textbook facts. A judge may ask "is cosmology basically finished?" The sophisticated answer names the tension: two precise, independent measurements of H₀ (early-universe CMB ≈ 67 vs late-universe distance-ladder ≈ 73) disagree at several sigma, and it is unresolved whether the cause is a systematic error or new physics. Crucially, a strong student explains WHY the small numerical gap matters (both methods are percent-precise, so an 8% offset is significant) rather than dismissing it as "close enough."',
            checkpoint: {
              questions: [
                {
                  kind: 'mc',
                  id: 'q1',
                  prompt: 'The "Hubble tension" refers to a discrepancy between:',
                  options: [
                    { id: 'a', text: 'Two theories of gravity' },
                    { id: 'b', text: 'The value of H₀ from the early-universe CMB (Planck, ~67 km/s/Mpc) versus the late-universe distance ladder (Cepheids + Type Ia supernovae, SH0ES, ~73 km/s/Mpc)' },
                    { id: 'c', text: 'The mass of dark matter and dark energy' },
                    { id: 'd', text: 'Whether the universe is expanding or contracting' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'It is a disagreement between two MEASUREMENTS of H₀, not a clash of gravity theories (though new physics is one possible resolution).',
                    b: 'Correct — the early-universe CMB-based value (~67.4) and the late-universe distance-ladder value (~73) of the SAME constant H₀ disagree by ~8–9%, at several sigma.',
                    c: 'The tension is specifically about H₀, not the dark-matter/dark-energy mass split.',
                    d: 'Cosmic expansion itself is not in doubt; the tension is about the RATE, H₀.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'Why is an ~8% gap between the two H₀ values considered significant rather than "close enough"?',
                  options: [
                    { id: 'a', text: 'Because H₀ is supposed to be exactly zero' },
                    { id: 'b', text: 'Because both methods now claim percent-level PRECISION, so a persistent 8–9% offset is many sigma apart and cannot be absorbed by their error bars' },
                    { id: 'c', text: 'Because 8% is enormous in absolute km/s/Mpc terms' },
                    { id: 'd', text: 'Because the two methods measure different quantities' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'H₀ is a positive expansion rate, not zero; that is not the issue.',
                    b: 'Correct — decades ago H₀ was uncertain by a factor of two, but today each method is percent-precise, so an 8–9% disagreement is a 4–6σ tension, not overlapping uncertainty.',
                    c: 'A few km/s/Mpc is small in absolute terms; the significance comes from the tiny error bars, not a large absolute gap.',
                    d: 'Both methods aim to measure the SAME quantity, today\'s H₀ — that is exactly why their disagreement is a problem.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'What are the two leading interpretations of the Hubble tension?',
                  options: [
                    { id: 'a', text: 'Either the universe is fake, or the data are made up' },
                    { id: 'b', text: 'Either an unrecognized SYSTEMATIC ERROR in one measurement, or genuinely NEW PHYSICS beyond the standard ΛCDM model' },
                    { id: 'c', text: 'Either dark matter or dark energy is entirely wrong' },
                    { id: 'd', text: 'Either the CMB does not exist, or supernovae are not real' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'These are not serious scientific positions; the debate is between systematics and new physics.',
                    b: 'Correct — one camp attributes the tension to a hidden systematic (e.g., in the distance ladder), the other to new physics beyond ΛCDM (e.g., early dark energy); as of the mid-2020s neither has won.',
                    c: 'The tension does not require discarding dark matter or dark energy wholesale, though it may point to a ΛCDM refinement.',
                    d: 'Both the CMB and Type Ia supernovae are well established; the debate is about the H₀ discrepancy they yield, not their existence.',
                  },
                },
                {
                  kind: 'ordering',
                  id: 'q4',
                  prompt: 'Put the rungs of the LATE-universe (distance-ladder) H₀ measurement in the correct order, from nearest/most-direct outward.',
                  items: [
                    { id: 'parallax', text: 'Parallax to nearby stars (geometric, no assumptions)' },
                    { id: 'cepheid', text: 'Cepheid variables calibrated by that parallax' },
                    { id: 'sneia', text: 'Type Ia supernovae calibrated by Cepheids in nearby galaxies' },
                    { id: 'flow', text: 'Type Ia\'s in the distant Hubble flow, giving H₀ from v = H₀·d' },
                  ],
                  correctOrder: ['parallax', 'cepheid', 'sneia', 'flow'],
                  explanation: 'The distance ladder builds outward: geometric parallax anchors nearby stars; those calibrate Cepheid variables; Cepheids in nearby galaxies calibrate Type Ia supernovae; and Type Ia\'s reaching into the smooth Hubble flow finally yield H₀ from v = H₀·d. Each rung depends on the one below it, which is why a systematic error anywhere on the ladder is a candidate explanation for the tension.',
                },
              ],
            },
          },
        ],
      },
      {
        id: 'astro-core-applications',
        label: 'Applications and Designing an Astronomy Study',
        lessons: [
          // ─── Lesson 1 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-app-mining-archives',
            label: 'Mining the Archives: SDSS, Gaia, and TESS',
            readingMinutes: 6,
            sections: [
              {
                heading: 'Modern astronomy is largely an archive science',
                body: 'You do not need a telescope to do original astronomy. The largest sky surveys are public, calibrated, and queryable, and a huge fraction of professional papers are written from archived data the authors never observed themselves. The Sloan Digital Sky Survey (SDSS), running since 2000 from Apache Point, New Mexico, imaged roughly a third of the sky and took spectra of millions of galaxies, quasars, and stars; its data are released in numbered Data Releases (DR1 through DR18 and counting) that never disappear, so a query you run today is reproducible by a judge tomorrow. The European Space Agency\'s Gaia mission (launched 2013) measured positions, distances (parallaxes), and motions for about 1.8 billion stars — the most precise 3-D map of the Milky Way ever made. NASA\'s TESS (Transiting Exoplanet Survey Satellite, launched 2018) records brightness-versus-time "light curves" for hundreds of thousands of bright stars across almost the whole sky. All three are free.',
              },
              {
                heading: 'Each archive answers a different kind of question',
                body: 'The skill is matching your question to the right archive, because each one measures fundamentally different quantities. SDSS gives you photometry in five bands (u, g, r, i, z) plus spectra — so it is the tool for color, redshift, and galaxy/quasar classification questions. Gaia gives you astrometry: parallax (hence distance), proper motion (motion across the sky), and precise brightness and color — so it is the tool for distances, cluster membership, and 3-D structure. TESS gives you time-series photometry at a ~2-minute or 30-minute cadence — so it is the tool for anything that varies in time: transiting exoplanets, eclipsing binaries, pulsating and flaring stars. A common student mistake is to reach for the famous survey (SDSS) for a variability question it cannot answer, or to try to get a distance out of TESS, which does not measure parallax at all.',
              },
              {
                heading: 'Querying is a real, learnable skill — and it is where rigor starts',
                body: 'Access is through web portals (the SDSS SkyServer, the Gaia Archive at ESA, the MAST portal at STScI for TESS) and, more powerfully, through ADQL/SQL queries or Python libraries such as astroquery, astropy, and lightkurve. Learning to write a query that says "give me every star within 0.5 degrees of these coordinates, with parallax greater than 5 milliarcseconds and parallax error under 10 percent" is exactly the kind of reproducible, defensible method judges reward. Two cautions matter for real work. First, Gaia parallaxes carry a small systematic zero-point offset (about −17 microarcseconds on average, per Lindegren et al. 2021) that you subtract for the most precise distances. Second, always record the Data Release you used (e.g. "Gaia DR3," "SDSS DR17"); numbers change slightly between releases, and an unversioned result is not reproducible.',
              },
            ],
            workedExample: 'A student wants the distance to a star and pulls its Gaia DR3 parallax: p = 5.00 milliarcseconds (mas), with a quoted uncertainty of 0.05 mas. Distance in parsecs is simply the reciprocal of the parallax in arcseconds: 5.00 mas = 0.00500 arcsec, so d = 1 / 0.00500 = 200 parsecs (about 652 light-years, since 1 pc ≈ 3.26 ly). Because the fractional parallax error is tiny (0.05/5.00 = 1 percent), the reciprocal is a trustworthy distance here. The student also applies the Gaia zero-point: correcting the parallax to 5.00 − (−0.017) = 5.017 mas shifts the distance to 1/0.005017 ≈ 199.3 pc — a 0.3 percent change, negligible for a bright nearby star but the kind of correction they can cite to show they read the documentation. They record "Gaia DR3, source_id logged, zero-point per Lindegren 2021" in their methods.',
            judgeFraming: 'Judges ask "where did your data come from, and could I reproduce it?" precisely to catch projects that hand-wave their source. Naming the specific archive AND the Data Release (Gaia DR3, not just "Gaia"), and being able to say why that archive fits the question (astrometry for a distance, time-series for a transit), signals a student who understands that in modern astronomy the query IS the experiment. A student who says "I used NASA data" has told the judge nothing reproducible; one who says "Gaia DR3, parallax > 5 mas, error < 10 percent, zero-point corrected" has handed the judge a recipe.',
            checkpoint: {
              questions: [
                {
                  kind: 'matching',
                  id: 'q1',
                  prompt: 'Match each survey to the primary kind of measurement it delivers.',
                  left: [
                    { id: 'sdss', text: 'SDSS' },
                    { id: 'gaia', text: 'Gaia' },
                    { id: 'tess', text: 'TESS' },
                  ],
                  right: [
                    { id: 'spectra', text: 'Multi-band photometry and spectra (colors, redshifts)' },
                    { id: 'astrometry', text: 'Astrometry: parallax, distance, and proper motion' },
                    { id: 'timeseries', text: 'Time-series photometry (light curves) for variability and transits' },
                  ],
                  correctPairs: [
                    ['sdss', 'spectra'],
                    ['gaia', 'astrometry'],
                    ['tess', 'timeseries'],
                  ],
                  explanation: 'SDSS is an imaging-and-spectroscopy survey (u,g,r,i,z photometry plus spectra, hence colors and redshifts); Gaia is an astrometric mission measuring parallax, distance, and proper motion; TESS records brightness versus time, so it is the tool for transits, eclipses, and stellar variability.',
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'A student wants the distance to a nearby star. Which archive is the right primary tool?',
                  options: [
                    { id: 'a', text: 'TESS, from the depth of the light curve' },
                    { id: 'b', text: 'Gaia, from the measured parallax' },
                    { id: 'c', text: 'SDSS, from the u-band magnitude' },
                    { id: 'd', text: 'Any of them — they all measure distance directly' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'TESS measures brightness over time; light-curve depth relates to a transiting object\'s size ratio, not to distance.',
                    b: 'Correct — Gaia measures parallax, and distance in parsecs is the reciprocal of the parallax in arcseconds. It is the purpose-built distance archive.',
                    c: 'A single-band magnitude does not give distance without an independent luminosity; SDSS is for colors and spectra, not geometric distance.',
                    d: 'They do not — only Gaia measures parallax (a geometric distance). SDSS and TESS measure other quantities.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'Why should a project report the specific Data Release (e.g. "Gaia DR3") rather than just "Gaia"?',
                  options: [
                    { id: 'a', text: 'It makes the project sound more technical to judges' },
                    { id: 'b', text: 'Calibrations and values change slightly between releases, so the release is required for reproducibility' },
                    { id: 'c', text: 'Each Data Release covers a different half of the sky' },
                    { id: 'd', text: 'Older releases are deleted, so only the newest works' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Sounding technical is not the reason; reproducibility is a substantive scientific requirement, not a style point.',
                    b: 'Correct — values are refined between releases (better calibration, corrected zero-points), so a result is only reproducible if the release is stated.',
                    c: 'Data Releases are not sky halves; each release generally re-processes and extends the whole survey to date.',
                    d: 'Older releases are archived, not deleted — that permanence is exactly what makes an old query reproducible.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q4',
                  prompt: 'A star has a Gaia parallax of 10.0 mas. Roughly how far away is it?',
                  options: [
                    { id: 'a', text: '10 parsecs' },
                    { id: 'b', text: '100 parsecs' },
                    { id: 'c', text: '1000 parsecs' },
                    { id: 'd', text: '0.1 parsecs' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: '10 pc would require a parallax of 100 mas (0.1 arcsec); this star\'s parallax is ten times smaller.',
                    b: 'Correct — 10.0 mas = 0.0100 arcsec, and d = 1/0.0100 = 100 parsecs. Distance in pc is the reciprocal of parallax in arcseconds.',
                    c: '1000 pc would correspond to a parallax of 1 mas, ten times smaller than measured.',
                    d: 'No star is that close; even the nearest star (Proxima Centauri) is ~1.3 pc, and 0.1 pc would need a 10,000 mas parallax.',
                  },
                },
              ],
            },
          },

          // ─── Lesson 2 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-app-photometry-aavso',
            label: 'Doing Real Photometry: Variable Stars and AAVSO',
            readingMinutes: 6,
            sections: [
              {
                heading: 'Photometry is measuring brightness — and the magnitude scale is backwards and logarithmic',
                body: 'Photometry is the quantitative measurement of an object\'s brightness. Astronomers express brightness in magnitudes, a scale inherited from the Greek astronomer Hipparchus (2nd century BCE), who called the brightest stars "first magnitude" and the faintest visible ones "sixth." Two features trip up beginners. First, the scale is INVERTED: smaller (even negative) numbers are BRIGHTER. Sirius is magnitude −1.5; a faint star might be +12. Second, it is LOGARITHMIC: in 1856 Norman Pogson fixed the ratio so that a difference of exactly 5 magnitudes equals a brightness (flux) ratio of exactly 100. That makes one magnitude a flux ratio of the fifth root of 100, about 2.512. The working relation is m₁ − m₂ = −2.5 log₁₀(F₁ / F₂): the minus sign encodes the inversion, and the 2.5 encodes the log-100-per-5 convention.',
              },
              {
                heading: 'Differential photometry: comparison stars make it robust',
                body: 'You almost never measure a star\'s brightness in an absolute sense from the ground. Instead you do DIFFERENTIAL photometry: you measure your target and one or more nearby, known, non-varying COMPARISON stars in the same image, and report the difference. This is powerful because clouds, haze, and changing air path affect the target and the comparisons almost identically, so taking the difference cancels most of the atmosphere and the instrument out. You measure the light inside a software "aperture" around each star, subtract the sky background measured in an annulus around it, and get an instrumental flux you convert to a magnitude difference. Choosing good comparison stars — similar brightness, similar color, confirmed constant — is where amateur data quality is won or lost.',
              },
              {
                heading: 'The AAVSO turns amateurs into a professional-grade network',
                body: 'The American Association of Variable Star Observers (AAVSO), founded in 1911, is the world\'s largest network of amateur variable-star observers and holds a database of tens of millions of observations stretching back over a century — a genuine scientific resource that professionals mine for long-baseline behavior no single grant could fund. AAVSO publishes standardized comparison-star charts (with calibrated magnitudes) so that observers worldwide report on a common scale, and it defines target lists (like Mira-type long-period variables and cataclysmic variables) worth monitoring. For a student, contributing even a handful of well-calibrated observations to the AAVSO International Database, or downloading its light curves to analyze, is doing exactly what professional variable-star astronomers do. Long-period variables such as Mira (o Ceti) swing by 8 magnitudes over an ~332-day cycle — a factor of roughly 1600 in brightness — which is why century-long amateur records are indispensable.',
              },
            ],
            workedExample: 'A student monitors an eclipsing binary. In the same frame a comparison star of known (charted) magnitude 11.00 is measured, and out of eclipse the target reads 1.00 mag fainter than that comparison in the instrumental data. Adding that measured difference to the comparison\'s known magnitude gives the target\'s calibrated magnitude = 11.00 + 1.00 = 12.00. During the deepest eclipse the target drops another 0.50 mag relative to the same comparison, to a calibrated magnitude of 12.50 — a change of Δm = 0.50 mag. How much did the flux drop? Using F₂/F₁ = 10^(−Δm/2.5) = 10^(−0.50/2.5) = 10^(−0.20) = 0.63. So at mid-eclipse the star delivers 63 percent of its out-of-eclipse flux — a 37 percent dip. As a cross-check, a full 1-magnitude change would be a flux ratio of 10^(−0.4) = 0.40 (a 60 percent drop), so a half-magnitude dip landing between "no change" and that 60 percent drop is exactly where 0.63 should sit. The student reports the depth as "Δm = 0.50 mag (37 percent flux dip)," having correctly used the logarithmic, inverted scale rather than treating magnitudes as if they were linear.',
            judgeFraming: 'Judges love to ask a photometry student "what does one magnitude actually mean?" because the inverted, logarithmic scale is the single most common thing amateurs get wrong — treating a 2-magnitude change as "twice as bright" (it is really about 6.3 times) or forgetting that a bigger number is dimmer. A student who states m₁ − m₂ = −2.5 log₁₀(F₁/F₂), explains the minus sign as the inversion, and describes using comparison stars to cancel the atmosphere, has demonstrably done real photometry, not just downloaded a pretty picture.',
            checkpoint: {
              questions: [
                {
                  kind: 'mc',
                  id: 'q1',
                  prompt: 'Star A is magnitude +2.0 and star B is magnitude +7.0. Which is brighter, and by what flux ratio?',
                  options: [
                    { id: 'a', text: 'Star B is brighter, by a factor of 5' },
                    { id: 'b', text: 'Star A is brighter, by a factor of exactly 100' },
                    { id: 'c', text: 'Star A is brighter, by a factor of 5' },
                    { id: 'd', text: 'They are equally bright; magnitude only encodes color' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'This gets the direction backwards (smaller magnitude is brighter) and treats the scale as linear. B is the fainter star.',
                    b: 'Correct — smaller magnitude means brighter, so A (+2.0) is brighter than B (+7.0), and a 5-magnitude difference is by definition exactly a flux ratio of 100 (Pogson\'s convention).',
                    c: 'A is indeed the brighter star, but a 5-magnitude gap is a factor of 100, not 5 — the scale is logarithmic, not linear.',
                    d: 'Magnitude encodes brightness, not color; a 5-magnitude difference is a real 100× brightness difference.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'Why is differential photometry (using nearby comparison stars) more robust than absolute photometry from the ground?',
                  options: [
                    { id: 'a', text: 'Comparison stars are always brighter, which improves signal' },
                    { id: 'b', text: 'Atmospheric effects hit the target and comparison stars almost identically, so taking the difference cancels most of the atmosphere' },
                    { id: 'c', text: 'It removes the need to subtract the sky background' },
                    { id: 'd', text: 'Comparison stars change the exposure time automatically' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Good comparison stars are chosen to be SIMILAR in brightness and color, not simply brighter; brightness alone is not the point.',
                    b: 'Correct — clouds, haze, and air path affect target and comparisons in the same frame nearly equally, so the difference cancels most atmospheric and instrumental variation.',
                    c: 'You still subtract sky background (from an annulus) for every star; differential photometry does not remove that step.',
                    d: 'Comparison stars are passive references; they do not control the camera or exposure.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'A variable star dips by Δm = 1.0 magnitude at minimum. What fraction of its normal flux is left?',
                  options: [
                    { id: 'a', text: 'About 90 percent' },
                    { id: 'b', text: 'About 40 percent' },
                    { id: 'c', text: 'Exactly 50 percent' },
                    { id: 'd', text: 'About 10 percent' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: '90 percent would be a change of only about 0.1 mag; a full magnitude is a much bigger drop.',
                    b: 'Correct — flux ratio = 10^(−Δm/2.5) = 10^(−1.0/2.5) = 10^(−0.4) ≈ 0.40, so about 40 percent of the flux remains (a 60 percent dip).',
                    c: 'Magnitudes are logarithmic, not linear, so a 1-mag dip is not a simple halving; it leaves ~40 percent, not 50.',
                    d: '10 percent remaining would be a 2.5-magnitude dip, not 1.0.',
                  },
                },
                {
                  kind: 'matching',
                  id: 'q4',
                  prompt: 'Match each photometry term to its role.',
                  left: [
                    { id: 'aperture', text: 'Measurement aperture' },
                    { id: 'annulus', text: 'Sky annulus' },
                    { id: 'comp', text: 'Comparison star' },
                    { id: 'aavso', text: 'AAVSO' },
                  ],
                  right: [
                    { id: 'collect', text: 'Region around the star whose light is summed' },
                    { id: 'sky', text: 'Ring used to estimate and subtract the background sky' },
                    { id: 'ref', text: 'Known constant star used as a brightness reference' },
                    { id: 'db', text: 'Century-long database and standardized charts for variable stars' },
                  ],
                  correctPairs: [
                    ['aperture', 'collect'],
                    ['annulus', 'sky'],
                    ['comp', 'ref'],
                    ['aavso', 'db'],
                  ],
                  explanation: 'The aperture sums the star\'s light; the surrounding annulus estimates the sky background to subtract; a comparison star is a known constant reference for differential photometry; and the AAVSO provides standardized comparison-star charts and a century-long international variable-star database.',
                },
              ],
            },
          },

          // ─── Lesson 3 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-app-exoplanet-transits',
            label: 'Detecting Exoplanet Transits from Public Data',
            readingMinutes: 6,
            sections: [
              {
                heading: 'A transit is a tiny, periodic eclipse — and its depth is a size ratio',
                body: 'When a planet crosses in front of its star from our line of sight, it blocks a small fraction of the starlight, producing a shallow, flat-bottomed dip in the light curve called a TRANSIT. The fractional depth of that dip equals the ratio of the areas of the two disks: depth = (Rₚ / R★)², the planet\'s radius over the star\'s radius, squared. This is why transits favor big planets around small stars: a Jupiter-sized planet (about 1/10 the Sun\'s radius) produces a dip of (0.1)² = 0.01, or 1 percent, while an Earth-sized planet around a Sun-like star produces (1/109)² ≈ 0.008 percent — 84 parts per million, far below what the ground normally reaches, which is why space missions like Kepler (2009) and TESS were built. Kepler alone confirmed over 2,600 planets by this method.',
              },
              {
                heading: 'You need the period, and you need to fold the data',
                body: 'A single dip could be many things — a cloud, a cosmic ray, an instrumental glitch, a background eclipsing binary. What makes a transit believable is PERIODICITY and repeatability: the same-depth, same-shape dip recurs on a fixed period P as the planet orbits. The standard technique is PHASE FOLDING: you take the long light curve, divide time by the period, and stack every cycle on top of one another so all the transits pile up at the same phase. This dramatically boosts the signal — random noise averages down while the real, repeating dip reinforces. Algorithms like Box Least Squares (BLS) automate the search by trying many trial periods and durations and scoring how well a box-shaped dip fits. In the lightkurve Python library this is a few lines, but the concept — fold on the true period to reveal a signal buried in noise — is the heart of the method.',
              },
              {
                heading: 'A dip is a candidate, not a planet: the vetting mindset',
                body: 'Finding a periodic dip is the beginning, not the end. The great majority of periodic dips are FALSE POSITIVES — most often an eclipsing binary star (two stars orbiting and eclipsing each other), which can mimic a planet\'s dip but is a stellar-mass, not planetary, object. Professionals vet candidates with several checks: is the transit "V-shaped" (grazing/binary-like) or "U-shaped" with a flat bottom (planet-like)? Are the odd- and even-numbered transits the same depth (a difference betrays two stars of different brightness alternately eclipsing)? Is there a secondary eclipse — a shallow dip half a period later — indicating a self-luminous companion, i.e. a star, not a planet? Does the dip vanish or shift when you look at different pixels (a sign the signal actually comes from a nearby contaminating star)? A student who folds a TESS light curve, finds a dip, and immediately claims "a new planet" has skipped the entire discipline of the field; the honest, judge-impressing claim is "a transit-like candidate consistent with a planet, pending these vetting checks."',
              },
            ],
            workedExample: 'A student downloads a TESS light curve and, after phase-folding on a best-fit period of P = 3.20 days, finds a clean, flat-bottomed dip 1.0 percent deep (0.010 in fractional flux) around a star known from Gaia to have radius R★ = 1.0 R☉ (the Sun\'s radius, ~696,000 km). From depth = (Rₚ/R★)², the radius ratio is Rₚ/R★ = √0.010 = 0.10, so Rₚ = 0.10 × 696,000 km ≈ 69,600 km. Comparing to Jupiter (~71,500 km radius), the candidate is about 0.97 Jupiter radii — a hot-Jupiter-sized object. The student does NOT stop there: they check that odd and even transits match in depth (ruling out an eclipsing binary), look for a secondary eclipse half a period later (finding none, consistent with a dark planet), and verify the dip stays put across pixels. Only then do they write "a hot-Jupiter-sized transiting candidate, R ≈ 1 R_Jupiter, that passes odd/even and secondary-eclipse vetting."',
            judgeFraming: 'Judges will almost always ask an exoplanet student "how do you know it is a planet and not two stars?" — because distinguishing a real transit from an eclipsing-binary false positive is the exact skill that separates a science project from a wishful headline. Being able to name the vetting checks (odd/even depth consistency, absence of a secondary eclipse, flat U-shaped versus V-shaped bottom, pixel-level centroid stability) and to compute a sensible planet radius from depth = (Rₚ/R★)² proves the student did the science rather than just spotting a squiggle.',
            checkpoint: {
              questions: [
                {
                  kind: 'mc',
                  id: 'q1',
                  prompt: 'A transit that blocks 1 percent (0.01) of the starlight implies the planet\'s radius is what fraction of the star\'s radius?',
                  options: [
                    { id: 'a', text: '0.01 (1 percent)' },
                    { id: 'b', text: '0.10 (10 percent)' },
                    { id: 'c', text: '0.5 (50 percent)' },
                    { id: 'd', text: '0.0001 (0.01 percent)' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: '0.01 is the DEPTH, which equals (Rₚ/R★)². The radius ratio is the square ROOT of the depth, not the depth itself.',
                    b: 'Correct — depth = (Rₚ/R★)², so Rₚ/R★ = √0.01 = 0.10. The planet\'s radius is about 10 percent of the star\'s.',
                    c: 'A 50 percent radius ratio would block 0.5² = 25 percent of the light — a far deeper dip than 1 percent.',
                    d: 'That would be the depth if the radius ratio were 0.01; here the depth (0.01) gives a radius ratio of 0.10.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'What does phase folding a light curve accomplish?',
                  options: [
                    { id: 'a', text: 'It removes the planet\'s orbital period from the data' },
                    { id: 'b', text: 'It stacks every orbital cycle at the same phase so repeating transits reinforce while random noise averages down' },
                    { id: 'c', text: 'It converts brightness into a spectrum' },
                    { id: 'd', text: 'It measures the star\'s distance' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Folding USES the period (it divides time by P); it does not remove it.',
                    b: 'Correct — folding on the true period piles all cycles onto one phase axis, so a real repeating dip adds up while uncorrelated noise averages toward zero, revealing weak transits.',
                    c: 'Folding is a time-domain operation on brightness; it does not produce a spectrum (that needs a spectrograph).',
                    d: 'Distance comes from parallax or standard candles, not from folding a light curve.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'A periodic dip shows a shallow SECONDARY eclipse exactly half a period after the main dip. What does this most strongly suggest?',
                  options: [
                    { id: 'a', text: 'A confirmed Earth-like planet' },
                    { id: 'b', text: 'An eclipsing binary (a self-luminous stellar companion), i.e. a likely false positive' },
                    { id: 'c', text: 'A comet passing through the field' },
                    { id: 'd', text: 'That the star is variable in temperature only' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'A visible secondary eclipse points AWAY from a small dark planet; it indicates a bright companion, so this argues against a planet, not for one.',
                    b: 'Correct — a secondary eclipse half a period later means the companion emits significant light of its own (a star), so the system is most likely an eclipsing binary — a classic transit false positive.',
                    c: 'A comet would not produce a strictly periodic pair of eclipses tied to an orbital half-period.',
                    d: 'Temperature-only variability does not produce sharp, eclipse-shaped secondary dips at half a period.',
                  },
                },
                {
                  kind: 'ordering',
                  id: 'q4',
                  prompt: 'Order the steps of a defensible transit search from a public light curve.',
                  items: [
                    { id: 'i1', text: 'Download and clean the light curve (remove systematics/outliers)' },
                    { id: 'i2', text: 'Search trial periods (e.g. Box Least Squares) to find a candidate period' },
                    { id: 'i3', text: 'Phase-fold on the best period to reveal the stacked transit' },
                    { id: 'i4', text: 'Vet the candidate (odd/even depths, secondary eclipse, centroid) before claiming a planet' },
                  ],
                  correctOrder: ['i1', 'i2', 'i3', 'i4'],
                  explanation: 'You first clean the raw light curve, then search many trial periods to find a candidate period, then phase-fold on that period to reveal the stacked transit, and only THEN run the vetting checks that separate a real planet from an eclipsing-binary false positive before making any claim.',
                },
              ],
            },
          },

          // ─── Lesson 4 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-app-image-processing-stacking',
            label: 'Image Processing and Stacking',
            readingMinutes: 5,
            sections: [
              {
                heading: 'Calibration frames: darks, flats, and bias remove the camera, not the sky',
                body: 'A raw astronomical image is not a picture of the sky alone — it is the sky plus the camera\'s fingerprints. Three calibration frames remove those fingerprints. A BIAS frame (a zero-second exposure) captures the electronic offset the camera adds to every pixel. A DARK frame (a same-length exposure with the shutter closed) captures thermal "dark current" — electrons that accumulate from heat even with no light — which is why professional cameras are cooled to −20 °C or colder. A FLAT frame (an exposure of an evenly illuminated surface) captures the pixel-to-pixel sensitivity variations, vignetting (dimming toward the frame edges), and dust shadows ("dust donuts") in the optics. The calibrated science image is (raw − dark) ÷ (flat − bias), roughly: subtract the additive junk, divide out the multiplicative sensitivity pattern. Skipping calibration is the single most common reason an amateur\'s photometry is unreliable.',
              },
              {
                heading: 'Stacking beats down noise — signal grows faster than noise',
                body: 'The deepest reason to take many exposures and STACK (average or median-combine) them is the statistics of noise. The signal from a faint object adds linearly with the number of frames N, but random noise (which is uncorrelated frame to frame) adds only as the square root of N. So the signal-to-noise ratio improves as N/√N = √N. Stacking 4 frames roughly doubles the signal-to-noise ratio; stacking 100 improves it tenfold. This is why a stack of one hundred 30-second sub-exposures reveals galaxies invisible in any single frame — and why "just take one long exposure" is often worse: a single long exposure can saturate bright stars, be ruined entirely by one airplane or cosmic ray, and accumulate more dark current, whereas short sub-exposures you median-combine let you reject those artifacts.',
              },
              {
                heading: 'Alignment, rejection, and the honest-image ethic',
                body: 'Before stacking you must ALIGN (register) the frames, because the sky drifts across the sensor between exposures due to imperfect tracking and field rotation; software matches star patterns and shifts each frame to a common grid. A MEDIAN combine (or sigma-clipped average) then rejects transient outliers — cosmic rays, satellite trails, hot pixels — because a value present in only one frame is thrown out as an outlier while the real star, present in all frames, survives. There is an ethical line here that judges care about: calibration and stacking RECOVER real signal and remove instrument artifacts, which is legitimate science. Aggressive "photoshopping" that invents structure, boosts contrast until noise looks like nebulosity, or clones out features is not. Good practice is to document the full pipeline (frames used, calibration applied, stacking method) so the result is reproducible and clearly separated from any purely cosmetic stretch.',
              },
            ],
            workedExample: 'A student images a faint galaxy and gets a signal-to-noise ratio (SNR) of 3 in a single 60-second sub-exposure — barely a detection, since a real source is usually taken seriously at SNR ≥ 5. They want SNR = 15. Because stacking improves SNR by √N, they need √N = 15/3 = 5, so N = 5² = 25 frames. Twenty-five 60-second sub-exposures (25 minutes of integration) should lift the SNR from 3 to about 15 — a clean detection. The student also reasons about WHY sub-exposures beat one 25-minute exposure: a single long frame would saturate the bright foreground stars and could be wrecked by a single satellite trail, whereas 25 short frames, median-combined after alignment, let the software reject the trail as a one-frame outlier while the galaxy, present in all 25, survives. They log "25 × 60 s, bias/dark/flat calibrated, aligned and median-combined."',
            judgeFraming: 'Judges probe stacking with "why not just take one long exposure?" and "how does noise behave?" because the √N scaling and the artifact-rejection logic reveal whether a student understands imaging as measurement or just as pretty-picture-making. Being able to say "signal grows as N but noise as √N, so SNR improves as √N, and median-combining sub-exposures rejects cosmic rays and satellite trails a single long exposure could not" — plus drawing the honest line between recovering real signal and inventing it — is what earns credibility for any image-based project.',
            checkpoint: {
              questions: [
                {
                  kind: 'matching',
                  id: 'q1',
                  prompt: 'Match each calibration frame to the camera artifact it removes.',
                  left: [
                    { id: 'bias', text: 'Bias frame' },
                    { id: 'dark', text: 'Dark frame' },
                    { id: 'flat', text: 'Flat frame' },
                  ],
                  right: [
                    { id: 'offset', text: 'Constant electronic read-offset added to every pixel' },
                    { id: 'thermal', text: 'Thermal dark-current electrons that build up during the exposure' },
                    { id: 'sensitivity', text: 'Pixel-to-pixel sensitivity, vignetting, and dust shadows' },
                  ],
                  correctPairs: [
                    ['bias', 'offset'],
                    ['dark', 'thermal'],
                    ['flat', 'sensitivity'],
                  ],
                  explanation: 'A bias frame (zero-second) captures the electronic read-offset; a dark frame (shutter closed, same length) captures thermal dark current; a flat frame (evenly lit) captures multiplicative effects — pixel sensitivity variations, vignetting, and dust shadows in the optics.',
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'Stacking N frames improves the signal-to-noise ratio by roughly what factor?',
                  options: [
                    { id: 'a', text: 'N' },
                    { id: 'b', text: '√N' },
                    { id: 'c', text: 'N²' },
                    { id: 'd', text: 'log N' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Signal alone grows as N, but noise also grows (as √N), so the RATIO improves only as N/√N = √N, not N.',
                    b: 'Correct — signal adds as N while uncorrelated noise adds as √N, so SNR improves as √N. Four frames double it; 100 frames improve it tenfold.',
                    c: 'N² would be enormous; nothing in stacking grows quadratically. SNR gain is √N.',
                    d: 'The improvement is a power law (√N), not logarithmic.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'A student has SNR = 4 in one frame and wants SNR = 20. About how many frames must they stack?',
                  options: [
                    { id: 'a', text: '5 frames' },
                    { id: 'b', text: '10 frames' },
                    { id: 'c', text: '25 frames' },
                    { id: 'd', text: '100 frames' },
                  ],
                  answerId: 'c',
                  explanations: {
                    a: '5 frames would raise SNR only by √5 ≈ 2.2, giving about 9, not 20.',
                    b: '10 frames gives √10 ≈ 3.2×, or SNR ≈ 13 — still short of 20.',
                    c: 'Correct — need √N = 20/4 = 5, so N = 25. Twenty-five frames improve SNR fivefold, from 4 to 20.',
                    d: '100 frames would improve SNR tenfold (to 40), more than needed; 25 is the right count.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q4',
                  prompt: 'Why is median-combining many short sub-exposures often better than one long exposure of equal total time?',
                  options: [
                    { id: 'a', text: 'A long exposure collects less total light' },
                    { id: 'b', text: 'Median-combining rejects one-frame outliers like cosmic rays and satellite trails, and short frames avoid saturating bright stars' },
                    { id: 'c', text: 'Short exposures need no calibration frames' },
                    { id: 'd', text: 'A long exposure cannot be aligned to the sky' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Equal total integration time collects the same total light; the advantage is not more photons but better artifact handling.',
                    b: 'Correct — a value present in only one frame (a cosmic ray or satellite trail) is rejected by the median, while short frames keep bright stars below saturation. A single long frame can be ruined entirely by one such event.',
                    c: 'Short exposures still require bias, dark, and flat calibration; sub-framing does not remove that need.',
                    d: 'Long exposures can be aligned; alignment is about matching frames to a common grid, not about exposure length.',
                  },
                },
              ],
            },
          },

          // ─── Lesson 5 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-app-radio-citizen-science',
            label: 'Radio and Citizen-Science Astronomy',
            readingMinutes: 5,
            sections: [
              {
                heading: 'The radio window: astronomy you can do through clouds and daylight',
                body: 'The atmosphere is transparent in two main "windows": the optical/near-infrared, and a broad RADIO window from roughly 10 MHz to about 30 GHz. Radio astronomy, opened by Karl Jansky at Bell Labs in 1932 when he traced radio static to the center of the Milky Way, sees things optical telescopes cannot — cold hydrogen gas, pulsars, the cosmic microwave background, and active galactic nuclei — and it works through clouds and in daylight because radio waves are not blocked by them. The single most famous amateur-accessible radio target is the 21-CENTIMETRE LINE of neutral atomic hydrogen at 1420.4 MHz: a photon emitted when the electron\'s spin flips relative to the proton. Because hydrogen is everywhere, mapping this line lets you trace the spiral structure and rotation of the Milky Way. A modest horn antenna plus a software-defined radio (an RTL-SDR dongle costing about US$30) can detect it from a backyard — a genuinely professional measurement on an amateur budget.',
              },
              {
                heading: 'Doppler on a spectral line measures motion — the workhorse of both radio and optical spectroscopy',
                body: 'A spectral line has a known REST frequency (or wavelength). If the emitting gas moves toward or away from you, the line shifts by the Doppler effect: away-moving gas is REDSHIFTED (longer wavelength, lower frequency), approaching gas is BLUESHIFTED. For speeds small compared to light, the fractional shift equals the line-of-sight velocity over the speed of light: Δλ/λ = Δf/f = v/c. Point a 21-cm receiver at different galactic longitudes and the hydrogen line sits at slightly different frequencies because different arms of the rotating galaxy move at different velocities toward or away from us — that is literally how the Milky Way\'s rotation curve was first mapped, and it is measurable by a determined student. The same Doppler-shift logic on optical lines gives galaxy redshifts and exoplanet radial-velocity wobbles, so mastering it in the radio pays off everywhere.',
              },
              {
                heading: 'Citizen science: real discovery without owning a telescope',
                body: 'You can contribute to (and mine) frontier datasets through organized citizen-science platforms. Galaxy Zoo, launched in 2007, asked volunteers to classify galaxy shapes from SDSS images; within a year it had tens of millions of classifications and produced peer-reviewed discoveries, including "Hanny\'s Voorwerp" (a giant ionized gas cloud spotted by a Dutch schoolteacher) and the "green pea" galaxies. Planet Hunters lets volunteers flag transit dips in Kepler/TESS light curves that automated pipelines missed, and has co-discovered real planets. The broader Zooniverse platform hosts dozens of such projects. For a student project, citizen-science platforms offer two honest routes: contribute classifications and analyze your own contribution statistics, or (more ambitiously) download the public classification data and do original analysis on it. Either way you are working with the same data professionals publish from — the discovery is real, only the equipment barrier is gone.',
              },
            ],
            workedExample: 'A student points a homebuilt 21-cm horn at a region of the galactic plane and records the neutral-hydrogen line. Its rest frequency is f₀ = 1420.4 MHz, but the peak sits at f = 1419.9 MHz — shifted DOWN by Δf = −0.5 MHz. A lower frequency is a redshift, so the gas is moving AWAY. Using v/c = Δf/f₀ (taking magnitudes): v = c × (0.5 MHz / 1420.4 MHz) = 3.0×10⁵ km/s × (0.000352) ≈ 106 km/s of recession along the line of sight. As a sanity check, that is a plausible galactic-rotation velocity for gas a few kiloparsecs away — not the tiny drift of a nearby cloud nor an implausible relativistic speed. The student reports "H I line detected at 1419.9 MHz, redshifted 0.5 MHz, implying ~106 km/s recession, consistent with differential galactic rotation," having used Δf/f = v/c correctly and interpreted the sign (down in frequency = redshift = receding).',
            judgeFraming: 'Judges engaging a radio or spectroscopy project will ask "what does the shift of that line tell you, and which way is it moving?" because the Doppler relation Δλ/λ = v/c and the sign convention (redshift = receding = longer wavelength / lower frequency) are the load-bearing physics of the whole measurement. A student who detects the 1420 MHz hydrogen line, computes a velocity from its shift, and correctly reads the sign has done real astrophysics on a $30 budget — and a citizen-science student who can say exactly which public dataset they analyzed and how has crossed from "participated" to "did science."',
            checkpoint: {
              questions: [
                {
                  kind: 'mc',
                  id: 'q1',
                  prompt: 'The 21-cm (1420 MHz) radio line is emitted by:',
                  options: [
                    { id: 'a', text: 'Ionized helium recombining' },
                    { id: 'b', text: 'Neutral atomic hydrogen when the electron\'s spin flips' },
                    { id: 'c', text: 'Molecular oxygen in Earth\'s atmosphere' },
                    { id: 'd', text: 'Electrons spiraling in a pulsar\'s magnetic field' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Helium recombination lines are optical/infrared, not the 21-cm feature; the 21-cm line is a hydrogen spin-flip.',
                    b: 'Correct — the 1420.4 MHz line comes from the hyperfine spin-flip transition of the electron in neutral hydrogen, and because hydrogen is ubiquitous it traces galactic structure and rotation.',
                    c: 'Atmospheric oxygen absorbs at other frequencies; it is not the source of the astronomical 21-cm emission.',
                    d: 'That describes synchrotron radiation, a broadband process, not the narrow 21-cm hydrogen line.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'A hydrogen line observed at a LOWER frequency than its 1420.4 MHz rest value means the emitting gas is:',
                  options: [
                    { id: 'a', text: 'Moving toward us (blueshifted)' },
                    { id: 'b', text: 'Moving away from us (redshifted)' },
                    { id: 'c', text: 'Stationary but hotter than average' },
                    { id: 'd', text: 'Made of a different element' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Approaching gas is BLUEshifted — shifted to HIGHER frequency / shorter wavelength, the opposite of what is seen here.',
                    b: 'Correct — lower frequency (longer wavelength) is a redshift, which by the Doppler effect means the gas is receding along the line of sight.',
                    c: 'Temperature broadens or weakens a line but does not systematically shift its center frequency down; that shift is Doppler motion.',
                    d: 'A different element would emit at an entirely different rest frequency, not a slightly shifted 1420 MHz line.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'A 1420.4 MHz line is observed shifted by Δf = 1.42 MHz (about 0.1 percent). What line-of-sight speed does this imply?',
                  options: [
                    { id: 'a', text: 'About 300 km/s' },
                    { id: 'b', text: 'About 30 km/s' },
                    { id: 'c', text: 'About 3000 km/s' },
                    { id: 'd', text: 'About 3 km/s' },
                  ],
                  answerId: 'a',
                  explanations: {
                    a: 'Correct — v = c × (Δf/f) = 3.0×10⁵ km/s × (1.42/1420.4) = 3.0×10⁵ × 0.001 = 300 km/s.',
                    b: '30 km/s would be a shift of 0.01 percent (Δf ≈ 0.14 MHz), ten times smaller than given.',
                    c: '3000 km/s would require a 1 percent shift (Δf ≈ 14 MHz), ten times larger than given.',
                    d: '3 km/s corresponds to a 0.001 percent shift, a hundred times smaller than the 0.1 percent stated.',
                  },
                },
                {
                  kind: 'matching',
                  id: 'q4',
                  prompt: 'Match each citizen-science effort to what volunteers do in it.',
                  left: [
                    { id: 'galaxyzoo', text: 'Galaxy Zoo' },
                    { id: 'planethunters', text: 'Planet Hunters' },
                    { id: 'zooniverse', text: 'Zooniverse' },
                  ],
                  right: [
                    { id: 'classify', text: 'Classify galaxy shapes from survey images' },
                    { id: 'transits', text: 'Flag transit dips in Kepler/TESS light curves' },
                    { id: 'platform', text: 'The umbrella platform hosting many such projects' },
                  ],
                  correctPairs: [
                    ['galaxyzoo', 'classify'],
                    ['planethunters', 'transits'],
                    ['zooniverse', 'platform'],
                  ],
                  explanation: 'Galaxy Zoo has volunteers classify galaxy morphologies from SDSS images (yielding discoveries like Hanny\'s Voorwerp and the green peas); Planet Hunters has volunteers spot transit dips in light curves that pipelines missed; and Zooniverse is the broader platform hosting dozens of citizen-science projects.',
                },
              ],
            },
          },

          // ─── Lesson 6 ──────────────────────────────────────────────────────────
          {
            id: 'astronomy-core-app-designing-defensible-project',
            label: 'Designing a Defensible Science-Fair Astronomy Project',
            readingMinutes: 6,
            sections: [
              {
                heading: 'Scope to what you can actually measure and defend',
                body: 'The most common failure of a fair astronomy project is not a wrong answer — it is an unanswerable question. "Are there aliens?" or "How was the universe born?" cannot be measured by a student in a semester, and a judge knows it instantly. A defensible project starts from a measurable, falsifiable question tied to data you can actually obtain and analyze: "Does this eclipsing binary\'s period match the published value to within my error bars?", "What is the rotation velocity of neutral hydrogen at galactic longitude 90°?", "Does the transit depth of TOI-XXXX imply a Jupiter-sized or Neptune-sized planet?" Notice each one names a specific target, a specific measured quantity, and an expectation you could confirm or refute. Reproducing a known result with your own independent measurement is not "unoriginal" — replication is a pillar of science, and a clean replication with honest error bars beats a grandiose question with no data every time.',
              },
              {
                heading: 'Uncertainty is not optional — a number without an error bar is not a measurement',
                body: 'The single feature that most separates a serious astronomy project from a hobby demo is quantified UNCERTAINTY. Every measured quantity has an error: the parallax has a formal uncertainty from Gaia, the transit depth has scatter from photon noise, the line frequency has a width set by your receiver. Reporting "distance = 200 pc" is weaker than "distance = 200 ± 2 pc," which tells a judge you know how precisely you measured. Uncertainties propagate: when you divide or take a ratio, fractional errors add (in quadrature for independent errors), so a 1 percent parallax error gives roughly a 1 percent distance error. You should also distinguish RANDOM error (scatter you beat down by averaging more strides, frames, or observations — recall stacking improves SNR as √N) from SYSTEMATIC error (a bias that averaging does NOT remove, like an uncorrected Gaia zero-point or an uncalibrated flat field). A project that reports both a value and its uncertainty, and separates random from systematic, is doing measurement science.',
              },
              {
                heading: 'Comparison, controls, and honest limitations close the loop',
                body: 'A finished astronomy project compares its result to something: a published catalog value, a theoretical prediction, or a control condition. If your measured exoplanet period is 3.20 days and the NASA Exoplanet Archive lists 3.19 days, you can state that you agree within uncertainty — a powerful, checkable claim. Controls and confounders still apply even without a lab bench: in photometry your "control" is the constant comparison stars; in a transit search your confounder is the eclipsing-binary false positive you must vet against; in archive work your systematic is the survey\'s calibration you must cite. Finally, a defensible project states its LIMITATIONS plainly — "my single-night baseline cannot detect period drift," "atmospheric seeing limited my photometric precision to about 0.02 mag" — because naming what your method cannot conclude is a mark of rigor, not weakness. Judges consistently reward the student who says "here is exactly what I can and cannot claim from this data" over one who overclaims.',
              },
            ],
            workedExample: 'A student designs a project around a single TESS target: "Does the transit period of TOI-1234 that I measure agree with the published value?" Their method: download the TESS light curve (recording the sector and pipeline), clean and phase-fold it, and measure the period by fitting the transit times. They get P = 3.204 ± 0.003 days. The NASA Exoplanet Archive lists 3.201 ± 0.002 days. The difference is 0.003 days — within the combined uncertainty (√(0.003² + 0.002²) ≈ 0.0036 days) — so they report agreement, a clean independent replication. They separate errors honestly: random error came from photon noise and was reduced by folding many transits; a systematic they name is that a single TESS sector\'s ~27-day baseline limits how precisely a long period can be pinned, so they explicitly state their method "cannot detect any slow period drift over years." They compare to catalog, quote uncertainty, and disclose the limitation — the full arc of a defensible study.',
            judgeFraming: 'This lesson IS the judge\'s framing: at a fair the questions converge on "what exactly did you measure, how big is your error, and how do you know it is right?" A student who scoped to a measurable question, reported every number with an uncertainty, separated random from systematic error, compared to a published value, and stated the limitations of their method has pre-answered the judges\' entire line of attack. The overclaiming student ("I discovered a planet!") loses to the careful one ("I independently measured this candidate\'s period to 3.204 ± 0.003 days, agreeing with the archive, though my baseline cannot detect period drift") every single time.',
            checkpoint: {
              questions: [
                {
                  kind: 'mc',
                  id: 'q1',
                  prompt: 'Which is the strongest science-fair astronomy question?',
                  options: [
                    { id: 'a', text: 'How did the universe begin?' },
                    { id: 'b', text: 'Are we alone in the galaxy?' },
                    { id: 'c', text: 'Does my measured transit depth of TOI-1234 imply a Jupiter-sized or Neptune-sized planet?' },
                    { id: 'd', text: 'Is astronomy interesting?' },
                  ],
                  answerId: 'c',
                  explanations: {
                    a: 'A profound but unmeasurable question for a student project — no data you can obtain in a semester will answer it.',
                    b: 'Not falsifiable with student-accessible data; there is no measurement you can make to settle it.',
                    c: 'Correct — it names a specific target, a specific measured quantity (transit depth → planet size), and a checkable expectation, making it measurable and defensible.',
                    d: 'Subjective and unmeasurable; it is an opinion, not a scientific question.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q2',
                  prompt: 'What is the key difference between random and systematic error?',
                  options: [
                    { id: 'a', text: 'Random error is always larger than systematic error' },
                    { id: 'b', text: 'Random error averages down with more measurements; systematic error is a bias that averaging does NOT remove' },
                    { id: 'c', text: 'Systematic error only occurs in radio astronomy' },
                    { id: 'd', text: 'They are two names for the same thing' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Neither is inherently larger; which dominates depends on the measurement. Size is not the distinction.',
                    b: 'Correct — random (statistical) scatter shrinks as you average more data (SNR grows as √N), but a systematic bias (an uncorrected zero-point, a bad flat field) persists no matter how much you average.',
                    c: 'Systematic error appears in every kind of measurement, not only radio work.',
                    d: 'They are fundamentally different: one is beaten down by averaging, the other is not.',
                  },
                },
                {
                  kind: 'mc',
                  id: 'q3',
                  prompt: 'A student measures a period of 3.20 ± 0.03 days; the catalog lists 3.19 ± 0.02 days. What is the honest conclusion?',
                  options: [
                    { id: 'a', text: 'The measurement is wrong because the numbers are not identical' },
                    { id: 'b', text: 'The two agree within their combined uncertainty — a successful independent replication' },
                    { id: 'c', text: 'A new planet with a different period has been discovered' },
                    { id: 'd', text: 'The catalog value must be corrected to match the student' },
                  ],
                  answerId: 'b',
                  explanations: {
                    a: 'Measurements are essentially never bit-identical; agreement is judged against the ERROR BARS, and 3.20 and 3.19 overlap well within theirs.',
                    b: 'Correct — the 0.01-day difference is smaller than the combined uncertainty (~√(0.03²+0.02²) ≈ 0.036 d), so the values agree and the student has replicated the known result.',
                    c: 'Same target, agreeing period — nothing new is discovered; this is a confirmation, which is still valuable.',
                    d: 'A single student measurement consistent with the catalog does not overturn it; agreement is the point, not a correction.',
                  },
                },
                {
                  kind: 'ordering',
                  id: 'q4',
                  prompt: 'Order the elements of designing a defensible astronomy study.',
                  items: [
                    { id: 'i1', text: 'Pose a specific, measurable, falsifiable question tied to obtainable data' },
                    { id: 'i2', text: 'Collect and analyze the data with a documented, reproducible method' },
                    { id: 'i3', text: 'Report each result with its uncertainty, separating random from systematic error' },
                    { id: 'i4', text: 'Compare to a published value/prediction and state the method\'s limitations' },
                  ],
                  correctOrder: ['i1', 'i2', 'i3', 'i4'],
                  explanation: 'A defensible study first frames a measurable, falsifiable question, then collects and analyzes data with a reproducible method, then reports each number with its uncertainty (distinguishing random from systematic error), and finally compares to a published value or prediction while honestly stating what the method can and cannot conclude.',
                },
                {
                  kind: 'matching',
                  id: 'q5',
                  prompt: 'Match each project context to its natural control or confounder.',
                  left: [
                    { id: 'photometry', text: 'Differential photometry' },
                    { id: 'transit', text: 'Exoplanet transit search' },
                    { id: 'archive', text: 'Gaia archive distance' },
                  ],
                  right: [
                    { id: 'compstars', text: 'Constant comparison stars serve as the control' },
                    { id: 'eb', text: 'Eclipsing-binary false positives are the confounder to vet against' },
                    { id: 'zeropoint', text: 'The parallax zero-point is a systematic to correct/cite' },
                  ],
                  correctPairs: [
                    ['photometry', 'compstars'],
                    ['transit', 'eb'],
                    ['archive', 'zeropoint'],
                  ],
                  explanation: 'In differential photometry the constant comparison stars are the control that cancels atmosphere and instrument drift; in a transit search the eclipsing-binary false positive is the confounder you must vet against; and in Gaia archive work the parallax zero-point offset is a systematic error you correct for and cite.',
                },
              ],
            },
          },
        ],
      }
    ],
  },
  branches: [],
}

export default track
