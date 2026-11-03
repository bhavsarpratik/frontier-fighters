import { commonMoves } from '../common.ts';
import type { CharacterDef } from '../types.ts';

const normals = commonMoves({ reach: 1.05, power: 1.1, height: 0.96 });
normals.sHK = { ...normals.sHK, armor: 1 };

export const zen: CharacterDef = {
  id: 'zen',
  name: 'LISA ZEN',
  short: 'ZEN',
  title: 'Core Count',
  archetype: 'Heavy Hitter',
  inspired: 'Lisa Su',
  hp: 1080,
  walkF: 2.3, walkB: 2.0, jumpV: 9.2, jumpX: 3.0, gravity: 0.52, dashF: 6, dashB: 5.5,
  height: 86, width: 14,
  stage: 0,
  look: {
    face: { jaw: 0.95, nose: 0.9, eye: 1.0, brow: 1.0, smile: 0.8, eyeColor: '#1e140e' },
    skin: '#e9c6a4', hair: '#141414', top: '#d8232a', top2: '#141414', pants: '#141414', shoes: '#141414',
    accent: '#ff6a00', hairStyle: 'buzz', topStyle: 'jacket', height: 0.94, bulk: 0.95, glasses: true,
  },
  moves: {
    ...normals,
    chipletSaw: {
      name: 'Chiplet Saw', anim: 'cast', startup: 11, active: 2, recovery: 24, dmg: 0, hitstun: 0, blockstun: 0, cancel: 2, sfx: 'special',
      proj: { kind: 'chip', frame: 11, x: 28, y: 44, vx: 4, w: 26, h: 26, life: 140, hits: 4, hitGap: 4, dmg: 22, hitstun: 18, blockstun: 12 },
    },
    overclock: {
      name: 'Overclock', anim: 'taunt', startup: 18, active: 1, recovery: 10, dmg: 0, hitstun: 0, blockstun: 0,
      fx: 'buff', fxArg: 480, sfx: 'special',
    },
    coreUppercut: {
      name: 'Core Uppercut', anim: 'uppercut', startup: 4, active: 10, recovery: 26, dmg: 110, hitstun: 30, blockstun: 20,
      hit: { x: 4, y: 38, w: 34, h: 62 }, inv: [0, 5], launch: 8, kd: true, juggle: true, gravity: true, armor: 1,
      vel: [[4, 12, 1.4, 7.6]], cancel: 2, sfx: 'special',
    },
    meltdown: {
      name: 'ZEN CORE MELTDOWN', anim: 'super', isSuper: true, cost: 300, startup: 10, active: 4, recovery: 40, dmg: 0, hitstun: 0, blockstun: 0,
      sfx: 'super', superFx: 'heat',
      proj: { kind: 'fire', frame: 10, x: 60, y: 0, vx: 2.2, w: 150, h: 110, life: 64, hits: 7, hitGap: 6, dmg: 32, hitstun: 24, blockstun: 14 },
    },
  },
  specials: [
    { motion: '623', btn: 'P', move: 'coreUppercut', simple: 'f' },
    { motion: '214', btn: 'K', move: 'overclock', simple: 'd', ex: false },
    { motion: '236', btn: 'P', move: 'chipletSaw', simple: 'n' },
  ],
  superMove: 'meltdown',
  quotes: [
    'MORE CORES. MORE HITS. FEWER EXCUSES.',
    'I DID NOT COME HERE TO BE SECOND SOURCE.',
    'YOUR THERMALS COULD NOT HANDLE THAT.',
  ],
};
