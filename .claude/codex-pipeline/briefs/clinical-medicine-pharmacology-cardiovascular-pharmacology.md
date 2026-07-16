# Codex segment brief — clinical-medicine-pharmacology · cardiovascular-pharmacology

- **Field:** `clinical-medicine-pharmacology` — Clinical Medicine / Pharmacology
- **Segment:** branch `cardiovascular-pharmacology` — **Cardiovascular & Autonomic Pharmacology**
- **id / label:** `cardiovascular-pharmacology` / "Cardiovascular & Autonomic Pharmacology"
- **kind:** `branch` (Core already built: 8 units / 52 lessons)
- **id prefix:** `clinpharm-cardio` (Core used `clinpharm-core`; keep globally unique)
- **Pairs with:** epidemiology-medicine, sports-exercise-physiology, immunology-microbiology, neuroscience, data-science-ml-metrics

## Scope (from TAXONOMY)
The heart, vasculature, and their drugs: blood-pressure regulation, ECG interpretation,
antihypertensives / beta-blockers / stimulants, and autonomic (sympathetic/parasympathetic)
effects on heart rate and pressure. Angle is **drug-and-clinical-measurement** — distinct from
a pure exercise-physiology angle (that's `sports-exercise-physiology`). Advanced-high-school / AP
level, 4–6 minute reads. Every segment must include a **Landmark Work & Open Debates** unit.

## Unit plan — 7 units, ~45 lessons (target 40–50)

Order: fundamentals → autonomic control → measurement/instruments → interpretation → the drug
classes → landmark work & debates → applications/study design.

### U1 · `clinpharm-cardio-physio` — Cardiovascular Physiology for Pharmacology (6)
The mechanical substrate every cardiovascular drug acts on.
1. The cardiac cycle & pump function — systole/diastole, valves, the pressure-volume loop (intuition).
2. Cardiac output = HR × stroke volume — the master equation drugs move.
3. Preload, afterload, contractility — the three levers (Frank–Starling), and which drugs pull which.
4. Blood pressure as MAP = CO × SVR — where systolic/diastolic come from; pulse pressure.
5. Vascular tone & the endothelium — smooth muscle, nitric oxide, vasoconstriction/dilation.
6. Short- vs long-term BP regulation — baroreflex (fast) vs renal/RAAS (slow); why both matter for drugs.

### U2 · `clinpharm-cardio-autonomic` — The Autonomic Nervous System & the Heart (6)
The control system antihypertensives, beta-blockers and stimulants exploit.
1. Sympathetic vs parasympathetic — the two branches and their opposing cardiac effects.
2. Adrenergic receptors α1 / β1 / β2 — location and the measurable effect of each.
3. Cholinergic (M2) control & vagal tone — how the vagus slows the heart; atropine as the probe.
4. Catecholamines — epinephrine vs norepinephrine, dose-dependent α/β effects, the "adrenaline" response.
5. The baroreflex loop in detail — the negative-feedback arc that buffers BP beat-to-beat.
6. Reflex responses & drug pitfalls — reflex tachycardia from vasodilators; why a drug's *net* HR effect isn't obvious.

### U3 · `clinpharm-cardio-measure` — Measuring the Cardiovascular System (7)
Instruments and craft — the measurement half of the "drug-and-clinical-measurement" angle.
1. Blood-pressure measurement — auscultatory (Korotkoff sounds) vs oscillometric cuffs; cuff-size error.
2. Ambulatory BP monitoring (ABPM) & the dipping pattern — why one reading lies; white-coat effect.
3. The ECG — what it records (depolarization/repolarization), not the mechanical beat.
4. ECG leads & the 12-lead picture — limb vs precordial leads, why multiple views exist.
5. Heart rate & heart-rate variability (HRV) — RR intervals, time- vs frequency-domain HRV as an autonomic readout.
6. Pulse oximetry & photoplethysmography — SpO2, the PPG pulse, what wrist wearables actually measure.
7. Measurement artifact & reference ranges — motion, arrhythmia, and normal-range caveats for HR/BP/SpO2.

### U4 · `clinpharm-cardio-ecg` — Reading the ECG & Hemodynamic Traces (6)
Interpretation — turning traces into claims.
1. The P–QRS–T complex — what each deflection means and the normal sequence.
2. Rate & rhythm from the strip — the R-R method, regular vs irregular, sinus rhythm.
3. Intervals: PR, QRS, QT — what a long/short interval implies; QT and drug safety (a teaser for toxicology).
4. Tachycardia vs bradycardia & common ectopy — reading rate abnormalities at a high-school level.
5. Dose–response on HR/BP traces — reading a drug's effect off a time series, matched to baseline.
6. What a trace does and does not prove — correlation, confounders, and honest interpretation of vitals data.

### U5 · `clinpharm-cardio-drugs` — Antihypertensives, Beta-Blockers & Stimulants (7)
The drug classes — mechanism mapped to the measurable effect.
1. Beta-blockers — β1 blockade → ↓HR, ↓contractility; the propranolol story sets up U6.
2. ACE inhibitors & ARBs — the RAAS pathway; blocking angiotensin II → vasodilation, ↓afterload.
3. Calcium-channel blockers — vascular vs cardiac selectivity; dihydropyridines vs verapamil/diltiazem.
4. Diuretics — lowering volume/preload; thiazides as first-line, the mechanism-to-BP link.
5. Vasodilators & the reflex-tachycardia trap — nitrates/hydralazine; why HR rises when BP falls.
6. Sympathomimetics & stimulants — adrenergic agonists, decongestants, caffeine's adenosine-antagonism and HR/BP effect.
7. Matching drug → receptor → measurable readout — a synthesis lesson tying class to the trace it changes.

### U6 · `clinpharm-cardio-landmark` — Landmark Work & Open Debates (7)  **[REQUIRED landmark unit]**
1. James Black & the birth of the beta-blocker — rational drug design, propranolol, the 1988 Nobel.
2. Korotkoff & the sphygmomanometer — how BP measurement was invented and standardized.
3. The baroreflex — Hering, carotid-sinus discovery, and how reflex control was mapped.
4. ALLHAT & the "which first-line drug?" debate — the landmark antihypertensive trial and its fallout.
5. SPRINT & the blood-pressure-target controversy — intensive vs standard BP goals; still argued.
6. The salt–blood-pressure debate — INTERSALT/DASH vs the skeptics; an unsettled public-health fight.
7. HRV as a biomarker — the promise and the overreach; why HRV claims get judged skeptically.

### U7 · `clinpharm-cardio-apply` — Applications & Safe Study Design (6)
Applications — designing a real, safe, non-invasive cardiovascular project.
1. The non-invasive toolkit — cuffs, chest straps, wrist wearables, PPG apps: what each can claim.
2. Classic safe protocols — cold-pressor, orthostatic (posture) change, paced breathing, caffeine dose.
3. Controlling confounders — baseline rest, time of day, caffeine/exercise history, matched within-subject design.
4. Analyzing HR/BP/HRV data honestly — averaging, artifact rejection, effect size vs noise.
5. Ethics & safety of measuring vitals — consent, when NOT to test someone, why students don't dose drugs.
6. Case study: caffeine on heart rate — a fully worked, judge-ready mini-project from question to claim.

## Depth requirements (do not shrink)
- **Landmark work & people:** Black/propranolol, Korotkoff, Hering/baroreflex, ALLHAT, SPRINT — named, dated, with the finding.
- **Open debates:** BP targets (SPRINT), first-line drug choice (ALLHAT), salt–BP, HRV overreach.
- **Competing methods:** auscultatory vs oscillometric BP; time- vs frequency-domain HRV; vascular vs cardiac CCBs.
- **Applications:** the non-invasive protocols and the caffeine case study must be concrete and safe.
- Judge framing on every lesson must be specific to that concept (why a judge probes it), not generic.
