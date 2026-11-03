import { commonMoves } from '../common.ts';
import type { CharacterDef } from '../types.ts';

export const karpathink: CharacterDef = {
  id: 'karpathink',
  name: 'ANDREJ KARPATHINK',
  short: 'KARPATHINK',
  title: 'The Educator',
  archetype: 'All-rounder',
  inspired: 'Andrej Karpathy',
  hp: 1000,
  walkF: 2.6, walkB: 2.1, jumpV: 9.4, jumpX: 3.2, gravity: 0.5, dashF: 6.5, dashB: 5.5,
  height: 92, width: 14,
  stage: 1,
  look: {
    face: { jaw: 0.95, nose: 1.1, eye: 1.05, brow: 1.0, eyeColor: '#4a3020' },
    skin: '#e8b38f', hair: '#4a3326', top: '#2d3242', top2: '#e8e8e8', pants: '#3e4f73', shoes: '#dcdcdc',
    accent: '#ffffff', hairStyle: 'short', topStyle: 'tee', height: 1, bulk: 0.95, emblem: 'none',
  },
  moves: {
    ...commonMoves({ reach: 1, power: 1, height: 1 }),
    backprop: {
      name: 'Backprop Blast', anim: 'cast', startup: 12, active: 2, recovery: 28, dmg: 0, hitstun: 0, blockstun: 0,
      cancel: 2, sfx: 'special',
      proj: { kind: 'chalk', frame: 12, x: 30, y: 50, vx: 4.2, w: 24, h: 18, life: 160, dmg: 70, hitstun: 20, blockstun: 16 },
    },
    gradient: {
      name: 'Gradient Ascent', anim: 'uppercut', startup: 3, active: 10, recovery: 26, dmg: 110, hitstun: 30, blockstun: 20,
      hit: { x: 4, y: 40, w: 34, h: 62 }, inv: [0, 6], launch: 8, kd: true, juggle: true, gravity: true,
      vel: [[3, 12, 1.6, 8]], cancel: 2, sfx: 'special',
    },
    zeroToHero: {
      name: 'Zero to Hero', anim: 'kickrush', startup: 10, active: 16, recovery: 18, dmg: 40, hits: 3, hitGap: 5,
      hitstun: 18, blockstun: 14, push: 3, hit: { x: 10, y: 28, w: 44, h: 30 }, vel: [[8, 25, 5]], sfx: 'special',
    },
    fromScratch: {
      name: 'FROM SCRATCH', anim: 'super', isSuper: true, superFx: 'chalk', cost: 300, startup: 8, active: 4, recovery: 40,
      dmg: 0, hitstun: 0, blockstun: 0, sfx: 'super',
      proj: { kind: 'beam', frame: 10, x: 40, y: 18, vx: 5.5, w: 64, h: 76, life: 90, hits: 7, hitGap: 4, dmg: 42,
        hitstun: 22, blockstun: 16 },
    },
  },
  specials: [
    { motion: '236', btn: 'P', move: 'backprop', simple: 'n' },
    { motion: '623', btn: 'P', move: 'gradient', simple: 'f' },
    { motion: '214', btn: 'K', move: 'zeroToHero', simple: 'd' },
  ],
  superMove: 'fromScratch',
  quotes: [
    "LET'S BUILD IT FROM SCRATCH. IN ONE FILE.",
    'YOUR LOSS WENT DOWN. YOU WENT DOWN FURTHER.',
    'THAT WAS JUST THE WARMUP EPOCH.',
  ],
};
