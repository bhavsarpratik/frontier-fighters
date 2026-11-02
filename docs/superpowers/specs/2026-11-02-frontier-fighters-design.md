# Frontier Fighters — Design Spec (v2)

Date: 2026-11-02 · Status: decisions recorded, awaiting go to build

## 1. Pitch
A 2D 1v1 arcade fighter that runs in Chrome from a static page. The roster is friendly parody
of the AI community and big-tech CEOs: lightly bent names, caricatured pixel looks, moves
built from their public persona and memes. It borrows the *feel* of 90s arcade fighters
(motion-input specials, best-of-3, supers with cut-ins) and copies none of their
characters, sprites, names, moves, sounds or UI.

Online play is peer-to-peer. We run no servers.

## 2. What v1 got wrong (critique → fixes)
| v1 gap | v2 fix |
|---|---|
| No art pipeline (the biggest risk) | §6: code-authored pixel rig + drop-in sprite-sheet path |
| Didn't say the sim must be deterministic, and rollback is impossible without it | §4: fixed-point, seeded RNG, pure `step(state, inputs)` |
| No combat model | §5: per-frame box data, frame data, cancels, guard geometry |
| Netcode was one line; ignored NAT failures | §7: transport abstraction, rollback details, failure UX |
| No size/perf budget, no tests, no phasing | §9–§11 |
| Ignored parody/legal risk | §12 |
| Compared to the Phaser 4 AI-fighter video: it has great box tooling but is local-only, engine-heavy, and not rollback-safe | We keep its ideas (box gym, active frames, guard boxes, group camera, cut-in supers) on a deterministic core with online play |

## 3. Platform & architecture
- TypeScript + Vite. No game engine. Runtime deps: one P2P signaling lib (Trystero, see §7).
- Renderer: WebGL2 (sprite batcher + post shader); automatic Canvas2D fallback if WebGL2 is
  missing or slow. Internal resolution 480×270, integer-scaled, nearest-neighbor.
- Strict layering (each a folder, one-way deps):
  ```
  sim/      pure deterministic game logic. No DOM, no time, no Math.random
  content/  characters, moves, frame data, stages (data + small behavior hooks)
  net/      Transport interface, rollback session, time sync
  render/   reads sim state → draws. Never writes to the sim
  audio/    WebAudio synth SFX + chiptune sequencer, triggered by sim events
  ui/       menus, char select, HUD, lobby (DOM overlay + canvas)
  input/    keyboard, Gamepad API → 8-bit input bitmask per frame
  tools/    debug overlay, training mode, box gym (dev builds)
  ```
- Main loop: fixed 60 Hz sim step decoupled from rAF; render interpolates nothing (fighters
  should be frame-exact).

## 4. Deterministic simulation (the foundation)
- `step(state, p1Input, p2Input) → state`. All of the game is in `state`: positions,
  velocities, current move + frame, hitstop, meter, timer, RNG seed, projectiles, round.
- Fixed-point integers (1 unit = 1/256 px). No floats in sim logic.
- `save(state)` / `load(snapshot)` via a flat typed-array layout: cheap to clone 60×/s, plus
  a fast checksum (FNV-1a over the buffer).
- Budget: 1 step ≤ 0.25 ms so an 8-frame rollback resim fits in ~2 ms.

## 5. Combat system
- **Inputs:** 8 directions + 4 attack buttons (Light/Heavy Punch, Light/Heavy Kick) + 1
  "Assist/EX" button. Four buttons instead of six: keyboard-friendly, and not the SF layout.
- **Motion inputs:** quarter-circle, dragon-punch, charge (back→forward, down→up), double-tap
  dash. 4-frame input buffer, lenient diagonals. An optional "Simple" control mode maps
  direction + Assist to specials (accessibility, mobile later).
- **Per-frame box data:** every animation frame has hurtboxes, hitboxes (attack), a pushbox,
  and optional guard and throw boxes.
- **Frame data per move:** startup / active / recovery, damage, chip, hitstun, blockstun,
  hitstop, pushback, knockdown/launch, high/mid/low/overhead, cancel windows
  (normal→special→super), juggle points.
- **Blocking is geometric:** hold back to stand-block, down-back to crouch-block. Hit vs block
  is two checks: did the hitbox touch a hurt/guard box, and does the guard stance match
  the attack's height.
- **Systems:** throws + throw tech, damage scaling in combos, 3-bar meter (from dealing and
  taking hits), EX specials (1 bar), super (3 bars) with full-screen cut-in, combo counter,
  KO slow-mo, 60 s timer, best-of-3, side switching, corner pushback.
