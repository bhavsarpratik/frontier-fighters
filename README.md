# Frontier Fighters

**Play now: [bhavsarpratik.github.io/frontier-fighters](https://bhavsarpratik.github.io/frontier-fighters/)**

[![Frontier Fighters title screen](docs/cover.jpg)](https://bhavsarpratik.github.io/frontier-fighters/)

A 2D arcade fighting game where the AI frontier settles things with fists. It runs in the
browser and online play is peer-to-peer, so there's no game server.

> **Parody.** Not affiliated with or endorsed by anyone depicted. Names are bent, looks are
> pixel caricatures, and every quote is made up.

## Fighters

21 fighters in four play styles. Inputs are for facing right: QCF = down, down-forward, forward;
QCB = down, down-back, back; DP = forward, down, down-forward; P = punch, K = kick.

### Zoners

Keep you out with projectiles and traps.

| Fighter | Style | Specials | Super |
|---|---|---|---|
| Sam Altmind | Zoner | DP+P Hype Cycle · QCB+K Pivot (teleport) · QCF+P AGI Orb | SUPERINTELLIGENCE |
| Geoffrey Hintern | Old Master / Zoner | DP+K Capsule Kick · QCB+P Backprop Lightning (overhead) · QCF+P Boltzmann Blizzard | DEEP BELIEF |
| Sundar Pitch-AI | Zoner | DP+K I'm Feeling Lucky (teleport) · QCB+P Gemini Twins · QCF+P Search Beam | TEN BLUE LINKS |
| Fei-Fei Pixel | Zoner | DP+P Pixel Rise · QCB+K Spatial Warp (teleport) · QCF+P ImageNet Barrage | WORLD MODEL |
| Ilya Safeskever | Mystic Zoner | DP+P Sequence to Sequence (overhead) · QCB+K Board Exit (teleport) · QCF+P Feel the AGI | SAFE SUPERINTELLIGENCE |
| Alexandr Wangle | Zoner / Trapper | DP+P Scale Up · QCB+P Label Army (low) · QCF+P Bounding Box | GROUND TRUTH |

### Rushdown and speed

Fast, aggressive, always in your face.

| Fighter | Style | Specials | Super |
|---|---|---|---|
| Diogo Almighty | Speedster | DP+P Calibrated Confidence (counter) · QCB+K Fast Thinking · QCF+P Typed Decision | SYSTEM ONE |
| Thibault Codeaux | Rushdown | DP+P PR Swarm · QCF+K Cloud Dash · QCB+P Rate-Limit Reset (counter) | MERGE CONFLICT |
| Mira Mirage | Speed / Trickster | DP+K Phantom Rise · QCB+K Phantom Step (teleport) · QCF+P Mirage Clones | SORA STORM |
| Jeetu Packet | Rushdown | DP+P Zero Trust (counter) · QCB+K Agentic Rush · QCF+P Packet Burst | AGENTIC ERA |
| Elan Tusk | Charge | [down]up+K Starship Flip · [back]fwd+P Rocket Dash · QCB+K Hardcore Mode (power-up) | FULL SEND |

### Heavies and grapplers

Slow but armored, big damage and command grabs.

| Fighter | Style | Specials | Super |
|---|---|---|---|
| Jensen "Jacket" Hwang | Heavy / Armored | DP+P Jacket Spin · QCB+K GPU Drop (overhead) · QCF+P Tensor Core Charge | THE MORE YOU BUY |
| Andy Jazzy | Heavy Rushdown | DP+P Day One Uppercut · QCB+K Prime Rush · QCF+P Same-Day Delivery | PRIME DAY |
| Chuck Router | Heavy Grappler | DP+P Southern Uppercut · QCB+P Router Slam (command grab) · QCF+K Firewall (low) | HOSTILE ACQUISITION |
| Lisa Zen | Heavy Hitter | DP+P Core Uppercut · QCB+K Overclock (power-up) · QCF+P Chiplet Saw | ZEN CORE MELTDOWN |
| Mark Zuckerbot | Grappler | DP+P Pivot Elbow · QCB+P Jiu-Jitsu Takedown (command grab) · QCF+K Metaverse Warp (teleport) | META LOCK |

### All-rounders, counters and tricksters

Balanced kits, counters and surprises.

| Fighter | Style | Specials | Super |
|---|---|---|---|
| Dario Amodeus | Counter Fighter | DP+P Scaling Law · QCB+P Constitutional Counter (counter) · QCF+P Context Window | MACHINES OF LOVING GRACE |
| Demis Hassabyss | Counter / Strategist | DP+P Opening Book (counter) · QCB+P Protein Fold (command grab) · QCF+K Move 37 | ALPHA ZERO |
| Andrej Karpathink | All-rounder | QCF+P Backprop Blast · DP+P Gradient Ascent · QCB+K Zero to Hero | FROM SCRATCH |
| Andrew N-Gram | All-rounder | DP+P Course Correct (counter) · QCB+K Gradient Descent (overhead) · QCF+P Lecture Slide | ONE MILLION STUDENTS |
| Potetron | Trickster / Summoner | DP+P Hotfix · QCB+P Spud Toss (overhead) · QCF+P Reset Horde | FOUR DAY BUILD |

Every super needs a full meter and works once per round: press the **Super** button, or do
QCF QCF + punch. **Simple mode:** the Special button plus a direction does any special.
Specials done with two buttons are EX versions (they cost 1 bar).

## Play

```bash
npm run dev
```

Then open http://localhost:5173. Nothing needs installing; it's plain Node 22.

| | One player | Two players on one keyboard |
|---|---|---|
| Move (up jumps, down crouches) | Arrow keys | P1 W A S D · P2 arrows |
| Punch | A | P1 F · P2 O |
| Kick | S | P1 G · P2 L |
| Special | D | P1 H · P2 . |
| Super | W | P1 Y · P2 / |
| Heavy punch / kick | Q / E | P1 R / T · P2 P / ; |

Other keys:
- **Menu:** Esc opens the pause menu in every mode (online, the match keeps running)
- **Throw:** punch + kick together (A + S)
- **Block:** hold back (hold down-back to block lows)
- **Gamepad:** supported (RB special, RT super, Start menu)
- **Mute:** M (remembered between visits), or add `?mute` to the URL
- **CRT shader:** F8
- **Hitboxes:** F1 during a match
- **Training mode:** F2 pause, F3 step one frame, F4 change the dummy's behaviour, F5 reset

## Online

1. One player picks **ONLINE → CREATE ROOM** and sends the code or link to the other player.
2. The other player enters the code, or just opens the link.
3. Public Nostr relays introduce the two browsers, and from then on they talk directly over
   WebRTC.

Input travels on an unordered channel that never retransmits. A GGPO-style rollback session
predicts the opponent's input and corrects it when the real input arrives, so the game stays
responsive under lag.

Connection options:
- **MQTT:** a backup way for the browsers to find each other.
- **Manual mode:** copy-paste the connection offer and answer; no third party at all.
- **Same-computer test:** two tabs talking to each other.
- **Your own TURN server:** for networks that block direct connections.

Some networks (strict NAT, some office Wi-Fi and mobile carriers) block direct connections.
Without a TURN server those pairs can't connect, and the lobby says so.

**Why not do what the browser NFS Underground 2 port does?** That port relays the original
game's LAN packets through its own WebSocket server. That works, but someone has to run and
pay for the server.

## Build and deploy

```bash
npm run build
```

This writes two outputs:
- `dist/`: a static site, ready for GitHub Pages.
- `dist-single/index.html`: one self-contained file you can open straight from disk.

The code is about 100 KB gzipped; the fighter art adds the rest (the single file is about
18 MB gzipped because it embeds every image). The only online dependency is Trystero, loaded
from esm.sh when you open the online lobby.

## Tests

```bash
npm test
```

26 tests using Node's built-in test runner:
- Determinism across all 441 matchups.
- Motion-input parsing.
- Hit, block, throw and tech rules.
- Damage scaling and round flow.
- Every special and super coming out from its inputs.
- Rollback peers staying in sync over a simulated link with 30–150 ms latency, jitter and
  10–15% packet loss. Each peer's checksums are compared against an offline replay.

Browser checks, run through headless Chrome (`tools/cdp.mjs`):
- `netpair.html?via=p2p` plays a CPU-vs-CPU online match between two iframes over real
  WebRTC.
- `?demo=1,5,2` starts a CPU-vs-CPU match (this is also the title-screen attract mode).

## Tools

- `gym.html`: the Box Gym. Scrub any move frame by frame, drag or resize its hitbox, and export
  the result as JSON.
- `sprites.html`: a sprite sheet of every fighter in key poses.

## How it's built

```
src/sim      deterministic integer simulation (1 px = 256 units), step(state, p1, p2)
src/content  fighters, moves, frame data, stages: plain data
src/render   pose-frame renderer (vector rig fallback), stages, effects, HUD, WebGL2/Canvas2D output
src/net      Transport interface, rollback session, Trystero/manual WebRTC, BroadcastChannel
src/ai       CPU opponent and training dummy
src/ui       screens: title, select, stage, VS, match, results, lobby
tools        zero-dependency dev server and build (Node's built-in TypeScript stripping)
```

Fighters are hand-drawn style illustrations: a key art plus 15 pose drawings each, made with
Codex image generation (`tools/gen_queue.py`) and imported by `tools/import_poses.py`. Moves
play those poses with tweened lunges, smears and impact frames; a vector paper-doll rig fills
in for any missing pose. Stages and effects are drawn in code. Music and sound effects are
synthesized with WebAudio, and the announcer uses the browser's speech synthesis.
