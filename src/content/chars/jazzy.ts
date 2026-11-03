import { commonMoves } from '../common.ts';
import type { CharacterDef } from '../types.ts';

const normals = commonMoves({ reach: 1.04, power: 1.1, height: 1 });
normals.sHK = { ...normals.sHK, armor: 1 };

export const jazzy: CharacterDef = {
  id: 'jazzy',
  name: 'ANDY JAZZY',
  short: 'ANDY',
  title: 'Prime Mover',
  archetype: 'Heavy Rushdown',
  inspired: 'Andy Jassy',
  hp: 1100,
  walkF: 2.3, walkB: 2.0, jumpV: 9.1, jumpX: 3.0, gravity: 0.52, dashF: 6.5, dashB: 5.5,
  height: 90, width: 15,
  stage: 2,
  look: {
    face: { jaw: 1.1, nose: 1.0, eye: 0.95, brow: 1.0, smile: 1.2, eyeColor: '#3a2a1a' },
    skin: '#ecc3a0', hair: '#ecc3a0', top: '#1d2a44', top2: '#9cc4f0', pants: '#3a5a8a', shoes: '#6a4428',
    accent: '#ff9900', hairStyle: 'none', topStyle: 'jacket', height: 0.99, bulk: 1.1,
  },
  moves: {
    ...normals,
    sameDay: {
      name: 'Same-Day Delivery', anim: 'cast', startup: 13, active: 2, recovery: 24, dmg: 0, hitstun: 0, blockstun: 0, cancel: 2, sfx: 'special',
      proj: { kind: 'box', frame: 13, x: 30, y: 60, vx: 3.6, vy: 3, gravity: 0.18, w: 30, h: 30, life: 120, dmg: 80, hitstun: 22, blockstun: 16 },
    },
    primeRush: {
      name: 'Prime Rush', anim: 'rush', startup: 11, active: 12, recovery: 20, dmg: 105, hitstun: 24, blockstun: 18,
      hit: { x: 6, y: 34, w: 40, h: 44 }, vel: [[8, 22, 7]], armor: 1, kd: true, launch: 4, push: 12, sfx: 'special',
    },
    dayOne: {
      name: 'Day One Uppercut', anim: 'uppercut', startup: 4, active: 10, recovery: 26, dmg: 105, hitstun: 30, blockstun: 20,
      hit: { x: 4, y: 38, w: 34, h: 60 }, inv: [0, 5], launch: 8, kd: true, juggle: true, gravity: true,
      vel: [[4, 12, 1.4, 7.4]], cancel: 2, sfx: 'special',
    },
    twoDay: {
      name: 'PRIME DAY', anim: 'super', isSuper: true, superFx: 'boxes', cost: 300, startup: 10, active: 4, recovery: 40,
      dmg: 0, hitstun: 0, blockstun: 0, sfx: 'super',
      proj: { kind: 'box', frame: 12, x: 0, y: 190, vx: 0, vy: -3, gravity: 0.25, w: 36, h: 36, life: 100, dmg: 78, hitstun: 24, blockstun: 14,
        count: 6, spread: 28, atOpponent: true },
    },
  },
  specials: [
    { motion: '623', btn: 'P', move: 'dayOne', simple: 'f' },
    { motion: '214', btn: 'K', move: 'primeRush', simple: 'd' },
    { motion: '236', btn: 'P', move: 'sameDay', simple: 'n' },
  ],
  superMove: 'twoDay',
  quotes: [
    'YOUR DEFEAT HAS BEEN DELIVERED. PLEASE RATE YOUR EXPERIENCE.',
    'IT IS STILL DAY ONE. FOR ME. YOU ARE DONE.',
    'FREE RETURNS. NO REMATCHES.',
  ],
};