- **Camera:** group camera on a stage 1.5× screen width. It scrolls only when a fighter pushes
  the edge, and max fighter separation is clamped.

## 6. Art & audio pipeline
**Honest constraint:** I can't paint or generate raster art. The video above used an image
model; I don't have one here. So:

- **Default: code-authored pixel rig.** Each fighter is a paper-doll of ~14 parts (head, torso,
  upper/lower arms, hands, legs, feet, plus signature props). Each part is a small
  palette-indexed pixel sprite authored as data. Animations are keyframed joint poses,
  rendered at 1× into an offscreen atlas at boot, so runtime is plain sprite blits.
  Result: a crisp, consistent 16-bit-ish look with smooth animation and tiny file size.
  It will look stylized, not hand-painted SNES.
- **Upgrade path:** the frame/box data format is renderer-agnostic, so a character can later
  swap to an AI- or hand-made sprite sheet (PNG + JSON) without touching the sim.
- **Juice:** hit sparks, screen shake, hitstop flashes, palette-swap for mirror matches,
  parallax stages, an optional CRT/scanline post shader, super cut-ins with a portrait.
- **Audio:** all synthesized with WebAudio: punchy SFX, a small chiptune sequencer with one
  loop per stage, and announcer stingers ("ROUND 1", "K.O.") as synthesized voice-like
  sounds plus big on-screen text. No audio files.

## 7. Online multiplayer (no servers we run)
- **Transport interface** with three implementations:
  1. `WebRtcTransport`: WebRTC data channel, `ordered:false, maxRetransmits:0`.
  2. `BroadcastChannelTransport`: two tabs on one machine. Used for tests and local demos.
  3. `LoopbackTransport`: in-process, with simulated latency, jitter and loss for tests.
