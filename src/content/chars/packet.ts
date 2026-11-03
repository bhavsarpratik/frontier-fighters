import { commonMoves } from '../common.ts';
import type { CharacterDef } from '../types.ts';

const normals = commonMoves({ reach: 1.02, power: 1.02, height: 0.98 });
normals.sLP = { ...normals.sLP, chain: true };

export const packet: CharacterDef = {
  id: 'packet',
  name: 'JEETU PACKET',
  short: 'JEETU',
  title: 'The Product Chief',
  archetype: 'Rushdown',
  inspired: 'Jeetu Patel',
  hp: 1000,
  walkF: 2.7, walkB: 2.3, jumpV: 9.4, jumpX: 3.3, gravity: 0.52, dashF: 7, dashB: 6,
  height: 88, width: 14,
  stage: 0,
  look: {
    face: { jaw: 1.0, nose: 1.05, eye: 1.0, brow: 1.1, smile: 1.25, eyeColor: '#2a1a10' },
    skin: '#c98e62', hair: '#1a1a1a', top: '#1f2f7a', top2: '#9cc4f0', pants: '#2a2d3a', shoes: '#7a4422',
    accent: '#02c8ff', hairStyle: 'side', topStyle: 'jacket', height: 0.97, bulk: 1.0,
  },
  moves: {
    ...normals,
    packetBurst: {
      name: 'Packet Burst', anim: 'cast', startup: 11, active: 2, recovery: 24, dmg: 0, hitstun: 0, blockstun: 0, cancel: 2, sfx: 'special',
      proj: { kind: 'netbeam', frame: 11, x: 30, y: 46, vx: 5.2, w: 30, h: 18, life: 120, hits: 2, hitGap: 6, dmg: 36, hitstun: 20, blockstun: 14 },
    },
    agenticRush: {
      name: 'Agentic Rush', anim: 'rush', startup: 9, active: 12, recovery: 20, dmg: 95, hitstun: 24, blockstun: 16,
      hit: { x: 6, y: 34, w: 40, h: 44 }, vel: [[6, 20, 7.5]], kd: true, launch: 4, push: 10, cancel: 2, sfx: 'special',
    },
    zeroTrust: {
      name: 'Zero Trust', anim: 'counter', startup: 4, active: 22, recovery: 18, dmg: 0, hitstun: 0, blockstun: 0,
      fx: 'counter', fxArg: 120, sfx: 'special',
    },
    agenticEra: {
      name: 'AGENTIC ERA', anim: 'super', isSuper: true, superFx: 'neural', cost: 300, startup: 10, active: 4, recovery: 40,
      dmg: 0, hitstun: 0, blockstun: 0, sfx: 'super',
      proj: { kind: 'beam', frame: 12, x: 40, y: 44, vx: 0, w: 420, h: 34, life: 46, hits: 7, hitGap: 6, dmg: 30, hitstun: 22, blockstun: 12 },
    },
  },
  specials: [
    { motion: '623', btn: 'P', move: 'zeroTrust', simple: 'b' },
    { motion: '214', btn: 'K', move: 'agenticRush', simple: 'f' },
    { motion: '236', btn: 'P', move: 'packetBurst', simple: 'n' },
  ],
  superMove: 'agenticEra',
  quotes: [
    'EVERY PRODUCT. EVERY PUNCH. SHIPPED.',
    'YOUR SECURITY POSTURE WAS TERRIBLE.',
    'THE AGENTS DID THE WORK. I JUST SMILED.',
  ],
};
