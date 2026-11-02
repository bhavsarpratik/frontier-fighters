import type { Look } from '../content/types.ts';
import { hex, mix, pack, ramp, rotateHue, type Ramp, type RGB } from './color.ts';
import { type Detail, type Raster, type Shape } from './raster.ts';
import { renderToon } from './toon.ts';
import type { Pose } from './poses.ts';

// Logical sprite frame (in 1x pixels). Sprites are rasterized at `res` times this size.
export const SPR_W = 170;
export const SPR_H = 170;
export const ORIGIN_X = 85;
export const ORIGIN_Y = 160;
export const RES = 2;

const rad = (d: number) => (d * Math.PI) / 180;
const dirDown = (a: number): [number, number] => [Math.sin(rad(a)), Math.cos(rad(a))];
const dirUp = (a: number): [number, number] => [Math.sin(rad(a)), -Math.cos(rad(a))];
type V = [number, number];

interface Ramps {
  skin: Ramp; skinB: Ramp; hair: Ramp; top: Ramp; topB: Ramp; top2: Ramp; pants: Ramp; pantsB: Ramp;
  shoes: Ramp; shoesB: Ramp; sole: Ramp; accent: Ramp; dark: Ramp; white: Ramp; gold: Ramp; potato: Ramp; lip: Ramp;
}

const rampCache = new Map<Look, Ramps>();
function ramps(l: Look): Ramps {
  let r = rampCache.get(l);
  if (!r) {
    const jacket = l.topStyle === 'jacket';
    const gloss = jacket ? 0.42 : 0.26;
    const shoeLum = hex(l.shoes).reduce((a, b) => a + b, 0);
    r = {
      skin: ramp(l.skin, false, 0.3, true), skinB: ramp(l.skin, true),
      hair: ramp(l.hair, false, 0.34, true),
      top: ramp(l.top, false, gloss, jacket), topB: ramp(l.top, true, gloss),
      top2: ramp(l.top2), pants: ramp(l.pants), pantsB: ramp(l.pants, true),
      shoes: ramp(l.shoes, false, 0.35, true), shoesB: ramp(l.shoes, true),
      sole: ramp(shoeLum > 500 ? '#9a9aa8' : '#ececf2'),
      accent: ramp(l.accent, false, 0.4, true), dark: ramp('#1b1724'), white: ramp('#f4f1ea'),
      gold: ramp('#e8b23a', false, 0.5, true), potato: ramp('#c99a5b', false, 0.3, true),
      lip: ramp(rgbHex(mix(hex(l.skin), [150, 60, 60], 0.35))),
    };
    rampCache.set(l, r);
  }
  return r;
}

