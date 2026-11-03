import { commonMoves } from '../common.ts';
import type { CharacterDef } from '../types.ts';

export const mirage: CharacterDef = {
  id: 'mirage',
  name: 'MIRA MIRAGE',
  short: 'MIRAGE',
  title: 'The Phantom',
  archetype: 'Speed / Trickster',
  inspired: 'Mira Murati',
  hp: 920,
  walkF: 3.2, walkB: 2.6, jumpV: 10, jumpX: 3.6, gravity: 0.54, dashF: 8, dashB: 7,
  height: 88, width: 13,
  stage: 3,
  look: {
    face: { jaw: 0.9, nose: 0.9, eye: 1.1, brow: 1.0, smile: 0.3, eyeColor: '#3a2416' },
    skin: '#e6bf9c', hair: '#3a2418', top: '#141418', top2: '#141418', pants: '#22222a', shoes: '#141414',
    accent: '#c0c0d0', hairStyle: 'side', topStyle: 'turtleneck', height: 0.96, bulk: 0.86,
  },
  moves: {
    ...commonMoves({ reach: 0.95, power: 0.92, height: 0.96 }),
    mirageClones: {
      name: 'Mirage Clones', anim: 'rush', startup: 10, active: 2, recovery: 22, dmg: 0, hitstun: 0, blockstun: 0, cancel: 2, sfx: 'special',
      proj: { kind: 'clone', frame: 10, x: 20, y: 0, vx: 5.5, w: 28, h: 80, life: 60, hits: 1, dmg: 45, hitstun: 22, blockstun: 14, count: 2, spread: 34 },
    },
    phantomStep: {
      name: 'Phantom Step', anim: 'teleport', startup: 7, active: 1, recovery: 10, dmg: 0, hitstun: 0, blockstun: 0, inv: [0, 10],
      fx: 'warp-behind', sfx: 'special',
    },
    phantomRise: {
      name: 'Phantom Rise', anim: 'uppercut', startup: 3, active: 10, recovery: 24, dmg: 90, hitstun: 28, blockstun: 20,
      hit: { x: 4, y: 38, w: 32, h: 60 }, inv: [0, 5], launch: 8, kd: true, juggle: true, gravity: true,
      vel: [[3, 12, 1.6, 8]], cancel: 2, sfx: 'special',
    },
    soraStorm: {
      name: 'SORA STORM', anim: 'super', isSuper: true, cost: 300, startup: 10, active: 4, recovery: 42, dmg: 0, hitstun: 0, blockstun: 0,
      sfx: 'super', superFx: 'film',
      proj: { kind: 'portal', frame: 12, x: 0, y: 170, vx: 0, vy: -4, gravity: 0.25, w: 40, h: 34, life: 90, dmg: 42, hitstun: 24, blockstun: 14, count: 5, spread: 34, atOpponent: true },
    },
  },
  specials: [
    { motion: '623', btn: 'K', move: 'phantomRise', simple: 'f' },
    { motion: '214', btn: 'K', move: 'phantomStep', simple: 'b' },
    { motion: '236', btn: 'P', move: 'mirageClones', simple: 'n' },
  ],
  superMove: 'soraStorm',
  quotes: [
    'YOU HIT A MIRAGE. I WAS NEVER THERE.',
    'I SHIP. QUIETLY. THEN YOU LOSE.',
    'THAT FIGHT WAS RENDERED IN SIXTY FRAMES PER SECOND.',
  ],
};
