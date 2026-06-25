# Robotics Bay — blueprint (bespoke-form rebuild)

- **Name:** Robotics Bay · **Slug:** `robotics-bay` · **Lab type:** `volt_lab`
- **Role:** standard · **Mini-game:** configuration · **Base:** Integrate sensors, actuators, control

## Set palette (author on these chars→hex exactly)
`K #15181d` · `W #eef2f6  L #cdd6dd  M #9aa3ad  D #6c7682  d #49515b` · `h #d6f9ff  c #aef0fb  g #38cfe2  G #1f8ba0` · `o #ffe85a  O #fff7a8  r #c89a14`

## BUILT FORM — a tall OPEN HANGAR with a side control annex (NOT the gateway cube)
Compose from `art/isobuild.py` (`Box`). Target a robot **hangar/garage**, taller and deeper than the Mill, with a different silhouette:
- **Main hangar:** a tall, deep `Box` — roughly `Box(top≈(24,8), wx≈11, wy≈8, h≈24)`. Its lit **front face is mostly a big OPEN bay opening** — carve a large dark `d`/`K` recessed mouth into the face (the garage interior), with a rolled-up segmented `M`/`D` shutter at the lintel and a `K` frame. The bay opening is the dominant feature of the front face (NOT stock windows).
- **Control annex:** a smaller, lower `Box` abutting the right side — e.g. `Box(top≈(44,20), wx≈4, wy≈4, h≈14)` — with a single cyan control-room window (the teach-pendant station). Drawn AFTER the hangar so it sits in front on the right.
- **Roofline:** flat hangar roof with `D` corrugation ribs and a small `c` LIDAR/sensor puck on a short post (back corner). A `o` power conduit runs down the front corner.

## Signature feature (registered + user direction: a BOLD industrial robot arm — NOT a thin twig)
**A heavy, unmistakable industrial robot arm rising out of the open bay.** Build it like a real 6-axis manipulator, bold and chunky:
- **Pedestal base** on the bay floor — a solid `D`/`M` cylinder/box with a `K` outline and an `o` status LED.
- **Shoulder + thick upper arm:** a fat `L`/`M` tube link (≈4–5px wide, continuous `K` outline both edges) angling up out of the bay.
- **Elbow joint** (a bold `D` disk, `K` ring, one `g` cyan glow) into a **forearm** (another thick `L`/`M` tube) reaching up-and-out over the bay sill.
- **Wrist + big gripper:** a chunky 2-finger `M` claw with `K`-outlined fingers and `L` tips, the heaviest mass at the end. A `c`/`h` 2×2 **camera-eye** on the wrist.
- `o` yellow accent bands at the joints. The arm should read as a **heavy machine**, the hero of the sprite — thick segments, no single-pixel diagonals, clearly an industrial robot arm.

## Motifs it must honor (Volt Lab)
Corrugated roof + rivets, `o` hazard chevrons on the bay sill (robot work zone), `o` power conduit down the front corner, cyan control window, `c` LIDAR puck.

## Target output paths
- Source JSON → `art/src/buildings/volt_lab_robotics-bay.json`
- Rendered PNG → `apps/web/public/sprites/buildings/volt_lab/robotics-bay.png`
- Preview → `art/preview/buildings/volt_lab_robotics-bay.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (Volt palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as a **different building** from the gateways and from the CNC Mill Shop, with a **bold** robot arm (not thin/wispy).
