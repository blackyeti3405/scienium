/**
 * Building shop catalog — the purchasable lab structures (spec §"buildings").
 *
 * Unlike the 7 gateway buildings (lib/gateways.ts) which ARE the navigation and
 * are not bought, these are functional lab structures a team unlocks with
 * Knowledge Points (KP). This catalog lists only buildings that actually exist
 * (real name, cost, art); the shop grid is always `SHOP_SLOTS` wide and pads the
 * remaining positions with non-purchasable "coming soon" placeholders, so every
 * lab sees a full, uniform shelf even before its art is made.
 *
 * Three gates apply to every purchase (enforced in POST /api/buildings):
 *   1. **KP** — `cost × max(1, memberCount)`, so a bigger lab that earns more KP
 *      across its members also pays more.
 *   2. **Clearance** — the team's `clearanceLevel` (raised by Proof of Expertise,
 *      lib/clearance) must be at least `minClearance`. This is the ceiling: the
 *      best structures can't be grinded into — the team must prove expertise.
 *   3. **Lab type** — a building with a `labType` is only offered to (and buyable
 *      by) teams of that lab type (e.g. Volt Lab's fabrication shops). Filtered
 *      for the UI by `shopBuildingsForLabType`; re-checked in `evaluatePurchase`.
 *
 * Entries carry a `sprite` slug rendered through the manifest (`getBuildingSprite`).
 */

import type { LabType } from '@/lib/phase'

/** Total slots in the shop grid (real buildings first, placeholders fill the rest). */
export const SHOP_SLOTS = 10

export interface ShopBuilding {
  key: string
  /** Display name shown under the image. */
  name: string
  /** Base purchase cost, in Knowledge Points (KP), before the team-size multiplier. */
  cost: number
  /** Minimum team clearance level required to purchase (0 = no clearance needed). */
  minClearance: number
  /** One-line blurb shown under the cost. */
  description: string
  /**
   * If set, only teams of this lab type can see and buy this building (e.g. Volt
   * Lab's fabrication shops). Unset = available to every lab. The gate is enforced
   * in both the shop UI (`shopBuildingsForLabType`) and the purchase API.
   */
  labType?: LabType
  /**
   * Economy-building sprite slug (kebab-case) under the team's lab type, resolved
   * through the sprite manifest (`getBuildingSprite`).
   */
  sprite?: string
}

/**
 * The shared 10-step (cost, minClearance) economy ladder every lab catalog
 * mirrors, cheapest first. Rebalance prices here — never per lab.
 */
export const TIER_LADDER: ReadonlyArray<{ cost: number; minClearance: number }> = [
  { cost: 1000, minClearance: 0 },
  { cost: 2800, minClearance: 1 },
  { cost: 3600, minClearance: 1 },
  { cost: 4500, minClearance: 2 },
  { cost: 5500, minClearance: 2 },
  { cost: 6500, minClearance: 2 },
  { cost: 7500, minClearance: 3 },
  { cost: 9000, minClearance: 3 },
  { cost: 11000, minClearance: 3 },
  { cost: 18000, minClearance: 4 },
]

interface LabBuildingSpec {
  key: string
  name: string
  description: string
  /**
   * Ladder step override. Defaults to the entry's array index, so a lab whose
   * display order (= array order, preserved by `shopBuildingsForLabType`)
   * already runs cheapest-to-priciest omits it; volt_lab's shelf is curated in
   * a different order, so its entries pin explicit steps.
   */
  tier?: number
  /** Sprite slug override for the rare key↔slug mismatch (printing_shop → '3d-printing-shop'). */
  sprite?: string
}

/**
 * Expands one lab's catalog: entry `i` takes `TIER_LADDER[tier ?? i]`, and the
 * sprite slug derives from the key (underscores → hyphens) unless overridden —
 * a hand-typed sprite that drifts from its key silently renders the text
 * placeholder, so derive it instead.
 */
function labBuildings(labType: LabType, specs: LabBuildingSpec[]): ShopBuilding[] {
  return specs.map((spec, i) => {
    const step = TIER_LADDER[spec.tier ?? i]
    return {
      key: spec.key,
      name: spec.name,
      cost: step.cost,
      minClearance: step.minClearance,
      description: spec.description,
      labType,
      sprite: spec.sprite ?? spec.key.replaceAll('_', '-'),
    }
  })
}

