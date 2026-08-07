/**
 * Seeds the PvP spell catalog (`spells`) from lib/pvp/spell-catalog.ts.
 *
 * There was never a seeder for this table. `getTeamSpells`/`getTeamBuildings`
 * inner-join buildings to it, so an unseeded environment gave the attacker no
 * spells AND left the defender's base empty — every raid scored 0% and lost the
 * maximum trophies. Run once per environment, and again after editing the catalog.
 *
 *   pnpm --filter web seed:spells
 *
 * Idempotent: upserts by buildingKey, and reports rows whose building key is no
 * longer in the shop catalog rather than deleting them.
 */

import { PrismaClient } from '@prisma/client'
// Imported, not regex-scraped. The previous parser required each entry to END at
// `cooldownMs`, but every entry carries `lingering`/`shape`/`icon` after it, so it
// matched nothing and this seeder could never run — leaving `spells` empty, which
// is precisely the failure the header describes. `spell-catalog.ts`'s only import
// is `import type`, which Node's native type stripping erases, so the module loads
// directly here — the same trick `seed-e2e.mjs` uses for `lib/fairs/forms.ts`.
// Keep this file free of value imports or that stops working.
import { SPELL_CATALOG } from '../lib/pvp/spell-catalog.ts'

// Only the columns `spells` actually has — the catalog also carries art fields
// (`shape`, `icon`) and `lingering`, which the engine does not persist.
const entries = SPELL_CATALOG.map((e) => ({
  buildingKey: e.buildingKey,
  name: e.name,
  type: e.type,
  baseDamage: e.baseDamage,
  radius: e.radius,
  cooldownMs: e.cooldownMs,
}))

if (entries.length === 0) {
  console.error('No catalog entries parsed — refusing to run.')
  process.exit(1)
}

const db = new PrismaClient()

let created = 0
let updated = 0
for (const e of entries) {
  const before = await db.spell.findUnique({ where: { buildingKey: e.buildingKey } })
  await db.spell.upsert({
    where: { buildingKey: e.buildingKey },
    create: e,
    update: { name: e.name, type: e.type, baseDamage: e.baseDamage, radius: e.radius, cooldownMs: e.cooldownMs },
  })
  before ? updated++ : created++
}

const known = new Set(entries.map((e) => e.buildingKey))
const orphans = (await db.spell.findMany({ select: { buildingKey: true } }))
  .map((s) => s.buildingKey)
  .filter((k) => !known.has(k))

console.log(`spells: ${created} created, ${updated} updated, ${await db.spell.count()} total`)
if (orphans.length) {
  console.log(`orphaned rows (building key not in catalog, left alone): ${orphans.join(', ')}`)
}

await db.$disconnect()
