/**
 * Building shop catalog — the purchasable lab structures (spec §"buildings").
 *
 * Unlike the 7 gateway buildings (lib/gateways.ts) which ARE the navigation and
 * are not bought, these are functional/decorative lab structures a team unlocks
 * with Knowledge Points (KP). This is the single source for what the Buildings
 * shop offers. Pricing/balance lives here so it can be tuned without touching UI.
 *
 * Two gates apply to every purchase (enforced in POST /api/buildings):
 *   1. **KP** — `cost × max(1, memberCount)`, so a bigger lab that earns more KP
 *      across its members also pays more.
 *   2. **Clearance** — the team's `clearanceLevel` (raised by Proof of Expertise,
 *      lib/clearance) must be at least `minClearance`. This is the ceiling: the
 *      best structures can't be grinded into — the team must prove expertise.
 *
 * Each entry's image is a placeholder for now (the shop renders a labeled block);
 * swap in a real sprite path once the art exists.
 */

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
}

export const SHOP_BUILDINGS: ShopBuilding[] = [
  {
    key: 'reagent_store',
    name: 'Reagent Store',
    cost: 800,
    minClearance: 0,
    description: 'Stock the chemicals and consumables your experiments need.',
  },
  {
    key: 'microscope_bay',
    name: 'Microscope Bay',
    cost: 1600,
    minClearance: 0,
    description: 'High-magnification station for close-up observation.',
  },
  {
    key: 'data_greenhouse',
    name: 'Data Greenhouse',
    cost: 2400,
    minClearance: 1,
    description: 'Grow and cultivate long-running datasets over time.',
  },
  {
    key: 'aquarium_tank',
    name: 'Aquarium Tank',
    cost: 3200,
    minClearance: 1,
    description: 'House aquatic specimens for biology studies.',
  },
  {
    key: 'hypothesis_forge',
    name: 'Hypothesis Forge',
    cost: 4000,
    minClearance: 1,
    description: 'Draft and pressure-test your core research hypotheses.',
  },
  {
    key: 'centrifuge_hall',
    name: 'Centrifuge Hall',
    cost: 6000,
    minClearance: 2,
    description: 'Separate and isolate compounds for deeper analysis.',
  },
  {
    key: 'specimen_vault',
    name: 'Specimen Vault',
    cost: 8000,
    minClearance: 2,
    description: 'Securely archive samples, slides, and field specimens.',
  },
  {
    key: 'sensor_array',
    name: 'Sensor Array',
    cost: 12000,
    minClearance: 3,
    description: 'Capture continuous readings from the field automatically.',
  },
  {
    key: 'server_rack',
    name: 'Server Rack',
    cost: 16000,
    minClearance: 3,
    description: 'Crunch simulations and store your processed results.',
  },
  {
    key: 'field_station',
    name: 'Field Station',
    cost: 20000,
    minClearance: 4,
    description: 'A forward base for gathering observations on location.',
  },
  {
    key: 'fabrication_lab',
    name: 'Fabrication Lab',
    cost: 24000,
    minClearance: 4,
    description: 'Print and machine custom apparatus for your build.',
  },
  {
    key: 'telescope_dome',
    name: 'Telescope Dome',
    cost: 48000,
    minClearance: 5,
    description: 'Observe distant phenomena for astronomy investigations.',
  },
]

/** Look up a catalog entry by key (purchase validation). */
export function shopBuilding(key: string): ShopBuilding | undefined {
  return SHOP_BUILDINGS.find((b) => b.key === key)
}
