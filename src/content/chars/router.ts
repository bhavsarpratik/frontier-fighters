import { commonMoves } from '../common.ts';
import type { CharacterDef } from '../types.ts';

const normals = commonMoves({ reach: 1.06, power: 1.12, height: 1.02 });
normals.sHP = { ...normals.sHP, armor: 1, startup: 9 };
normals.throw = { ...normals.throw, grab: { ...normals.throw.grab!, dmg: 140, range: 40 } };

export const router: CharacterDef = {
  id: 'router',
  name: 'CHUCK ROUTER',
  short: 'CHUCK',
  title: 'The Chairman',
  archetype: 'Heavy Grappler',
  inspired: 'Chuck Robbins',
  hp: 1120,
  walkF: 2.1, walkB: 1.9, jumpV: 9.0, jumpX: 2.9, gravity: 0.52, dashF: 6, dashB: 5.5,
  height: 94, width: 16,
  stage: 1,
  look: {
    face: { jaw: 1.12, nose: 1.0, eye: 0.95, brow: 1.0, smile: 1.2, lines: true, eyeColor: '#3a5a7a' },
    skin: '#efc7a8', hair: '#bfbfbf', top: '#3c3f46', top2: '#f4f4f4', pants: '#34363c', shoes: '#111111',
    accent: '#0a60ff', hairStyle: 'side', topStyle: 'suit', height: 1.02, bulk: 1.14,
  },
  moves: {
    ...normals,
    firewall: {
      name: 'Firewall', anim: 'slam', startup: 14, active: 2, recovery: 24, dmg: 0, hitstun: 0, blockstun: 0, cancel: 2, sfx: 'special',
      proj: { kind: 'wave', frame: 14, x: 26, y: 0, vx: 3.8, w: 30, h: 30, life: 120, dmg: 75, level: 'low', hitstun: 22, blockstun: 16 },
    },
    routerSlam: {
      name: 'Router Slam', anim: 'grab', startup: 6, active: 3, recovery: 34, dmg: 0, hitstun: 0, blockstun: 0, sfx: 'special',
      grab: { range: 34, dmg: 200, tech: false, frames: 36, toss: 4 },
    },
    southernUpper: {
      name: 'Southern Uppercut', anim: 'uppercut', startup: 5, active: 9, recovery: 26, dmg: 110, hitstun: 28, blockstun: 20,
      hit: { x: 4, y: 40, w: 32, h: 58 }, inv: [0, 5], launch: 7, kd: true, juggle: true, gravity: true, armor: 1,
      vel: [[5, 12, 1.3, 7]], cancel: 2, sfx: 'special',
    },
    acquisition: {
      name: 'HOSTILE ACQUISITION', anim: 'grab', isSuper: true, superFx: 'boxes', cost: 300, startup: 12, active: 4, recovery: 40,
      dmg: 0, hitstun: 0, blockstun: 0, sfx: 'super',
      vel: [[1, 12, 9]],
      grab: { range: 46, dmg: 370, tech: false, frames: 60, toss: 6 },
    },
  },
  specials: [
    { motion: '623', btn: 'P', move: 'southernUpper', simple: 'f' },
    { motion: '214', btn: 'P', move: 'routerSlam', simple: 'b' },
    { motion: '236', btn: 'K', move: 'firewall', simple: 'n' },
  ],
  superMove: 'acquisition',
  quotes: [
    "I'VE SEEN BETTER UPTIME FROM A DIAL-UP MODEM.",
    'BLESS YOUR HEART. NOW STAY DOWN.',
    'ALL YOUR TRAFFIC ROUTES THROUGH ME.',
  ],
};
