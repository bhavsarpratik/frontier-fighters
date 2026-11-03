import { commonMoves } from '../common.ts';
import type { CharacterDef } from '../types.ts';

const normals = commonMoves({ reach: 0.98, power: 0.95, height: 0.96 });
normals.sLP = { ...normals.sLP, chain: true };

export const almighty: CharacterDef = {
  id: 'almighty',
  name: 'DIOGO ALMIGHTY',
  short: 'DIOGO',
  title: 'The Type Checker',
  archetype: 'Speedster',
  inspired: 'Diogo Almeida (TypeSafe AI)',
  hp: 940,
  walkF: 2.9, walkB: 2.5, jumpV: 9.6, jumpX: 3.5, gravity: 0.54, dashF: 7.5, dashB: 6.5,
  height: 87, width: 13,
  stage: 3,
  look: {
    face: { jaw: 1.0, nose: 1.0, eye: 1.0, brow: 1.0, smile: 1.0, eyeColor: '#2a1a10' },
    skin: '#e0b48e', hair: '#2a1c14', top: '#3a3d44', top2: '#ffffff', pants: '#141414', shoes: '#f4f4f4',
    accent: '#00e0a0', hairStyle: 'messy', topStyle: 'hoodie', height: 0.96, bulk: 0.94, beard: true,
  },
  moves: {
    ...normals,
    typedDecision: {
      name: 'Typed Decision', anim: 'cast', startup: 9, active: 2, recovery: 22, dmg: 0, hitstun: 0, blockstun: 0, cancel: 2, sfx: 'special',
      proj: { kind: 'pr', frame: 9, x: 28, y: 46, vx: 6.5, w: 26, h: 16, life: 90, dmg: 55, hitstun: 18, blockstun: 12 },
    },
    calibrated: {
      name: 'Calibrated Confidence', anim: 'counter', startup: 4, active: 20, recovery: 16, dmg: 0, hitstun: 0, blockstun: 0,
      fx: 'counter', fxArg: 115, sfx: 'special',
    },
    fastThinking: {
      name: 'Fast Thinking', anim: 'kickrush', startup: 7, active: 12, recovery: 18, dmg: 80, hits: 2, hitGap: 5, hitstun: 22, blockstun: 14,
      hit: { x: 6, y: 20, w: 42, h: 40 }, vel: [[4, 18, 8]], kd: true, launch: 3, cancel: 2, sfx: 'special',
    },
    systemOne: {
      name: 'SYSTEM ONE', anim: 'superRush', isSuper: true, superFx: 'code', cost: 300, startup: 6, active: 30, recovery: 24,
      dmg: 30, hits: 10, hitGap: 3, hitstun: 20, blockstun: 12, push: 2, hit: { x: 4, y: 16, w: 52, h: 64 },
      vel: [[6, 35, 7.5]], juggle: true, sfx: 'super',
    },
  },
  specials: [
    { motion: '623', btn: 'P', move: 'calibrated', simple: 'b' },
    { motion: '214', btn: 'K', move: 'fastThinking', simple: 'f' },
    { motion: '236', btn: 'P', move: 'typedDecision', simple: 'n' },
  ],
  superMove: 'systemOne',
  quotes: [
    'DECISION: YOU LOSE. CONFIDENCE: 0.99.',
    '193 TIMES FASTER. YOU DID NOT EVEN SEE IT.',
    'NO CHATTING. JUST ANSWERS. MOSTLY PUNCHES.',
  ],
};
