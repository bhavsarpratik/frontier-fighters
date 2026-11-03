import { commonMoves } from '../common.ts';
import type { CharacterDef } from '../types.ts';

export const pitchai: CharacterDef = {
  id: 'pitchai',
  name: 'SUNDAR PITCH-AI',
  short: 'SUNDAR',
  title: 'The Search King',
  archetype: 'Zoner',
  inspired: 'Sundar Pichai',
  hp: 980,
  walkF: 2.5, walkB: 2.2, jumpV: 9.4, jumpX: 3.1, gravity: 0.52, dashF: 6.5, dashB: 6,
  height: 88, width: 14,
  stage: 2,
  look: {
    face: { jaw: 1.0, nose: 1.0, eye: 1.0, brow: 0.95, smile: 1.1, eyeColor: '#24160c' },
    skin: '#c48a5e', hair: '#1c1c1c', top: '#b9bcc2', top2: '#ffffff', pants: '#3a3f4a', shoes: '#f2f2f2',
    accent: '#4285f4', hairStyle: 'side', topStyle: 'sweater', height: 0.97, bulk: 0.96,
  },
  moves: {
    ...commonMoves({ reach: 1, power: 0.98, height: 0.97 }),
    searchBeam: {
      name: 'Search Beam', anim: 'cast', startup: 12, active: 2, recovery: 24, dmg: 0, hitstun: 0, blockstun: 0, cancel: 2, sfx: 'special',
      proj: { kind: 'netbeam', frame: 12, x: 30, y: 46, vx: 4.6, w: 30, h: 18, life: 140, hits: 2, hitGap: 8, dmg: 38, hitstun: 20, blockstun: 14 },
    },
    geminiTwins: {
      name: 'Gemini Twins', anim: 'cast', startup: 10, active: 2, recovery: 26, dmg: 0, hitstun: 0, blockstun: 0, sfx: 'special',
      proj: { kind: 'clone', frame: 10, x: 20, y: 0, vx: 5, w: 28, h: 80, life: 64, hits: 1, dmg: 48, hitstun: 22, blockstun: 14, count: 2, spread: 30 },
    },
    feelingLucky: {
      name: "I'm Feeling Lucky", anim: 'teleport', startup: 10, active: 1, recovery: 12, dmg: 0, hitstun: 0, blockstun: 0, inv: [0, 12],
      fx: 'warp-behind', sfx: 'special',
    },
    blueLinks: {
      name: 'TEN BLUE LINKS', anim: 'super', isSuper: true, superFx: 'cosmos', cost: 300, startup: 10, active: 4, recovery: 42,
      dmg: 0, hitstun: 0, blockstun: 0, sfx: 'super',
      proj: { kind: 'tiles', frame: 12, x: 0, y: 190, vx: 0, vy: -4, gravity: 0.15, w: 26, h: 20, life: 90, dmg: 52, hitstun: 22, blockstun: 12,
        count: 8, spread: 22, atOpponent: true },
    },
  },
  specials: [
    { motion: '623', btn: 'K', move: 'feelingLucky', simple: 'b', ex: false },
    { motion: '214', btn: 'P', move: 'geminiTwins', simple: 'f' },
    { motion: '236', btn: 'P', move: 'searchBeam', simple: 'n' },
  ],
  superMove: 'blueLinks',
  quotes: [
    'I SEARCHED FOR YOUR WEAKNESS. ABOUT 2,000,000 RESULTS.',
    'DID YOU MEAN: GIVE UP?',
    'THAT WAS NOT A DEFEAT. IT WAS A REORG.',
  ],
};
