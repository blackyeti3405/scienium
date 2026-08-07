/**
 * PvP spell catalog — one spell per economy building (spec §11.3).
 *
 * Source of truth: the "Spells list scienium" design sheet. This file mirrors it
 * so the catalog is code-reviewable, typechecked against `lib/shop.ts` keys, and
 * seedable without a spreadsheet round-trip. Re-run `pnpm --filter web seed:spells`
 * after editing, and `python art/spellfx.py` to rebuild the icons.
 *
 * Shape of the design — 11 shared archetypes + 30 lab-signature spells, with
 * signatures at tiers 1 / 5 / 8 / 9 / 10 so a lab's identity shows up on the
 * FIRST building rather than the eighth:
 *   tier  1     SIGNATURE (starter)  unique per lab, no unlock gate
 *   tiers 2-3   generic damage       (Data Burst / Proof Blast / Impact Charge)
 *   tier  4     wide + weak          (Sample Sweep / Model Cascade / Shockwave)
 *   tier  5     SIGNATURE (mid)      unique per lab, unlocks at building lvl 3
 *   tier  6     focused + strong     (Precision Assay / Derivation Lance / Drill Strike)
 *   tier  7     lingering DOT        (Contamination Field / Recursive Error / Corrosion Cloud)
 *   tiers 8-10  SIGNATURE (late)     unique per lab, unlocks at building lvl 3
 *
 * Each lab's five signatures span all three types, so no lab is left without an
 * answer to a matchup it did not choose (lab type is assigned, not picked).
 *
 * `radius` is in PLOT TILES (lib/plot.ts), not pixels. `baseDamage` is the value
 * at building level 1; `scaleDamage()` applies the per-level curve.
 *
 * ART: `shape` is the icon/FX form and encodes BEHAVIOUR (see art/spellfx.py) —
 * it is derived from radius + lingering by `spellShapeFor()` below, which
 * art/spellfx.py reads back out of this file so the pipeline and the app can
 * never disagree. `icon` is the sprite slug resolved through the manifest.
 *
 * NOT YET MODELLED in the engine: the sheet's "Side effect" column and the
 * per-signature unlock levels in its Notes. `lingering` IS recorded here (the
 * art needs it), but resolveCast still applies a lingering spell as one instant
 * hit of `baseDamage`.
 */

import type { SpellType } from '@scienium/shared-types'

/** Icon/FX form. Encodes what the spell DOES, so it reads at a glance mid-raid. */
export type SpellShape = 'burst' | 'wave' | 'lance' | 'flask'

export interface SpellCatalogEntry {
  /** Matches a `key` in SHOP_BUILDINGS (lib/shop.ts). */
  buildingKey: string
  /** Shown in the raid spell bar. */
  name: string
  type: SpellType
  /** Damage per target at building level 1, before type and meter multipliers. */
  baseDamage: number
  /** Blast radius in plot tiles. */
  radius: number
  cooldownMs: number
  /** Damage-over-time in the design; still resolves as one instant hit for now. */
  lingering: boolean
  shape: SpellShape
  /** Sprite slug: `sig_<buildingKey>` for signatures, `<shape>_<type>` for shared. */
  icon: string
}

/** The one shape rule. art/spellfx.py mirrors this — change both together. */
export function spellShapeFor(radius: number, lingering: boolean): SpellShape {
  if (lingering) return 'flask'
  if (radius <= 1) return 'lance'
  if (radius >= 2.5) return 'wave'
  return 'burst'
}

