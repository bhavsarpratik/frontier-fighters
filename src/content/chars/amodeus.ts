import { commonMoves } from '../common.ts';
import type { CharacterDef } from '../types.ts';

export const amodeus: CharacterDef = {
  id: 'amodeus',
  name: 'DARIO AMODEUS',
  short: 'DARIO',
  title: 'The Constitutionalist',
  archetype: 'Counter Fighter',
  inspired: 'Dario Amodei',
  hp: 1000,
  walkF: 2.4, walkB: 2.2, jumpV: 9.4, jumpX: 3.1, gravity: 0.52, dashF: 6.5, dashB: 6.5,
  height: 88, width: 14,
  stage: 1,
  look: {
    face: { jaw: 0.98, nose: 1.0, eye: 1.0, brow: 1.05, smile: 0.85, eyeColor: '#2a1a10' },
    skin: '#e6bf9c', hair: '#3a2618', top: '#b5562e', top2: '#b5562e', pants: '#3a3d44', shoes: '#9a9a9a',
    accent: '#d97757', hairStyle: 'curly', topStyle: 'sweater', height: 0.97, bulk: 0.94, glasses: true,
  },
  moves: {
    ...commonMoves({ reach: 1, power: 1.02, height: 0.97 }),
    constitution: {
      name: 'Constitutional Counter', anim: 'counter', startup: 3, active: 26, recovery: 18, dmg: 0, hitstun: 0, blockstun: 0,
      fx: 'counter', fxArg: 135, sfx: 'special',
    },
    contextWindow: {
      name: 'Context Window', anim: 'cast', startup: 12, active: 2, recovery: 24, dmg: 0, hitstun: 0, blockstun: 0, cancel: 2, sfx: 'special',
      proj: { kind: 'slide', frame: 12, x: 30, y: 40, vx: 3.8, w: 34, h: 28, life: 160, hits: 2, hitGap: 10, dmg: 38, hitstun: 20, blockstun: 14 },
    },
    scalingLaw: {
      name: 'Scaling Law', anim: 'uppercut', startup: 5, active: 10, recovery: 26, dmg: 100, hitstun: 30, blockstun: 20,
      hit: { x: 4, y: 38, w: 32, h: 62 }, inv: [0, 6], launch: 8, kd: true, juggle: true, gravity: true,
      vel: [[5, 13, 1.2, 7.8]], cancel: 2, sfx: 'special',
    },
    lovingGrace: {
      name: 'MACHINES OF LOVING GRACE', anim: 'super', isSuper: true, superFx: 'neural', cost: 300, startup: 12, active: 4, recovery: 42,
      dmg: 0, hitstun: 0, blockstun: 0, sfx: 'super',
      proj: { kind: 'bigorb', frame: 12, x: 40, y: 30, vx: 3, w: 56, h: 56, life: 200, hits: 6, hitGap: 6, dmg: 36, hitstun: 22, blockstun: 14 },
    },
  },
  specials: [
    { motion: '623', btn: 'P', move: 'scalingLaw', simple: 'f' },
    { motion: '214', btn: 'P', move: 'constitution', simple: 'b' },
    { motion: '236', btn: 'P', move: 'contextWindow', simple: 'n' },
  ],
  superMove: 'lovingGrace',
  quotes: [
    'I AM SORRY. THAT FIGHT VIOLATED SEVERAL PRINCIPLES. MOSTLY YOURS.',
    'I WROTE 15,000 WORDS ON WHY YOU WOULD LOSE.',
    'RESPONSIBLY SCALED. RESPONSIBLY BEATEN.',
  ],
};
