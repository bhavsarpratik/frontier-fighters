// Angles in degrees. Torso t: lean forward from vertical. Head h: tilt.
// Arms [upper, elbow]: upper measured from straight down, + toward facing; forearm = upper + elbow.
// Legs [thigh, knee]: thigh from straight down, + forward; shin = thigh - knee.
export interface Pose {
  t: number; h: number;
  ba: [number, number]; fa: [number, number];
  bl: [number, number]; fl: [number, number];
  dx?: number; dy?: number;
  open?: number;
}

const P = (t: number, h: number, ba: [number, number], fa: [number, number], bl: [number, number], fl: [number, number], dx = 0, dy = 0, open = 0): Pose =>
  ({ t, h, ba, fa, bl, fl, dx, dy, open });

const crouchLegs = { bl: [62, 128] as [number, number], fl: [86, 118] as [number, number] };

export const POSES: Record<string, Pose> = {
  stance: P(8, -2, [42, 96], [58, 92], [-18, 10], [22, 16]),
  stance2: P(6, 0, [38, 100], [54, 96], [-17, 14], [21, 20], 0, 1),
  walk1: P(10, -2, [40, 96], [56, 92], [-26, 8], [28, 10]),
  walk2: P(10, -2, [44, 94], [60, 90], [-6, 30], [6, 4]),
  walk3: P(10, -2, [40, 96], [56, 92], [26, 10], [-24, 8]),
  walk4: P(10, -2, [44, 94], [60, 90], [4, 4], [-6, 30]),
  crouch: P(18, 0, [46, 100], [62, 96], crouchLegs.bl, crouchLegs.fl),
  squat: P(14, 0, [30, 80], [40, 80], [50, 100], [70, 95]),
  jump: P(10, 0, [100, 50], [120, 40], [55, 120], [85, 130]),
  jumpRise: P(4, -4, [140, 20], [150, 20], [-5, 10], [10, 20]),
  fall: P(8, 0, [70, 60], [80, 60], [20, 40], [40, 50]),
  sLP0: P(10, -2, [38, 100], [70, 70], [-18, 10], [22, 16]),
  sLP: P(14, -2, [36, 104], [92, 0], [-20, 8], [24, 14], 2),
  sHP0: P(-2, 0, [20, 110], [30, 135], [-24, 6], [24, 12], -2),
  sHP: P(24, -4, [-14, 70], [96, 0], [-34, 4], [34, 12], 6),
  sLK0: P(-4, 0, [40, 96], [50, 90], [-10, 4], [50, 80]),
  sLK: P(-10, 0, [30, 90], [40, 80], [-12, 4], [82, 10]),
  sHK0: P(-12, 0, [-10, 60], [30, 70], [-14, 2], [70, 110]),
  sHK: P(-24, -4, [-26, 50], [24, 60], [-16, 0], [116, 0]),
  cLP: P(20, 0, [44, 100], [90, 0], crouchLegs.bl, crouchLegs.fl, 2),
  cHP0: P(22, 0, [40, 100], [20, 120], crouchLegs.bl, crouchLegs.fl),
  cHP: P(2, -10, [30, 80], [170, 6], [40, 80], [60, 70], 4),
  cLK: P(24, 0, [46, 100], [62, 96], [62, 128], [88, 2], 2),
  cHK0: P(28, 0, [10, 40], [30, 40], [62, 128], [70, 90]),
  cHK: P(36, 4, [8, 20], [24, 30], [72, 136], [96, 0], 4),
  jP: P(16, 4, [40, 100], [64, 0], [42, 96], [72, 104]),
  jK: P(-10, 0, [60, 90], [80, 80], [30, 112], [52, 0]),
  grab: P(16, 0, [80, 30], [86, 22], [-20, 8], [26, 14], 4, 0, 1),
  throw2: P(-26, -8, [150, 30], [170, 20], [-6, 4], [36, 12], -4, 0, 1),
  hit: P(-22, -16, [16, 30], [-8, 30], [-26, 10], [12, 12], -3),
  hitc: P(-6, -12, [30, 60], [10, 60], crouchLegs.bl, crouchLegs.fl, -2),
  block: P(-4, 4, [64, 126], [74, 122], [-22, 10], [20, 16], -1),
  cblock: P(10, 4, [66, 126], [76, 122], crouchLegs.bl, crouchLegs.fl, -1),
  air: P(-60, -20, [-40, 30], [-10, 40], [50, 40], [70, 30], -4),
  kd: P(-92, -10, [-100, 10], [-80, 20], [84, 2], [90, 6]),
  getup: P(26, 0, [60, 40], [70, 40], [60, 120], [80, 110]),
  win: P(-6, -6, [24, 50], [176, 0], [-8, 2], [8, 2], 0, 0),
  win2: P(-4, -8, [22, 50], [172, 6], [-8, 2], [8, 2], 0, -1),
  intro: P(0, 2, [42, 128], [48, 124], [-6, 2], [8, 4]),
  dash: P(26, 4, [-20, 60], [20, 70], [-34, 20], [44, 30], 2),
  bdash: P(-16, -4, [60, 100], [70, 96], [-10, 40], [10, 20], -2),
  cast0: P(-6, -2, [-34, 64], [-24, 70], [-16, 6], [24, 14], -3),
  cast: P(22, -2, [86, 4], [92, 0], [-36, 2], [42, 22], 6, 0, 1),
  uppercut0: P(18, 4, [30, 90], [20, 120], [50, 100], [70, 95]),
  uppercut: P(-6, -12, [40, 90], [168, 0], [-4, 34], [44, 64], 2),
  rush: P(32, 2, [-30, 40], [96, 0], [-40, 6], [48, 30], 6),
  kickA: P(-12, 0, [20, 70], [40, 70], [-14, 4], [96, 0], 3),
  kickB: P(-6, 0, [30, 70], [50, 70], [100, 10], [-10, 6], 3),
  counter: P(-6, 0, [30, 104], [100, 108], [-26, 12], [24, 20], -2, 0, 1),
  counterHit: P(20, -4, [-10, 60], [100, 0], [-30, 6], [36, 14], 6),
  super0: P(-10, -8, [150, 20], [154, 20], [-22, 6], [22, 6], 0, 0, 1),
  super: P(18, 0, [88, 0], [92, 0], [-34, 2], [40, 18], 6, 0, 1),
  flurryA: P(26, 0, [96, 0], [40, 100], [-36, 6], [40, 26], 5),
  flurryB: P(26, 0, [40, 100], [100, 0], [-36, 6], [40, 26], 5),
  spin: P(0, 0, [-88, 0], [92, 0], [-14, 6], [14, 6]),
  spin2: P(0, 0, [92, 0], [-88, 0], [-14, 6], [14, 6]),
  slam0: P(-16, -10, [176, 20], [172, 16], [-14, 4], [20, 12], 0, 0, 0),
  slam: P(40, 6, [70, 0], [80, 0], [-30, 4], [50, 60], 6),
  taunt: P(-4, -6, [30, 40], [110, 100], [-8, 2], [8, 2], 0, 0, 1),
  hover: P(0, -4, [60, 30], [70, 30], [10, 30], [20, 40]),
};

