import { commonMoves } from '../common.ts';
import type { CharacterDef } from '../types.ts';

export const ngram: CharacterDef = {
  id: 'ngram',
  name: 'ANDREW N-GRAM',
  short: 'ANDREW',
  title: 'The Professor',
  archetype: 'All-rounder',
  inspired: 'Andrew Ng',
  hp: 1000,
  walkF: 2.6, walkB: 2.2, jumpV: 9.5, jumpX: 3.2, gravity: 0.52, dashF: 6.5, dashB: 6,
  height: 90, width: 14,
  stage: 1,
  look: {
    face: { jaw: 1.0, nose: 0.95, eye: 0.95, brow: 0.9, smile: 0.9, eyeColor: '#1e140e' },
    skin: '#e8c19a', hair: '#141414', top: '#9ec3e6', top2: '#9ec3e6', pants: '#c8b48a', shoes: '#6a4428',
    accent: '#1a73e8', hairStyle: 'side', topStyle: 'sweater', height: 0.98, bulk: 0.95, glasses: true,
  },
  moves: {
    ...commonMoves({ reach: 1, power: 1, height: 0.98 }),
    lectureSlide: {
      name: 'Lecture Slide', anim: 'cast', startup: 12, active: 2, recovery: 26, dmg: 0, hitstun: 0, blockstun: 0, cancel: 2, sfx: 'special',
      proj: { kind: 'slide', frame: 12, x: 30, y: 40, vx: 4.2, w: 32, h: 26, life: 150, dmg: 70, hitstun: 20, blockstun: 16 },
    },
    gradientDescent: {
      name: 'Gradient Descent', anim: 'jK', startup: 13, active: 14, recovery: 14, dmg: 85, hitstun: 22, blockstun: 16, level: 'overhead',
      hit: { x: 6, y: 0, w: 44, h: 40 }, kd: true, launch: 4, gravity: true,
      vel: [[0, 11, 2.2, 9], [12, 27, 6.5, -10]], sfx: 'special',
    },
    courseCorrect: {
      name: 'Course Correct', anim: 'counter', startup: 4, active: 24, recovery: 18, dmg: 0, hitstun: 0, blockstun: 0,
      fx: 'counter', fxArg: 125, sfx: 'special',
    },
    millionStudents: {
      name: 'ONE MILLION STUDENTS', anim: 'super', isSuper: true, cost: 300, startup: 10, active: 4, recovery: 40, dmg: 0, hitstun: 0, blockstun: 0,
      sfx: 'super', superFx: 'classroom',
      proj: { kind: 'students', frame: 12, x: -30, y: 0, vx: 6, w: 18, h: 40, life: 110, hits: 1, dmg: 42, hitstun: 22, blockstun: 12, launch: 3, count: 6, spread: 24 },
    },
  },
  specials: [
    { motion: '623', btn: 'P', move: 'courseCorrect', simple: 'b' },
    { motion: '214', btn: 'K', move: 'gradientDescent', simple: 'f' },
    { motion: '236', btn: 'P', move: 'lectureSlide', simple: 'n' },
  ],
  superMove: 'millionStudents',
  quotes: [
    'GREAT EFFORT. NOW LET US REVIEW WHAT WENT WRONG: EVERYTHING.',
    'THAT WAS WEEK ONE. THE COURSE HAS TEN WEEKS.',
    'AI IS THE NEW ELECTRICITY. YOU JUST GOT SHOCKED.',
  ],
};
