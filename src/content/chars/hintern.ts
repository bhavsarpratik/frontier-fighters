import { commonMoves } from '../common.ts';
import type { CharacterDef } from '../types.ts';

export const hintern: CharacterDef = {
  id: 'hintern',
  name: 'GEOFFREY HINTERN',
  short: 'HINTERN',
  title: 'The Godfather',
  archetype: 'Old Master / Zoner',
  inspired: 'Geoffrey Hinton',
  hp: 950,
  walkF: 2.2, walkB: 2.0, jumpV: 9.0, jumpX: 2.9, gravity: 0.5, dashF: 6, dashB: 6,
  height: 96, width: 13,
  stage: 0,
  look: {
    face: { jaw: 1.0, nose: 1.2, eye: 0.9, brow: 1.1, smile: 0.6, lines: true, eyeColor: '#4a5a6a' },
    skin: '#efcfb4', hair: '#ececec', top: '#7a7268', top2: '#f2f2f2', pants: '#3a3a40', shoes: '#5a3a22',
    accent: '#7ad7ff', hairStyle: 'buzz', topStyle: 'jacket', height: 1.06, bulk: 0.88,
  },
  moves: {
    ...commonMoves({ reach: 1.05, power: 0.95, height: 1.05 }),
    boltzmann: {
      name: 'Boltzmann Blizzard', anim: 'cast', startup: 14, active: 2, recovery: 28, dmg: 0, hitstun: 0, blockstun: 0, cancel: 2, sfx: 'special',
      proj: { kind: 'ice', frame: 14, x: 32, y: 34, vx: 2.4, w: 40, h: 50, life: 170, hits: 3, hitGap: 8, dmg: 30, freeze: 20, hitstun: 20, blockstun: 14 },
    },
    backpropLightning: {
      name: 'Backprop Lightning', anim: 'super', startup: 18, active: 2, recovery: 22, dmg: 0, hitstun: 0, blockstun: 0, sfx: 'special',
      proj: { kind: 'lightning', frame: 18, x: 0, y: 0, vx: 0, w: 26, h: 150, life: 22, hits: 2, hitGap: 6, dmg: 45, level: 'overhead', hitstun: 22, blockstun: 16, atOpponent: true },
    },
    capsuleKick: {
      name: 'Capsule Kick', anim: 'uppercut', startup: 4, active: 10, recovery: 26, dmg: 100, hitstun: 28, blockstun: 20,
      hit: { x: 4, y: 36, w: 34, h: 62 }, inv: [0, 5], launch: 8, kd: true, juggle: true, gravity: true,
      vel: [[4, 12, 1.4, 7.6]], cancel: 2, sfx: 'special',
    },
    deepBelief: {
      name: 'DEEP BELIEF', anim: 'super', isSuper: true, cost: 300, startup: 14, active: 4, recovery: 46, dmg: 0, hitstun: 0, blockstun: 0,
      sfx: 'super', superFx: 'neural',
      proj: { kind: 'netbeam', frame: 14, x: 190, y: 22, vx: 0, w: 330, h: 64, life: 52, hits: 8, hitGap: 5, dmg: 30, hitstun: 22, blockstun: 14 },
    },
  },
  specials: [
    { motion: '623', btn: 'K', move: 'capsuleKick', simple: 'f' },
    { motion: '214', btn: 'P', move: 'backpropLightning', simple: 'd' },
    { motion: '236', btn: 'P', move: 'boltzmann', simple: 'n' },
  ],
  superMove: 'deepBelief',
  quotes: [
    'I WARNED THEM THIS WOULD HAPPEN. NOBODY LISTENS.',
    'I HAVE BEEN DOING THIS SINCE BEFORE IT WAS COOL. TWICE.',
    'YOUR GRADIENTS VANISHED. SO DID YOU.',
  ],
};