// Animation keyframes. For moves, frame anchors are symbolic:
// 's' = 0, 'a' = startup, 'r' = startup + active, 'e' = total. Optional offset in frames.
export type Key = [string, number, string];
export interface Anim { keys?: Key[]; cycle?: string[]; period?: number; cycleIn?: 'active' | 'all' }

export const ANIMS: Record<string, Anim> = {
  idle: { cycle: ['stance', 'stance2'], period: 26 },
  walk: { cycle: ['walk1', 'walk2', 'walk3', 'walk4'], period: 7 },
  crouch: { keys: [['s', 0, 'crouch']] },
  jump: { keys: [['s', 0, 'jumpRise'], ['s', 8, 'jump'], ['s', 28, 'fall']] },
  sLP: { keys: [['s', 0, 'sLP0'], ['a', 0, 'sLP'], ['r', 0, 'sLP'], ['e', 0, 'stance']] },
  sHP: { keys: [['s', 0, 'sHP0'], ['a', 0, 'sHP'], ['r', 2, 'sHP'], ['e', 0, 'stance']] },
  sLK: { keys: [['s', 0, 'sLK0'], ['a', 0, 'sLK'], ['r', 0, 'sLK'], ['e', 0, 'stance']] },
  sHK: { keys: [['s', 0, 'sHK0'], ['a', 0, 'sHK'], ['r', 2, 'sHK'], ['e', 0, 'stance']] },
  cLP: { keys: [['s', 0, 'crouch'], ['a', 0, 'cLP'], ['r', 0, 'cLP'], ['e', 0, 'crouch']] },
  cHP: { keys: [['s', 0, 'cHP0'], ['a', 0, 'cHP'], ['r', 2, 'cHP'], ['e', 0, 'crouch']] },
  cLK: { keys: [['s', 0, 'crouch'], ['a', 0, 'cLK'], ['r', 0, 'cLK'], ['e', 0, 'crouch']] },
  cHK: { keys: [['s', 0, 'cHK0'], ['a', 0, 'cHK'], ['r', 3, 'cHK'], ['e', 0, 'crouch']] },
  jP: { keys: [['s', 0, 'jump'], ['a', 0, 'jP'], ['e', 0, 'jP']] },
  jK: { keys: [['s', 0, 'jump'], ['a', 0, 'jK'], ['e', 0, 'jK']] },
  throw: { keys: [['s', 0, 'stance'], ['a', 0, 'grab'], ['r', 6, 'grab'], ['r', 14, 'throw2'], ['e', 0, 'stance']] },
  hit: { keys: [['s', 0, 'hit'], ['s', 10, 'hit'], ['s', 18, 'stance']] },
  hitc: { keys: [['s', 0, 'hitc']] },
  block: { keys: [['s', 0, 'block']] },
  cblock: { keys: [['s', 0, 'cblock']] },
  air: { keys: [['s', 0, 'air']] },
  kd: { keys: [['s', 0, 'kd']] },
  getup: { keys: [['s', 0, 'kd'], ['s', 8, 'getup'], ['s', 16, 'stance']] },
  ko: { keys: [['s', 0, 'kd']] },
  win: { cycle: ['win', 'win2'], period: 14 },
  intro: { keys: [['s', 0, 'intro'], ['s', 70, 'intro'], ['s', 96, 'stance']] },
  dash: { keys: [['s', 0, 'dash'], ['s', 12, 'dash'], ['s', 16, 'stance']] },
  bdash: { keys: [['s', 0, 'bdash'], ['s', 12, 'bdash'], ['s', 16, 'stance']] },
  thrown: { keys: [['s', 0, 'hit'], ['s', 12, 'air']] },
  land: { keys: [['s', 0, 'squat'], ['s', 3, 'stance']] },
  tech: { keys: [['s', 0, 'bdash'], ['s', 16, 'stance']] },
  cast: { keys: [['s', 0, 'cast0'], ['a', -2, 'cast0'], ['a', 0, 'cast'], ['r', 10, 'cast'], ['e', 0, 'stance']] },
  uppercut: { keys: [['s', 0, 'uppercut0'], ['a', 0, 'uppercut'], ['r', 8, 'uppercut'], ['e', 0, 'fall']] },
  rush: { keys: [['s', 0, 'dash'], ['a', 0, 'rush'], ['r', 0, 'rush'], ['e', 0, 'stance']] },
  kickrush: { cycle: ['kickA', 'kickB'], period: 5, cycleIn: 'active', keys: [['s', 0, 'sLK0'], ['e', 0, 'stance']] },
  counter: { keys: [['s', 0, 'stance'], ['a', 0, 'counter'], ['r', 0, 'counter'], ['e', 0, 'stance']] },
  super: { keys: [['s', 0, 'super0'], ['a', 0, 'super'], ['r', 20, 'super'], ['e', 0, 'stance']] },
  superRush: { cycle: ['flurryA', 'flurryB'], period: 3, cycleIn: 'active', keys: [['s', 0, 'super0'], ['e', 0, 'stance']] },
  spin: { cycle: ['spin', 'spin2'], period: 3, cycleIn: 'active', keys: [['s', 0, 'stance'], ['e', 0, 'stance']] },
  slam: { keys: [['s', 0, 'slam0'], ['a', 0, 'slam'], ['r', 6, 'slam'], ['e', 0, 'stance']] },
  grab: { keys: [['s', 0, 'stance'], ['a', 0, 'grab'], ['r', 10, 'grab'], ['r', 22, 'throw2'], ['e', 0, 'stance']] },
  taunt: { keys: [['s', 0, 'taunt']] },
  teleport: { keys: [['s', 0, 'squat'], ['a', 0, 'stance'], ['e', 0, 'stance']] },
  hover: { keys: [['s', 0, 'hover']] },
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const l2 = (a: [number, number], b: [number, number], t: number): [number, number] => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  return {
    t: lerp(a.t, b.t, t), h: lerp(a.h, b.h, t),
    ba: l2(a.ba, b.ba, t), fa: l2(a.fa, b.fa, t), bl: l2(a.bl, b.bl, t), fl: l2(a.fl, b.fl, t),
    dx: lerp(a.dx ?? 0, b.dx ?? 0, t), dy: lerp(a.dy ?? 0, b.dy ?? 0, t), open: t < 0.5 ? a.open : b.open,
  };
}

