import { commonMoves } from '../common.ts';
import type { CharacterDef } from '../types.ts';

export const altmind: CharacterDef = {
  id: 'altmind',
  name: 'SAM ALTMIND',
  short: 'ALTMIND',
  title: 'The Founder',
  archetype: 'Zoner',
  inspired: 'Sam Altman',
  hp: 950,
  walkF: 2.5, walkB: 2.2, jumpV: 9.4, jumpX: 3.1, gravity: 0.5, dashF: 6, dashB: 6.5,
  height: 86, width: 13,
  stage: 1,
  passive: 'rehired',
  look: {
    face: { jaw: 0.88, nose: 0.85, eye: 1.3, brow: 0.8, eyeColor: '#3a7a5a' },
    skin: '#f0c8a8', hair: '#7a5236', top: '#4f6a8f', top2: '#435b7c', pants: '#b5a585', shoes: '#e8e8e8',
    accent: '#10a37f', hairStyle: 'short', topStyle: 'sweater', height: 0.93, bulk: 0.92,
  },
  moves: {
    ...commonMoves({ reach: 0.95, power: 0.95, height: 0.94 }),
    agiOrb: {
      name: 'AGI Orb', anim: 'cast', startup: 14, active: 2, recovery: 28, dmg: 0, hitstun: 0, blockstun: 0, cancel: 2, sfx: 'special',
      proj: { kind: 'orb', frame: 14, x: 30, y: 46, vx: 1.8, w: 22, h: 22, life: 300, hits: 2, hitGap: 16, dmg: 45, hitstun: 20, blockstun: 14 },
    },
    pivot: {
      name: 'Pivot', anim: 'teleport', startup: 6, active: 1, recovery: 14, dmg: 0, hitstun: 0, blockstun: 0, inv: [0, 12],
      fx: 'teleport', fxArg: 140, sfx: 'special',
    },
    hypeCycle: {
      name: 'Hype Cycle', anim: 'uppercut', startup: 4, active: 10, recovery: 26, dmg: 95, hitstun: 28, blockstun: 20,
      hit: { x: 4, y: 38, w: 32, h: 58 }, inv: [0, 5], launch: 8, kd: true, juggle: true, gravity: true,
      vel: [[4, 12, 1.2, 7.8]], cancel: 2, sfx: 'special',
    },
    superintelligence: {
      name: 'SUPERINTELLIGENCE', anim: 'super', isSuper: true, superFx: 'cosmos', cost: 300, startup: 12, active: 4, recovery: 40, dmg: 0, hitstun: 0, blockstun: 0, sfx: 'super',
      proj: { kind: 'bigorb', frame: 12, x: 40, y: 30, vx: 2.4, w: 48, h: 48, life: 220, hits: 6, hitGap: 6, dmg: 40, hitstun: 22, blockstun: 16 },
    },
  },
  specials: [
    { motion: '623', btn: 'P', move: 'hypeCycle', simple: 'f' },
    { motion: '214', btn: 'K', move: 'pivot', simple: 'b' },
    { motion: '236', btn: 'P', move: 'agiOrb', simple: 'n' },
  ],
  superMove: 'superintelligence',
  quotes: [
    'I WAS OUT FOR THE WEEKEND. NOW I AM BACK.',
    'THIS VICTORY FEELS PRETTY CLOSE TO AGI.',
    'THE BOARD HAS REVIEWED THE FIGHT. I STAY.',
  ],
};
