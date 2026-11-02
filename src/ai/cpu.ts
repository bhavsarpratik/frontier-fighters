import { CHARS } from '../sim/data.ts';
import { FX } from '../sim/fixed.ts';
import { curMove, isAirborne } from '../sim/fighter.ts';
import { DOWN, HK, HP, LEFT, LK, LP, RIGHT, SP, UP } from '../sim/input.ts';
import {
  S_AIR, S_AIRHIT, S_ATTACK, S_BLOCKSTUN, S_HITSTUN, S_IDLE, S_KNOCKDOWN, S_WALK, type SimState,
} from '../sim/types.ts';

export type Difficulty = 0 | 1 | 2;
export const DIFF_NAMES = ['EASY', 'NORMAL', 'HARD'];

interface Tune { react: number; block: number; antiAir: number; aggro: number; combo: number; super: number }
const TUNES: Tune[] = [
  { react: 22, block: 0.25, antiAir: 0.15, aggro: 0.25, combo: 0.15, super: 0.2 },
  { react: 13, block: 0.55, antiAir: 0.45, aggro: 0.45, combo: 0.5, super: 0.6 },
  { react: 7, block: 0.85, antiAir: 0.8, aggro: 0.6, combo: 0.85, super: 0.95 },
];

// Relative directions → absolute bits for a given facing.
function rel(d: number, facing: number): number {
  let v = 0;
  if (d === 7 || d === 8 || d === 9) v |= UP;
  if (d === 1 || d === 2 || d === 3) v |= DOWN;
  const fwd = d === 3 || d === 6 || d === 9;
  const back = d === 1 || d === 4 || d === 7;
  if (fwd) v |= facing > 0 ? RIGHT : LEFT;
  if (back) v |= facing > 0 ? LEFT : RIGHT;
  return v;
}

export class Cpu {
  private queue: number[] = [];
  private wait = 0;
  private hold = 0;
  private holdFrames = 0;
  private t: Tune;
  private seed: number;

  level: Difficulty;

  constructor(level: Difficulty, seed = 12345) {
    this.level = level;
    this.t = TUNES[level];
    this.seed = seed;
  }

  private rand(): number {
    this.seed = (this.seed * 1103515245 + 12345) >>> 0;
    return (this.seed >>> 8) / 16777216;
  }

  private macro(dirs: number[], button: number, facing: number): void {
    for (let i = 0; i < dirs.length; i++) this.queue.push(rel(dirs[i], facing) | (i === dirs.length - 1 ? button : 0));
    this.queue.push(0);
  }

