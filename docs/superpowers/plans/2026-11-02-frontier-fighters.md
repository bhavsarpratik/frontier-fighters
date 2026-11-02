# Frontier Fighters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Browser 1v1 parody fighter with local, CPU and serverless P2P rollback online play.

**Architecture:** Pure deterministic integer sim (`sim/`) driven by 16-bit per-frame inputs.
Renderer rasterizes code-authored pixel rigs into a 480×270 canvas, presented via WebGL2
(CRT shader) or Canvas2D fallback. Netcode is a hand-rolled GGPO-style session over a
`Transport` (WebRTC via Trystero/manual SDP, BroadcastChannel, Loopback).

**Tech Stack:** TypeScript 5, Vite 6, Vitest, Trystero 0.26, vite-plugin-singlefile.

**Spec:** `docs/superpowers/specs/2026-11-02-frontier-fighters-design.md`

## Global Constraints
- Sim: integers only (1 px = 256 units), no `Math.random`/`Date`/floats in `src/sim/**`.
- Sim never imports from render/audio/ui/net/input.
- 60 Hz fixed step; internal resolution 480×270; stage width 720 px.
- Bundle ≤ 300 KB gzipped; no audio or image asset files.
- Parody rules: bent names, no logos/photos/real quotes; disclaimer on title + README.
- Max rollback 8 frames, input delay 0–4 (default 2), checksum every 30 frames.

## File map
```
index.html, vite.config.ts, vite.single.config.ts, package.json, tsconfig.json
src/main.ts                 boot, loop, screen manager
src/sim/fixed.ts            FX=256, helpers
src/sim/rng.ts              xorshift32 on state.seed
src/sim/input.ts            bit consts, motion detection on history
src/sim/types.ts            SimState, FighterState, Projectile, SimEvent
src/sim/step.ts             createMatch(), step(), hashState(), cloneState()
src/sim/fighter.ts          per-fighter state machine + move execution
src/sim/combat.ts           hit/block/throw resolution, projectiles
src/content/types.ts        CharacterDef, MoveDef, Box, Look
src/content/common.ts       shared normals/throw generator, poses
src/content/chars/*.ts      8 fighters
src/content/roster.ts       ordered list
src/content/stages.ts       stage defs
src/render/raster.ts        shape rasterizer w/ outline + cel shade
src/render/rig.ts           pose → shapes for a Look; sprite cache
src/render/font.ts          5×7 bitmap font
src/render/stageArt.ts      procedural parallax layers
src/render/scene.ts         draws match: stage, fighters, fx, HUD
src/render/fx.ts            particles/shake from events
src/render/present.ts       WebGL2 CRT present + Canvas2D fallback
src/audio/audio.ts          sfx synth, music sequencer, announcer
src/input/devices.ts        keyboard + gamepad → per-player u16
src/net/transport.ts        Transport interface
src/net/loopback.ts         in-process with latency/jitter/loss
src/net/broadcast.ts        BroadcastChannel (2 tabs)
src/net/webrtc.ts           Trystero room + unordered channel; manual SDP
src/net/rollback.ts         RollbackSession
src/ai/cpu.ts               CPU controller
src/ui/*.ts                 title, menu, select, stage, lobby, results, training
tests/*.test.ts
```

## Interfaces (shared names)
```ts
// sim/input.ts
export const UP=1, DOWN=2, BACK_L=4, RIGHT=8, LP=16, HP=32, LK=64, HK=128, SP=256;
// sim/step.ts
createMatch(opts:{p1:number;p2:number;stage:number;seed:number;mode?:'versus'|'training'}): SimState
step(s:SimState, i1:number, i2:number): void      // mutates; fills s.events
cloneState(s):SimState; hashState(s):number
// net/transport.ts
interface Transport { send(b:ArrayBuffer|string):void; onMessage(cb:(b:ArrayBuffer|string)=>void):void;
  onClose(cb:()=>void):void; close():void }
// net/rollback.ts
class RollbackSession { constructor(o:{local:0|1; transport:Transport; init:SimState; delay?:number})
  tick(localInput:number): {state:SimState; stalled:boolean; desync:boolean} }
```

## Tasks
### Task 1: Scaffold + sim core (Phase 0)
- [ ] git init, package.json, Vite/TS/Vitest config, index.html.
- [ ] fixed.ts, rng.ts, types.ts, step.ts skeleton with clone/hash.
- [ ] Test: `tests/determinism.test.ts` — 10k random-input frames run twice → identical hash each frame; clone→step equals step.
- [ ] Commit.

### Task 2: Combat engine + 2 fighters + local VS (Phase 1)
- [ ] input.ts motion parser. Test `tests/input.test.ts`: 236/623/214/236236/charge [4]6 detected, with 4-frame buffer, mirrored when facing left.
- [ ] fighter.ts states: idle/walk/crouch/jump/dash/attack/hitstun/blockstun/knockdown/thrown/ko.
- [ ] combat.ts: box overlap, stance-vs-height block check, chip, hitstop, pushback, scaling, meter, throws+tech, projectiles.
- [ ] Karpathink + Codeaux content. Test `tests/combat.test.ts`: LP hits only in active frames; crouch-block stops low, fails on overhead; throw tech; damage scaling; KO ends round; best-of-3.
- [ ] Minimal render + keyboard → playable local VS. Commit.

### Task 3: Presentation (Phase 2)
- [ ] raster.ts, rig.ts, font.ts, stageArt.ts, scene.ts, fx.ts, present.ts.
- [ ] HUD (health, meter, timer, round pips, combo), menus, char select w/ portraits, stage select, VS splash, results.
- [ ] audio.ts. Browser check: golden path local match; WebGL2 disabled fallback. Commit.

### Task 4: Netcode (Phase 3)
- [ ] transport.ts, loopback.ts, broadcast.ts, rollback.ts.
- [ ] Test `tests/rollback.test.ts`: two sessions over Loopback (0–150 ms latency, jitter, 10% loss, 5k frames) → equal confirmed hashes; no stall > 8 frames lead.
- [ ] webrtc.ts (Trystero nostr + mqtt fallback, negotiated unordered channel id 7; manual SDP mode), lobby UI, online select sync, rematch, disconnect handling.
- [ ] Browser check: two tabs over BroadcastChannel complete a match. Commit.

### Task 5: Roster + AI + training (Phase 4)
- [ ] Potetron, Wangle, Altmind, Hwang, Zuckerbot, Tusk (+ specials primitives: arc/trap/minion/rain projectiles, counter, command grab, teleport, buff, armor, revive, charge).
- [ ] Test: every move's frame data valid; each special reachable via its motion in sim.
- [ ] cpu.ts (3 difficulties), training mode (dummy modes, overlay, frame advantage). Commit.

### Task 6: Polish + ship (Phase 5)
- [ ] Super cut-ins, gamepad, box overlay F1 / frame step F2, Box Gym (edit move hitboxes live, export JSON).
- [ ] `npm run build` (Pages) + `npm run build:single` (one HTML); size check ≤300 KB gz; README with controls + disclaimer. Commit.
