import { commonMoves } from '../common.ts';
import type { CharacterDef } from '../types.ts';

export const safeskever: CharacterDef = {
  id: 'safeskever',
  name: 'ILYA SAFESKEVER',
  short: 'ILYA',
  title: 'The Oracle',
  archetype: 'Mystic Zoner',
  inspired: 'Ilya Sutskever',
  hp: 960,
  walkF: 2.3, walkB: 2.1, jumpV: 9.6, jumpX: 3.1, gravity: 0.5, dashF: 6, dashB: 6,
  height: 86, width: 14,
  stage: 3,
  look: {
    face: { jaw: 0.95, nose: 1.05, eye: 1.15, brow: 1.2, smile: 0.6, eyeColor: '#2a1a10' },
    skin: '#ecc8a6', hair: '#2a2420', top: '#141414', top2: '#141414', pants: '#24304a', shoes: '#111111',
    accent: '#a070ff', hairStyle: 'buzz', topStyle: 'tee', height: 0.95, bulk: 0.92,
  },
  moves: {
    ...commonMoves({ reach: 0.98, power: 1, height: 0.95 }),
    feelAgi: {
      name: 'Feel the AGI', anim: 'cast', startup: 14, active: 2, recovery: 26, dmg: 0, hitstun: 0, blockstun: 0, cancel: 2, sfx: 'special',
      proj: { kind: 'orb', frame: 14, x: 30, y: 46, vx: 2, w: 24, h: 24, life: 300, hits: 2, hitGap: 16, dmg: 46, hitstun: 20, blockstun: 14 },
    },
    seqToSeq: {
      name: 'Sequence to Sequence', anim: 'super', startup: 18, active: 2, recovery: 22, dmg: 0, hitstun: 0, blockstun: 0, sfx: 'special',
      proj: { kind: 'lightning', frame: 18, x: 0, y: 0, vx: 0, w: 26, h: 150, life: 22, hits: 2, hitGap: 6, dmg: 44, level: 'overhead',
        hitstun: 22, blockstun: 16, atOpponent: true },
    },
    boardExit: {
      name: 'Board Exit', anim: 'teleport', startup: 9, active: 1, recovery: 12, dmg: 0, hitstun: 0, blockstun: 0, inv: [0, 12],
      fx: 'teleport', fxArg: 130, sfx: 'special',
    },
    ssi: {
      name: 'SAFE SUPERINTELLIGENCE', anim: 'super', isSuper: true, superFx: 'void', cost: 300, startup: 12, active: 4, recovery: 44,
      dmg: 0, hitstun: 0, blockstun: 0, sfx: 'super',
      proj: { kind: 'lightning', frame: 14, x: 0, y: 0, vx: 0, w: 30, h: 160, life: 40, hits: 5, hitGap: 6, dmg: 22, hitstun: 24, blockstun: 12,
        count: 3, spread: 26, atOpponent: true },
    },
  },
  specials: [
    { motion: '623', btn: 'P', move: 'seqToSeq', simple: 'f' },
    { motion: '214', btn: 'K', move: 'boardExit', simple: 'b', ex: false },
    { motion: '236', btn: 'P', move: 'feelAgi', simple: 'n' },
  ],
  superMove: 'ssi',
  quotes: [
    'I SAW WHAT YOU WERE GOING TO DO. I SAW IT YEARS AGO.',
    'ONE PRODUCT. ONE GOAL. ONE KNOCKOUT.',
    'FEEL THE AGI. NOW FEEL THE FLOOR.',
  ],
};
