# Field Codex — track taxonomy (canonical brief source)

> The **source of truth** for what Codex tracks exist and their branch structure. The
> `/codex-pipeline <field-slug>` command reads this to brief each track. Generated 2026-07-07
> from the 29 Data Terminal Charts-Guide fields (`lib/data-terminal/charts-guide.ts`) — the
> Codex track slugs are 1:1 with the chart-field slugs so the two cross-link.

## The model

- **Top-level track = a science field** (its Core segment — the shared foundation everyone
  in the field learns).
- **Branch = a subfield** (5 per field — what a project specializes into).
- **Depth targets (6-month goal — see the pipeline command):** Core ≈ **45–55 lessons**,
  each subfield ≈ **40–50**. A student's path (Core + ~2 routed subfields) ≈ **120 lessons
  per field**; ×~3 interdisciplinary fields ≈ 360 lessons ≈ 6 months at 2/day. The unit
  outlines below are a **skeleton to expand** to that depth — add units for landmark work,
  debates, history, advanced methods, and applications; every segment needs a dedicated
  "Landmark Work & Open Debates" unit.
- **Totals:** 29 fields × (Core + 5 subfields) = **174 segments ≈ ~7,000–8,000 lessons**
  fully authored — a long-horizon program, built one segment per `/codex-pipeline` run and
  reused across every student.
- `pairsWith` lists the sibling fields each pairs with on interdisciplinary projects — fed to
  the Study-Plan classifier so a project routes to all its relevant tracks + subfields.
- The 6 lab-type "home" tracks from the F13 build are **retired** in favor of this field
  taxonomy; a labType→default-fields map replaces them for "where do I start" routing.

_5 cross-field subfield overlaps were found and re-scoped for unique ownership (marked ⓕ)._

---

## 1. `acoustics-sound` — Acoustics / Sound

*Core:* The shared foundation every acoustics student needs: what sound physically is, the units and math (dB, frequency, spectra) it is measured in, how it propagates and resonates, and how to record and read acoustic data honestly.

**Core units:**
- **What Sound Is** — Sound as a longitudinal pressure wave; frequency, wavelength, period, amplitude, and the speed of sound in air and other media.
- **Loudness, Level, and the Decibel** — Sound pressure vs. sound power, the logarithmic decibel scale, dB SPL, why levels add logarithmically, and A-weighting vs. flat measurement.
- **Frequency, Spectra, and Timbre** — Reading a waveform vs. a spectrum, harmonics and fundamentals, the FFT, pitch vs. frequency, and why timbre is spectral shape.
- **Propagation, Reflection, and Resonance** — Inverse-square spreading, reflection/absorption/diffraction, standing waves in strings and tubes, resonance modes, interference and beats.
- **Measuring Sound: Instruments and Method** — Microphones, sound level meters, calibration, sample rate and aliasing, controlling background noise, and reading/interpreting acoustic plots.

**Subfields (branches):**
- `psychoacoustics-hearing` **Psychoacoustics & Hearing** — How humans perceive sound: equal-loudness contours and phons, pitch and masking, the audible range, hearing thresholds, and the mechanics of the ear. Perception-side, distinct from the physics-only Core.
- `architectural-room-acoustics` **Architectural & Room Acoustics** — How enclosed spaces shape sound: reverberation time (RT60), absorption coefficients, standing-wave room modes, echo, and treating a room for speech intelligibility or music.
- `noise-control-soundproofing` **Noise Control & Soundproofing** — Reducing unwanted sound: transmission loss through barriers and materials, mass and damping, active noise cancellation, and community/environmental noise measurement and mitigation.
- `musical-acoustics-instruments` **Musical Acoustics & Instruments** — The physics of instruments: how strings, air columns, membranes, and plates produce pitch and timbre, harmonic content, tuning systems, and the acoustics of voice and singing.
- `ultrasound-vibration` **Ultrasound & Vibration** — Sound above human hearing and structural vibration: ultrasonic ranging/imaging (sonar, distance sensors), Doppler shift, cavitation, resonance in structures, and vibration measurement.

*Pairs with:* `signal-processing`, `optics-photonics`, `electronics-electrical-engineering`, `materials-science`, `neuroscience`


## 2. `astronomy-astrophysics` — Astronomy / Astrophysics

*Core:* The shared observational-astrophysics foundation every project needs: the electromagnetic sky, how light is captured and measured, the tools (photometry, spectroscopy, HR/CMD diagrams, light curves), and how a raw signal becomes a defensible physical claim.

**Core units:**
- **The Sky and Its Objects** — Coordinate systems, magnitudes and flux, the electromagnetic spectrum, and the census of objects (stars, clusters, galaxies, exoplanets) a project might target.
- **Light as Data** — How light carries information: blackbody/thermal radiation, the inverse-square law, redshift/Doppler shift, and spectral lines as the physics behind every measurement.
- **Instruments and Observation** — Telescopes and detectors (CCDs), angular resolution and seeing, photometry vs. spectroscopy, survey archives, and the noise/uncertainty every observation carries.
- **Reading the Diagnostic Plots** — Interpreting the field's core diagrams — HR diagram and CMD, light curves, radial-velocity and rotation curves, period-luminosity relations, SEDs — and what each reveals.
- **From Signal to Claim** — Distance ladder and standard candles, error bars and significance, systematic vs. random error, and the skeptical reasoning that turns a measurement into a defensible conclusion.

**Subfields (branches):**
- `stellar-astrophysics` **Stellar Astrophysics & Evolution** — The lives of stars: fusion and stellar structure, main-sequence-to-remnant evolution, spectral classification, and dating star clusters via HR-diagram turnoff points.
- `exoplanets` **Exoplanet Detection & Characterization** — Finding and describing planets around other stars via transit light curves and radial-velocity wobble; deriving planet radius, mass, orbit, and the habitable zone.
- `galactic-extragalactic` **Galactic & Extragalactic Astronomy** — The structure of the Milky Way and other galaxies, galaxy classification, rotation curves and the dark-matter problem, and active galactic nuclei.
- `cosmology` **Cosmology & the Distance Ladder** — The large-scale, expanding universe: Hubble's law and redshift-distance, standard candles (Cepheids, Type Ia supernovae), the cosmic microwave background, and the age and fate of the cosmos.
- `observational-methods-timedomain` **Observational & Time-Domain Techniques** — The craft of getting good data: telescope and detector operation, CCD photometry pipelines, variable-star and transient monitoring, and survey/archive data mining with proper calibration.

*Pairs with:* `optics-photonics`, `signal-processing`, `data-science-ml-metrics`, `computer-science-algorithms`, `classical-mechanics-physics`


## 3. `chemistry` — Chemistry

*Core:* The shared bedrock every chemistry researcher needs: matter and bonding, the mole and stoichiometry, reactions and equilibrium, energy and rate, and the measurement/analytical toolkit used to read chemical results.

**Core units:**
- **Atoms, Bonding, and the Structure of Matter** — Atomic structure, periodic trends, electron configuration, ionic vs. covalent vs. metallic bonding, molecular geometry (VSEPR), polarity, and intermolecular forces — the vocabulary for what a substance is.
- **The Mole, Stoichiometry, and Solutions** — Moles, molar mass, balancing equations, limiting reagents, percent yield, molarity and dilution, and how to prepare and quantify solutions — the quantitative language of chemistry.
- **Reactions, Equilibrium, and Acids–Bases** — Reaction types, dynamic equilibrium and Le Chatelier, K expressions, acid–base theory, pH/pKa, buffers, and titration curves — how chemical systems settle and shift.
- **Energy and Rate: Thermodynamics and Kinetics** — Enthalpy/entropy/Gibbs free energy, spontaneity, heating/cooling curves, reaction-coordinate diagrams, rate laws, activation energy, catalysis, and the Arrhenius relationship — why and how fast reactions go.
- **Measurement, Analysis, and the Lab Toolkit** — Significant figures, error and uncertainty, calibration curves (Beer–Lambert), and the core instruments — spectrophotometry (UV-Vis, IR/FTIR), chromatography (HPLC), titration — used to identify and quantify substances.
- **Reading and Defending Chemistry Results** — Interpreting spectra and chromatograms, distinguishing correlation from mechanism, controls and blanks, propagating uncertainty into a conclusion, and framing a claim a judge will probe.

**Subfields (branches):**
- `analytical-chemistry` **Analytical Chemistry** — Quantitative and qualitative identification of substances: spectroscopy (UV-Vis, IR, atomic absorption), chromatography (HPLC, GC, TLC), titrimetry, and electrochemical sensors — building calibration curves and validating detection limits for a real unknown.
- `organic-synthesis` **Organic Chemistry & Synthesis** — Carbon-based structure, functional groups, reaction mechanisms, and stereochemistry; designing, running, and purifying a synthesis (extraction, recrystallization, distillation) and confirming the product's identity and yield.
- `electrochemistry` **Electrochemistry** — Redox reactions, half-cells, cell potentials and the Nernst equation, electrolysis, and corrosion — quantifying electron transfer in batteries, sensors, and plating, distinct from device-level power engineering.
- `green-environmental-chemistry` **Green & Environmental Chemistry** — Reaction efficiency, atom economy, safer solvents and catalysts, water/soil contaminant chemistry, and remediation — the chemistry of reducing waste and hazards, framed by reactions and analysis rather than ecosystem or earth-system science.
- `physical-chemistry` **Physical Chemistry** — The quantitative theory beneath reactions: chemical kinetics and rate-law determination, thermodynamics, phase equilibria and phase diagrams, colligative properties, and the physical models (collision theory, transition state) that explain rate and spontaneity.

*Pairs with:* `materials-science`, `environmental-earth-science`, `clinical-medicine-pharmacology`, `nutrition-food-science`, `renewable-energy`


## 4. `classical-mechanics-physics` — Classical Mechanics / Physics

*Core:* The shared mechanics foundation every student in this field needs: the vocabulary of motion and force, the measurement/lab craft that produces trustworthy data, and how to read the canonical plots (kinematics graphs, energy curves, oscillation traces, linearized fits).

