import { commonMoves } from '../common.ts';
import type { CharacterDef } from '../types.ts';

const normals = commonMoves({ reach: 1.08, power: 1.15, height: 1 });
normals.sHP = { ...normals.sHP, armor: 1, startup: 9 };
normals.sHK = { ...normals.sHK, armor: 1, startup: 11 };

export const hwang: CharacterDef = {
  id: 'hwang',
  name: 'JENSEN "JACKET" HWANG',
  short: 'HWANG',
  title: 'Leather Jacket',
  archetype: 'Heavy / Armored',
  inspired: 'Jensen Huang',
  hp: 1150,
  walkF: 2.0, walkB: 1.8, jumpV: 9.0, jumpX: 2.9, gravity: 0.52, dashF: 5.5, dashB: 5,
  height: 92, width: 16,
  stage: 0,
  look: {
    face: { jaw: 1.12, nose: 1.15, eye: 0.9, brow: 1.1, smile: 1.2, lines: true },
    skin: '#e2b48e', hair: '#cfcfcf', top: '#141414', top2: '#3a3a3a', pants: '#1c1c1c', shoes: '#0e0e0e',
    accent: '#76b900', hairStyle: 'swept', topStyle: 'jacket', height: 0.99, bulk: 1.18,
  },
  moves: {
    ...normals,
    tensorCharge: {
      name: 'Tensor Core Charge', anim: 'rush', startup: 12, active: 12, recovery: 20, dmg: 110, hitstun: 24, blockstun: 18,
      hit: { x: 6, y: 34, w: 40, h: 44 }, vel: [[8, 22, 6.5]], armor: 1, kd: true, launch: 4, push: 12, sfx: 'special',
    },
    jacketSpin: {
      name: 'Jacket Spin', anim: 'spin', startup: 4, active: 16, recovery: 22, dmg: 30, hits: 4, hitGap: 4, hitstun: 22, blockstun: 14,
      hit: { x: -30, y: 34, w: 76, h: 46 }, inv: [0, 5], juggle: true, launch: 5, cancel: 2, sfx: 'special',
    },
    gpuDrop: {
      name: 'GPU Drop', anim: 'slam', startup: 16, active: 2, recovery: 22, dmg: 0, hitstun: 0, blockstun: 0, sfx: 'special',
      proj: { kind: 'gpu', frame: 16, x: 0, y: 190, vx: 0, vy: -2, gravity: 0.35, w: 28, h: 16, life: 90, dmg: 90, level: 'overhead',
        hitstun: 24, blockstun: 16, atOpponent: true },
    },
    moreYouBuy: {
      name: 'THE MORE YOU BUY', anim: 'super', isSuper: true, cost: 300, startup: 10, active: 4, recovery: 40, dmg: 0, hitstun: 0, blockstun: 0, sfx: 'super',
      proj: { kind: 'gpu', frame: 12, x: 0, y: 200, vx: 0, vy: -1, gravity: 0.3, w: 28, h: 16, life: 110, dmg: 48, hitstun: 26, blockstun: 16,
        count: 5, spread: 30, atOpponent: true },
    },
  },
  specials: [
    { motion: '623', btn: 'P', move: 'jacketSpin', simple: 'f' },
    { motion: '214', btn: 'K', move: 'gpuDrop', simple: 'd' },
    { motion: '236', btn: 'P', move: 'tensorCharge', simple: 'n' },
  ],
  superMove: 'moreYouBuy',
  quotes: [
    'THE MORE YOU BUY, THE MORE YOU LOSE. TO ME.',
    'THIS JACKET HAS SEEN THINGS. MOSTLY BENCHMARKS.',
    'YOU WERE COMPUTE-BOUND.',
  ],
};