- **Why not copy the NFS approach:** the browser NFS Underground 2 port ("Underground 2
  Revived", nfsu2.xyz, a WASM + WebGPU recompile) tunnels the 2004 game's LAN packets
  through its own `wss://…/lan` WebSocket relay. That needs a server someone runs, so we
  go true P2P instead.
- **Signaling:** Trystero 0.26 over public Nostr relays (default), with
  `@trystero-p2p/mqtt` as a fallback strategy. The host creates a room, gets a short code +
  share link, and the friend opens the link. A "manual mode" fallback copy-pastes one
  non-trickle SDP offer/answer blob (zero third-party signaling).
- **Channel:** Trystero's own channel is reliable + ordered, which causes head-of-line
  stalls. So after Trystero connects, we open our own
  `{ordered:false, maxRetransmits:0}` data channel on the underlying RTCPeerConnection for
  inputs, and use Trystero's channel only for lobby/control messages.
- **STUN:** Google (stun/stun1/stun2 :19302) + Cloudflare (:3478), Trystero's defaults. No TURN.
- **Rollback library:** hand-rolled. netplayjs is dormant (last release 2023) and needs its
  own signaling server; `rollback-netcode` is 0.0.x with 5 stars. A GGPO-style loop for
  two players is a few hundred lines and we control determinism end-to-end.
- **NAT reality:** without TURN, some pairs (symmetric NAT, strict corporate Wi-Fi) can't
  connect. The UI detects a timeout and says so plainly, with tips (try a phone hotspot or
  the same network). Bring-your-own TURN URL is an advanced setting.
- **Rollback netcode (GGPO-style):**
  - Each side sends its input for frame N plus the last ~8 unacked inputs in every packet
    (1 byte per frame, redundancy instead of retransmit).
  - Remote input is predicted by repeating the last one. On a mismatch: load the snapshot at
    the first wrong frame and resimulate to now.
  - Input delay starts at 2 frames, auto-tuned from RTT (0–4). Max rollback is 8 frames;
    past that the game stalls instead of desyncing.
  - Time sync: whichever side is ahead skips a frame now and then so both stay aligned.
  - Every 30 frames, peers exchange a state checksum. A mismatch shows a desync notice and
    writes a debug dump (dev builds).
  - Sim events (sounds, sparks) are re-derived after rollback so effects don't double-fire.
- **Match flow online:** lobby → both pick characters (synced) → stage chosen by host →
  match → rematch / back to lobby. Shared RNG seed is chosen by the host at match start.

## 8. Roster (parody, launch 8 + 4 stretch)
Classic *archetypes* (all-rounder, rushdown, grappler, zoner, charge, heavy) mapped onto each
person's persona. Names and looks are bent: caricature, no photos, no company logos.

| Fighter | Inspired by | Archetype | Signature bits |
|---|---|---|---|
| **Andrej Karpathink** "The Educator" | Andrej Karpathy | All-rounder | *Backprop Blast* (chalk-equation projectile), *Gradient Ascent* (rising anti-air), super *From Scratch* (writes a tiny GPT on a chalkboard, multi-hit) |
| **Thibault Codeaux** "The Codex" | Thibault "Tibo" Sottiaux | Rushdown | *Rate-Limit Reset* (counter that refills meter), cloud-dash, a swarm of PR notifications |
| **Potetron** "4-Day Build" | Poteto | Trickster/summoner | Summons pixel "reset-begging" zombies (tibo.dog homage), *1,150 PRs* multi-hit rush |
| **Alexandr Wangle** "The Labeler" | Alexandr Wang | Assist/zoner | Calls in a labeling army; bounding-box traps that freeze opponents |
| **Sam Altmind** "The Founder" | Sam Altman | Zoner | Slow *AGI Orb* projectile; once per match *Fired? Rehired.* returns from KO at 10% HP |
| **Jensen "Jacket" Hwang** "Leather Jacket" | Jensen Huang | Heavy/armored | Super armor on heavies; super *The More You Buy* (GPU rain) |
| **Mark Zuckerbot** "The Grappler" | Mark Zuckerberg | Grappler | BJJ command throws, metaverse teleport, sunscreen-white idle |
| **Elan Tusk** "Full Send" | Elon Musk | Charge | Rocket charge dash, *Hardcore Mode* (trades HP for damage) |
| *Stretch:* Satya Copilella, Sundar Pitch-AI, Demis Hassabyss, Dario Amodeus | | | |

Content goal per fighter: ~14 normals, 3 specials, 1 super, throw, ~20 animations, an intro, a
win pose, and one easter egg.

## 9. Modes, UI, tools
- Modes: **Versus Local** (2 keyboards, or keyboard + gamepad), **Versus CPU** (3
  difficulties; simple state-machine AI that reads frame data), **Online**, **Training**
  (dummy settings, hitbox overlay, input display, frame-advantage readout, frame step).
- Flow: title (with parody disclaimer) → mode → char select with portraits → stage select
  → VS splash → "ROUND 1 / FIGHT".
- Stages (4): GPU Datacenter, SF Rooftop, Labeling Warehouse, The Reset Queue (zombie
  crowd in the background).
- Dev tools: F1 box overlay, F2 frame step, and a **Box Gym** page for editing per-frame
  boxes with drag handles that exports JSON (credit to the video for this idea).

## 10. Budgets
- ≤ 300 KB gzipped total. A single-file `index.html` build is an option.
- 60 fps on a 2019 laptop with integrated GPU; Canvas2D fallback at 60 fps too.
- Online: playable up to ~120 ms RTT.

## 11. Testing
- **Vitest unit:** motion-input parser, frame-data invariants (every hitbox frame lies in
  its active window), guard logic, damage scaling.
- **Determinism:** run 10k frames of random inputs twice and compare checksums every frame.
  Save/load round-trip equals the original.
- **Rollback harness:** two sessions over `LoopbackTransport` with random 0–150 ms latency,
  jitter and 10% loss for 5k frames. Checksums must match and no stall may exceed the limit.
- **Browser checks:** dev server + preview: menus, local match, a two-tab online match over
  BroadcastChannel, and the WebGL2-off fallback.
- Real WebRTC across two networks needs a manual test by you; I can only fully automate the
  same-machine path.

## 12. Parody & legal guardrails
- Bent names, caricatured pixel art, no photos, no company logos or trademarks, no real
  quotes put in anyone's mouth, jokes stay about public persona and are good-natured.
- Title-screen and README disclaimer: "Parody. Not affiliated with or endorsed by anyone
  depicted."
- Title *Frontier Fighters* chosen to stay clear of the "Street Fighter" trademark.

## 13. Phases (implemented end-to-end without stopping after approval)
0. Scaffold, sim core, fixed-point math, save/load, determinism tests.
1. Combat engine + 2 fighters (Karpathink, Codeaux) + local versus + debug overlay.
2. Renderer polish, HUD, menus, char select, 2 stages, audio.
3. Transports, rollback session, lobby, online versus, rollback harness.
4. Remaining 6 fighters, 2 stages, CPU AI, training mode.
5. Supers/cut-ins polish, gamepad, Box Gym, single-file build, README.

## 14. Decisions
1. **Title:** DECIDED: *Frontier Fighters*.
2. **Art:** DECIDED: code-authored pixel rig (sprite-sheet swap path kept).
3. **Roster:** DECIDED: launch 8 as listed; 4 stretch.
4. **Hosting:** DECIDED: both, a static build for GitHub Pages and a single-file index.html.
