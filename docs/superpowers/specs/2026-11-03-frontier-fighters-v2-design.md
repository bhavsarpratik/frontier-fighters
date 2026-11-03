# Frontier Fighters v2 — Characters, Roster, Super Moves (draft for review)

Date: 2026-11-03 · Status: awaiting user review

## Why the fighters still look weak
1. Every frame is one illustration with rotated limbs, so they read as paper puppets.
2. There are no real poses or expressions per move.
3. They are small on screen (~1/3 of the height), so the art's detail is lost.

## Solution: hand-drawn pose sets per fighter (Codex image generation)
Codex keeps a character consistent when given its key art as the reference (verified with
Karpathink: punch, kick and hit came out on-model with expressive faces).

- **13 poses per fighter:** idle, walk, crouch, jump, punch, kick, sweep, uppercut, special,
  block, hit, knockdown, victory. Plus 2 **super frames** (charge-up, release) for cinematics.
- **Animation:** each move plays wind-up → strike → recover using its pose drawing, with tweened
  squash/lunge, motion smears, impact frames and afterimages. The illustrated face changes per move.
- **Bigger on screen:** closer camera so fighters fill ~45% of the screen height (Street Fighter
  scale); backgrounds get depth of field so fighters pop.
- **Rendering quality:** full-resolution art (no downscaled cutouts); a subtle ink rim and
  stage-coloured rim light to tie fighters into each stage.
- The cutout rig stays as a fallback for any pose that's missing.

## Roster: 8 → 14 at launch (bent names, caricature, no logos)
| New fighter | Inspired by | Archetype | Wild moves (super in caps) |
|---|---|---|---|
| **Fei-Fei Pixel** "The Visionary" | Fei-Fei Li | Zoner | *ImageNet Barrage* (storm of labeled photo tiles), *Spatial Warp* (teleport through a 3D grid), SUPER *WORLD MODEL* (the stage becomes a wireframe; she reshapes it to crush the opponent) |
| **Andrew N-Gram** "The Professor" | Andrew Ng | All-rounder | *Gradient Descent* (dive kick from the sky), *Course Correct* (counter), SUPER *ONE MILLION STUDENTS* (an army of students floods the screen) |
| **Geoffrey Hintern** "The Godfather" | Geoffrey Hinton | Old master | *Boltzmann Blizzard* (ice storm), *Backprop Lightning* (lightning traces back to the opponent), SUPER *DEEP BELIEF* (a giant neural-net constellation fires a beam) |
| **Mira Mirage** "The Phantom" | Mira Murati | Speed/trickster | *Mirage Clones* (decoy afterimages), *Phantom Step* (slide behind), SUPER *SORA STORM* (film-reel portals rain clips that strike) |
| **Lisa Zen** "Core Count" | Lisa Su | Heavy hitter | *Chiplet Saw* (spinning chip blades), *Overclock* (fire aura speed buff), SUPER *ZEN CORE MELTDOWN* (heat-wave eruption) |
| **Demis Hassabyss** "The Grandmaster" | Demis Hassabis | Counter/strategist | *Move 37* (unblockable chess-piece strike), *Fold* (protein-chain grab), SUPER *ALPHA ZERO* (the board flips; 37 pieces strike) |

- **Potetron becomes she/her** (inspired by Lauren from xAI): she keeps the potato-head mascot
  look (no real likeness), redrawn as a woman with a ponytail and her own outfit.
- **Stretch (after launch):** Dario Amodeus, Satya Copilella, Sundar Pitch-AI.

## Wild supers for the original 8
Every fighter gets a cinematic super: freeze, cut-in, background swap and a screen-filling effect.
For example: Karpathink *FROM SCRATCH* becomes a giant chalk neural net that assembles and fires;
Hwang's GPU rain becomes a datacenter avalanche; Tusk's rocket launches into orbit and crashes
down; Zuckerbot pulls the opponent into a metaverse void.

## Effects engine upgrades (procedural)
Beams, lightning, ice, fire auras, shockwaves, chalk/wireframe overlays, anime speed lines,
screen-wide flashes and super backgrounds, all as a reusable effect library.

## Budget and risk
- About 14 fighters × 16 images ≈ 220 Codex images (~2.5 min each, 3–4 in parallel → 3–4 hours).
- **Risk:** your ChatGPT plan's image limits. Mitigation: generate in priority order (all fighters
  playable first, then supers), resume where it stops, and keep the cutout fallback.

## Order of work
1. Pose renderer + closer camera with the 4 Karpathink test poses (prove the look).
2. Full pose sets for the current 8 (Potetron redrawn as female).
3. Effects library + cinematic supers for the 8.
4. The 6 new fighters: content, moves, art, rigs, supers.
5. Tests (frame data, move reachability, determinism for 14 fighters), browser checks, builds.
