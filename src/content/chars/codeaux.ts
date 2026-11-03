import { commonMoves } from '../common.ts';
import type { CharacterDef } from '../types.ts';

export const codeaux: CharacterDef = {
  id: 'codeaux',
  name: 'THIBAULT CODEAUX',
  short: 'THIBAULT',
  title: 'The Codex',
  archetype: 'Rushdown',
  inspired: 'Thibault "Tibo" Sottiaux',
  hp: 950,
  walkF: 3.1, walkB: 2.4, jumpV: 9.8, jumpX: 3.6, gravity: 0.54, dashF: 7.5, dashB: 6,
  height: 88, width: 13,
  stage: 3,
  look: {
    face: { jaw: 1.05, nose: 1.0, eye: 1.0, brow: 1.2 },
    skin: '#e6b08c', hair: '#2a1d17', top: '#16181d', top2: '#34d399', pants: '#25272d', shoes: '#f0f0f0',
    accent: '#34d399', hairStyle: 'messy', topStyle: 'hoodie', height: 0.97, bulk: 0.95, beard: true, visor: '#34d399',
  },
  moves: {
    ...commonMoves({ reach: 0.95, power: 0.95, height: 0.97 }),
    cloudDash: {
      name: 'Cloud Dash', anim: 'rush', startup: 8, active: 10, recovery: 16, dmg: 90, hitstun: 22, blockstun: 16,
      hit: { x: 8, y: 36, w: 40, h: 36 }, vel: [[4, 17, 8]], kd: true, launch: 4, cancel: 2, push: 10, sfx: 'special',
    },
    rateLimit: {
      name: 'Rate-Limit Reset', anim: 'counter', startup: 4, active: 26, recovery: 16, dmg: 0, hitstun: 0, blockstun: 0,
      fx: 'counter', fxArg: 120, sfx: 'special',
    },
    prSwarm: {
      name: 'PR Swarm', anim: 'uppercut', startup: 4, active: 12, recovery: 24, dmg: 35, hits: 3, hitGap: 4,
      hitstun: 24, blockstun: 16, hit: { x: 6, y: 40, w: 36, h: 60 }, inv: [0, 4], gravity: true,
      vel: [[4, 14, 1.2, 7]], juggle: true, launch: 6, cancel: 2, sfx: 'special',
    },
    mergeConflict: {
      name: 'MERGE CONFLICT', anim: 'superRush', isSuper: true, superFx: 'code', cost: 300, startup: 6, active: 30, recovery: 24,
      dmg: 32, hits: 9, hitGap: 3, hitstun: 20, blockstun: 14, push: 2, hit: { x: 4, y: 16, w: 52, h: 64 },
      vel: [[6, 35, 7]], juggle: true, sfx: 'super',
    },
  },
  specials: [
    { motion: '623', btn: 'P', move: 'prSwarm', simple: 'f' },
    { motion: '236', btn: 'K', move: 'cloudDash', simple: 'n' },
    { motion: '214', btn: 'P', move: 'rateLimit', simple: 'd' },
  ],
  superMove: 'mergeConflict',
  quotes: [
    'RATE LIMITS RESET. FOR ME, NOT YOU.',
    'SHIPPED FORTY PRS WHILE YOU WERE BLOCKING.',
    'YOUR CONTEXT WINDOW JUST CLOSED.',
  ],
};
