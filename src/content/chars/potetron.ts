import { commonMoves } from '../common.ts';
import type { CharacterDef } from '../types.ts';

export const potetron: CharacterDef = {
  id: 'potetron',
  name: 'POTETRON',
  short: 'POTETRON',
  title: '4-Day Build',
  archetype: 'Trickster / Summoner',
  inspired: 'Poteto',
  hp: 980,
  walkF: 2.5, walkB: 2.1, jumpV: 9.6, jumpX: 3.2, gravity: 0.52, dashF: 6.5, dashB: 5.5,
  height: 90, width: 14,
  stage: 3,
  look: {
    face: { smile: 1 },
    skin: '#e0b090', hair: '#000000', top: '#151515', top2: '#ffffff', pants: '#2b3a55', shoes: '#e04040',
    accent: '#ffd23e', hairStyle: 'none', topStyle: 'tee', height: 0.97, bulk: 1, head: 'potato', shades: true, emblem: 'none',
  },
  moves: {
    ...commonMoves({ reach: 1, power: 1, height: 0.98 }),
    resetHorde: {
      name: 'Reset Horde', anim: 'cast', startup: 14, active: 2, recovery: 26, dmg: 0, hitstun: 0, blockstun: 0, sfx: 'special',
      proj: { kind: 'zombie', frame: 14, x: 24, y: 0, vx: 1.1, w: 16, h: 34, life: 260, hits: 2, hitGap: 30, dmg: 45, hitstun: 22, blockstun: 14 },
    },
    spudToss: {
      name: 'Spud Toss', anim: 'cast', startup: 10, active: 2, recovery: 24, dmg: 0, hitstun: 0, blockstun: 0, sfx: 'special', cancel: 2,
      proj: { kind: 'spud', frame: 10, x: 20, y: 64, vx: 3.4, vy: 5, gravity: 0.25, w: 14, h: 12, life: 120, dmg: 65, level: 'overhead', hitstun: 22, blockstun: 16 },
    },
    hotfix: {
      name: 'Hotfix', anim: 'uppercut', startup: 4, active: 10, recovery: 26, dmg: 100, hitstun: 28, blockstun: 20,
      hit: { x: 4, y: 40, w: 32, h: 60 }, inv: [0, 5], launch: 8, kd: true, juggle: true, gravity: true,
      vel: [[4, 12, 1.4, 7.6]], cancel: 2, sfx: 'special',
    },
    fourDayBuild: {
      name: 'FOUR DAY BUILD', anim: 'super', isSuper: true, cost: 300, startup: 10, active: 4, recovery: 36, dmg: 0, hitstun: 0, blockstun: 0, sfx: 'super',
      proj: { kind: 'zombie', frame: 12, x: 40, y: 0, vx: 1.8, w: 18, h: 36, life: 240, hits: 2, hitGap: 12, dmg: 46, hitstun: 26, blockstun: 16, count: 4, spread: 26 },
    },
  },
  specials: [
    { motion: '623', btn: 'P', move: 'hotfix', simple: 'f' },
    { motion: '214', btn: 'P', move: 'spudToss', simple: 'b' },
    { motion: '236', btn: 'P', move: 'resetHorde', simple: 'n' },
  ],
  superMove: 'fourDayBuild',
  quotes: [
    'BUILT THIS WIN IN FOUR DAYS. ON A POTATO.',
    'THE HORDE ONLY WANTED A RESET. YOU GOT ONE.',
    '124 KILOBYTES OF PURE PAIN.',
  ],
};
