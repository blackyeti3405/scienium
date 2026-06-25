# Review — Robotics Bay (round 0)

**VERDICT: TWEAK**

## Per-criterion

1. **Isometric 2:1 — PASS.** The box reads as a clean 2:1 iso projection; top and two side faces are consistent with a single iso grid.
2. **3/4 top-down, roof visible — PASS.** The corrugated roof is fully visible with `D` rib lines running front-to-back. Good.
3. **Front corner faces viewer — PASS.** The near vertical corner is centered toward the viewer with lit-left / shaded-right faces.
4. **Sharp, no blur/AA, clean `K` outline — FAIL.** Building shell is crisp, but the robot arm is the opposite: it's a chain of single-pixel diagonal segments with soft anti-aliased/gradient pixels around it, reading as a wispy wire or antenna, not a solid shape. There is no `K` outline on the arm at all. The bay interior also has mushy `D`/`M` gradient shading instead of crisp slats. Off-palette check is clean (only the preview checkerboard backdrop registers as non-palette).
5. **Cohesive with Volt Lab palette + motifs — PASS.** Steel greys (`L/M/D/d`), electric-yellow conduit/chevrons (`o/r`), cyan readout panel and roof LIDAR puck (`c/g`), corrugated roof, rivets, hazard chevrons on the floor lip — all present and on-palette.
6. **One-of-one signature legible — FAIL.** The hero is unreadable. The arm is a thin 1px diagonal line; the "wave" at the top is a 2-pixel V-fork that looks like scissors/an insect antenna, not a 2-finger gripper claw. I cannot read distinct link tubes, the 2–3 joints, the turntable base, or a gripper. The cyan camera-eye is a stray blob mid-shaft rather than on a defined wrist. The signature feature does not communicate "articulated robot arm reaching out and waving."
7. **Attractive — FAIL (because of the arm).** The shell is attractive and well-rendered, but the fragile, sketchy arm spoiling the focal point makes the overall sprite look broken/unfinished rather than polished.

## Painter-actionable tweaks

1. **Rebuild the arm as solid tube links, not a 1px line.** Make every arm segment a **2–3px-wide `M`/`L` tube with a continuous `K` outline on both long edges** (lit `L` highlight on the top edge, `M` body, `K` border). The arm currently runs from roughly the bay opening (center-left of the front face) up-and-left to the canvas edge near the top-left. Keep that pose, but every part of it must be a chunky outlined bar, never a single diagonal pixel.

2. **Make the joints unmistakable.** Place **2–3 distinct elbow joints** as small `D` pivot circles (3×3 with a `K` ring) at the bends of the arm — one at the shoulder where it leaves the turntable, one mid-arm elbow, one at the wrist. Add a **`g` cyan glow ring** around each pivot so they read as powered actuators.

3. **Anchor the arm to a turntable base inside the bay.** Add a short `D` cylinder/turntable (with a `K` outline and one `o` status LED) sitting on the dark bay floor, with the arm's shoulder clearly mounted on it. Right now the arm appears to float out of the doorway with no base.

4. **Give the gripper a real claw, not a V of stray pixels.** Replace the thin top fork with a **bold 2-finger `M` gripper**: each finger a 2px-wide `K`-outlined hook, posed **open and raised** (the wave). The claw should be the largest, boldest cluster at the arm's far end so the "hello" gesture is obvious.

5. **Move/define the camera-eye on the wrist.** Put the **`c`/`h` cyan camera-eye as a clean 2×2 dot with an `h` highlight pixel** on the wrist segment just behind the gripper — not floating mid-shaft. It should read as the robot's "eye."

6. **Clean up the bay interior.** Remove the soft `D`/`M` gradient mush inside the open bay. Make it a flat dark `d`/`K` cavity so the arm and turntable pop against it as a single clean silhouette (per the blueprint: "no clutter overlapping its links").

7. **Crisp the roll-up door slats.** The rolled-up slat stack at the top of the bay opening is currently indistinct — render it as 2–3 clearly stacked `M`/`D` curled slat bars with `K` separators so it reads as a rolled-up garage door.

8. **Keep (these already work):** corrugated roof ribbing, the `g` cyan teach-pendant panel on the front-right of the door, the `o`/`K` hazard chevrons on the floor lip, the `o` yellow conduit down the front corner, the cyan LIDAR puck up on the roof, and the rivet dots. Don't disturb these.