function rgbHex(c: RGB): string {
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

// Hair outlines in head units: u forward, v down.
const HAIR: Record<string, number[]> = {
  short: [0.8, -0.4, 0.62, -0.92, 0.1, -1.16, -0.55, -1.06, -1.04, -0.55, -1.08, 0.25, -0.66, 0.4, -0.42, -0.1, 0.32, -0.48],
  messy: [0.88, -0.34, 0.86, -0.82, 0.55, -0.92, 0.5, -1.34, 0.15, -1.1, -0.1, -1.4, -0.4, -1.1, -0.82, -1.24, -0.92, -0.82,
    -1.14, -0.5, -1.1, 0.36, -0.62, 0.5, -0.44, -0.1, 0.3, -0.46],
  curly: [0.84, -0.4, 0.74, -0.96, 0.3, -1.24, -0.25, -1.28, -0.82, -1.1, -1.16, -0.6, -1.14, 0.2, -0.68, 0.36, -0.44, -0.1, 0.3, -0.5],
  swept: [0.74, -0.5, 0.7, -1.08, 0.2, -1.32, -0.55, -1.28, -1.16, -0.86, -1.22, -0.1, -0.98, 0.34, -0.52, 0.2, -0.42, -0.22, 0.26, -0.6],
  buzz: [0.74, -0.48, 0.52, -0.92, 0, -1.06, -0.6, -0.94, -1.0, -0.42, -1.0, 0.2, -0.6, 0.3, -0.42, -0.14, 0.25, -0.56],
  side: [1.0, -0.18, 0.98, -0.62, 0.66, -1.1, -0.06, -1.2, -0.72, -1.06, -1.12, -0.5, -1.1, 0.32, -0.64, 0.42, -0.42, -0.1, 0.44, -0.36],
};
const HAIR_STREAKS: Record<string, [number, number, number, number][]> = {
  short: [[0.3, -0.95, -0.5, -0.9], [0.5, -0.75, -0.2, -1.0]],
  messy: [[0.4, -1.05, -0.3, -1.05], [0.6, -0.8, 0, -1.2]],
  curly: [[0.4, -1.05, -0.6, -0.95]],
  swept: [[0.55, -0.95, -0.85, -1.05], [0.5, -0.75, -0.95, -0.75], [0.3, -1.15, -0.6, -1.15]],
  buzz: [],
  side: [[0.8, -0.6, -0.4, -1.05], [0.6, -0.9, -0.7, -0.85]],
};

export interface Built { shapes: Shape[]; details: Detail[]; head: V; hand: V }

export function buildShapes(look: Look, pose: Pose, res: number, ox: number, oy: number): Built {
  const R = ramps(look);
  const S = res * look.height;
  const B = look.bulk;
  const shapes: Shape[] = [];
  const details: Detail[] = [];
  const thigh = 22 * S, shin = 21 * S, foot = 11 * S, torso = 30 * S, ua = 16 * S, fa = 15 * S;
  const headR = (look.head === 'potato' ? 12.5 : 9.6) * S;
  const u = Math.max(1, Math.round(res / 2));

  const hip: V = [(pose.dx ?? 0) * S, (pose.dy ?? 0) * S];
  const up = dirUp(pose.t);
  const fwd: V = [Math.cos(rad(pose.t)), Math.sin(rad(pose.t))];
  const at = (o: V, d: V, l: number): V => [o[0] + d[0] * l, o[1] + d[1] * l];
  const chest = at(hip, up, torso * 0.68);
  const neck = at(hip, up, torso);
  const sh = at(hip, up, torso * 0.86);
  const headUp = dirUp(pose.t + pose.h);
  const head = at(neck, headUp, headR * 0.92 + 2 * S);
  const limb = (o: V, a: [number, number], l1: number, l2: number, leg: boolean) => {
    const j = at(o, dirDown(a[0]), l1);
    const second = leg ? a[0] - a[1] : a[0] + a[1];
    const e = at(j, dirDown(second), l2);
    return { j, e, second };
  };
  const bsh: V = [sh[0] - 4 * S * B, sh[1] + 0.5 * S];
  const fsh: V = [sh[0] + 3 * S * B, sh[1] + 1 * S];
  const bArm = limb(bsh, pose.ba, ua, fa, false);
  const fArm = limb(fsh, pose.fa, ua, fa, false);
  const bHip: V = [hip[0] - 3.5 * S, hip[1]];
  const fHip: V = [hip[0] + 3.5 * S, hip[1]];
  const bLeg = limb(bHip, pose.bl, thigh, shin, true);
  const fLeg = limb(fHip, pose.fl, thigh, shin, true);
  const toeOf = (leg: { e: V; second: number }) => at(leg.e, dirDown(leg.second + 90), foot);
  const bToe = toeOf(bLeg);
  const fToe = toeOf(fLeg);

  const pts = [hip, chest, neck, head, bArm.j, bArm.e, fArm.j, fArm.e, bLeg.j, bLeg.e, fLeg.j, fLeg.e, bToe, fToe];
  let maxY = -Infinity;
  for (const p of pts) maxY = Math.max(maxY, p[1]);
  maxY = Math.max(maxY + 5 * S, head[1] + headR, chest[1] + 13 * S * B);
  const offX = ox;
  const offY = oy - maxY;
  const T = (p: V): V => [p[0] + offX, p[1] + offY];

  const cap = (a: V, b: V, ra: number, rb: number, c: Ramp, g: number, flat = false) => {
    const A = T(a), Bp = T(b);
    shapes.push({ k: 'cap', ax: A[0], ay: A[1], bx: Bp[0], by: Bp[1], ra, rb, c, g, flat });
  };
  const ell = (p: V, rx: number, ry: number, c: Ramp, g: number, flat = false) => {
    const q = T(p);
    shapes.push({ k: 'ell', x: q[0], y: q[1], rx, ry, c, g, flat });
  };
  const poly = (p: V[], c: Ramp, g: number, flat = false) => {
    const out: number[] = [];
    for (const v of p) { const q = T(v); out.push(q[0], q[1]); }
    shapes.push({ k: 'poly', pts: out, c, g, flat });
  };
  const px = (p: V, c: number, w = u, h = u) => {
    const q = T(p);
    details.push({ x: q[0], y: q[1], w, h, c });
  };
  const line = (a: V, b: V, c: number, thick = u) => {
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / u);
    for (let i = 0; i <= n; i++) px([a[0] + ((b[0] - a[0]) * i) / Math.max(1, n), a[1] + ((b[1] - a[1]) * i) / Math.max(1, n)], c, thick, thick);
  };
  const along = (a: V, b: V, t: number): V => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  const longSleeve = look.topStyle !== 'tee';
  const drawArm = (s0: V, arm: { j: V; e: V; second: number }, back: boolean, g: number) => {
    const sk = back ? R.skinB : R.skin;
    const tp = back ? R.topB : R.top;
    // deltoid
    ell(s0, 5.6 * S * B, 5.9 * S * B, tp, g);
    cap(s0, arm.j, 5.0 * S * B, 4.1 * S * B, longSleeve ? tp : sk, g);
    if (!longSleeve) cap(s0, along(s0, arm.j, 0.5), 5.8 * S * B, 5.3 * S * B, tp, g);
    cap(arm.j, arm.e, 4.5 * S * B, 3.5 * S * B, longSleeve ? tp : sk, g);
    if (longSleeve) cap(along(arm.j, arm.e, 0.82), arm.e, 4.3 * S * B, 4.1 * S * B, back ? R.topB : look.topStyle === 'suit' ? R.top2 : R.top, g);
    const fist: V = at(arm.e, dirDown(arm.second), 2.2 * S);
    ell(fist, 4.9 * S * B, 4.4 * S * B, sk, g);
    if (!back) {
      const kn = at(fist, dirDown(arm.second), 2.6 * S * B);
      const side: V = [Math.cos(rad(arm.second)), -Math.sin(rad(arm.second))];
      line(at(kn, side, -2.5 * S), at(kn, side, 2.5 * S), sk.lo2);
    }
    return fist;
  };
  const drawLeg = (h0: V, leg: { j: V; e: V; second: number }, toe: V, back: boolean, g: number) => {
    const pn = back ? R.pantsB : R.pants;
    cap(h0, leg.j, 7.2 * S * B, 5.7 * S * B, pn, g);
    cap(leg.j, leg.e, 5.6 * S * B, 4.3 * S * B, pn, g);
    // shoe: sole below, body above
    const heel = at(leg.e, dirDown(leg.second - 90), 1.6 * S);
    const down = dirDown(leg.second);
    cap(at(heel, down, 2.3 * S), at(toe, down, 2.1 * S), 2.6 * S, 2.4 * S, R.sole, g + 50, true);
    cap(heel, toe, 4.0 * S, 3.4 * S, back ? R.shoesB : R.shoes, g + 51);
    if (!back) {
      const mid = along(heel, toe, 0.55);
      px(at(mid, down, -3.4 * S), R.shoes.hi2, 2 * u, u);
      px(at(along(heel, toe, 0.7), down, -3.2 * S), R.shoes.hi2, 2 * u, u);
    }
    if (!back) line(at(leg.j, [-down[1], down[0]], 0), at(leg.j, down, 3 * S), pn.lo2);
  };

  // ---- back layer ----
  drawArm(bsh, bArm, true, 1);
  drawLeg(bHip, bLeg, bToe, true, 2);
  if (look.topStyle === 'hoodie') ell(at(neck, fwd, -5 * S), 9.5 * S, 8 * S, R.topB, 3);

  // ---- torso ----
  cap(hip, at(hip, up, torso * 0.22), 10.4 * S * B, 10.4 * S * B, R.pants, 4);
  const waistTop = at(hip, up, torso * 0.2);
  cap(waistTop, chest, 10.2 * S * B, 13.4 * S * B, R.top, 5);
  ell(at(sh, fwd, -0.5 * S), 11.5 * S * B, 7.5 * S * B, R.top, 5);
  // belt line (or jacket hem)
  const beltY = at(hip, up, torso * 0.22);
  if (look.topStyle === 'jacket' || look.topStyle === 'suit') {
    cap(hip, beltY, 10.9 * S * B, 10.6 * S * B, R.top, 5);
  } else {
    line(at(beltY, fwd, -9 * S * B), at(beltY, fwd, 10 * S * B), R.pants.lo2, u * 2);
    px(at(beltY, fwd, 8 * S * B), R.gold.hi, 2 * u, 2 * u);
  }
  // front edge of torso, used for collars, zips, emblems
  const front = (t: number, inset: number) => at(at(hip, up, torso * t), fwd, (10.2 + (13.4 - 10.2) * Math.min(1, t / 0.68)) * S * B - inset * S);
  if (look.topStyle === 'jacket' || look.topStyle === 'suit') {
    const n2 = front(0.94, 5.5), w0 = front(0.24, 0.5);
    poly([n2, at(n2, fwd, 6 * S), at(w0, fwd, 1.5 * S), at(w0, fwd, -4 * S)], R.top2, 6, look.topStyle === 'suit');
    // lapels
    line(at(n2, fwd, -1 * S), front(0.55, 4), R.top.lo2, u);
    line(front(0.9, 1), front(0.6, 3.5), R.top.hi2, u);
    if (look.topStyle === 'suit') cap(at(n2, fwd, 2.5 * S), front(0.42, 1.5), 1.4 * S, 2.1 * S, R.accent, 7, true);
    else line(front(0.88, 2.2), front(0.24, 0.8), R.top.hi2, u);
  }
  if (look.topStyle === 'hoodie') {
    const a = front(0.8, 1.5);
    line(a, at(a, up, -7 * S), R.top2.base, u);
    const b = front(0.8, 4.5);
    line(b, at(b, up, -5.5 * S), R.top2.base, u);
    line(front(0.36, 1), front(0.36, 9), R.top.lo2, u);
  }
  if (look.topStyle === 'tee' || look.topStyle === 'sweater') {
    line(front(0.98, 4), front(0.9, 1.2), R.top.lo2, u);
    line(front(0.3, 1), front(0.3, 6), R.top.lo, u);
  }
  if (look.emblem && look.emblem !== 'none') {
    const c = front(0.62, 5);
    const k = 1.2 * S;
    const col = look.emblem === 'chip' ? R.accent.hi : look.emblem === 'box' ? R.accent.base : R.white.base;
    if (look.emblem === 'rocket') {
      px([c[0], c[1] - 3 * k], R.accent.hi, k, k);
      px([c[0], c[1] - 2 * k], col, k, 4 * k);
      px([c[0] - k, c[1] + k], col, 3 * k, k);
      px([c[0], c[1] + 2 * k], pack([255, 176, 0]), k, k);
    } else if (look.emblem === 'chip') {
      px([c[0] - 2 * k, c[1] - 2 * k], col, 4 * k, 4 * k);
      px([c[0] - k, c[1] - k], R.dark.base, 2 * k, 2 * k);
    } else {
      px([c[0] - 2 * k, c[1] - 2 * k], col, 5 * k, k);
      px([c[0] - 2 * k, c[1] + 2 * k], col, 5 * k, k);
    }
  }

  // ---- front leg ----
  drawLeg(fHip, fLeg, fToe, false, 8);

  // ---- neck + head ----
  const nTop = at(neck, headUp, 5 * S);
  cap(neck, nTop, 4.6 * S, 4.4 * S, look.topStyle === 'turtleneck' ? R.top : R.skin, 9);
  if (look.topStyle === 'turtleneck') cap(neck, at(neck, headUp, 3.5 * S), 5.6 * S, 5.4 * S, R.top, 9);
  if (look.chain) {
    for (let i = 0; i < 6; i++) px(at(at(neck, up, -(1.5 + i) * S), fwd, (1.5 + i * 1.5) * S), i % 2 ? R.gold.hi2 : R.gold.base, 2 * u, 2 * u);
  }
  const hx = head[0], hy = head[1], hr = headR;
  const fwdH: V = [Math.cos(rad(pose.t + pose.h)), Math.sin(rad(pose.t + pose.h))];
  const dn: V = [-headUp[0], -headUp[1]];
  const H = (a: number, b: number): V => [hx + fwdH[0] * a * hr + dn[0] * b * hr, hy + fwdH[1] * a * hr + dn[1] * b * hr];
  const ink = pack(mix(hex(look.skin), [20, 10, 30], 0.88));
  if (look.head === 'potato') {
    ell([hx, hy], hr * 1.06, hr * 1.18, R.potato, 10);
    for (const [a, b] of [[-0.5, -0.5], [0.1, 0.7], [-0.7, 0.4], [0.35, -0.75], [-0.2, 0.15]]) {
      px(H(a, b), R.potato.lo2, 2 * u, 2 * u);
      px(H(a + 0.08, b + 0.06), R.potato.hi, u, u);
    }
    cap(H(-0.05, -1.12), H(0.25, -1.6), 1.4 * S, 2.2 * S, ramp('#6fbf4a', false, 0.4, true), 11);
    ell(H(0.38, -1.52), 2.6 * S, 1.4 * S, ramp('#7fd95a', false, 0.4), 11);
  } else {
    // 3/4 profile facing forward: forehead, brow, nose, lips, chin, jaw, skull
    const PROFILE = [0.55, -0.95, 0.84, -0.6, 0.94, -0.26, 0.96, -0.06, 1.16, 0.18, 1.12, 0.26, 0.98, 0.3, 1.0, 0.44,
      0.94, 0.52, 0.97, 0.62, 0.9, 0.82, 0.7, 0.98, 0.3, 1.0, -0.1, 0.86, -0.5, 0.62, -0.92, 0.2, -0.96, -0.3, -0.62, -0.88, 0.0, -1.08];
    const prof: V[] = [];
    for (let k = 0; k < PROFILE.length; k += 2) prof.push(H(PROFILE[k], PROFILE[k + 1]));
    poly(prof, R.skin, 10);
    const hs = look.hairStyle;
    if (hs !== 'none' && HAIR[hs]) {
      const p = HAIR[hs];
      const q: V[] = [];
      for (let i = 0; i < p.length; i += 2) q.push(H(p[i], p[i + 1]));
      poly(q, R.hair, 11);
      if (hs === 'curly') {
        for (const [a, b] of [[0.55, -0.96], [0.12, -1.22], [-0.38, -1.2], [-0.84, -0.92], [-1.1, -0.36], [0.2, -0.8], [-0.4, -0.7]]) ell(H(a, b), hr * 0.3, hr * 0.28, R.hair, 11);
      }
    }
    if (look.beard) {
      poly([H(-0.25, 0.2), H(-0.15, 0.84), H(0.35, 1.14), H(0.88, 0.88), H(1.02, 0.42), H(0.72, 0.48), H(0.3, 0.58)], R.hair, 12);
    }
    // ear on top of hair
    ell(H(-0.2, 0.06), hr * 0.2, hr * 0.27, R.skin, 13);
    px(H(-0.22, 0.02), R.skin.lo2, u, 2 * u);
    for (const [x0, y0, x1, y1] of HAIR_STREAKS[hs] ?? []) line(H(x0, y0), H(x1, y1), R.hair.hi2, u);
    // cheekbone + jaw shading
    line(H(0.15, 0.78), H(0.6, 0.94), R.skin.lo, u);
    line(H(0.4, 0.2), H(0.62, 0.28), R.skin.lo, u);
  }
  const eye = look.head === 'potato' ? H(0.5, -0.05) : H(0.52, -0.02);
  if (look.visor) {
    const vr = ramp(look.visor, false, 0.6, true);
    cap(H(0.02, -0.26), H(1.05, -0.12), 2.6 * S, 3 * S, vr, 14);
    line(H(0.2, -0.32), H(0.95, -0.24), vr.hi2, u);
  } else if (look.shades) {
    cap(H(0.08, -0.15), H(1.02, -0.12), 2.3 * S, 2.7 * S, R.dark, 14);
    px(H(0.7, -0.24), pack([150, 220, 255]), 2 * u, u);
    px(H(0.9, -0.2), pack([150, 220, 255]), u, u);
  } else {
    // sclera, iris, brow
    px([eye[0] - u, eye[1] - 2 * u], R.white.base, 3 * u, 3 * u);
    px([eye[0], eye[1] - 2 * u], ink, 2 * u, 3 * u);
    px([eye[0] + u, eye[1] - 2 * u], R.white.hi, u, u);
    line(H(0.28, -0.36), H(0.78, -0.34), look.head === 'potato' ? R.potato.lo2 : R.hair.lo, 2 * u);
    if (look.glasses) {
      const gc = pack([30, 30, 36]);
      line([eye[0] - 3 * u, eye[1] - 4 * u], [eye[0] + 4 * u, eye[1] - 4 * u], gc);
      line([eye[0] - 3 * u, eye[1] + 2 * u], [eye[0] + 4 * u, eye[1] + 2 * u], gc);
      line(H(-0.2, -0.1), [eye[0] - 3 * u, eye[1] - 2 * u], gc);
    }
  }
  if (look.head !== 'potato') {
    // nose shading and mouth with lip tone
    line(H(0.98, 0.28), H(1.08, 0.26), R.skin.lo2, u);
    line(H(0.74, 0.5), H(0.95, 0.5), look.beard ? R.hair.line : R.lip.lo2, u);
    if (!look.beard) line(H(0.8, 0.56), H(0.92, 0.56), R.lip.base, u);
  } else {
    line(H(0.45, 0.42), H(0.82, 0.36), R.potato.line, u);
  }

  // ---- front arm last ----
  const fist = drawArm(fsh, fArm, false, 15);
  if (look.accent === '#ffffff' && look.topStyle === 'tee') px([fist[0] + 2 * S, fist[1] - 3 * S], R.white.hi2, 3 * u, 2 * u);
  return { shapes, details, head: T(head), hand: T(fist) };
}

