import { commonMoves } from '../common.ts';
import type { CharacterDef } from '../types.ts';

export const feifei: CharacterDef = {
  id: 'feifei',
  name: 'FEI-FEI PIXEL',
  short: 'PIXEL',
  title: 'The Visionary',
  archetype: 'Zoner',
  inspired: 'Fei-Fei Li',
  hp: 980,
  walkF: 2.6, walkB: 2.3, jumpV: 9.6, jumpX: 3.2, gravity: 0.52, dashF: 6.5, dashB: 6.5,
  height: 86, width: 13,
  stage: 2,
  look: {
    face: { jaw: 0.9, nose: 0.85, eye: 1.15, brow: 0.9, smile: 0.5, eyeColor: '#2a1a12' },
    skin: '#e9c4a0', hair: '#141414', top: '#f2f2f2', top2: '#1aa8a0', pants: '#2a2f3a', shoes: '#f2f2f2',
    accent: '#1aa8a0', hairStyle: 'side', topStyle: 'jacket', height: 0.94, bulk: 0.88,
  },
  moves: {
    ...commonMoves({ reach: 0.95, power: 0.95, height: 0.94 }),
    imagenet: {
      name: 'ImageNet Barrage', anim: 'cast', startup: 12, active: 2, recovery: 26, dmg: 0, hitstun: 0, blockstun: 0, cancel: 2, sfx: 'special',
      proj: { kind: 'tiles', frame: 12, x: 30, y: 36, vx: 3.6, w: 34, h: 44, life: 150, hits: 3, hitGap: 6, dmg: 30, hitstun: 20, blockstun: 14 },
    },
    spatialWarp: {
      name: 'Spatial Warp', anim: 'teleport', startup: 9, active: 1, recovery: 12, dmg: 0, hitstun: 0, blockstun: 0, inv: [0, 12],
      fx: 'warp-behind', sfx: 'special',
    },
    pixelRise: {
      name: 'Pixel Rise', anim: 'uppercut', startup: 4, active: 10, recovery: 26, dmg: 95, hitstun: 28, blockstun: 20,
      hit: { x: 4, y: 38, w: 32, h: 60 }, inv: [0, 5], launch: 8, kd: true, juggle: true, gravity: true,
      vel: [[4, 12, 1.2, 7.8]], cancel: 2, sfx: 'special',
    },
    worldModel: {
      name: 'WORLD MODEL', anim: 'super', isSuper: true, cost: 300, startup: 10, active: 4, recovery: 44, dmg: 0, hitstun: 0, blockstun: 0,
      sfx: 'super', superFx: 'wireframe',
      proj: { kind: 'wireframe', frame: 12, x: 0, y: 0, vx: 0, w: 90, h: 120, life: 54, hits: 8, hitGap: 5, dmg: 32, hitstun: 24, blockstun: 14, atOpponent: true },
    },
  },
  specials: [
    { motion: '623', btn: 'P', move: 'pixelRise', simple: 'f' },
    { motion: '214', btn: 'K', move: 'spatialWarp', simple: 'b' },
    { motion: '236', btn: 'P', move: 'imagenet', simple: 'n' },
  ],
  superMove: 'worldModel',
  quotes: [
    'I HAVE SEEN FOURTEEN MILLION FIGHTS. YOURS WAS LABELED "LOSS".',
    'SPATIAL INTELLIGENCE SAYS: YOU ARE ON THE FLOOR.',
    'EVERY PIXEL OF THAT WIN WAS EARNED.',
  ],
};
