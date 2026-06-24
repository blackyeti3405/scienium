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

export const SHOP_BUILDINGS: ShopBuilding[] = [
  // ─── Volt Lab — Engineering & Fabrication (lab-type-gated) ───────────────────
  // Only teams assigned the `volt_lab` lab type see or can buy these. Sprites are
  // the /pixel-art-pipeline buildings under /sprites/buildings/volt_lab/.
  {
    key: 'workshop',
    name: 'Workshop',
    cost: 1000,
    minClearance: 0,
    description: 'A general workbench for assembling and tinkering with your builds.',
    labType: 'volt_lab',
    sprite: 'workshop',
  },
  {
    key: 'cnc_mill_shop',
    name: 'CNC Mill Shop',
    cost: 2800,
    minClearance: 1,
    description: 'Mill precise components by carving them from solid stock.',
    labType: 'volt_lab',
    sprite: 'cnc-mill-shop',
  },
  {
    key: 'printing_shop',
    name: '3D Printing Shop',
    cost: 3600,
    minClearance: 1,
    description: 'Rapidly prototype custom parts, printed layer by layer.',
    labType: 'volt_lab',
    sprite: '3d-printing-shop',
  },
  {
    key: 'pcb_fab',
    name: 'PCB Fab',
    cost: 6500,
    minClearance: 2,
    description: 'Design and etch your own printed circuit boards in-house.',
    labType: 'volt_lab',
    sprite: 'pcb-fab',
  },
  {
    key: 'robotics_bay',
    name: 'Robotics Bay',
    cost: 9000,
    minClearance: 2,
    description: 'Integrate sensors, actuators, and control into working robots.',
    labType: 'volt_lab',
    sprite: 'robotics-bay',
  },
  {
    key: 'electronics_bench',
    name: 'Electronics Bench',
    cost: 4500,
    minClearance: 2,
    description: 'Prototype and debug analog and digital circuits on the bench.',
    labType: 'volt_lab',
    sprite: 'electronics-bench',
  },
  {
    key: 'mechanical_testing_rig',
    name: 'Mechanical Testing Rig',
    cost: 5500,
    minClearance: 2,
    description: 'Stress, fatigue, and load-test parts all the way to failure.',
    labType: 'volt_lab',
    sprite: 'mechanical-testing-rig',
  },
  {
    key: 'welding_fabrication',
    name: 'Welding & Fabrication',
    cost: 7500,
    minClearance: 3,
    description: 'Weld and assemble structural metalwork in the fab yard.',
    labType: 'volt_lab',
    sprite: 'welding-fabrication',
  },
  {
    key: 'embedded_systems_lab',
    name: 'Embedded Systems Lab',
    cost: 11000,
    minClearance: 3,
    description: 'Develop microcontroller firmware and embedded prototypes.',
    labType: 'volt_lab',
    sprite: 'embedded-systems-lab',
  },
  {
    key: 'ai_incubator',
    name: 'AI Incubator',
    cost: 18000,
    minClearance: 4,
    description: 'Train and deploy ML-driven engineering systems. (Premium)',
    labType: 'volt_lab',
    sprite: 'ai-incubator',
  },

  // ─── BioCore — Life & Environmental Sciences (lab-type-gated) ────────────────
  // Only teams assigned the `biocore` lab type see or can buy these. Sprites are
  // the /pixel-art-pipeline buildings under /sprites/buildings/biocore/.
  {
    key: 'greenhouse',
    name: 'Greenhouse',
    cost: 1000,
    minClearance: 0,
    description: 'Cultivate and observe living plant specimens under glass.',
    labType: 'biocore',
    sprite: 'greenhouse',
  },
  {
    key: 'specimen_vault',
    name: 'Specimen Vault',
    cost: 2800,
    minClearance: 1,
    description: 'Curate, archive, and classify your biological samples.',
    labType: 'biocore',
    sprite: 'specimen-vault',
  },
  {
    key: 'microscopy_suite',
    name: 'Microscopy Suite',
    cost: 3600,
    minClearance: 1,
    description: 'Visualize cells and microorganisms at high magnification.',
    labType: 'biocore',
    sprite: 'microscopy-suite',
  },
  {
    key: 'incubation_chamber',
    name: 'Incubation Chamber',
    cost: 4500,
    minClearance: 2,
    description: 'Grow cultures under controlled heat and humidity.',
    labType: 'biocore',
    sprite: 'incubation-chamber',
  },
  {
    key: 'wet_lab',
    name: 'Wet Lab',
    cost: 5500,
    minClearance: 2,
    description: 'Run biological assays at the bench.',
    labType: 'biocore',
    sprite: 'wet-lab',
  },
  {
    key: 'field_station',
    name: 'Field Station',
    cost: 6500,
    minClearance: 2,
    description: 'Gather ecological field data from a forward base.',
    labType: 'biocore',
    sprite: 'field-station',
  },
  {
    key: 'aquatic_habitat',
    name: 'Aquatic Habitat',
    cost: 7500,
    minClearance: 3,
    description: 'Study aquatic ecosystems in a living water tank.',
    labType: 'biocore',
    sprite: 'aquatic-habitat',
  },
  {
    key: 'genetics_sequencing_lab',
    name: 'Genetics Sequencing Lab',
    cost: 9000,
    minClearance: 3,
    description: 'Sequence and align DNA samples to decode the genome.',
    labType: 'biocore',
    sprite: 'genetics-sequencing-lab',
  },
  {
    key: 'behavioral_observation_room',
    name: 'Behavioral Observation Room',
    cost: 11000,
    minClearance: 3,
    description: 'Track and analyze animal behavior through observation glass.',
    labType: 'biocore',
    sprite: 'behavioral-observation-room',
  },
  {
    key: 'bioinformatics_suite',
    name: 'Bioinformatics Suite',
    cost: 18000,
    minClearance: 4,
    description: 'Analyze genomic data at scale. (Premium)',
    labType: 'biocore',
    sprite: 'bioinformatics-suite',
  },
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