export interface Sprite extends Raster { res: number; ox: number; oy: number; headX: number; headY: number }

const cache = new Map<string, Sprite>();
const MAX_CACHE = 600;

export function spriteFor(key: string, look: Look, pose: Pose, res = RES, rim?: RGB): Sprite {
  const k = `${key}|${res}|${rim ?? ''}`;
  let s = cache.get(k);
  if (s) {
    cache.delete(k);
    cache.set(k, s);
    return s;
  }
  const ox = Math.round(ORIGIN_X * res);
  const oy = Math.round(ORIGIN_Y * res);
  const r = renderToon(look, pose, res, Math.round(SPR_W * res), Math.round(SPR_H * res), ox, oy, rim);
  s = { canvas: r.canvas, w: r.w, h: r.h, x0: r.x0, y0: r.y0, res, ox, oy, headX: r.head[0], headY: r.head[1] };
  cache.set(k, s);
  if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value!);
  return s;
}

// Draw a sprite with its feet origin at logical (x, y). `scale` is the logical size multiplier.
export function drawSprite(ctx: CanvasRenderingContext2D, s: Sprite, x: number, y: number, flip: boolean, scale = 1): void {
  const k = scale / s.res;
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(s.canvas as CanvasImageSource, (s.x0 - s.ox) * k, (s.y0 - s.oy) * k, s.w * k, s.h * k);
  ctx.restore();
}

export function poseKey(p: Pose): string {
  const r = (v: number) => Math.round(v);
  return `${r(p.t)},${r(p.h)},${r(p.ba[0])},${r(p.ba[1])},${r(p.fa[0])},${r(p.fa[1])},${r(p.bl[0])},${r(p.bl[1])},${r(p.fl[0])},${r(p.fl[1])},${r(p.dx ?? 0)},${r(p.dy ?? 0)}`;
}

const altCache = new Map<Look, Look>();
export function altLook(l: Look): Look {
  let a = altCache.get(l);
  if (!a) {
    a = l.palette2
      ? { ...l, ...l.palette2 }
      : { ...l, top: rotateHue(l.top, 160), pants: rotateHue(l.pants, 140), top2: rotateHue(l.top2, 160), accent: rotateHue(l.accent, 160) };
    altCache.set(l, a);
  }
  return a;
}