**Core units:**
- **Language of Motion and Force** — Core vocabulary and models: scalars vs. vectors, position/velocity/acceleration, mass vs. weight, force, free-body diagrams, and reference frames — the shared terms every mechanics project rests on.
- **Newton's Laws and Dynamics** — The three laws applied to real systems: net force and F=ma, action-reaction, friction and normal forces, and how forces cause the motion you measure.
- **Energy, Work, and Momentum** — The conserved-quantity toolkit — work-energy theorem, kinetic/potential energy and their exchange, power, impulse and momentum, and when conservation laws apply (and when they don't).
- **Measurement, Units, and Lab Craft** — SI units and dimensional analysis, timing/tracking instruments (photogates, video tracking, stopwatches, force sensors), significant figures, and controlling a mechanics experiment.
- **Error, Uncertainty, and Linearization** — Systematic vs. random error, propagating uncertainty, fitting a straight line, and the linearization trick that turns a physical law (T ∝ √L, F = kx) into a testable straight-line plot through the origin.
- **Reading Mechanics Data** — Interpreting the field's canonical plots — kinematics motion graphs, projectile trajectories, force-vs-displacement, energy-exchange curves, oscillation traces, and phase portraits — and stating what each does and does not prove.

**Subfields (branches):**
- `projectile-ballistics` **Projectile Motion & Ballistics** — 2D motion under gravity: launch-angle/range/height optimization, decomposition into independent horizontal and vertical components, and how (light) air resistance bends the ideal parabola. Trajectory-focused, distinct from full fluid-dynamics drag modeling.
- `oscillations-shm` **Oscillations & Simple Harmonic Motion** — Springs and pendulums as SHM: restoring force, period/frequency laws, damping, driven oscillation and mechanical resonance, and phase-space (velocity-vs-position) analysis. Mechanical vibration only — the acoustics field owns sound/pressure waves.
- `collisions-momentum` **Collisions, Impulse & Momentum** — Conservation of momentum in one and two dimensions: elastic vs. inelastic collisions, coefficient of restitution, impulse from force-time curves, and center-of-mass motion of interacting bodies.
- `rotational-mechanics` **Rotational Dynamics & Rigid Bodies** — Torque, moment of inertia, angular momentum and its conservation, rolling vs. sliding, and rotational kinetic energy — the angular analogs of the Core's linear mechanics.
- `gravitation-orbits` **Gravitation & Orbital Mechanics** — Newtonian gravity as a force law: g at a planet's surface, Kepler's laws, circular and elliptical orbits, and escape velocity. The mechanics/force-law angle on orbits, not the astronomy field's observation and instrumentation.

*Pairs with:* `fluid-dynamics-aerodynamics`, `robotics-control-systems`, `materials-science`, `acoustics-sound`, `renewable-energy`


## 5. `clinical-medicine-pharmacology` — Clinical Medicine / Pharmacology

*Core:* The shared clinical-and-drug-science foundation every student needs: how drugs move through and act on the body, how vital-sign and organ-function measurements are read, how clinical evidence is generated and judged, and the safety, dosing, and ethics that frame all human-subject work.

**Core units:**
- **Foundations of Clinical Medicine & Drug Science** — Vocabulary of physiology-meets-pharmacology: agonist/antagonist, receptor, dose vs concentration, homeostasis, signs vs symptoms, and where a science-fair project sits (measuring a physiological or drug response under a controlled condition).
- **Pharmacokinetics — What the Body Does to a Drug (ADME)** — Absorption, distribution, metabolism, excretion; the concentration-time curve, Cmax/Tmax/AUC, half-life and first-order exponential decay, clearance, volume of distribution, and steady-state on repeated dosing.
- **Pharmacodynamics — What a Drug Does to the Body** — The dose-response curve, EC50/Emax and the Hill slope, potency vs efficacy, therapeutic index and the therapeutic window, agonists/antagonists/partial agonists, and tolerance.
- **Clinical Measurement & Vital-Sign Instruments** — Reading the core clinical traces and their instruments: blood pressure and ABPM, ECG waveform and heart rate, spirometry flow-volume loops, pulse oximetry, and the oral glucose tolerance curve — plus reference ranges and measurement artifact.
- **Clinical Evidence, Trials & Reading Results** — Randomized controlled trials, placebo and blinding, control groups, sensitivity/specificity and reference ranges, absolute vs relative risk, confidence intervals and p-values, and how landmark trials shape practice.
- **Safety, Dosing & Research Ethics** — Dose calculation and units (mg/kg), adverse effects and drug interactions, contraindications, informed consent and IRB/human-subjects rules, and why student projects use surveys, models, or non-invasive measures rather than dosing people.

**Subfields (branches):**
- `cardiovascular-pharmacology` **Cardiovascular & Autonomic Pharmacology** — The heart, vasculature, and their drugs: blood-pressure regulation, ECG interpretation, antihypertensives/beta-blockers/stimulants, and autonomic (sympathetic/parasympathetic) effects on heart rate and pressure. Focus is drug-and-clinical-measurement, distinct from a pure exercise-physiology angle.
- `clinical-pharmacokinetics-dosing` **Clinical Pharmacokinetics & Dosing** — Applied ADME for real regimens: compartment models, half-life and steady-state, loading vs maintenance doses, therapeutic drug monitoring, and how kidney/liver function and body size change dosing. Deeper, quantitative build on the PK Core.
- `neuropsychopharmacology` **Neuro- & Psychopharmacology** — Drugs acting on the brain: neurotransmitter systems, receptor agonism/antagonism, analgesics, caffeine/stimulants and reaction-time studies, and psychoactive-drug mechanisms. The angle is the drug and its dose-response, not the neural circuitry itself.
- `endocrine-metabolic-pharmacology` **Endocrine & Metabolic Pharmacology** — Hormone-and-metabolism drugs and tests: insulin and the glucose tolerance curve, diabetes/thyroid agents, hormone feedback loops, and metabolic response to a challenge. Clinical-drug framing, distinct from a food-composition or diet-design angle.
- `toxicology-adverse-effects` **Toxicology & Adverse Drug Reactions** — The dark side of the dose-response curve: LD50 and dose-toxicity, overdose and the therapeutic index, drug interactions, poisons and antidotes, and adverse-reaction and safety-signal analysis.

*Pairs with:* `epidemiology-medicine`, `sports-exercise-physiology`, `immunology-microbiology`, `neuroscience`, `data-science-ml-metrics`


## 6. `computer-science-algorithms` — Computer Science / Algorithms

*Core:* The shared foundation every algorithms student needs: how to specify a problem, express an algorithm, reason about its correctness, measure and prove its cost, and read the charts that report that cost.

**Core units:**
- **Foundations: Problems, Algorithms, and Data** — What an algorithm is vs. a program; problem specification (input/output, preconditions); pseudocode; the primitive data structures (array, linked list, stack, queue, hash table, tree) and why the choice of structure shapes what's efficient.
- **Asymptotic Analysis and Big-O** — Counting basic operations; Big-O, Big-Omega, Big-Theta; the standard complexity classes O(1) < O(log n) < O(n) < O(n log n) < O(n^2) < O(2^n); best/worst/average case; why constant factors and crossover points matter for real input sizes.
- **Correctness and Proof Techniques** — Arguing an algorithm is correct, not just fast: loop invariants, induction, termination arguments, and edge-case reasoning — the difference between 'it passed my tests' and 'it is provably correct'.
- **Core Algorithmic Paradigms** — The reusable design strategies: brute force, greedy, divide-and-conquer (with recurrence relations / the intuition behind the Master Theorem), dynamic programming, and recursion vs. iteration — recognizing which paradigm a problem calls for.
- **Empirical Measurement and Benchmarking** — Turning theory into data: timing runs, controlling for warm-up/caching/noise, varying input size, averaging over trials, and separating the algorithm's cost from hardware and language overhead.
- **Reading and Interpreting Algorithm Charts** — How results are presented and defended: log-log and semi-log runtime plots, fitting an empirical curve to a complexity class, growth-curve and crossover charts, cache hit-rate/saturation curves — and how to tell whether measured data actually supports the claimed Big-O.

**Subfields (branches):**
- `sorting-searching-selection` **Sorting, Searching & Selection** — Comparison sorts (merge, quick, heap, insertion) and non-comparison sorts (counting, radix); the O(n log n) comparison lower bound; binary search and its variants; selection/order statistics; stability, in-place vs. extra memory, and when a 'worse' sort wins on small or nearly-sorted input.
- `graph-algorithms` **Graph Algorithms** — Modeling problems as graphs; BFS/DFS, shortest paths (Dijkstra, Bellman-Ford), minimum spanning trees, topological sort, connectivity and cycle detection; adjacency-list vs. matrix representations and how they change complexity.
- `data-structures-design` **Advanced Data Structures** — Structures engineered for specific operation costs: balanced BSTs, heaps/priority queues, hash tables (collision handling, load factor, amortized analysis), tries, union-find, and how a structure's design fixes the Big-O of insert/search/delete.
- `complexity-computability` **Complexity & Computability** — The limits of what's efficiently solvable: P vs. NP, NP-completeness and reductions, tractable vs. intractable problems, and coping strategies (approximation and heuristic algorithms) when an exact fast solution provably may not exist.
- `randomized-heuristic-algorithms` **Randomized & Heuristic Algorithms** — Using randomness and approximation to beat worst-case cost: randomized quicksort, Monte Carlo vs. Las Vegas algorithms, hashing with random seeds, and metaheuristics (simulated annealing, genetic/evolutionary search) for hard optimization — analyzed by expected time and solution quality rather than guaranteed exact answers.

*Pairs with:* `data-science-ml-metrics`, `signal-processing`, `robotics-control-systems`, `electronics-electrical-engineering`


## 7. `data-science-ml-metrics` — Data Science / ML Metrics

*Core:* The shared foundation every applied-ML student needs: the data-and-evaluation vocabulary, how models are trained and validated, and how to read the standard diagnostic plots and metrics that judges quiz on regardless of specialization.

**Core units:**
- **Data, Features, and the ML Problem** — What a dataset, feature, label, and train/validation/test split are; supervised vs. unsupervised vs. the framing of a prediction problem; leakage and why held-out data exists.
- **Models and the Training Loop** — What 'fitting' a model means, loss/objective functions, epochs and gradient-based learning, reading loss curves, and the bias-variance / over- vs. underfitting trade-off.
- **Classification Metrics** — Confusion matrix and everything derived from it — accuracy, precision, recall, F1, the precision-recall and ROC curves, thresholds, and probability calibration.
- **Regression Metrics and Diagnostics** — Error measures (MAE, RMSE, R-squared), residual plots and predicted-vs-actual parity plots, and what patterned residuals reveal about a fitted model.
- **Validation and Honest Evaluation** — Cross-validation, learning curves vs. training-set size, baselines, class imbalance, and the experimental discipline that keeps a reported metric trustworthy.

**Subfields (branches):**
- `classification-eval` **Classification Evaluation** — Deep specialization in evaluating classifiers: threshold selection, ROC-AUC vs. PR-AUC under imbalance, cost-sensitive metrics, multi-class averaging (macro/micro/weighted), and probability calibration for decision scores.
- `regression-forecasting-eval` **Regression & Forecasting Evaluation** — Assessing continuous-outcome and time-series models: residual diagnostics, RMSE/MAPE trade-offs, prediction intervals, and backtesting/rolling-origin validation specific to forecasts (not the physics of the system being forecast).
- `unsupervised-clustering-eval` **Unsupervised & Clustering Evaluation** — Choosing and validating cluster/segmentation and dimensionality-reduction results: elbow and silhouette methods, k selection, internal vs. external cluster validity indices, and interpreting embeddings.
- `model-interpretability` **Model Interpretability & Feature Analysis** — Explaining why a model predicts what it does: feature importance, permutation importance, SHAP/partial-dependence, and distinguishing correlation-driven importance from genuine signal.
- `fairness-robustness` **Fairness, Bias & Robustness** — Auditing models across subgroups and conditions: fairness metrics (demographic parity, equalized odds), dataset bias and shift, robustness to noise/adversarial inputs, and error analysis by slice.

*Pairs with:* `computer-science-algorithms`, `signal-processing`, `epidemiology-medicine`, `psychology-behavioral-science`, `ecology`


## 8. `ecology` — Ecology

*Core:* The shared foundation every ecology student needs: the levels-of-organization vocabulary, the field/lab sampling and estimation methods that generate ecological data, and how to read the standard population and community summaries (diversity indices, growth curves, survivorship, rank-abundance).

**Core units:**
- **What Ecology Studies** — The levels of organization (individual, population, community, ecosystem, biome) and their core vocabulary — species, habitat vs. niche, abiotic vs. biotic factors, limiting factors, carrying capacity — and where a science-fair project sits among them.
- **Sampling the Living World** — How ecologists actually collect data: quadrats and transects, plot placement and random vs. stratified sampling, mark-recapture (Lincoln-Petersen) for mobile animals, pitfall/light traps, and why sampling effort and detectability bias every count.
- **Measuring Abundance and Diversity** — Turning raw counts into ecological numbers: density, relative abundance, richness vs. evenness, the Shannon and Simpson diversity indices, rarefaction and species-area curves, and reading a rank-abundance (Whittaker) plot.
- **Population Dynamics** — How populations change over time: exponential vs. logistic (S-curve) growth toward carrying capacity K, density-dependent vs. density-independent regulation, r- vs. K-strategies, and reading age pyramids and survivorship curves.
- **Species Interactions and Energy Flow** — How organisms connect: competition, predation (Lotka-Volterra cycles), mutualism, parasitism; niche overlap and resource partitioning; food webs and trophic levels; and energy loss up the pyramid (the ~10% rule).
- **Reading Ecological Evidence** — Interpreting ecological results honestly: correlation vs. causation in field data, confounds and pseudoreplication, natural variability and controls, error bars and confidence intervals on estimates, and framing findings for judge Q&A.

**Subfields (branches):**
- `population-ecology` **Population Ecology** — Single-species dynamics in depth: life tables and cohort survivorship, age/stage structure, growth-rate estimation from field data, invasive-species spread and pest outbreaks, and simple population viability. Focused on one species' numbers over time, distinct from community-level diversity work.
- `community-ecology` **Community Ecology** — Multi-species assembly and structure: succession, keystone and foundation species, competition and coexistence, diversity gradients, and how communities reorganize after disturbance. Goes beyond the Core's diversity indices into why communities are assembled the way they are.
- `behavioral-ecology` **Behavioral Ecology** — How organisms behave to survive and reproduce in their environment: optimal foraging, habitat selection, territoriality, predator-avoidance, and mating/social strategies — behavior scored in a field/naturalistic context. Distinct from psychology-behavioral-science by its evolutionary, fitness-and-environment framing on wild organisms.
- `conservation-restoration-ecology` **Conservation & Restoration Ecology** — Applying ecology to protect and rebuild systems: habitat fragmentation and edge effects, corridors and reserve design, endangered-species monitoring, invasive-species management, and measuring restoration success. The applied 'save/rebuild it' angle within ecology.
- `urban-human-impact-ecology` **Urban & Human-Impact Ecology** — Ecology of human-dominated landscapes: urban heat-island effects on species, light and noise pollution, pollinators and green spaces, roadkill and wildlife corridors, and biodiversity along urbanization gradients. The city-and-people-facing side of ecology, kept to living-organism responses rather than earth-system chemistry.

*Pairs with:* `environmental-earth-science`, `plant-science-agriculture`, `oceanography-limnology`, `data-science-ml-metrics`, `meteorology-climate`


## 9. `electronics-electrical-engineering` — Electronics / Electrical Engineering

*Core:* The shared foundation every electronics project rests on: circuit laws and quantities, the components and semiconductors that make up a circuit, the bench instruments used to measure them, and how the resulting traces and curves are read.

**Core units:**
- **Electrical Quantities and Units** — Charge, current, voltage, resistance, power and energy; SI units and prefixes; AC vs DC; the vocabulary and sign/unit conventions every circuit measurement depends on.
- **Circuit Fundamentals and Laws** — Ohm's law, Kirchhoff's current and voltage laws, series vs parallel networks, voltage/current dividers, and Thevenin/Norton equivalents used to analyze any resistive circuit.
- **Components and Semiconductor Devices** — Resistors, capacitors, inductors, diodes, BJTs and MOSFETs; datasheet ratings and tolerances; reading I-V curves, load lines, and transistor output characteristics to see what a device does.
- **Bench Instruments and Measurement** — Multimeter, oscilloscope, function generator, and power supply; probing, grounding, bandwidth and sampling limits; measurement error, loading effects, and how to get a trustworthy reading.
- **AC Circuits and the Frequency Domain** — RC/RL time constants and transients, impedance and reactance, resonance, filters, and how a Bode plot's passband, cutoff, and roll-off encode a circuit's frequency response.
- **Reading Results and Building It Safely** — Interpreting scope traces, duty cycle, and characteristic curves; breadboard-to-PCB prototyping, soldering, and the electrical-safety and grounding practices judges expect to see.

**Subfields (branches):**
- `analog-circuit-design` **Analog Circuit Design** — Amplifiers, op-amp circuits, biasing and load-line analysis, active filters, and feedback; designing and tuning continuous-signal circuits and reasoning about gain, offset, and stability margins from Bode/Nyquist plots.
- `digital-logic-embedded` **Digital Logic and Embedded Systems** — Logic gates, combinational/sequential logic, microcontrollers, GPIO/ADC/PWM, and firmware; building sensor-driven embedded projects and reading digital timing, duty-cycle, and eye-diagram traces.
- `power-electronics` **Power Electronics and Energy Conversion** — Rectifiers, switching regulators, DC-DC converters, motor drivers, PWM control, efficiency and thermal management for delivering and converting electrical power (device circuitry, not the generation-source physics owned by renewable-energy).
- `rf-antennas` **RF and Antenna Engineering** — High-frequency circuits, transmission lines, impedance matching via the Smith chart, S-parameters, and antenna design; managing reflection, standing waves, and matching for wireless and radio-band electronics.
- `sensors-instrumentation` **Sensors and Instrumentation** — Transducers, signal conditioning, bridge circuits, amplification and filtering of small analog signals, calibration, and noise rejection for turning a physical quantity into a clean measurable electrical signal.

*Pairs with:* `robotics-control-systems`, `signal-processing`, `renewable-energy`, `optics-photonics`, `computer-science-algorithms`


## 10. `environmental-earth-science` — Environmental / Earth Science

*Core:* The shared foundation every Earth/environmental student needs: how Earth's coupled systems and biogeochemical cycles work, the standard field/lab instruments and sampling design, and how environmental data, thresholds, and standards are read and defended.

**Core units:**
- **Earth as a System** — Spheres (atmo-, hydro-, litho-, bio-, cryosphere), energy and matter flows between them, residence time, feedbacks, and equilibrium vs. flux — the conceptual frame every project sits inside.
- **Biogeochemical Cycles** — The carbon, nitrogen, phosphorus, and water cycles as stocks-and-fluxes; sources, sinks, mass balance, and how human activity perturbs each (fertilizer runoff, fossil CO2, the greenhouse effect).
- **Field & Lab Methods** — Core instruments and protocols — water sampling and DO/pH/conductivity/turbidity probes, soil cores, air samplers, weather stations, GPS/GIS — plus calibration, blanks, replicates, and grab vs. composite sampling.
- **Sampling Design & Data Integrity** — Spatial and temporal sampling strategy, controls and reference sites, detection limits, QA/QC, contamination and blank/duplicate checks — why a defensible environmental result depends on how you sampled.
- **Reading Environmental Data** — Interpreting time series, depth profiles, hydrographs, climographs, and hydrochemical diagrams; comparing to regulatory thresholds and baselines; distinguishing trend from natural variability and correlation from causation.
- **Environmental Standards & Interpretation** — Reading results against real yardsticks — EPA/WHO water and air standards, indices (AQI, WQI), background/baseline values — and framing findings as impact, risk, and remediation for a judge.

**Subfields (branches):**
- `water-quality-hydrology` **Water Quality & Hydrology** — Freshwater chemistry and movement: dissolved oxygen, nutrients, pH, turbidity, and contaminants in streams, lakes, and groundwater; watersheds, runoff, hydrographs, and self-purification (Streeter-Phelps). Focused on inland freshwater quality/flow, distinct from the marine/lake-ecology emphasis of oceanography-limnology.
- `air-quality-atmosphere` **Air Quality & Atmospheric Pollution** — Ambient and indoor pollutants (PM2.5/PM10, ozone, NOx, VOCs, CO2), sources, dispersion, wind roses, and the Air Quality Index. Centered on pollution measurement and human exposure, not the weather-systems/forecasting scope of meteorology-climate.
- `soil-land-degradation` **Soil Science & Land Degradation** — Soil composition, texture, pH, nutrients, salinity, and contamination; erosion, compaction, runoff, and land-use change. The environmental-quality angle on soils, distinct from crop-yield agriculture and from deep-earth geology-seismology.
- `climate-change-carbon` **Climate Change & the Carbon Cycle** — The greenhouse effect, the Keeling curve, carbon sources/sinks and sequestration, and local climate-change indicators (temperature trends, phenology, sea level). The Earth-system carbon-budget angle, distinct from atmospheric climate dynamics in meteorology-climate.
- `pollution-remediation-waste` **Pollution, Remediation & Waste** — Point vs. non-point pollution, heavy metals, microplastics, and solid/hazardous waste; bioremediation, filtration, phytoremediation, and treatment methods tested at bench scale. The applied clean-up-and-mitigation branch of the field.

*Pairs with:* `ecology`, `meteorology-climate`, `oceanography-limnology`, `chemistry`, `geology-seismology`


## 11. `epidemiology-medicine` — Epidemiology / Medicine

*Core:* The shared foundation every epidemiology student needs: disease-frequency vocabulary, the core study designs and how they measure risk, the tools of outbreak investigation and screening, and how to read/critique population-level evidence for bias and confounding.

**Core units:**
- **Measuring Disease and Risk** — The vocabulary of populations — incidence vs. prevalence, morbidity/mortality, person-time, rates, ratios and proportions, and how a case is defined before anything is counted.
- **Study Designs of Epidemiology** — Cohort, case-control, cross-sectional, and ecological designs — what each measures, its time direction, and the design-specific traps (recall, selection, survivorship) a judge will probe.
- **Measures of Association and Effect** — Relative risk, odds ratio, hazard ratio, attributable risk and NNT — building and reading the 2x2 table, confidence intervals, and what an association can and cannot claim.
- **Bias, Confounding, and Causal Reasoning** — Confounding, selection and information bias, effect modification, and the Bradford Hill viewpoints — the toolkit for arguing (or doubting) that an exposure actually causes an outcome.
- **Screening, Diagnosis, and Test Accuracy** — Sensitivity, specificity, PPV/NPV, ROC curves, and how disease prevalence and cutoff choice change a test's usefulness — plus method-agreement (Bland-Altman) reading.
- **Reading and Interpreting the Evidence** — Epi curves, survival/Kaplan-Meier and forest/funnel plots, the evidence hierarchy, statistical vs. clinical significance, and reading a paper's results critically.

**Subfields (branches):**
- `outbreak-investigation` **Outbreak & Field Epidemiology** — The point-source/propagated outbreak playbook: case definitions, line lists, attack-rate tables, epi-curve interpretation, and the population pyramid — tracing a foodborne or communicable outbreak to its source in the field.
- `infectious-disease-modeling` **Infectious Disease Transmission Modeling** — Compartmental SIR/SEIR models, the basic and effective reproduction numbers (R0, Rt), herd-immunity thresholds, and how contact patterns and interventions bend an epidemic curve. Population-transmission dynamics, distinct from pathogen biology (immunology-microbiology).
- `chronic-disease-epidemiology` **Chronic & Lifestyle Disease Epidemiology** — Long-latency, multifactorial outcomes (cancer, cardiovascular, diabetes): cohort follow-up, dose-response and risk-factor analysis, survival curves, and adjusting for confounders over long time horizons.
- `biostatistics-clinical-trials` **Biostatistics & Clinical Trial Methods** — The quantitative core: randomization, blinding, control groups, power/sample size, p-values and CIs, survival analysis and regression as applied to human-subjects studies — the design and statistics behind a rigorous trial.
- `public-health-surveillance` **Public Health Surveillance & Prevention** — Population monitoring and prevention: surveillance systems, health disparities and social determinants, vaccination/screening program evaluation, and measuring the population impact of a public-health intervention.

*Pairs with:* `clinical-medicine-pharmacology`, `immunology-microbiology`, `data-science-ml-metrics`, `nutrition-food-science`, `psychology-behavioral-science`


## 12. `fluid-dynamics-aerodynamics` — Fluid Dynamics / Aerodynamics

*Core:* The shared foundation every fluids/aero student needs: fluid properties and governing principles, the dimensionless numbers and regimes that classify flow, the wind-tunnel/PIV/pressure-tap methods used to measure it, and how to read the field's signature plots (boundary-layer profiles, lift curves, drag polars, Moody charts).

**Core units:**
- **Fluids and Forces** — Fluid properties (density, viscosity, pressure), the continuum idea, and the forces a fluid exerts — pressure vs. shear/skin friction vs. form drag — plus lift and drag as the two resultant components.
- **Governing Principles** — Conservation of mass (continuity), Bernoulli's equation and its assumptions/limits, Navier-Stokes as the full picture conceptually, and the streamline/streamtube way of reasoning about flow.
- **Regimes and Dimensionless Numbers** — Reynolds number and laminar-to-turbulent transition, the boundary layer and the no-slip condition, flow separation and stall, plus Mach number and when compressibility matters.
- **Measurement and Instrumentation** — Wind tunnels, pitot-static tubes and manometers, pressure taps and Cp, hot-wire/anemometry, force balances and load cells, and PIV/smoke/tuft flow visualization — with calibration and blockage/error sources.
- **Reading the Signature Plots** — Interpreting boundary-layer velocity profiles, lift curves (C_L vs alpha), drag polars, Cp distributions, Moody charts and flow-rate/pressure-drop curves — and dimensional analysis / similitude for scaling model results to full size.

**Subfields (branches):**
- `external-aero-lift-drag` **External Aerodynamics: Lift, Drag & Airfoils** — Flow over wings, airfoils, and bluff/streamlined bodies: angle of attack, stall, drag breakdown (pressure/form vs. friction vs. induced), wing planform and aspect ratio, and vehicle/car drag reduction.
- `internal-pipe-duct-flow` **Internal Flow: Pipes, Ducts & Channels** — Confined flows through pipes, ducts, nozzles, and channels: flow-rate vs. pressure-drop, friction factor and the Moody chart, laminar vs. turbulent pipe flow, and losses through bends, valves, and expansions.
- `boundary-layers-transition-separation` **Boundary Layers, Transition & Separation** — The near-wall layer in depth: laminar/turbulent boundary-layer growth, tripping and transition control, adverse pressure gradients and separation, and drag-reduction devices like vortex generators, dimples, and riblets.
- `unsteady-vortex-wake-flows` **Unsteady, Vortex & Wake Flows** — Time-varying flow phenomena: vortex shedding and Karman streets, Strouhal number, wakes and drafting, flow-induced vibration and flutter, and unsteady lift on flapping or oscillating bodies.
- `hydrodynamics-open-channel-free-surface` **Hydrodynamics & Free-Surface Flows** — Liquid-specific flows with a free surface: open-channel and weir flow, hull/boat drag and wave-making resistance, buoyancy and settling, capillarity and surface tension, and the Froude-number scaling of surface waves.

*Pairs with:* `renewable-energy`, `materials-science`, `robotics-control-systems`, `oceanography-limnology`, `meteorology-climate`


## 13. `gait-biomechanics` — Gait Biomechanics

*Core:* The shared foundation every gait researcher learns — the gait cycle and its vocabulary, how walking/running kinematics and kinetics are measured, and how the standard gait waveforms and parameters are read.

**Core units:**
- **The Gait Cycle and Its Language** — Stride vs. step, stance vs. swing, the sub-phases (initial contact, loading, midstance, terminal stance, pre-swing), double vs. single support, and how running's flight phase changes the split — the shared vocabulary all gait work is described in.
- **Spatiotemporal Parameters** — Stride/step length and width, cadence, walking speed, stance/swing times, and how these are computed and how they trade off — plus symmetry between limbs as the first-pass descriptor of a gait pattern.
- **Gait Kinematics** — Joint-angle waveforms across the cycle (hip/knee/ankle flexion-extension), angle conventions, time-normalization to % gait cycle, and how motion is captured (2D video, markerless pose estimation, marker-based mocap) and its foreshortening pitfalls.
- **Gait Kinetics** — Ground-reaction force (the double-hump vertical GRF, braking/propulsive shear), force plates and pressure insoles, inverse dynamics to joint moments and powers, and the center-of-pressure trajectory during stance.
- **Reading Gait Graphs** — Interpreting the canonical plots — kinematic waveforms, GRF curves, cyclograms/angle-angle loops, moment-angle hysteresis, COP butterfly, plantar-pressure maps, stance/swing timelines — and separating a real deviation from cycle-to-cycle variability.

**Subfields (branches):**
- `clinical-pathological-gait` **Clinical & Pathological Gait Analysis** — Recognizing and quantifying abnormal walking patterns — antalgic limp, Trendelenburg, crouch and equinus/toe-walking, hemiplegic and Parkinsonian gait — and the deviations from normative waveforms that flag neuromuscular or orthopedic impairment.
- `prosthetics-orthotics-gait` **Prosthetic & Orthotic Gait** — How lower-limb prostheses and orthoses (AFOs, KAFOs) reshape the gait cycle — rollover shape and effective foot radius, alignment, energy return of running blades, and restoring symmetry for amputees and braced limbs.
- `footwear-surface-biomechanics` **Footwear & Surface Biomechanics** — How shoes, insoles, barefoot/minimalist conditions, and walking surfaces alter foot strike pattern, plantar pressure distribution, GRF impact peaks, and joint loading during locomotion.
- `balance-stability-fall-risk` **Balance, Stability & Fall Risk** — Dynamic stability during walking and standing — center-of-pressure sway, margin of stability, base of support, gait variability as a fall-risk marker, and how aging or dual-tasking degrades stable locomotion.
- `wearable-gait-sensing` **Wearable & IMU Gait Sensing** — Extracting gait parameters outside the lab from accelerometers, gyroscopes, and instrumented insoles — step detection, cadence and asymmetry estimation, and validating cheap wearable signals against lab-grade reference measures.

*Pairs with:* `robotics-control-systems`, `signal-processing`, `electronics-electrical-engineering`, `sports-exercise-physiology`, `clinical-medicine-pharmacology`


## 14. `genetics-genomics` — Genetics / Genomics

*Core:* The shared foundation every genetics/genomics student needs: the molecular vocabulary of genes and variation, the core lab and sequencing methods, and how to read the field's signature plots and statistics.

**Core units:**
- **DNA, Genes, and Inheritance** — The central dogma, genes vs. alleles, chromosomes, dominant/recessive and Mendelian ratios, genotype vs. phenotype — the vocabulary every downstream lesson assumes.
- **Variation and the Genome** — How genomes differ: SNPs, indels, copy-number and structural variants, mutations vs. polymorphisms, the reference genome, and allele/genotype frequencies in a population.
- **Core Lab Methods** — PCR, gel electrophoresis, restriction enzymes, Sanger vs. next-generation sequencing, DNA extraction and qPCR — what each measures, its readout, and its limits.
- **Reading Genomic Data** — Interpreting the field's signature plots — Manhattan, volcano, gene-expression heatmap, PCA, Circos, phylogenetic tree — and what pattern in each signals a real result.
- **Statistics and Rigor in Genomics** — p-values and effect size (fold-change), multiple-testing correction, false discovery rate, sample size and power, batch effects and controls — why big genomic datasets demand these guardrails.

**Subfields (branches):**
- `population-evolutionary-genomics` **Population & Evolutionary Genomics** — Allele-frequency change across populations and time: Hardy-Weinberg equilibrium, genetic drift and selection signatures, phylogenetics, molecular clocks, and ancestry/admixture from genome-wide data.
- `transcriptomics-gene-expression` **Transcriptomics & Gene Expression** — Measuring which genes are on and how much: RNA-seq and qPCR workflows, differential-expression analysis (volcano plots, heatmaps), and regulation of transcription — distinct from cell-biology mechanism, focused on genome-wide expression profiling.
- `human-medical-genetics` **Human & Medical Genetics** — Linking genotype to human traits and disease: GWAS and Manhattan plots, pedigrees and inheritance patterns, penetrance, carrier and polygenic risk, and interpreting a variant's clinical significance.
- `genome-editing-genetic-engineering` **Genome Editing & Genetic Engineering** — Deliberately altering DNA: CRISPR-Cas9 mechanism and guide-RNA design, on/off-target effects, knockouts and knock-ins, plasmids and cloning, and validating an edit — the applied 'write' side of genomics.
- `bioinformatics-sequence-analysis` **Bioinformatics & Sequence Analysis** — The computational pipeline behind sequencing data: read alignment, variant calling, sequence alignment and BLAST, assembly, and quality control — the algorithms that turn raw reads into interpretable genomic results.

*Pairs with:* `molecular-cell-biology`, `immunology-microbiology`, `clinical-medicine-pharmacology`, `data-science-ml-metrics`, `plant-science-agriculture`


## 15. `geology-seismology` — Geology / Seismology

*Core:* The shared foundation every geology/seismology student needs: Earth materials and structure, the rock cycle and geologic time, how the ground deforms and fails, how seismic waves are recorded and read, and how field/lab data become defensible interpretations.

**Core units:**
- **Earth Materials and the Rock Cycle** — Minerals, the three rock families (igneous/sedimentary/metamorphic), the rock cycle, and reading a hand sample — the vocabulary of what the Earth is made of.
- **Earth Structure and Plate Tectonics** — Crust/mantle/core layering, plate boundaries, faults and folds, and why earthquakes and volcanoes cluster where they do.
- **Geologic Time and Stratigraphy** — Relative vs. absolute dating, the principles of superposition and cross-cutting, stratigraphic columns, and radiometric age reasoning.
- **Rock and Soil Mechanics** — Stress and strain, Mohr's circle and the Mohr–Coulomb failure envelope, grain-size and soil-texture classification, porosity and permeability.
- **Seismic Waves and Instrumentation** — P/S/surface waves, the seismometer, reading a seismogram, travel-time and Wadati diagrams, locating and sizing an earthquake.
- **Field and Lab Methods, and Interpretation** — Sampling, measuring strike/dip, sieve/hydrometer analysis, map/cross-section reading, and turning measurements into a defensible geologic story.

**Subfields (branches):**
- `seismology-earthquake-science` **Seismology & Earthquake Science** — Earthquake location and magnitude, ground-motion and shaking intensity, fault rupture and recurrence, and seismic hazard — reading seismograms and travel-time/Wadati data to characterize real events.
- `sedimentology-stratigraphy` **Sedimentology & Stratigraphy** — Sediment transport, deposition, grain-size and sorting, sedimentary structures, and reconstructing depositional environments and geologic history from stratigraphic columns and cores.
- `mineralogy-petrology` **Mineralogy & Petrology** — Mineral identification and crystallography, igneous/metamorphic classification (QAP, textures), and inferring formation conditions (temperature, pressure, cooling) from rock composition and fabric.
- `structural-geology-geophysics` **Structural Geology & Geophysics** — Faults, folds, joints and strain analysis (strike/dip, rose diagrams, Mohr's circle), plus subsurface imaging via gravity, magnetics, and seismic-reflection surveys.
- `geotechnical-engineering-geology` **Geotechnical & Engineering Geology** — Soil and rock behavior for the built environment — bearing capacity, slope stability and landslides, liquefaction, foundations, and site characterization from soil-mechanics tests.

*Pairs with:* `environmental-earth-science`, `oceanography-limnology`, `materials-science`, `fluid-dynamics-aerodynamics`, `signal-processing`


## 16. `immunology-microbiology` — Immunology / Microbiology

*Core:* The shared foundation every student in this field needs: the microbes and immune system, aseptic culture and enumeration methods, the core assays (growth curves, MIC, titers), and how to read microbiology/immunology data honestly.

**Core units:**
- **The Microbial and Immune World** — Vocabulary and biology: bacteria vs viruses vs fungi, prokaryotic cell structure, Gram-positive vs Gram-negative, innate vs adaptive immunity, antigens and antibodies, pathogens vs commensals.
- **Culturing and Handling Microbes** — Aseptic technique, media types (broth/agar/selective/differential), sterilization and autoclaving, biosafety levels and BSL-1 classroom limits, streaking for isolation, staining.
- **Counting and Measuring Populations** — CFU and serial dilution plate counts, optical density (OD600) and turbidity, the growth curve (lag/log/stationary/death), why log10 axes, converting OD to viable count.
- **Core Assays: Susceptibility and Immune Response** — MIC and MBC, disk-diffusion (Kirby-Bauer) zones of inhibition, time-kill curves, bacteriostatic vs bactericidal, ELISA and antibody titer, positive/negative controls.
- **Reading and Defending Microbiology Data** — Interpreting kill curves and titer curves, breakpoints vs raw zone sizes, contamination and false positives, replicates and controls, log-scale statistics, what a result does and does not prove.

**Subfields (branches):**
- `antimicrobial-resistance` **Antimicrobial Resistance & Drug Discovery** — How resistance arises and spreads (mutation, horizontal gene transfer, biofilms, efflux), MIC/breakpoint testing, and screening natural or novel compounds for antibacterial activity. Centered on the drug-vs-microbe combat side, not human treatment outcomes.
- `microbial-ecology` **Microbial Ecology & Microbiome** — Communities of microbes in soil, water, food, and the gut/skin microbiome: culturing environmental isolates, quantifying diversity, and community shifts under a manipulated condition. The microbe-community angle, distinct from whole-ecosystem ecology.
- `adaptive-immunity` **Adaptive Immunity & Antibody Response** — B and T cells, antigen recognition, clonal selection, primary vs secondary response and immunological memory, antibody titer kinetics, and how vaccines train the adaptive system. The immune-mechanism specialization.
- `host-pathogen-infection` **Host-Pathogen Interaction & Infection** — Virulence factors, how pathogens invade/evade the immune system, the innate inflammatory response, toxins, and infection models. Mechanism of a single infection, distinct from population-level disease spread.
- `applied-antimicrobial-testing` **Applied Antimicrobial & Sanitation Testing** — Real-world efficacy testing of disinfectants, hand sanitizers, food-preservation methods, antimicrobial surfaces, and household/natural agents against microbial growth using zone-of-inhibition and kill assays. The hands-on product-testing branch students most often pursue.

*Pairs with:* `epidemiology-medicine`, `molecular-cell-biology`, `genetics-genomics`, `clinical-medicine-pharmacology`, `nutrition-food-science`


## 17. `materials-science` — Materials Science

*Core:* The shared foundation every materials-science student needs: structure-property-processing thinking, the vocabulary of mechanical/thermal/electrical properties, the standard characterization instruments, and how to read the field's core plots (stress-strain, Ashby, XRD, S-N).

**Core units:**
- **The Materials Paradigm & Bonding** — The structure-property-processing-performance tetrahedron; atomic bonding types (metallic, covalent, ionic, van der Waals) and why they set a material's baseline behavior; the four material classes (metals, ceramics, polymers, composites).
- **Crystal Structure & Microstructure** — Crystalline vs. amorphous order; unit cells (FCC/BCC/HCP); grains, grain boundaries, and defects (vacancies, dislocations); why microstructure — not just composition — controls properties.
- **Mechanical Properties & Testing** — Reading the stress-strain curve (Young's modulus, yield, UTS, ductility, toughness); hardness testing; the three deformation regimes (elastic, plastic, fracture); tension/compression/bending test setups.
- **Thermal, Electrical & Chemical Properties** — Phase transitions and the phase diagram; DSC/TGA thermal analysis; conductors vs. semiconductors vs. insulators; corrosion, oxidation, and environmental degradation.
- **Characterization & Materials Selection** — How the standard instruments work and what they output (XRD for structure, SEM/optical microscopy for microstructure, spectroscopy); Ashby charts and performance indices for choosing a material; honestly reporting measurement limits.

**Subfields (branches):**
- `metals-alloys` **Metallurgy & Alloys** — Metals and their alloys: phase diagrams and the lever rule, heat treatment (annealing, quenching, tempering), strengthening mechanisms (work hardening, grain refinement, solid-solution and precipitation hardening), steel/aluminum systems, and metal failure modes like fatigue and creep.
- `polymers-soft-matter` **Polymers & Soft Matter** — Long-chain macromolecules: thermoplastics vs. thermosets vs. elastomers, molecular weight and cross-linking, the glass transition and viscoelastic (time-dependent) mechanical behavior, and how processing (extrusion, molding, degradation) shapes plastic and rubber properties.
- `ceramics-glasses` **Ceramics & Glasses** — Ionic/covalent inorganic solids: brittle fracture and Weibull statistics, hardness and wear resistance, sintering and powder processing, refractory and high-temperature behavior, and the amorphous structure of glasses versus crystalline ceramics.
- `composites-biomaterials` **Composites & Biomaterials** — Engineered multi-phase materials: fiber-reinforced composites, the rule of mixtures and matrix/reinforcement load transfer, natural and bio-inspired materials, and biocompatible materials for implants — combining stiffness, strength, and weight in ways single materials cannot.
- `nanomaterials-thin-films` **Nanomaterials & Thin Films** — Materials structured at the nanoscale: how surface-area-to-volume ratio and quantum/size effects change properties, nanoparticles and nanotubes, thin-film deposition and coatings, and self-assembly — where being small itself is the property that matters.

*Pairs with:* `chemistry`, `renewable-energy`, `electronics-electrical-engineering`, `gait-biomechanics`, `fluid-dynamics-aerodynamics`


## 18. `meteorology-climate` — Meteorology / Climate

*Core:* The shared atmospheric-science foundation every student needs: what the atmosphere is, the energy budget that drives weather, the variables and instruments that measure it, how weather systems form, and how observational and climate records are read.

**Core units:**
- **The Atmosphere and Its Structure** — Composition, vertical layers (troposphere to thermosphere), pressure/density with altitude, the lapse rate, and standard atmospheric vocabulary.
- **Energy Balance and the Drivers of Weather** — Solar radiation, the greenhouse effect, radiative energy budget, latent vs. sensible heat, and how uneven heating drives circulation and the diurnal cycle.
- **Water, Moisture, and Stability** — Humidity (relative, specific, dew point), saturation and the Clausius-Clapeyron idea, cloud/precipitation formation, and atmospheric stability.
- **Instruments and Weather Observation** — Thermometers, barometers, hygrometers, anemometers, rain gauges; siting/exposure standards, station data, radiosondes, radar and satellites, and measurement error.
- **Weather Systems and Circulation** — Air masses, fronts, high/low pressure, the Coriolis effect, global circulation cells, jet streams, and how systems produce day-to-day weather.
- **Reading Weather and Climate Data** — Time series, anomalies vs. baselines, climatological normals, trends vs. variability, distributions (e.g. Weibull winds), and the weather-vs-climate distinction.

**Subfields (branches):**
- `synoptic-severe-weather` **Synoptic & Severe Weather / Forecasting** — Mid-latitude cyclones, fronts, thunderstorm and convective processes, tornadoes/hurricanes, and how forecasts are built from observations, radar, and numerical models. Focuses on organized weather systems and prediction, not the abstract fluid equations.
- `climatology-climate-dynamics` **Climatology & Climate Change** ⓕ — Climate dynamics and variability — circulation patterns, ENSO/teleconnections, paleoclimate, downscaling (the carbon cycle & mitigation narrative lives in environmental-earth-science).
- `boundary-layer-microclimate` **Boundary Layer & Microclimatology** — Near-surface atmosphere at local scale: urban heat islands, surface energy balance, microclimate mapping, temperature/humidity gradients over terrain and land cover, and local-siting effects.
- `atmospheric-chemistry-aerosols` **Atmospheric Chemistry & Air Quality** ⓕ — Atmospheric composition dynamics — aerosols, ozone photochemistry, greenhouse-gas transport and radiative forcing (regulatory air-quality monitoring lives in environmental-earth-science).
- `applied-wind-solar-resource` **Applied Meteorology: Wind & Solar Resource** — Characterizing the atmospheric energy resource: wind-speed distributions and profiles, solar irradiance/insolation, and siting assessment. Focused on measuring and modeling the atmospheric resource, not device/grid engineering.

*Pairs with:* `environmental-earth-science`, `oceanography-limnology`, `renewable-energy`, `fluid-dynamics-aerodynamics`, `data-science-ml-metrics`


## 19. `molecular-cell-biology` — Molecular & Cell Biology

*Core:* The shared wet-lab foundation every MCB student needs: cell structure, the central dogma, core lab techniques (PCR, electrophoresis, culture, microscopy), and how to read the field's standard plots and controls.

**Core units:**
- **The Cell as a System** — Prokaryotic vs. eukaryotic cells, organelles and their jobs, membranes and transport, and the cell cycle — the structural vocabulary every project rests on.
- **Molecules of Life & the Central Dogma** — DNA/RNA/protein structure, replication, transcription, translation, and the gene-to-protein flow that most MCB hypotheses ultimately concern.
- **Proteins, Enzymes & Reaction Kinetics** — Protein folding and function, enzyme catalysis, and reading Michaelis-Menten and dose-response curves for rate, Km, Vmax, and potency.
- **Core Lab Techniques** — PCR and qPCR, gel electrophoresis, cell culture, spectrophotometry/OD, and microscopy — how each works and what raw signal it produces.
- **Controls, Assays & Reading the Data** — Positive/negative controls, replicates, growth curves, flow-cytometry gating, and normalization — turning instrument output into a defensible claim.

**Subfields (branches):**
- `transcriptional-epigenetic-regulation` **Gene Expression & Regulation** ⓕ — Mechanistic single-locus regulation — transcription-factor binding, chromatin/epigenetic control, promoter and RNA-processing mechanisms (genome-wide profiling lives in genetics-genomics).
- `cell-signaling-metabolism` **Cell Signaling & Metabolism** — Signal-transduction pathways, receptors and second messengers, apoptosis, and core metabolic flux (glycolysis, respiration) — how cells sense their environment and route energy and information.
- `molecular-cloning-techniques` **Molecular Techniques & Genetic Engineering** ⓕ — Bench molecular techniques — cloning, PCR/qPCR, plasmid construction, reporter assays, protein expression (CRISPR/genome editing lives in genetics-genomics).
- `cell-culture-microscopy` **Cell Culture & Microscopy** — Growing and maintaining cell lines, cytotoxicity and viability assays, fluorescent staining, and quantitative image analysis — the workflow for studying live cells and their morphology directly.
- `molecular-toxicology-stress` **Molecular Toxicology & Cellular Stress** — How cells respond to toxins, oxidative stress, and DNA damage — dose-response testing, viability endpoints, and stress-response pathways at the cellular level. Distinct from clinical pharmacology by staying at the in-vitro cell/molecule scale.

*Pairs with:* `genetics-genomics`, `immunology-microbiology`, `clinical-medicine-pharmacology`, `chemistry`, `data-science-ml-metrics`


## 20. `neuroscience` — Neuroscience

*Core:* The shared foundation every neuroscience student needs: neuron/synapse biology, the vocabulary of neural signaling, the standard recording and imaging instruments, and how to read the field's canonical plots (spikes, EEG, tuning curves, activation maps).

**Core units:**
- **The Neuron and the Nervous System** — Structure of neurons (soma, dendrites, axon, synapse), glia, gray vs. white matter, and the gross organization of the CNS/PNS and major brain regions a student must be able to name and place.
- **Electrical and Chemical Signaling** — Resting membrane potential, ion gradients and channels, the action potential's phases, synaptic transmission, neurotransmitters and receptors, excitation vs. inhibition, and the all-or-none principle.
- **Recording and Imaging the Brain** — The core instruments and what each actually measures: single-unit/multi-electrode electrophysiology, EEG, fMRI/BOLD, calcium imaging, and their spatial-vs-temporal-resolution trade-offs.
- **Reading Neural Data** — How to interpret the field's canonical plots — spike raster, PSTH, tuning curve, EEG band-power spectrum and spectrogram, ERP waveform, dose-firing curves, fMRI activation bars — and what a peak, shift, or band change means.
- **Experimental Design and Interpretation in Neuroscience** — Stimulus-locked averaging, trial structure, controls and baselines, correlation-vs-causation (lesion/stimulation/optogenetics), inter-subject variability, and the ethics/limits of human and animal neuro studies.

**Subfields (branches):**
- `cellular-electrophysiology` **Cellular & Systems Electrophysiology** — Single-neuron and circuit recording: action-potential dynamics, ion-channel behavior, spike trains, tuning curves, and neural coding of stimuli. The angle is the biophysics and firing patterns of individual neurons and small circuits, not whole-brain imaging.
- `cognitive-eeg` **Cognitive & EEG/ERP Neuroscience** — Non-invasive human electrophysiology of cognition: EEG oscillations, band power, event-related potentials, and brain-computer interfaces tied to attention, memory, sleep, and perception. The angle is measuring cognition through scalp electrical signals.
- `neuroimaging-connectomics` **Neuroimaging & Connectomics** — Whole-brain structure and function via fMRI/BOLD, structural MRI, and connectivity/connectome analysis: mapping which regions activate for a task and how regions are wired together as a network. The angle is spatial brain mapping and network structure.
- `neuromodulation-synaptic-pharmacology` **Neuropharmacology & Neuromodulation** ⓕ — Basic-science mechanism — receptor/synaptic pharmacology, neuromodulator systems, and neuromodulation techniques (optogenetics, DBS); clinical CNS drugs live in clinical-medicine-pharmacology.
- `developmental-plasticity` **Developmental Neuroscience & Plasticity** — How the nervous system wires, learns, and rewires: neurodevelopment, synaptic plasticity (LTP/LTD), learning-driven circuit change, critical periods, and neurodegeneration. The angle is change in neural structure and connectivity over time and experience.

*Pairs with:* `psychology-behavioral-science`, `clinical-medicine-pharmacology`, `signal-processing`, `data-science-ml-metrics`, `molecular-cell-biology`


## 21. `nutrition-food-science` — Nutrition / Food Science

*Core:* The shared foundation every nutrition/food-science student needs: macronutrient and energy vocabulary, the lab and analytical methods that measure food composition and quality, and how to read the standard charts and interpret a study.

**Core units:**
- **Nutrients and Food Energy** — Macronutrients (carbohydrate, protein, fat), micronutrients, water, and fiber; Atwater factors and how grams convert to kilocalories.
- **Food Composition and Labeling** — Reading a nutrition-facts panel, serving sizes, per-100g vs per-serving, ingredient lists, and food-composition databases as data sources.
- **Measuring Food in the Lab** — Core instruments and assays: pH meter, penetrometer/texture, refractometer (Brix), moisture and titratable acidity, plate counts for microbes, and calibration.
- **Food Quality, Safety, and Spoilage** — Microbial growth curves and CFU, water activity, the temperature danger zone, oxidation/rancidity, and the Maillard/browning reactions behind quality change.
- **Sensory Science and Study Design** — Trained vs consumer panels, hedonic scales, triangle/difference tests, blinding and controls, and why sensory data needs replication and statistics.
- **Reading Nutrition Evidence** — Interpreting the field's charts (composition bars, growth curves, glycemic-response, sensory radar), plus confounding, RCT vs observational studies, and correlation vs causation in diet research.

**Subfields (branches):**
- `macronutrients-metabolism` **Macronutrients & Metabolic Response** — How the body handles carbohydrate, protein, and fat: glycemic index/load and blood-glucose response curves, satiety, and energy balance. Focused on human dietary response, not clinical disease treatment.
- `food-chemistry-processing` **Food Chemistry & Processing** — The chemistry of food itself: browning (Maillard/caramelization), emulsions, gelation, protein denaturation, pH/acidity, and how cooking, drying, and heat processing change composition and structure.
- `food-microbiology-safety` **Food Microbiology & Safety** — Spoilage and pathogen growth in food: CFU plate counts, growth curves, water activity, preservation (refrigeration, salting, canning, pasteurization), and shelf-life testing.
- `fermentation-preservation` **Fermentation & Preservation** — Controlled microbial transformation of food: lactic-acid and yeast fermentation, pH acidification time-courses, brewing/baking/pickling/dairy cultures, and how fermentation preserves and flavors food.
- `sensory-consumer-science` **Sensory & Consumer Science** — Measuring perceived quality: trained-panel and consumer testing, hedonic and intensity scales, sensory radar profiles, difference tests, and linking sensory data to formulation choices.

*Pairs with:* `plant-science-agriculture`, `clinical-medicine-pharmacology`, `immunology-microbiology`, `chemistry`, `epidemiology-medicine`


## 22. `oceanography-limnology` — Oceanography / Limnology

*Core:* The shared water-column literacy every aquatic-science student needs: what seawater and lake water are made of, how they stratify and move, the standard sampling instruments, and how to read a depth profile or T-S diagram.

**Core units:**
- **The Aquatic Environment** — What distinguishes ocean from lake, the vertical zones (epipelagic/euphotic, mixed layer, benthic), the global picture of basins vs. lentic/lotic freshwater, and why water's density behavior governs everything.
- **Water Properties and Chemistry** — Salinity and the practical salinity scale, temperature, the equation of state and density, dissolved oxygen, pH/carbonate system, and key nutrients (N, P, Si) as the vocabulary of a water sample.
- **Stratification and Water Movement** — Thermocline/halocline/pycnocline, the seasonal mixing-stratification cycle of lakes (turnover, mono/dimictic), tides, currents, waves, and upwelling as the physical structure water organizes into.
- **Sampling Instruments and Field Methods** — The CTD rosette, Niskin bottles, Secchi disk, fluorometer, DO/oxygen sensors, ADCP, tide gauges, and how each turns water into a number — plus calibration and casting technique.
- **Reading Profiles and Diagrams** — Interpreting a vertical depth profile, the T-S diagram and isopycnals/water masses, tidal-height curves and the spring-neap cycle, and the deep chlorophyll maximum — how oceanographers extract meaning from a cast.
- **Study Design and Data Integrity** — Replication across depth and time, distinguishing spatial from temporal variability, avoiding contamination, honest treatment of instrument drift and detection limits, and framing an aquatic hypothesis for judges.

**Subfields (branches):**
- `physical-oceanography` **Physical Oceanography & Hydrodynamics** — The motion and physical structure of water bodies: currents, tides, waves, Ekman transport, mixing, stratification dynamics, and heat/momentum transport measured with ADCPs, drifters, and temperature strings. Stays on the water side rather than atmospheric climate forcing.
- `chemical-oceanography` **Chemical Oceanography & Aquatic Chemistry** — The dissolved and particulate chemistry of natural waters: the carbonate system and acidification, nutrient cycling (N, P, Si), dissolved oxygen and hypoxia, and trace constituents — the chemical fingerprint of a water sample and how it changes with depth and season.
- `biological-oceanography` **Biological Oceanography & Plankton Dynamics** — Primary production, phytoplankton and zooplankton communities, the deep chlorophyll maximum, food-web transfer, and how chlorophyll-a and productivity link to light and nutrients — the living, drifting component of the water column rather than benthic community ecology.
- `limnology-freshwater` **Limnology & Freshwater Systems** — Lakes, ponds, rivers, and reservoirs: thermal stratification and turnover, trophic state and eutrophication, algal blooms, watershed inputs, and Secchi-depth clarity — freshwater-specific dynamics distinct from marine systems.
- `estuarine-coastal` **Estuarine & Coastal Processes** — The land-sea transition zone: salinity gradients and mixing regimes, estuarine circulation, sediment transport and turbidity, tidal wetlands, and the physical-chemical dynamics where rivers meet the sea — a distinct hydrographic regime from open ocean or inland lakes.

*Pairs with:* `ecology`, `environmental-earth-science`, `chemistry`, `meteorology-climate`, `fluid-dynamics-aerodynamics`


## 23. `optics-photonics` — Optics / Photonics

*Core:* The shared foundation every optics student needs: the nature of light, geometric and wave optics, the instruments that measure light, and how to read spectra, intensity curves, and interference patterns.

**Core units:**
- **The Nature of Light** — Light as an electromagnetic wave and as photons; wavelength/frequency/energy (E=hf), the visible-to-IR/UV spectrum, speed of light and index of refraction, intensity and irradiance, and the core vocabulary (coherence, monochromaticity, polarization) a judge expects you to define.
- **Geometric Optics** — The ray model: reflection, refraction and Snell's law, total internal reflection, dispersion, thin lenses and mirrors, the lens/mirror equation, magnification, focal length, and real-vs-virtual images — the backbone of any imaging or lens project.
- **Wave Optics** — Superposition and interference, Huygens' principle, single- and double-slit diffraction, the diffraction grating equation, thin-film interference, the diffraction limit, and polarization with Malus's law — why light bends, spreads, and cancels.
- **Sources, Detectors, and Instruments** — How light is made and measured: lasers and the Gaussian beam, LEDs and blackbody/thermal emitters, photodiodes and image sensors, spectrometers, photometry vs. radiometry units (lux, watts, lumens), and calibration of an optical measurement.
- **Spectroscopy and Reading Optical Data** — Emission and absorption line spectra, blackbody curves and Wien's law, the Beer–Lambert law, and how to read the standard optics plots — intensity-vs-angle, spectral-radiance-vs-wavelength, and diffraction patterns — the interpretation skills judges probe.

**Subfields (branches):**
- `imaging-microscopy` **Imaging & Microscopy** — Building and characterizing imaging systems: resolution and the diffraction limit, numerical aperture, aberrations, depth of field, contrast, and microscopy/telescope/camera optics. The 'form an image and measure how good it is' branch, distinct from acoustics or astronomy instrumentation.
- `lasers-photonics-devices` **Lasers & Photonic Devices** — How lasers work (stimulated emission, gain, resonators, modes) and photonic components — beam collimation and focusing, fiber optics and waveguides, LEDs and laser diodes. Light-generation and light-guiding hardware, not the general EM theory in Core.
- `spectroscopy-color` **Spectroscopy & Color Science** — Using light to identify and quantify matter: absorption/emission/fluorescence spectroscopy, colorimetry and the CIE color space, human color perception, and pigment/dye analysis. Chemical/perceptual readout of spectra, deeper than the Core intro.
- `optical-sensing-photometry` **Optical Sensing & Photometry** — Turning light into measured data: photodetectors, LIDAR and time-of-flight ranging, optical fiber and free-space sensors, illuminance/photometric measurement, and signal-to-noise in optical detection. The measurement-and-instrumentation branch of optics.
- `polarization-nonlinear-optics` **Polarization & Advanced Wave Optics** — Polarization states and control (linear, circular, birefringence, waveplates, LCDs, optical stress analysis), holography, and interferometry for precision measurement. The advanced wave-behavior branch beyond the Core diffraction/Malus intro.

*Pairs with:* `astronomy-astrophysics`, `chemistry`, `electronics-electrical-engineering`, `signal-processing`, `materials-science`


## 24. `plant-science-agriculture` — Plant Science / Agriculture

*Core:* The shared foundation every plant-science student needs: plant structure and physiology, how growth/yield are measured, the controlled-environment and field methods used to test treatments, and how growth and response curves are read.

**Core units:**
- **Plant Structure and Life Cycle** — Root/shoot/leaf anatomy, tissues (xylem, phloem, meristems, stomata), and the seed-to-senescence life cycle that frames every measurement.
- **Plant Physiology Fundamentals** — Photosynthesis and respiration, water relations and transpiration, and the essential macro/micronutrients that drive growth and yield.
- **Growth, Development, and Hormones** — Cell division vs. expansion, tropisms, and the five classic plant hormones (auxin, gibberellin, cytokinin, ABA, ethylene) as the control system behind development.
- **Measuring Plants and Running Trials** — Growth-analysis metrics (biomass, RGR, leaf area, root:shoot), controlled-environment vs. field design, randomization, replication/blocking, and controlling confounds like edge effects.
- **Instruments and Data in Plant Science** — Gas-exchange and chlorophyll-fluorescence systems, SPAD/chlorophyll meters, soil moisture and light (PAR) sensors, and how germination, growth, and dose-response curves are interpreted.
- **Landmark Work and Interpretation** — Green Revolution and dwarfing genes, Mitscherlich/law-of-the-minimum yield thinking, C3/C4/CAM pathways, and reading response curves for compensation points, optima, and plateaus.

**Subfields (branches):**
- `crop-agronomy-yield` **Crop Agronomy & Yield** — Field-crop management to maximize yield and quality: fertilizer and irrigation dose-response, planting density and spacing, tillage, crop rotation, and yield-component analysis. Focused on whole-plot productivity, distinct from lab plant physiology.
- `soil-fertility-plant-nutrition` **Soil Science & Plant Nutrition** — The soil-plant interface: soil texture, pH, organic matter, cation exchange, nutrient availability and deficiency symptoms, composting/amendments, and the rhizosphere. The chemistry and biology of what roots grow in, angled at plant nutrition rather than pure geochemistry.
- `abiotic-stress-physiology` **Abiotic Stress Physiology** — How plants sense and tolerate drought, salinity, heat/cold, flooding, and light/UV stress: stomatal regulation, water-use efficiency, osmotic adjustment, and stress-tolerance screening. Whole-plant stress responses, not molecular-biology mechanism for its own sake.
- `plant-pathology-pest-management` **Plant Pathology & Pest Management** — Crop threats and their control: fungal/bacterial/viral diseases and insect pests, the disease triangle, plant immune responses, resistant varieties, and integrated pest management. Framed around protecting the crop, distinct from general microbiology or ecology.
- `crop-breeding-improvement` **Crop Breeding & Improvement** — Improving varieties through applied plant breeding: heritability and selection, hybrid vigor, marker-assisted selection, and comparing cultivars in replicated variety trials. The applied trait-improvement side, kept distinct from foundational genetics/genomics.

*Pairs with:* `ecology`, `genetics-genomics`, `environmental-earth-science`, `molecular-cell-biology`, `nutrition-food-science`


## 25. `psychology-behavioral-science` — Psychology / Behavioral Science

*Core:* The shared experimental-psychology foundation every behavioral researcher needs: operationalizing constructs, human-subjects study design, measurement/psychometrics, and reading behavioral data honestly.

**Core units:**
- **Foundations of Behavioral Science** — What psychology measures and how: constructs vs. operational definitions, independent/dependent variables, the behavioral-vs-cognitive-vs-biological levels of explanation, and where a fair project sits.
- **Research Design with Human Subjects** — Experimental vs. correlational vs. observational designs, between- vs. within-subjects, random assignment, control/comparison groups, and the confounds (placebo, demand characteristics, order effects) these designs manage.
- **Measuring Behavior** — Turning behavior into numbers: reaction time, accuracy, self-report/Likert scales, behavioral coding, and psychophysical thresholds — plus reliability and validity of each measure.
- **Sampling, Bias, and Research Ethics** — Sampling frames and generalizability, self-selection and response bias, informed consent, assent for minors, IRB/ethics norms, and why they constrain a student study.
- **Reading and Interpreting Behavioral Data** — Descriptive stats and distributions for behavioral data, significance vs. effect size, correlation-is-not-causation, and standard psychology figures (RT distributions, learning/forgetting curves, diverging Likert bars).

**Subfields (branches):**
- `cognitive-psychology` **Cognitive Psychology** — Internal mental processes measured through behavior: attention, memory (serial-position, forgetting curves), problem-solving, decision-making, and mental workload — typically via reaction-time and accuracy paradigms.
- `social-psychology` **Social Psychology** — How the presence, behavior, and expectations of others shape an individual: conformity, persuasion, group influence, stereotypes/bias, and prosocial behavior, studied with manipulation-based social experiments and attitude surveys.
- `developmental-psychology` **Developmental Psychology** — How behavior and cognition change across age, from childhood to adolescence: cognitive milestones, language, moral reasoning, and age-comparison designs (cross-sectional vs. longitudinal) — distinct from adult-only cognitive work.
- `psychophysics-perception` **Psychophysics & Perception** — The quantitative link between physical stimuli and subjective sensation: detection/discrimination thresholds, just-noticeable differences, psychometric functions, and perceptual illusions across the senses.
- `health-behavior-motivation` **Health Behavior & Motivation** — What drives and changes everyday behavior: habit formation, motivation and reward, stress and sleep effects on performance, and behavior-change interventions measured through self-report and behavioral logging.

*Pairs with:* `neuroscience`, `data-science-ml-metrics`, `epidemiology-medicine`, `nutrition-food-science`, `sports-exercise-physiology`


## 26. `renewable-energy` — Renewable Energy

*Core:* The shared foundation every renewable-energy student needs: energy/power vocabulary and units, the resource-to-electricity conversion chain, the core instruments and characteristic curves, and how to read efficiency, capacity factor, and system performance.

**Core units:**
- **Energy, Power, and Units** — Energy vs. power, the joule/watt/watt-hour distinction, kW vs kWh, capacity vs. output, and the unit conversions and sanity-checks every renewable calculation depends on.
- **How Energy Is Converted and Delivered** — The resource-to-electricity chain (source, conversion device, conditioning, storage, load/grid), AC vs DC, and where losses appear at each stage.
- **Measuring the Resource and the Output** — Core instruments and quantities: irradiance (pyranometer), wind speed (anemometer), streamflow, voltage/current/power meters, and characteristic curves (I-V, power, discharge).
- **Efficiency, Capacity Factor, and Losses** — Defining and computing conversion efficiency, capacity factor, and losses; why real output falls short of nameplate; reading efficiency-vs-condition and derating curves.
- **Variability, Storage, and Matching Supply to Load** — Intermittency, load-duration and flow-duration curves, capacity vs. energy storage, round-trip efficiency, and matching a variable source to a demand profile.
- **Interpreting and Defending Renewable Results** — Reading performance curves, controlling for confounds (temperature, shading, wind gusts), levelized-cost and payback intuition, and honest reporting of a system's real-world limits.

**Subfields (branches):**
- `solar-photovoltaics` **Solar Photovoltaics** — PV cells, modules, and arrays: the photovoltaic effect, I-V and power curves, maximum-power-point tracking, temperature and shading derating, tilt/orientation and irradiance optimization. Centered on converting sunlight directly to electricity, distinct from general optics/photonics.
- `wind-energy` **Wind Energy** — Wind turbine aerodynamics and siting: power curves, cut-in/rated/cut-out speeds, the cubic wind-speed relationship, blade design, Betz limit, and turbine placement. Focused on capturing wind energy, not general fluid-dynamics theory for its own sake.
- `energy-storage-batteries` **Energy Storage and Batteries** — Storing renewable energy: battery chemistries, charge/discharge curves, capacity fade and cycle life, depth of discharge, round-trip efficiency, and other storage (pumped-hydro, thermal, flywheel) for smoothing intermittent supply.
- `hydro-and-marine-power` **Hydro and Marine Power** — Extracting power from moving water: hydropower head and flow, flow-duration curves, turbine types, plus tidal and wave energy. Emphasis on the head-times-flow power relationship and water-resource variability specific to renewables.
- `grid-integration-microgrids` **Grid Integration and Microgrids** — Connecting variable renewables to loads: inverters and power conditioning, microgrid and off-grid system sizing, demand matching, load-duration analysis, and stability challenges of high-renewable grids. Focused on the energy-delivery side, not general electronics design.

*Pairs with:* `electronics-electrical-engineering`, `meteorology-climate`, `materials-science`, `environmental-earth-science`, `fluid-dynamics-aerodynamics`


## 27. `robotics-control-systems` — Robotics / Control Systems

*Core:* The shared foundation every robotics/control student needs: the sense-think-act loop, feedback control (PID) and system response, actuators/sensors, and how to read control-performance plots.

**Core units:**
- **Foundations of Robotics and Control** — Vocabulary and the big picture: what a robot/control system is, the sense-think-act loop, plant vs. controller, open-loop vs. closed-loop (feedback), setpoint/error/disturbance, and where a fair project sits.
- **Sensors and Actuators** — How a robot perceives and moves: encoders, IMUs, ultrasonic/IR/lidar, force sensors; DC/servo/stepper motors and the torque-speed curve; sensor calibration, resolution, noise, and actuator saturation limits.
- **Feedback Control and PID** — The heart of the field: error-driven feedback, proportional/integral/derivative terms and what each fixes, PID tuning, integrator windup, and closing the loop to hold a setpoint despite disturbances.
- **System Response and Stability** — Reading how a system reacts: step response, rise time, settling time, overshoot, steady-state error, under/critically/over-damped behavior, and the idea of stability vs. oscillation/instability.
- **Measurement, Tracking, and Interpreting Results** — How results are read: trajectory/path-following and tracking error, control-effort plots, sampling rate and timing, quantifying performance (RMS error, %-overshoot), and defensible experimental design for a control project.

**Subfields (branches):**
- `mobile-robotics-navigation` **Mobile Robotics and Navigation** — Wheeled/legged robots that move through space: odometry and dead reckoning, path planning and obstacle avoidance, line/wall following, differential-drive kinematics, and localization (this field's own angle, distinct from pure CS pathfinding algorithms).
- `manipulation-kinematics` **Robotic Arms and Manipulation** — Serial-link arms and end-effectors: forward/inverse kinematics, degrees of freedom, joint vs. workspace coordinates, grippers, and controlling an arm to reach a pose or follow a path.
- `control-theory-tuning` **Control Theory and Controller Design** — Deeper controller design beyond basic PID: system modeling and transfer functions, feedforward, state feedback, cascade/loop tuning, and stability analysis for a specific plant a fair project builds.
- `autonomous-systems-decision` **Autonomous Behavior and Decision Logic** — How a robot decides what to do: finite-state machines, behavior-based control, reactive vs. deliberative architectures, and sensor-triggered autonomy (the robotics-embodied angle, not general ML/AI).
- `balancing-legged-dynamics` **Balance and Legged/Dynamic Systems** — Controlling inherently unstable, dynamic robots: self-balancing (inverted-pendulum) robots, legged locomotion gaits, center-of-mass control, and using feedback to stabilize systems that fall without it.

*Pairs with:* `electronics-electrical-engineering`, `computer-science-algorithms`, `gait-biomechanics`, `signal-processing`, `classical-mechanics-physics`


## 28. `signal-processing` — Signal Processing

*Core:* The shared foundation every signal-processing student needs: what a signal is, how sampling and the frequency domain work, how filters and spectral tools are built and read, and how to judge whether a spectral result is real or an artifact.

**Core units:**
- **Signals, Sampling, and the Digital Domain** — What a signal is (continuous vs. discrete, analog vs. digital), amplitude/time/sample-rate vocabulary, the sampling theorem, the Nyquist frequency, aliasing, quantization, and reading a raw time-domain waveform.
- **The Frequency Domain and the Fourier Transform** — Time domain vs. frequency domain, the DFT/FFT, magnitude and phase spectra, frequency resolution and bin spacing, and how to read an FFT magnitude spectrum to find the frequencies present in a signal.
- **Windowing, Leakage, and Spectral Estimation** — Why finite records cause spectral leakage, window functions (rectangular/Hann/Hamming) and the resolution-vs-leakage trade-off, power spectral density, the spectrogram (STFT), and the time-frequency resolution trade-off.
- **Filters and Filtering** — Low/high/band-pass and notch filters, cutoff frequency and roll-off, FIR vs. IIR, the frequency-response and pole-zero views, phase delay, and reading a filtered-vs-unfiltered overlay to judge what a filter kept or removed.
- **Correlation, Noise, and Signal Quality** — Autocorrelation and cross-correlation for periodicity and delay, signal-to-noise ratio and averaging to pull signal out of noise, common artifacts (60 Hz line noise, DC offset, clipping), and detrending/normalization before analysis.
- **Reading, Reporting, and Defending a Result** — Turning a spectral or filtered result into a defensible claim: choosing sample rate and record length, sanity-checking a peak against aliasing/leakage, honest reporting of resolution limits, and the vocabulary judges probe.

**Subfields (branches):**
- `biosignal-processing` **Biosignal Processing** — Recording and cleaning physiological signals — ECG/EMG/EEG/PPG — including motion and line-noise removal, R-peak and heart-rate-variability extraction, EMG envelope detection, and framing biosignal features for classification. Focuses on the signal-chain and DSP, not the clinical physiology itself.
- `audio-speech-dsp` **Audio & Speech DSP** — Processing sound as a signal: pitch and formant estimation, filtering and equalization, noise gating, MFCC/spectral features, and speech/keyword detection. Concerns the digital processing pipeline for audio, not room acoustics or the physics of sound propagation.
- `digital-communications` **Digital Communications & Modulation** — Encoding bits onto carriers — AM/FM, ASK/FSK/PSK/QAM — plus constellation diagrams, symbol/bit error rate, matched filtering, and simple channel-noise and equalization experiments (e.g. software-defined radio, IR/RF links).
- `image-2d-signal-processing` **Image & 2D Signal Processing** — Extending 1D DSP to images: 2D convolution and kernels, spatial vs. frequency-domain (2D FFT) filtering, edge detection, denoising and sharpening, and thresholding/feature extraction on pixel data.
- `adaptive-realtime-dsp` **Adaptive & Real-Time DSP** — Filters and estimators that update online: adaptive noise cancellation and LMS filters, Kalman filtering for sensor fusion, streaming/buffered processing, and latency, throughput, and fixed-point constraints of running DSP on a microcontroller.

*Pairs with:* `acoustics-sound`, `electronics-electrical-engineering`, `data-science-ml-metrics`, `neuroscience`, `robotics-control-systems`


## 29. `sports-exercise-physiology` — Sports / Exercise Physiology

*Core:* The shared foundation every exercise physiology student needs: energy systems, the cardiorespiratory and metabolic responses to exercise, the standard lab tests and instruments that measure them, and how to read the resulting curves and defend the numbers.

**Core units:**
- **Foundations of Exercise Physiology** — What the field studies, acute vs. chronic (adaptation) responses, homeostasis, the dose-response logic linking a training stimulus to a physiological change, and where a science-fair project sits within it.
- **Energy Systems & Metabolism** — ATP-PCr, glycolytic, and oxidative pathways; aerobic vs. anaerobic contribution by intensity/duration; substrate use (fat vs. carbohydrate); EPOC and the oxygen deficit/debt.
- **Cardiorespiratory & Muscular Systems Under Load** — Heart rate, stroke volume, cardiac output, ventilation, oxygen delivery/extraction (Fick equation), and skeletal-muscle fiber types (Type I vs. II) — the physiology behind the response.
- **Measurement Methods & Instruments** — Ergometers, indirect calorimetry/metabolic carts, HR monitors, blood lactate analyzers, RPE scales, incremental (graded) exercise-test protocols, and controlling confounds like hydration, time-of-day, and warm-up.
- **Reading the Curves & Key Thresholds** — Interpreting VO₂max plateau, lactate/ventilatory thresholds, HR-recovery, force-velocity-power, and critical-power curves; normalizing to body mass; and distinguishing a real threshold from noise.
- **Study Design, Ethics & Defending Results** — Within- vs. between-subject designs, reliability/validity of physiological measures, human-subject ethics (consent, PAR-Q screening, safety), effect size vs. significance, and framing findings for judges.

**Subfields (branches):**
- `cardiorespiratory-endurance` **Cardiorespiratory & Endurance Physiology** — Aerobic capacity and its limiters: VO₂max, lactate and ventilatory thresholds, exercise economy/efficiency, VO₂ kinetics, and cardiovascular drift over prolonged endurance work.
- `strength-power-neuromuscular` **Strength, Power & Neuromuscular Performance** — Maximal force and rate of force development: force-velocity-power profiling, the stretch-shortening cycle, jump/sprint mechanics of power output, and motor-unit recruitment — the muscle's output side, not gait mechanics.
- `metabolism-nutrition-fueling` **Exercise Metabolism & Fueling** — Substrate utilization during exercise, glycogen depletion and carbohydrate/fat oxidation crossover, hydration and electrolyte balance, and how nutritional timing shifts fuel use and performance during effort.
- `training-adaptation-periodization` **Training Adaptation & Periodization** — Chronic adaptations to a training stimulus: overload/progression, specificity, supercompensation and recovery, monitoring training load, detraining/tapering, and season-long performance progression.
- `environmental-altitude-thermal` **Environmental & Extreme-Condition Physiology** — How heat, cold, altitude/hypoxia, and dehydration alter the exercise response: thermoregulation, sweat rate and heat strain, acclimatization, and hypoxic effects on oxygen delivery and endurance.

*Pairs with:* `nutrition-food-science`, `gait-biomechanics`, `clinical-medicine-pharmacology`, `data-science-ml-metrics`, `psychology-behavioral-science`

