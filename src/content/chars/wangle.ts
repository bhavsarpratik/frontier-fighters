import { commonMoves } from '../common.ts';
import type { CharacterDef } from '../types.ts';

export const wangle: CharacterDef = {
  id: 'wangle',
  name: 'ALEXANDR WANGLE',
  short: 'WANGLE',
  title: 'The Labeler',
  archetype: 'Zoner / Trapper',
  inspired: 'Alexandr Wang',
  hp: 1000,
  walkF: 2.6, walkB: 2.2, jumpV: 9.5, jumpX: 3.2, gravity: 0.52, dashF: 6.5, dashB: 6,
  height: 91, width: 14,
  stage: 2,
  look: {
    face: { jaw: 0.9, nose: 0.8, eye: 0.95, brow: 1.1, smile: 0.4, eyeColor: '#1a1210' },
    skin: '#e9c19c', hair: '#121212', top: '#1f2a44', top2: '#f2f2f2', pants: '#1f2a44', shoes: '#141414',
    accent: '#7b5cff', hairStyle: 'side', topStyle: 'suit', height: 0.99, bulk: 0.95,
  },
  moves: {
    ...commonMoves({ reach: 1, power: 1, height: 1 }),
    boundingBox: {
      name: 'Bounding Box', anim: 'cast', startup: 12, active: 2, recovery: 26, dmg: 0, hitstun: 0, blockstun: 0, cancel: 2, sfx: 'special',
      proj: { kind: 'box', frame: 12, x: 30, y: 6, vx: 2.6, w: 34, h: 62, life: 140, dmg: 50, freeze: 30, hitstun: 20, blockstun: 14 },
    },
    labelArmy: {
      name: 'Label Army', anim: 'cast', startup: 10, active: 2, recovery: 24, dmg: 0, hitstun: 0, blockstun: 0, sfx: 'special',
      proj: { kind: 'labeler', frame: 10, x: -10, y: 0, vx: 5.5, w: 14, h: 36, life: 120, dmg: 60, kd: true, launch: 4, level: 'low', hitstun: 20, blockstun: 14 },
    },
    scaleUp: {
      name: 'Scale Up', anim: 'uppercut', startup: 3, active: 10, recovery: 26, dmg: 105, hitstun: 30, blockstun: 20,
      hit: { x: 4, y: 40, w: 34, h: 62 }, inv: [0, 6], launch: 8, kd: true, juggle: true, gravity: true,
      vel: [[3, 12, 1.5, 8]], cancel: 2, sfx: 'special',
    },
    groundTruth: {
      name: 'GROUND TRUTH', anim: 'super', isSuper: true, superFx: 'boxes', cost: 300, startup: 8, active: 4, recovery: 40, dmg: 0, hitstun: 0, blockstun: 0, sfx: 'super',
      proj: { kind: 'box', frame: 10, x: 0, y: 150, vx: 0, vy: -3, gravity: 0.2, w: 40, h: 44, life: 90, dmg: 70, freeze: 36,
        hitstun: 24, blockstun: 16, count: 3, spread: 42, atOpponent: true },
    },
  },
  specials: [
    { motion: '623', btn: 'P', move: 'scaleUp', simple: 'f' },
    { motion: '214', btn: 'P', move: 'labelArmy', simple: 'd' },
    { motion: '236', btn: 'P', move: 'boundingBox', simple: 'n' },
  ],
  superMove: 'groundTruth',
  quotes: [
    'YOU HAVE BEEN LABELED: DEFEATED.',
    'EVERY FRAME OF THAT FIGHT IS NOW TRAINING DATA.',
    'SCALE IS ALL YOU NEED.',
  ],
};
