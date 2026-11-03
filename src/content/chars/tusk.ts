import { commonMoves } from '../common.ts';
import type { CharacterDef } from '../types.ts';

export const tusk: CharacterDef = {
  id: 'tusk',
  name: 'ELAN TUSK',
  short: 'TUSK',
  title: 'Full Send',
  archetype: 'Charge',
  inspired: 'Elon Musk',
  hp: 1000,
  walkF: 2.4, walkB: 2.2, jumpV: 9.6, jumpX: 3.2, gravity: 0.52, dashF: 6.5, dashB: 6,
  height: 96, width: 14,
  stage: 1,
  look: {
    face: { jaw: 1.28, nose: 1.1, eye: 0.85, brow: 1.25, eyeColor: '#4a6a8a' },
    skin: '#efc8a8', hair: '#3a2a22', top: '#121212', top2: '#121212', pants: '#22252c', shoes: '#222222',
    accent: '#c03040', hairStyle: 'short', topStyle: 'tee', height: 1.07, bulk: 1.05, emblem: 'rocket',
  },
  moves: {
    ...commonMoves({ reach: 1.05, power: 1, height: 1.06 }),
    rocketDash: {
      name: 'Rocket Dash', anim: 'rush', startup: 6, active: 14, recovery: 18, dmg: 100, hitstun: 24, blockstun: 16,
      hit: { x: 8, y: 36, w: 40, h: 40 }, vel: [[4, 20, 9]], kd: true, launch: 4, push: 10, cancel: 2, sfx: 'special',
    },
    starshipFlip: {
      name: 'Starship Flip', anim: 'uppercut', startup: 3, active: 11, recovery: 26, dmg: 110, hitstun: 30, blockstun: 20,
      hit: { x: 2, y: 40, w: 34, h: 64 }, inv: [0, 6], launch: 9, kd: true, juggle: true, gravity: true,
      vel: [[3, 12, 1.2, 8.6]], cancel: 2, sfx: 'special',
    },
    hardcore: {
      name: 'Hardcore Mode', anim: 'taunt', startup: 20, active: 1, recovery: 10, dmg: 0, hitstun: 0, blockstun: 0,
      fx: 'buff', fxArg: 600, sfx: 'special',
    },
    fullSend: {
      name: 'FULL SEND', anim: 'super', isSuper: true, superFx: 'space', cost: 300, startup: 8, active: 4, recovery: 36, dmg: 0, hitstun: 0, blockstun: 0, sfx: 'super',
      proj: { kind: 'rocket', frame: 8, x: 20, y: 50, vx: 7, w: 30, h: 16, life: 90, hits: 5, hitGap: 3, dmg: 50, hitstun: 22, blockstun: 14, launch: 6 },
    },
  },
  specials: [
    { motion: '[2]8', btn: 'K', move: 'starshipFlip', simple: 'f' },
    { motion: '[4]6', btn: 'P', move: 'rocketDash', simple: 'n' },
    { motion: '214', btn: 'K', move: 'hardcore', simple: 'd', ex: false },
  ],
  superMove: 'fullSend',
  quotes: [
    'RAPID UNSCHEDULED DISASSEMBLY. YOURS.',
    'WE WILL BE ON MARS BY NEXT ROUND. PROBABLY.',
    'HARDCORE MODE IS THE ONLY MODE.',
  ],
};