export interface Timing { startup: number; active: number; total: number }

function anchor(k: Key, tm: Timing): number {
  const base = k[0] === 's' ? 0 : k[0] === 'a' ? tm.startup : k[0] === 'r' ? tm.startup + tm.active : tm.total;
  return base + k[1];
}

export function samplePose(name: string, frame: number, tm?: Timing): Pose {
  const a = ANIMS[name] ?? ANIMS.idle;
  if (a.cycle && (!a.cycleIn || (tm && frame >= tm.startup && frame < tm.startup + tm.active))) {
    const per = a.period ?? 8;
    const n = a.cycle.length;
    const idx = Math.floor(frame / per);
    const t = (frame % per) / per;
    const p0 = POSES[a.cycle[idx % n]];
    const p1 = POSES[a.cycle[(idx + 1) % n]];
    return lerpPose(p0, p1, a.cycleIn ? 0 : smooth(t));
  }
  const keys = a.keys ?? [['s', 0, 'stance']];
  const timing = tm ?? { startup: 0, active: 0, total: 0 };
  let prev = keys[0];
  if (frame <= anchor(prev, timing)) return POSES[prev[2]];
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    const f0 = anchor(prev, timing);
    const f1 = anchor(k, timing);
    if (frame < f1) {
      const t = f1 > f0 ? (frame - f0) / (f1 - f0) : 1;
      return lerpPose(POSES[prev[2]], POSES[k[2]], ease(t));
    }
    prev = k;
  }
  return POSES[prev[2]];
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const ease = (t: number) => 1 - (1 - t) * (1 - t);
