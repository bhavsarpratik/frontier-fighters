import { commonMoves } from '../common.ts';
import type { CharacterDef } from '../types.ts';

export const hassabyss: CharacterDef = {
  id: 'hassabyss',
  name: 'DEMIS HASSABYSS',
  short: 'HASSABYSS',
  title: 'The Grandmaster',
  archetype: 'Counter / Strategist',
  inspired: 'Demis Hassabis',
  hp: 1000,
  walkF: 2.5, walkB: 2.3, jumpV: 9.4, jumpX: 3.1, gravity: 0.52, dashF: 6.5, dashB: 6,
  height: 89, width: 13,
  stage: 2,
  look: {
    face: { jaw: 0.95, nose: 1.0, eye: 1.0, brow: 1.0, smile: 0.5, eyeColor: '#2a1a12' },
    skin: '#e3bb94', hair: '#2a1e18', top: '#1f2a44', top2: '#f2f2f2', pants: '#2a3040', shoes: '#141414',
    accent: '#ffd23e', hairStyle: 'short', topStyle: 'sweater', height: 0.97, bulk: 0.9,
  },
  moves: {
    ...commonMoves({ reach: 1, power: 1, height: 0.97 }),
    move37: {
      name: 'Move 37', anim: 'rush', startup: 20, active: 6, recovery: 20, dmg: 95, hitstun: 26, blockstun: 0, level: 'unblockable',
      hit: { x: 8, y: 30, w: 40, h: 44 }, vel: [[14, 24, 6]], kd: true, launch: 4, sfx: 'special',
    },
    proteinFold: {
      name: 'Protein Fold', anim: 'grab', startup: 6, active: 3, recovery: 32, dmg: 0, hitstun: 0, blockstun: 0, sfx: 'special',
      grab: { range: 30, dmg: 170, tech: false, frames: 34, toss: 4 },
    },
    openingBook: {
      name: 'Opening Book', anim: 'counter', startup: 3, active: 22, recovery: 18, dmg: 0, hitstun: 0, blockstun: 0,
      fx: 'counter', fxArg: 130, sfx: 'special',
    },
    alphaZero: {
      name: 'ALPHA ZERO', anim: 'super', isSuper: true, cost: 300, startup: 10, active: 4, recovery: 42, dmg: 0, hitstun: 0, blockstun: 0,
      sfx: 'super', superFx: 'chess',
      proj: { kind: 'chess', frame: 12, x: 0, y: 180, vx: 0, vy: -5, gravity: 0.3, w: 28, h: 40, life: 90, dmg: 44, hitstun: 24, blockstun: 14, count: 5, spread: 30, atOpponent: true },
    },
  },
  specials: [
    { motion: '623', btn: 'P', move: 'openingBook', simple: 'b' },
    { motion: '214', btn: 'P', move: 'proteinFold', simple: 'd' },
    { motion: '236', btn: 'K', move: 'move37', simple: 'n' },
  ],
  superMove: 'alphaZero',
  quotes: [
    'I CALCULATED THIS OUTCOME FORTY MOVES AGO.',
    'MOVE 37. THEY WILL WRITE PAPERS ABOUT IT.',
    'SOLVE FIGHTING, THEN USE IT TO SOLVE EVERYTHING ELSE.',
  ],
};