export const SPELL_CATALOG: SpellCatalogEntry[] = [
  { buildingKey: 'workshop', name: 'Rapid Prototype', type: 'applied', baseDamage: 27, radius: 1.5, cooldownMs: 1500, lingering: false, shape: 'burst', icon: 'sig_workshop' },
  { buildingKey: 'cnc_mill_shop', name: 'Impact Charge', type: 'applied', baseDamage: 30, radius: 1.5, cooldownMs: 2000, lingering: false, shape: 'burst', icon: 'burst_applied' },
  { buildingKey: 'printing_shop', name: 'Impact Charge', type: 'applied', baseDamage: 30, radius: 1.5, cooldownMs: 2000, lingering: false, shape: 'burst', icon: 'burst_applied' },
  { buildingKey: 'electronics_bench', name: 'Sample Sweep', type: 'empirical', baseDamage: 18, radius: 2.5, cooldownMs: 2500, lingering: false, shape: 'wave', icon: 'wave_empirical' },
  { buildingKey: 'mechanical_testing_rig', name: 'Stress Fracture', type: 'empirical', baseDamage: 72, radius: 1.5, cooldownMs: 3000, lingering: false, shape: 'burst', icon: 'sig_mechanical_testing_rig' },
  { buildingKey: 'pcb_fab', name: 'Derivation Lance', type: 'theoretical', baseDamage: 65, radius: 1, cooldownMs: 3000, lingering: false, shape: 'lance', icon: 'lance_theoretical' },
  { buildingKey: 'welding_fabrication', name: 'Corrosion Cloud', type: 'applied', baseDamage: 10, radius: 2, cooldownMs: 4000, lingering: true, shape: 'flask', icon: 'flask_applied' },
  { buildingKey: 'robotics_bay', name: 'Swarm Deployment', type: 'applied', baseDamage: 45, radius: 2, cooldownMs: 5000, lingering: false, shape: 'burst', icon: 'sig_robotics_bay' },
  { buildingKey: 'embedded_systems_lab', name: 'Diagnostic Sweep', type: 'empirical', baseDamage: 40, radius: 2, cooldownMs: 5000, lingering: false, shape: 'burst', icon: 'sig_embedded_systems_lab' },
  { buildingKey: 'ai_incubator', name: 'Predictive Model Strike', type: 'theoretical', baseDamage: 50, radius: 2, cooldownMs: 6000, lingering: false, shape: 'burst', icon: 'sig_ai_incubator' },
  { buildingKey: 'greenhouse', name: 'Bloom Surge', type: 'empirical', baseDamage: 26, radius: 2, cooldownMs: 2000, lingering: false, shape: 'burst', icon: 'sig_greenhouse' },
  { buildingKey: 'specimen_vault', name: 'Impact Charge', type: 'applied', baseDamage: 30, radius: 1.5, cooldownMs: 2000, lingering: false, shape: 'burst', icon: 'burst_applied' },
  { buildingKey: 'microscopy_suite', name: 'Data Burst', type: 'empirical', baseDamage: 30, radius: 1.5, cooldownMs: 2000, lingering: false, shape: 'burst', icon: 'burst_empirical' },
  { buildingKey: 'incubation_chamber', name: 'Shockwave', type: 'applied', baseDamage: 18, radius: 2.5, cooldownMs: 2500, lingering: false, shape: 'wave', icon: 'wave_applied' },
  { buildingKey: 'wet_lab', name: 'Assay Cascade', type: 'theoretical', baseDamage: 15, radius: 2, cooldownMs: 3500, lingering: true, shape: 'flask', icon: 'sig_wet_lab' },
  { buildingKey: 'field_station', name: 'Precision Assay', type: 'empirical', baseDamage: 65, radius: 1, cooldownMs: 3000, lingering: false, shape: 'lance', icon: 'lance_empirical' },
  { buildingKey: 'aquatic_habitat', name: 'Recursive Error', type: 'theoretical', baseDamage: 10, radius: 2, cooldownMs: 4000, lingering: true, shape: 'flask', icon: 'flask_theoretical' },
  { buildingKey: 'genetics_sequencing_lab', name: 'Genome Unravel', type: 'theoretical', baseDamage: 40, radius: 2, cooldownMs: 5000, lingering: false, shape: 'burst', icon: 'sig_genetics_sequencing_lab' },
  { buildingKey: 'behavioral_observation_room', name: 'Observed Collapse', type: 'empirical', baseDamage: 45, radius: 1.5, cooldownMs: 5000, lingering: false, shape: 'burst', icon: 'sig_behavioral_observation_room' },
  { buildingKey: 'bioinformatics_suite', name: 'Pipeline Overrun', type: 'applied', baseDamage: 35, radius: 2, cooldownMs: 6000, lingering: false, shape: 'burst', icon: 'sig_bioinformatics_suite' },
  { buildingKey: 'fume_hood_bench', name: 'Reagent Splash', type: 'empirical', baseDamage: 15, radius: 1.5, cooldownMs: 2500, lingering: true, shape: 'flask', icon: 'sig_fume_hood_bench' },
  { buildingKey: 'reaction_synthesis_lab', name: 'Impact Charge', type: 'applied', baseDamage: 30, radius: 1.5, cooldownMs: 2000, lingering: false, shape: 'burst', icon: 'burst_applied' },
  { buildingKey: 'spectroscopy_suite', name: 'Data Burst', type: 'empirical', baseDamage: 30, radius: 1.5, cooldownMs: 2000, lingering: false, shape: 'burst', icon: 'burst_empirical' },
  { buildingKey: 'materials_testing_bay', name: 'Sample Sweep', type: 'empirical', baseDamage: 18, radius: 2.5, cooldownMs: 2500, lingering: false, shape: 'wave', icon: 'wave_empirical' },
  { buildingKey: 'crystallography_room', name: 'Lattice Shatter', type: 'theoretical', baseDamage: 60, radius: 1.5, cooldownMs: 2500, lingering: false, shape: 'burst', icon: 'sig_crystallography_room' },
  { buildingKey: 'distillation_tower', name: 'Drill Strike', type: 'applied', baseDamage: 65, radius: 1, cooldownMs: 3000, lingering: false, shape: 'lance', icon: 'lance_applied' },
  { buildingKey: 'catalysis_lab', name: 'Recursive Error', type: 'theoretical', baseDamage: 10, radius: 2, cooldownMs: 4000, lingering: true, shape: 'flask', icon: 'flask_theoretical' },
  { buildingKey: 'polymer_workshop', name: 'Polymer Seize', type: 'applied', baseDamage: 14, radius: 2, cooldownMs: 5000, lingering: true, shape: 'flask', icon: 'sig_polymer_workshop' },
  { buildingKey: 'computational_chemistry_hub', name: 'Simulated Detonation', type: 'theoretical', baseDamage: 55, radius: 1.5, cooldownMs: 6000, lingering: false, shape: 'burst', icon: 'sig_computational_chemistry_hub' },
  { buildingKey: 'cleanroom_synthesizer', name: 'Reagent Purge', type: 'empirical', baseDamage: 12, radius: 2.5, cooldownMs: 6000, lingering: true, shape: 'flask', icon: 'sig_cleanroom_synthesizer' },
  { buildingKey: 'sampling_station', name: 'Core Sample', type: 'empirical', baseDamage: 85, radius: 1, cooldownMs: 2500, lingering: false, shape: 'lance', icon: 'sig_sampling_station' },
  { buildingKey: 'seismograph_array', name: 'Proof Blast', type: 'theoretical', baseDamage: 30, radius: 1.5, cooldownMs: 2000, lingering: false, shape: 'burst', icon: 'burst_theoretical' },
  { buildingKey: 'weather_monitoring_post', name: 'Impact Charge', type: 'applied', baseDamage: 30, radius: 1.5, cooldownMs: 2000, lingering: false, shape: 'burst', icon: 'burst_applied' },
  { buildingKey: 'soil_analysis_lab', name: 'Sample Sweep', type: 'empirical', baseDamage: 18, radius: 2.5, cooldownMs: 2500, lingering: false, shape: 'wave', icon: 'wave_empirical' },
  { buildingKey: 'hydrology_bay', name: 'Flood Channel', type: 'theoretical', baseDamage: 11, radius: 2.5, cooldownMs: 3000, lingering: true, shape: 'flask', icon: 'sig_hydrology_bay' },
  { buildingKey: 'geological_core_lab', name: 'Drill Strike', type: 'applied', baseDamage: 65, radius: 1, cooldownMs: 3000, lingering: false, shape: 'lance', icon: 'lance_applied' },
  { buildingKey: 'atmospheric_sensor_array', name: 'Recursive Error', type: 'theoretical', baseDamage: 10, radius: 2, cooldownMs: 4000, lingering: true, shape: 'flask', icon: 'flask_theoretical' },
  { buildingKey: 'remote_sensing_hub', name: 'Orbital Survey Strike', type: 'empirical', baseDamage: 22, radius: 3.5, cooldownMs: 5000, lingering: false, shape: 'wave', icon: 'sig_remote_sensing_hub' },
  { buildingKey: 'deep_earth_observatory', name: 'Tectonic Fracture', type: 'applied', baseDamage: 60, radius: 1.5, cooldownMs: 6000, lingering: false, shape: 'burst', icon: 'sig_deep_earth_observatory' },
  { buildingKey: 'climate_modeling_station', name: 'Forecast Cascade', type: 'theoretical', baseDamage: 11, radius: 2.5, cooldownMs: 6000, lingering: true, shape: 'flask', icon: 'sig_climate_modeling_station' },
  { buildingKey: 'interview_room', name: 'Leading Question', type: 'empirical', baseDamage: 28, radius: 2.5, cooldownMs: 2500, lingering: false, shape: 'wave', icon: 'sig_interview_room' },
  { buildingKey: 'survey_distribution_center', name: 'Proof Blast', type: 'theoretical', baseDamage: 30, radius: 1.5, cooldownMs: 2000, lingering: false, shape: 'burst', icon: 'burst_theoretical' },
  { buildingKey: 'behavioral_lab', name: 'Data Burst', type: 'empirical', baseDamage: 30, radius: 1.5, cooldownMs: 2000, lingering: false, shape: 'burst', icon: 'burst_empirical' },
  { buildingKey: 'focus_group_chamber', name: 'Sample Sweep', type: 'empirical', baseDamage: 18, radius: 2.5, cooldownMs: 2500, lingering: false, shape: 'wave', icon: 'wave_empirical' },
  { buildingKey: 'eye_tracking_suite', name: 'Focus Lock', type: 'applied', baseDamage: 115, radius: 1, cooldownMs: 2500, lingering: false, shape: 'lance', icon: 'sig_eye_tracking_suite' },
  { buildingKey: 'statistical_analysis_hub', name: 'Derivation Lance', type: 'theoretical', baseDamage: 65, radius: 1, cooldownMs: 3000, lingering: false, shape: 'lance', icon: 'lance_theoretical' },
  { buildingKey: 'eeg_biofeedback_room', name: 'Corrosion Cloud', type: 'applied', baseDamage: 10, radius: 2, cooldownMs: 4000, lingering: true, shape: 'flask', icon: 'flask_applied' },
  { buildingKey: 'longitudinal_study_wing', name: 'Attrition Study', type: 'empirical', baseDamage: 8, radius: 2, cooldownMs: 5000, lingering: true, shape: 'flask', icon: 'sig_longitudinal_study_wing' },
  { buildingKey: 'data_visualization_studio', name: 'Insight Burst', type: 'applied', baseDamage: 50, radius: 1.5, cooldownMs: 5000, lingering: false, shape: 'burst', icon: 'sig_data_visualization_studio' },
  { buildingKey: 'computational_social_science_lab', name: 'Cascade Model', type: 'theoretical', baseDamage: 30, radius: 1.5, cooldownMs: 6000, lingering: false, shape: 'burst', icon: 'sig_computational_social_science_lab' },
  { buildingKey: 'chalkboard_room', name: 'Chalk Proof', type: 'theoretical', baseDamage: 36, radius: 1.5, cooldownMs: 2000, lingering: false, shape: 'burst', icon: 'sig_chalkboard_room' },
  { buildingKey: 'computation_cluster', name: 'Impact Charge', type: 'applied', baseDamage: 30, radius: 1.5, cooldownMs: 2000, lingering: false, shape: 'burst', icon: 'burst_applied' },
  { buildingKey: 'optics_laboratory', name: 'Proof Blast', type: 'theoretical', baseDamage: 30, radius: 1.5, cooldownMs: 2000, lingering: false, shape: 'burst', icon: 'burst_theoretical' },
  { buildingKey: 'numerical_methods_hub', name: 'Model Cascade', type: 'theoretical', baseDamage: 18, radius: 2.5, cooldownMs: 2500, lingering: false, shape: 'wave', icon: 'wave_theoretical' },
  { buildingKey: 'mathematical_modeling_suite', name: 'Extrapolate', type: 'theoretical', baseDamage: 52, radius: 2.5, cooldownMs: 3500, lingering: false, shape: 'wave', icon: 'sig_mathematical_modeling_suite' },
  { buildingKey: 'particle_physics_bench', name: 'Precision Assay', type: 'empirical', baseDamage: 65, radius: 1, cooldownMs: 3000, lingering: false, shape: 'lance', icon: 'lance_empirical' },
  { buildingKey: 'observatory_dome', name: 'Corrosion Cloud', type: 'applied', baseDamage: 10, radius: 2, cooldownMs: 4000, lingering: true, shape: 'flask', icon: 'flask_applied' },
  { buildingKey: 'theoretical_physics_annex', name: 'Grand Unification', type: 'theoretical', baseDamage: 45, radius: 2, cooldownMs: 5000, lingering: false, shape: 'burst', icon: 'sig_theoretical_physics_annex' },
  { buildingKey: 'quantum_simulation_lab', name: 'Superposition Collapse', type: 'empirical', baseDamage: 40, radius: 2, cooldownMs: 5000, lingering: false, shape: 'burst', icon: 'sig_quantum_simulation_lab' },
  { buildingKey: 'cosmology_visualization_theater', name: 'Redshift Lens', type: 'applied', baseDamage: 20, radius: 4, cooldownMs: 6000, lingering: false, shape: 'wave', icon: 'sig_cosmology_visualization_theater' },
]

/** Catalog entry for a building key, if that building grants a spell. */
export function spellForBuilding(buildingKey: string): SpellCatalogEntry | undefined {
  return SPELL_CATALOG.find((s) => s.buildingKey === buildingKey)
}
