/**
 * Building shop catalog — the purchasable lab structures (spec §"buildings").
 *
 * Unlike the 7 gateway buildings (lib/gateways.ts) which ARE the navigation and
 * are not bought, these are functional/decorative lab structures a team unlocks
 * with Knowledge Points (KP — see the buildings POST route, which deducts KP).
 * This is the single source for what the Buildings shop offers. Pricing/balance
 * lives here so it can be tuned without touching the UI.
 *
 * Each entry's `image` is a placeholder key for now (the shop renders a labeled
 * placeholder block); swap in a real sprite path once the art exists.
 */

export interface ShopBuilding {
  key: string
  /** Display name shown under the image. */
  name: string
  /** Purchase cost, in Knowledge Points (KP). */
  cost: number
  /** One-line blurb shown under the cost. */
  description: string
}

export const SHOP_BUILDINGS: ShopBuilding[] = [
  {
    key: 'hypothesis_forge',
    name: 'Hypothesis Forge',
    cost: 4000,
    description: 'Draft and pressure-test your core research hypotheses.',
  },
  {
    key: 'data_greenhouse',
    name: 'Data Greenhouse',
    cost: 2400,
    description: 'Grow and cultivate long-running datasets over time.',
  },
  {
    key: 'specimen_vault',
    name: 'Specimen Vault',
    cost: 8000,
    description: 'Securely archive samples, slides, and field specimens.',
  },
  {
    key: 'sensor_array',
    name: 'Sensor Array',
    cost: 12000,
    description: 'Capture continuous readings from the field automatically.',
  },
  {
    key: 'microscope_bay',
    name: 'Microscope Bay',
    cost: 1600,
    description: 'High-magnification station for close-up observation.',
  },
  {
    key: 'centrifuge_hall',
    name: 'Centrifuge Hall',
    cost: 6000,
    description: 'Separate and isolate compounds for deeper analysis.',
  },
  {
    key: 'server_rack',
    name: 'Server Rack',
    cost: 16000,
    description: 'Crunch simulations and store your processed results.',
  },
  {
    key: 'reagent_store',
    name: 'Reagent Store',
    cost: 800,
    description: 'Stock the chemicals and consumables your experiments need.',
  },
  {
    key: 'field_station',
    name: 'Field Station',
    cost: 20000,
    description: 'A forward base for gathering observations on location.',
  },
  {
    key: 'telescope_dome',
    name: 'Telescope Dome',
    cost: 48000,
    description: 'Observe distant phenomena for astronomy investigations.',
  },
  {
    key: 'aquarium_tank',
    name: 'Aquarium Tank',
    cost: 3200,
    description: 'House aquatic specimens for biology studies.',
  },
  {
    key: 'fabrication_lab',
    name: 'Fabrication Lab',
    cost: 24000,
    description: 'Print and machine custom apparatus for your build.',
  },
]
