# STEM-Game
Video-game designed to spread STEM and improve student commitment to science fair projects.

## Documentation map

- [Product specification](SPEC.md)
- [Technical architecture](ARCHITECTURE.md)
- [Setup and operations](SETUP.md)
- [Security checklist](SECURITY.md)
- [Changelog](CHANGELOG.md)
- [Deferred work](TODO.md)
- [Architecture decisions and refactor plans](architecture/)
- [Operational runbooks](runbooks/) — incident response, restore, data export/delete, LLM cost & AI data-sharing
- [ISEF 2026 reference notes](reference/ISEF-2026.md)

## The lab is the interface

After auth, players land on a single **spatial lab scene** (`/lab`) — there is no
sidebar or tab bar. Each feature lives behind a **gateway building**; clicking a
building opens that feature as an overlay over the (dimmed) scene. Buildings
appear as the team advances through phases and reskin to the chosen lab type on
specialization. See `SPEC.md` §1/§9.6 and `ARCHITECTURE.md` §8.4.

Key files: `apps/web/components/lab/LabScene.tsx` (scene), `lib/gateways.ts`
(the 7 gateways), `lib/phase.ts` (gating), `lib/featureRegistry.tsx` (building →
feature). Server-side phase gates live in `app/api/*/route.ts` via
`assertFeatureUnlocked()` and are the source of truth — client gating mirrors them.

## Pixel art

Sprites are generated from code (reproducible, easy to re-skin). To add or
re-skin a sprite, or understand the tile/manifest system, see
[`art/README.md`](../art/README.md). Quick start: `pip install Pillow` then
`python art/build_sprites.py && python art/recolor.py`.