  input(s: SimState, me: number): number {
    const f = s.f[me];
    const o = s.f[1 - me];
    const c = CHARS[f.char];
    if (this.queue.length) return this.queue.shift()!;
    if (this.holdFrames > 0) {
      this.holdFrames--;
      return this.hold;
    }
    const dist = Math.abs(o.x - f.x) / FX;
    const face = f.facing;
    const om = curMove(o);
    const free = f.state === S_IDLE || f.state === S_WALK || f.state === 2;
    // punish / combo when the opponent is in hitstun from our hit
    if (f.state === S_ATTACK && o.state === S_HITSTUN && this.rand() < this.t.combo * 0.25) {
      const m = curMove(f);
      if (m && m.cancel === 1 && f.connected) {
        const sp = c.specials[Math.floor(this.rand() * c.specials.length)];
        return SP | rel(sp.simple === 'd' ? 2 : sp.simple === 'f' ? 6 : sp.simple === 'b' ? 4 : 5, face);
      }
    }
    // defend
    if (o.state === S_ATTACK && om && dist < 150 && free) {
      if (this.rand() < this.t.block) {
        const low = om.level === 'low';
        this.hold = rel(low ? 1 : 4, face);
        this.holdFrames = 8;
        return this.hold;
      }
    }
    if (s.proj.some((p) => p.owner !== me && Math.abs(p.x - f.x) / FX < 110) && free && this.rand() < this.t.block) {
      if (this.rand() < 0.35) {
        this.queue.push(rel(9, face), rel(9, face), rel(9, face), 0);
        return rel(9, face);
      }
      this.hold = rel(4, face);
      this.holdFrames = 10;
      return this.hold;
    }
    // anti-air
    if ((o.state === S_AIR || (o.state === S_ATTACK && isAirborne(o))) && dist < 120 && free && o.vy < 0) {
      if (this.rand() < this.t.antiAir) {
        const aa = c.specials.find((x) => x.motion === '623' || x.motion === '[2]8');
        if (aa && this.rand() < 0.6) return SP | rel(6, face);
        return DOWN | HP;
      }
    }
    if (this.wait > 0) {
      this.wait--;
      return this.walkDecision(dist, face);
    }
    this.wait = this.t.react + Math.floor(this.rand() * this.t.react);
    if (!free) return 0;
    if (f.meter >= 300 && dist < 140 && this.rand() < this.t.super && o.state !== S_KNOCKDOWN) return SP | UP;
    const r = this.rand();
    if (dist > 200) {
      const proj = c.specials.find((x) => c.moves[x.move].proj);
      if (proj && r < 0.35) return SP | rel(proj.simple === 'd' ? 2 : proj.simple === 'f' ? 6 : 5, face);
      if (r < 0.35 + this.t.aggro * 0.4) {
        this.macro([6, 6, 5, 6], 0, face);
        return 0;
      }
      this.hold = rel(6, face);
      this.holdFrames = 20;
      return this.hold;
    }
    if (dist > 80) {
      if (r < 0.15 * this.t.aggro + 0.05) {
        this.queue.push(rel(9, face), rel(9, face), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, HK, 0);
        return rel(9, face);
      }
      if (r < 0.4) {
        const sp = c.specials[Math.floor(this.rand() * c.specials.length)];
        return SP | rel(sp.simple === 'd' ? 2 : sp.simple === 'f' ? 6 : sp.simple === 'b' ? 4 : 5, face);
      }
      this.hold = rel(r < 0.85 ? 6 : 4, face);
      this.holdFrames = 12;
      return this.hold;
    }
    if (o.state === S_BLOCKSTUN || o.state === S_AIRHIT) return 0;
    if (r < 0.12) return LP | LK;
    if (r < 0.3) {
      this.queue.push(DOWN | LK, 0, 0, 0, 0, 0, DOWN | LK, 0, 0, 0, 0);
      if (this.rand() < this.t.combo) this.queue.push(0, 0, SP | rel(2, face));
      return DOWN;
    }
    if (r < 0.5) return HP;
    if (r < 0.62) return DOWN | HK;
    if (r < 0.75) return LK;
    if (r < 0.85) return LP;
    this.hold = rel(4, face);
    this.holdFrames = 14;
    return this.hold;
  }

  private walkDecision(dist: number, face: number): number {
    if (dist > 120 && this.rand() < this.t.aggro * 0.6) return rel(6, face);
    return 0;
  }
}

export const DUMMY_MODES = ['STAND', 'CROUCH', 'JUMP', 'BLOCK ALL', 'CPU'] as const;

export function dummyInput(mode: number, s: SimState, me: number, cpu: Cpu): number {
  const f = s.f[me];
  const o = s.f[1 - me];
  switch (mode) {
    case 1: return DOWN;
    case 2: return f.state === S_IDLE ? UP : 0;
    case 3: {
      const m = curMove(o);
      const projNear = s.proj.some((p) => p.owner !== me);
      if ((o.state === S_ATTACK && m) || projNear) {
        const lvl = m?.level ?? 'mid';
        return rel(lvl === 'low' ? 1 : lvl === 'overhead' ? 4 : f.state === S_BLOCKSTUN && f.crouchHit ? 1 : 4, f.facing);
      }
      return f.state === S_BLOCKSTUN ? rel(f.crouchHit ? 1 : 4, f.facing) : 0;
    }
    case 4: return cpu.input(s, me);
  }
  return 0;
}

export { LK, LP, HK, HP };