export const SHOP_BUILDINGS: ShopBuilding[] = [
  // ─── Volt Lab — Engineering & Fabrication (lab-type-gated) ───────────────────
  // Only teams assigned the `volt_lab` lab type see or can buy these. Sprites are
  // the /pixel-art-pipeline buildings under /sprites/buildings/volt_lab/.
  // Shelf order is curated (not ladder order), so each entry pins its tier.
  ...labBuildings('volt_lab', [
    { key: 'workshop', name: 'Workshop', tier: 0, description: 'A general workbench for assembling and tinkering with your builds.' },
    { key: 'cnc_mill_shop', name: 'CNC Mill Shop', tier: 1, description: 'Mill precise components by carving them from solid stock.' },
    { key: 'printing_shop', name: '3D Printing Shop', tier: 2, sprite: '3d-printing-shop', description: 'Rapidly prototype custom parts, printed layer by layer.' },
    { key: 'pcb_fab', name: 'PCB Fab', tier: 5, description: 'Design and etch your own printed circuit boards in-house.' },
    { key: 'robotics_bay', name: 'Robotics Bay', tier: 7, description: 'Integrate sensors, actuators, and control into working robots.' },
    { key: 'electronics_bench', name: 'Electronics Bench', tier: 3, description: 'Prototype and debug analog and digital circuits on the bench.' },
    { key: 'mechanical_testing_rig', name: 'Mechanical Testing Rig', tier: 4, description: 'Stress, fatigue, and load-test parts all the way to failure.' },
    { key: 'welding_fabrication', name: 'Welding & Fabrication', tier: 6, description: 'Weld and assemble structural metalwork in the fab yard.' },
    { key: 'embedded_systems_lab', name: 'Embedded Systems Lab', tier: 8, description: 'Develop microcontroller firmware and embedded prototypes.' },
    { key: 'ai_incubator', name: 'AI Incubator', tier: 9, description: 'Train and deploy ML-driven engineering systems. (Premium)' },
  ]),

  // ─── BioCore — Life & Environmental Sciences (lab-type-gated) ────────────────
  ...labBuildings('biocore', [
    { key: 'greenhouse', name: 'Greenhouse', description: 'Cultivate and observe living plant specimens under glass.' },
    { key: 'specimen_vault', name: 'Specimen Vault', description: 'Curate, archive, and classify your biological samples.' },
    { key: 'microscopy_suite', name: 'Microscopy Suite', description: 'Visualize cells and microorganisms at high magnification.' },
    { key: 'incubation_chamber', name: 'Incubation Chamber', description: 'Grow cultures under controlled heat and humidity.' },
    { key: 'wet_lab', name: 'Wet Lab', description: 'Run biological assays at the bench.' },
    { key: 'field_station', name: 'Field Station', description: 'Gather ecological field data from a forward base.' },
    { key: 'aquatic_habitat', name: 'Aquatic Habitat', description: 'Study aquatic ecosystems in a living water tank.' },
    { key: 'genetics_sequencing_lab', name: 'Genetics Sequencing Lab', description: 'Sequence and align DNA samples to decode the genome.' },
    { key: 'behavioral_observation_room', name: 'Behavioral Observation Room', description: 'Track and analyze animal behavior through observation glass.' },
    { key: 'bioinformatics_suite', name: 'Bioinformatics Suite', description: 'Analyze genomic data at scale. (Premium)' },
  ]),

  // ─── ChemWorks — Chemistry & Materials (lab-type-gated) ──────────────────────
  ...labBuildings('chemworks', [
    { key: 'fume_hood_bench', name: 'Fume Hood Bench', description: 'A safe baseline workspace for running reactions under an extraction hood.' },
    { key: 'reaction_synthesis_lab', name: 'Reaction Synthesis Lab', description: 'Run controlled chemical syntheses in glass.' },
    { key: 'spectroscopy_suite', name: 'Spectroscopy Suite', description: 'Identify compounds by their spectral signatures.' },
    { key: 'materials_testing_bay', name: 'Materials Testing Bay', description: 'Measure the mechanical and chemical properties of materials.' },
    { key: 'crystallography_room', name: 'Crystallography Room', description: 'Determine molecular structures by X-ray diffraction.' },
    { key: 'distillation_tower', name: 'Distillation Tower', description: 'Separate and purify mixtures by fractional distillation.' },
    { key: 'catalysis_lab', name: 'Catalysis Lab', description: 'Study how catalysts accelerate reactions.' },
    { key: 'polymer_workshop', name: 'Polymer Workshop', description: 'Synthesize and test polymers and plastics.' },
    { key: 'computational_chemistry_hub', name: 'Computational Chemistry Hub', description: 'Simulate molecules and reactions in silico.' },
    { key: 'cleanroom_synthesizer', name: 'Cleanroom Synthesizer', description: 'Precision synthesis under contamination control. (Premium)' },
  ]),

  // ─── TerraBase — Earth, Environmental & Atmospheric Sciences ───
  ...labBuildings('terrabase', [
    { key: 'sampling_station', name: 'Sampling Station', description: 'Collect and log field samples from the surrounding terrain.' },
    { key: 'seismograph_array', name: 'Seismograph Array', description: 'Detect and record ground motion across the region.' },
    { key: 'weather_monitoring_post', name: 'Weather Monitoring Post', description: 'Track temperature, pressure, and wind in real time.' },
    { key: 'soil_analysis_lab', name: 'Soil Analysis Lab', description: 'Test soil composition, pH, and nutrient content.' },
    { key: 'hydrology_bay', name: 'Hydrology Bay', description: 'Study water flow, quality, and watershed dynamics.' },
    { key: 'geological_core_lab', name: 'Geological Core Lab', description: 'Extract and analyze rock and sediment core samples.' },
    { key: 'atmospheric_sensor_array', name: 'Atmospheric Sensor Array', description: 'Profile the atmosphere across altitude and time.' },
    { key: 'remote_sensing_hub', name: 'Remote Sensing Hub', description: 'Interpret satellite and aerial imagery of the field site.' },
    { key: 'deep_earth_observatory', name: 'Deep Earth Observatory', description: "Probe the planet's deep structure and processes." },
    { key: 'climate_modeling_station', name: 'Climate Modeling Station', description: 'Run large-scale climate simulations and forecasts. (Premium)' },
  ]),

  // ─── MindFrame — Behavioral & Social Sciences ───
  ...labBuildings('mindframe', [
    { key: 'interview_room', name: 'Interview Room', description: 'Conduct one-on-one interviews with study participants.' },
    { key: 'survey_distribution_center', name: 'Survey Distribution Center', description: 'Design, deploy, and collect surveys at scale.' },
    { key: 'behavioral_lab', name: 'Behavioral Lab', description: 'Observe and measure behavior under controlled conditions.' },
    { key: 'focus_group_chamber', name: 'Focus Group Chamber', description: 'Facilitate guided group discussions behind observation glass.' },
    { key: 'eye_tracking_suite', name: 'Eye-Tracking Suite', description: 'Measure gaze and attention with precision eye-tracking.' },
    { key: 'statistical_analysis_hub', name: 'Statistical Analysis Hub', description: 'Crunch survey and experiment data for significance.' },
    { key: 'eeg_biofeedback_room', name: 'EEG & Biofeedback Room', description: 'Record neural and physiological signals during tasks.' },
    { key: 'longitudinal_study_wing', name: 'Longitudinal Study Wing', description: 'Track participants and outcomes over extended timelines.' },
    { key: 'data_visualization_studio', name: 'Data Visualization Studio', description: 'Turn behavioral data into clear, presentable visuals.' },
    { key: 'computational_social_science_lab', name: 'Computational Social Science Lab', description: 'Model social dynamics at population scale. (Premium)' },
  ]),

  // ─── Axiom — Physics, Math & Theoretical Sciences ───
  ...labBuildings('axiom', [
    { key: 'chalkboard_room', name: 'Chalkboard Room', description: 'Sketch out proofs and derivations on the chalkboard wall.' },
    { key: 'computation_cluster', name: 'Computation Cluster', description: 'Run numerical jobs across a bank of networked machines.' },
    { key: 'optics_laboratory', name: 'Optics Laboratory', description: 'Explore light, lenses, and interference on an optical bench.' },
    { key: 'numerical_methods_hub', name: 'Numerical Methods Hub', description: 'Approximate hard equations with stable numerical schemes.' },
    { key: 'mathematical_modeling_suite', name: 'Mathematical Modeling Suite', description: 'Build formal models of physical and abstract systems.' },
    { key: 'particle_physics_bench', name: 'Particle Physics Bench', description: 'Study fundamental particles and their interactions.' },
    { key: 'observatory_dome', name: 'Observatory Dome', description: 'Point a telescope at the sky and record what you find.' },
    { key: 'theoretical_physics_annex', name: 'Theoretical Physics Annex', description: 'Develop and test theories at the edge of known physics.' },
    { key: 'quantum_simulation_lab', name: 'Quantum Simulation Lab', description: 'Simulate quantum systems beyond pen-and-paper reach.' },
    { key: 'cosmology_visualization_theater', name: 'Cosmology Visualization Theater', description: 'Render the large-scale structure of the universe. (Premium)' },
  ]),
]


/** Look up a catalog entry by key (purchase validation). */
export function shopBuilding(key: string): ShopBuilding | undefined {
  return SHOP_BUILDINGS.find((b) => b.key === key)
}

/**
 * The real, purchasable buildings a given lab type can see and buy, in display
 * order. Universal buildings (no `labType`) are always included; lab-type-
 * restricted buildings (e.g. Volt Lab's fabrication shops) appear only for a
 * matching team, and a team with no lab type yet sees only the universal set.
 * The shop UI renders these first, then pads to `SHOP_SLOTS` with placeholders.
 * Used by both the shop UI and the purchase API so the gate is defined once.
 */
export function shopBuildingsForLabType(labType: LabType | null): ShopBuilding[] {
  return SHOP_BUILDINGS.filter((b) => !b.labType || b.labType === labType)
}
