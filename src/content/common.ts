import type { Box, MoveDef } from './types.ts';

export interface NormalTuning { reach: number; power: number; height: number }

const sc = (b: Box, t: NormalTuning): Box => ({
  x: Math.round(b.x * t.reach),
  y: Math.round(b.y * t.height),
  w: Math.round(b.w * t.reach),
  h: Math.round(b.h * t.height),
});
const d = (v: number, t: NormalTuning) => Math.round(v * t.power);

export function commonMoves(t: NormalTuning): Record<string, MoveDef> {
  return {
    sLP: { anim: 'sLP', startup: 4, active: 2, recovery: 7, dmg: d(30, t), hitstun: 14, blockstun: 10, push: 4,
      hit: sc({ x: 16, y: 60, w: 34, h: 12 }, t), cancel: 1, chain: true, sfx: 'light' },
    sHP: { anim: 'sHP', startup: 7, active: 3, recovery: 16, dmg: d(80, t), hitstun: 20, blockstun: 15, push: 8,
      hit: sc({ x: 18, y: 58, w: 46, h: 16 }, t), cancel: 1, sfx: 'heavy' },
    sLK: { anim: 'sLK', startup: 5, active: 3, recovery: 8, dmg: d(35, t), hitstun: 15, blockstun: 11, push: 5,
      hit: sc({ x: 14, y: 26, w: 42, h: 14 }, t), cancel: 1, sfx: 'light' },
    sHK: { anim: 'sHK', startup: 9, active: 4, recovery: 18, dmg: d(90, t), hitstun: 21, blockstun: 16, push: 10,
      hit: sc({ x: 16, y: 46, w: 56, h: 18 }, t), sfx: 'heavy' },
    cLP: { anim: 'cLP', startup: 4, active: 2, recovery: 6, dmg: d(25, t), hitstun: 13, blockstun: 9, push: 4,
      hit: sc({ x: 14, y: 32, w: 34, h: 12 }, t), cancel: 1, chain: true, sfx: 'light' },
    cHP: { anim: 'cHP', startup: 6, active: 4, recovery: 17, dmg: d(75, t), hitstun: 20, blockstun: 14, push: 6,
      hit: sc({ x: 4, y: 46, w: 36, h: 50 }, t), cancel: 1, launch: 0, sfx: 'heavy' },
    cLK: { anim: 'cLK', startup: 5, active: 2, recovery: 8, dmg: d(28, t), hitstun: 13, blockstun: 9, push: 4, level: 'low',
      hit: sc({ x: 14, y: 0, w: 44, h: 12 }, t), cancel: 1, chain: true, sfx: 'light' },
    cHK: { anim: 'cHK', startup: 8, active: 4, recovery: 22, dmg: d(70, t), hitstun: 20, blockstun: 14, push: 6, level: 'low',
      hit: sc({ x: 16, y: 0, w: 60, h: 12 }, t), kd: true, launch: 2, sfx: 'heavy' },
    jP: { anim: 'jP', startup: 5, active: 8, recovery: 3, dmg: d(70, t), hitstun: 18, blockstun: 14, push: 4, level: 'overhead', air: true,
      hit: sc({ x: 10, y: 22, w: 36, h: 24 }, t), sfx: 'heavy' },
    jK: { anim: 'jK', startup: 6, active: 9, recovery: 3, dmg: d(80, t), hitstun: 18, blockstun: 14, push: 4, level: 'overhead', air: true,
      hit: sc({ x: 12, y: 4, w: 42, h: 24 }, t), sfx: 'heavy' },
    throw: { anim: 'throw', startup: 3, active: 2, recovery: 22, dmg: 0, hitstun: 0, blockstun: 0,
      grab: { range: 34, dmg: d(120, t), tech: true, frames: 28, toss: 5 } },
  };
}

export const TUNE_DEFAULT: NormalTuning = { reach: 1, power: 1, height: 1 };
