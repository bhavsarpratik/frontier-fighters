import { commonMoves } from '../common.ts';
import type { CharacterDef } from '../types.ts';

const normals = commonMoves({ reach: 1, power: 1.08, height: 1 });
normals.throw = { ...normals.throw, grab: { ...normals.throw.grab!, dmg: 150, range: 40 } };

export const zuckerbot: CharacterDef = {
  id: 'zuckerbot',
  name: 'MARK ZUCKERBOT',
  short: 'ZUCKERBOT',
  title: 'The Grappler',
  archetype: 'Grappler',
  inspired: 'Mark Zuckerberg',
  hp: 1100,
  walkF: 2.3, walkB: 2.0, jumpV: 9.2, jumpX: 3.0, gravity: 0.52, dashF: 6.5, dashB: 5.5,
  height: 88, width: 15,
  stage: 0,
  look: {
    face: { jaw: 1.05, nose: 1.0, eye: 1.2, brow: 0.9, eyeColor: '#5a7aa0' },
    skin: '#f6dccb', hair: '#4a3528', top: '#8b9099', top2: '#8b9099', pants: '#3b4252', shoes: '#f0f0f0',
    accent: '#e8b23a', hairStyle: 'curly', topStyle: 'tee', height: 0.96, bulk: 1.14, chain: true,
  },
  moves: {
    ...normals,
    takedown: {
      name: 'Jiu-Jitsu Takedown', anim: 'grab', startup: 5, active: 3, recovery: 34, dmg: 0, hitstun: 0, blockstun: 0, sfx: 'special',
      grab: { range: 32, dmg: 190, tech: false, frames: 36, toss: 3 },
    },
    metaWarp: {
      name: 'Metaverse Warp', anim: 'teleport', startup: 10, active: 1, recovery: 12, dmg: 0, hitstun: 0, blockstun: 0, inv: [0, 12],
      fx: 'warp-behind', sfx: 'special',
    },
    pivotElbow: {
      name: 'Pivot Elbow', anim: 'uppercut', startup: 4, active: 9, recovery: 26, dmg: 105, hitstun: 28, blockstun: 20,
      hit: { x: 4, y: 40, w: 32, h: 56 }, inv: [0, 5], launch: 7, kd: true, juggle: true, gravity: true,
      vel: [[4, 11, 1.4, 7]], cancel: 2, sfx: 'special',
    },
    metaLock: {
      name: 'META LOCK', anim: 'grab', isSuper: true, cost: 300, startup: 4, active: 4, recovery: 40, dmg: 0, hitstun: 0, blockstun: 0, sfx: 'super',
      grab: { range: 44, dmg: 380, tech: false, frames: 60, toss: 6 },
    },
  },
  specials: [
    { motion: '623', btn: 'P', move: 'pivotElbow', simple: 'f' },
    { motion: '214', btn: 'P', move: 'takedown', simple: 'n' },
    { motion: '236', btn: 'K', move: 'metaWarp', simple: 'd' },
  ],
  superMove: 'metaLock',
  quotes: [
    'TAPPED OUT. LIKE YOUR ENGAGEMENT METRICS.',
    'I TRAIN BRAZILIAN JIU-JITSU. AND ALSO LLAMAS.',
    'SUNSCREEN ON. OPPONENT OFF.',
  ],
};
