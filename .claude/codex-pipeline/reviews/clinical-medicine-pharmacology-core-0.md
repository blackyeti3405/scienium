# Review — clinical-medicine-pharmacology · Core (round 0, workflow wf_9c441cfa-512)

Draft + adversarial fact-check fan-out, one lane per unit (Sonnet default, Opus on escalation).
**Result: `allClean: true`** — every unit shipped with zero open HIGH findings. **No Opus escalations.**

| Unit | Lessons | Fact-check rounds | Final |
|------|---------|-------------------|-------|
| foundations | 6 | 3 | clean |
| pk | 7 | 3 | clean |
| pd | 7 | 3 | clean |
| measure | 7 | 3 | clean |
| evidence | 7 | 3 | clean |
| ethics | 6 | 3 | clean |
| plots | 6 | 1 | clean (no findings) |
| landmark | 6 | 3 | clean |

**Total: 8 units / 52 lessons** (target 45–55). 65 agents, 0 errors, ~3.8M subagent tokens, ~22 min.

Fact-check: **5 HIGH-severity findings** raised across the checks and all resolved by the Sonnet fix/verify loop before assembly (each survived the "defense" refute lens, so it was a real error, and was corrected). Seven units iterated the full 3 rounds on residual MED/LOW polish; `plots` was clean on the first check.

Gates (all green): shared-types build · `codex:build --check` (registry in sync) · typecheck · lint · content-shape (25) · generated-content zod + deep-equal + checksum (19).
