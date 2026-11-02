import type { Look } from '../content/types.ts';
import { hex, mix, pack, ramp, rotateHue, type Ramp } from './color.ts';
import { rasterize, type Detail, type Raster, type Shape } from './raster.ts';
import type { Pose } from './poses.ts';

export const SPR_W = 160;
export const SPR_H = 156;
export const ORIGIN_X = 80;
export const ORIGIN_Y = 146;

const rad = (d: number) => (d * Math.PI) / 180;
// Direction for an angle measured from straight down, + toward facing (x right, y down).
const dirDown = (a: number): [number, number] => [Math.sin(rad(a)), Math.cos(rad(a))];
const dirUp = (a: number): [number, number] => [Math.sin(rad(a)), -Math.cos(rad(a))];

interface Ramps {
  skin: Ramp; skinB: Ramp; hair: Ramp; top: Ramp; topB: Ramp; top2: Ramp; pants: Ramp; pantsB: Ramp;
  shoes: Ramp; shoesB: Ramp; accent: Ramp; dark: Ramp; white: Ramp; gold: Ramp; potato: Ramp;
}

const rampCache = new Map<Look, Ramps>();
function ramps(l: Look): Ramps {
  let r = rampCache.get(l);
  if (!r) {
    const gloss = l.topStyle === 'jacket' ? 0.45 : 0.28;
    r = {
      skin: ramp(l.skin), skinB: ramp(l.skin, true), hair: ramp(l.hair, false, 0.32),
      top: ramp(l.top, false, gloss), topB: ramp(l.top, true, gloss), top2: ramp(l.top2),
      pants: ramp(l.pants), pantsB: ramp(l.pants, true), shoes: ramp(l.shoes), shoesB: ramp(l.shoes, true),
      accent: ramp(l.accent), dark: ramp('#1b1724'), white: ramp('#f4f1ea'), gold: ramp('#e8b23a', false, 0.5),
      potato: ramp('#c99a5b'),
    };
    rampCache.set(l, r);
  }
  return r;
}

const HAIR: Record<string, number[]> = {
  short: [0.78, -0.42, 0.55, -0.92, 0, -1.14, -0.6, -1.0, -1.06, -0.45, -1.06, 0.3, -0.62, 0.42, -0.42, -0.1, 0.3, -0.5],
  messy: [0.86, -0.36, 0.8, -0.8, 0.5, -0.9, 0.42, -1.3, 0.1, -1.08, -0.15, -1.35, -0.42, -1.08, -0.8, -1.2, -0.9, -0.8,
    -1.12, -0.5, -1.08, 0.36, -0.6, 0.5, -0.42, -0.1, 0.3, -0.48],
  curly: [0.82, -0.4, 0.72, -0.95, 0.3, -1.22, -0.25, -1.26, -0.8, -1.08, -1.14, -0.6, -1.12, 0.2, -0.66, 0.36, -0.44, -0.1, 0.3, -0.52],
  swept: [0.7, -0.5, 0.62, -1.08, 0.05, -1.3, -0.65, -1.22, -1.18, -0.75, -1.2, 0.0, -0.95, 0.4, -0.5, 0.22, -0.4, -0.2, 0.25, -0.62],
  buzz: [0.72, -0.48, 0.5, -0.9, 0, -1.06, -0.6, -0.94, -1.0, -0.42, -1.0, 0.2, -0.6, 0.3, -0.42, -0.14, 0.25, -0.56],
  side: [0.95, -0.2, 0.92, -0.62, 0.6, -1.08, -0.1, -1.18, -0.7, -1.04, -1.1, -0.5, -1.08, 0.32, -0.62, 0.42, -0.42, -0.1, 0.4, -0.38],
};

export interface BuiltSprite extends Raster { headX: number; headY: number; handX: number; handY: number }

export function buildShapes(look: Look, pose: Pose, scale: number): { shapes: Shape[]; details: Detail[]; head: [number, number]; hand: [number, number] } {
  const R = ramps(look);
  const S = scale * look.height;
  const B = look.bulk;
  const shapes: Shape[] = [];
  const details: Detail[] = [];
  const thigh = 22 * S, shin = 21 * S, foot = 9 * S, torso = 30 * S, ua = 16 * S, fa = 15 * S;
  const headR = (look.head === 'potato' ? 11 : 8.4) * S;

  // Forward kinematics from a provisional hip at (0, 0); grounded afterwards.
  const hip: [number, number] = [(pose.dx ?? 0) * S, (pose.dy ?? 0) * S];
  const up = dirUp(pose.t);
  const at = (o: [number, number], d: [number, number], l: number): [number, number] => [o[0] + d[0] * l, o[1] + d[1] * l];
  const chest = at(hip, up, torso * 0.7);
  const neck = at(hip, up, torso);
  const sh = at(hip, up, torso * 0.86);
  const headUp = dirUp(pose.t + pose.h);
  const head = at(neck, headUp, headR * 0.95 + 1.5 * S);
  const limb = (o: [number, number], a: [number, number], l1: number, l2: number, leg: boolean) => {
    const j = at(o, dirDown(a[0]), l1);
    const second = leg ? a[0] - a[1] : a[0] + a[1];
    const e = at(j, dirDown(second), l2);
    return { j, e, second };
  };
  const bsh: [number, number] = [sh[0] - 2.5 * S, sh[1]];
  const fsh: [number, number] = [sh[0] + 2 * S, sh[1] + 0.5 * S];
  const bArm = limb(bsh, pose.ba, ua, fa, false);
  const fArm = limb(fsh, pose.fa, ua, fa, false);
  const bHip: [number, number] = [hip[0] - 3 * S, hip[1]];
  const fHip: [number, number] = [hip[0] + 3 * S, hip[1]];
  const bLeg = limb(bHip, pose.bl, thigh, shin, true);
  const fLeg = limb(fHip, pose.fl, thigh, shin, true);
  const bToe = at(bLeg.e, dirDown(bLeg.second + 90), foot);
  const fToe = at(fLeg.e, dirDown(fLeg.second + 90), foot);

  const pts = [hip, chest, neck, head, bArm.j, bArm.e, fArm.j, fArm.e, bLeg.j, bLeg.e, fLeg.j, fLeg.e, bToe, fToe];
  let maxY = -Infinity;
  for (const p of pts) maxY = Math.max(maxY, p[1]);
  maxY = Math.max(maxY + 3.5 * S, head[1] + headR, chest[1] + 11 * S * B);
  const ox = ORIGIN_X;
  const oy = ORIGIN_Y - maxY;
  const T = (p: [number, number]): [number, number] => [p[0] + ox, p[1] + oy];

  const cap = (a: [number, number], b: [number, number], ra: number, rb: number, c: Ramp, g: number, flat = false) => {
    const A = T(a), Bp = T(b);
    shapes.push({ k: 'cap', ax: A[0], ay: A[1], bx: Bp[0], by: Bp[1], ra, rb, c, g, flat });
  };
  const ell = (p: [number, number], rx: number, ry: number, c: Ramp, g: number, flat = false) => {
    const q = T(p);
    shapes.push({ k: 'ell', x: q[0], y: q[1], rx, ry, c, g, flat });
  };
  const poly = (p: number[], c: Ramp, g: number, flat = false) => {
    const out: number[] = [];
    for (let i = 0; i < p.length; i += 2) {
      const q = T([p[i], p[i + 1]]);
      out.push(q[0], q[1]);
    }
    shapes.push({ k: 'poly', pts: out, c, g, flat });
  };
  const px = (p: [number, number], c: number, w = 1, h = 1) => {
    const q = T(p);
    details.push({ x: q[0], y: q[1], w, h, c });
  };

  const longSleeve = look.topStyle !== 'tee';
  const armR = 4.3 * S * B, foreR = 3.8 * S * B, handR = 3.9 * S * B;
  const drawArm = (s0: [number, number], arm: { j: [number, number]; e: [number, number] }, back: boolean, g: number) => {
    const sk = back ? R.skinB : R.skin;
    const tp = back ? R.topB : R.top;
    cap(s0, arm.j, armR + 0.6 * S, armR, longSleeve ? tp : sk, g);
    if (!longSleeve) cap(s0, at(s0, [(arm.j[0] - s0[0]) / ua, (arm.j[1] - s0[1]) / ua], ua * 0.5), armR + 1.1 * S, armR + 0.9 * S, tp, g);
    cap(arm.j, arm.e, foreR + (longSleeve ? 0.5 * S : 0), foreR - 0.3 * S, longSleeve ? tp : sk, g);
    if (longSleeve) cap(at(arm.j, [(arm.e[0] - arm.j[0]) / fa, (arm.e[1] - arm.j[1]) / fa], fa * 0.82), arm.e, foreR + 0.7 * S, foreR + 0.7 * S, back ? R.topB : R.top2, g);
    ell(arm.e, handR, handR, sk, g);
  };
  const drawLeg = (h0: [number, number], leg: { j: [number, number]; e: [number, number] }, toe: [number, number], back: boolean, g: number) => {
    const pn = back ? R.pantsB : R.pants;
    cap(h0, leg.j, 6.4 * S * B, 5.2 * S * B, pn, g);
    cap(leg.j, leg.e, 5 * S * B, 4.2 * S * B, pn, g);
    cap(leg.e, toe, 3.8 * S, 3.2 * S, back ? R.shoesB : R.shoes, g + 50);
  };

  // back arm, back leg
  drawArm(bsh, bArm, true, 1);
  drawLeg(bHip, bLeg, bToe, true, 2);
  // hood behind head
  if (look.topStyle === 'hoodie') ell([neck[0] - 4 * S, neck[1] - 3 * S], 8 * S, 7 * S, R.topB, 3);
  // torso: pants hip, then top
  cap(hip, at(hip, up, torso * 0.2), 9 * S * B, 9 * S * B, R.pants, 4);
  cap(at(hip, up, torso * 0.18), chest, 9 * S * B, 11.2 * S * B, R.top, 5);
  ell([sh[0] - 0.5 * S, sh[1] + 1 * S], 9 * S * B, 6.5 * S * B, R.top, 5);
  // inner shirt strip for jackets/suits
  if (look.topStyle === 'jacket' || look.topStyle === 'suit') {
    const n2 = at(hip, up, torso * 0.92);
    const w0 = at(hip, up, torso * 0.25);
    const fwd: [number, number] = [Math.cos(rad(pose.t)), Math.sin(rad(pose.t))];
    const e = 8.2 * S * B;
    poly([
      n2[0] + fwd[0] * (e - 4 * S), n2[1] + fwd[1] * (e - 4 * S),
      n2[0] + fwd[0] * (e + 2 * S), n2[1] + fwd[1] * (e + 2 * S),
      w0[0] + fwd[0] * (e + 2.6 * S), w0[1] + fwd[1] * (e + 2.6 * S),
      w0[0] + fwd[0] * (e - 1 * S), w0[1] + fwd[1] * (e - 1 * S),
    ], R.top2, 6, look.topStyle === 'suit');
    if (look.topStyle === 'suit') {
      const t0 = at(n2, fwd, e + 0.6 * S);
      const t1 = at(at(hip, up, torso * 0.42), fwd, e + 1.2 * S);
      cap(t0, t1, 1.2 * S, 1.8 * S, R.accent, 7, true);
    }
  }
  if (look.topStyle === 'hoodie') {
    const a = at(hip, up, torso * 0.8);
    const fwd: [number, number] = [Math.cos(rad(pose.t)), Math.sin(rad(pose.t))];
    px(at(a, fwd, 8.5 * S * B), R.top2.base, Math.max(1, Math.round(S)), Math.max(2, Math.round(5 * S)));
    px(at(at(a, fwd, 5.5 * S * B), up, 0), R.top2.base, Math.max(1, Math.round(S)), Math.max(2, Math.round(4 * S)));
  }
  if (look.emblem && look.emblem !== 'none') {
    const fwd: [number, number] = [Math.cos(rad(pose.t)), Math.sin(rad(pose.t))];
    const c = at(at(hip, up, torso * 0.62), fwd, 3 * S * B);
    const k = Math.max(1, Math.round(S));
    const col = look.emblem === 'chip' ? R.accent.hi : look.emblem === 'box' ? R.accent.base : R.white.base;
    if (look.emblem === 'rocket') {
      px([c[0], c[1] - 3 * k], col, k, 5 * k);
      px([c[0] - k, c[1] + k], col, 3 * k, k);
      px([c[0], c[1] + 2 * k], R.accent.base, k, k);
    } else if (look.emblem === 'chip') {
      px([c[0] - 2 * k, c[1] - 2 * k], col, 4 * k, 4 * k);
      px([c[0] - k, c[1] - k], R.dark.base, 2 * k, 2 * k);
    } else {
      px([c[0] - 2 * k, c[1] - 2 * k], col, 5 * k, k);
      px([c[0] - 2 * k, c[1] + 2 * k], col, 5 * k, k);
      px([c[0] - 2 * k, c[1] - 2 * k], col, k, 5 * k);
      px([c[0] + 2 * k, c[1] - 2 * k], col, k, 5 * k);
    }
  }
  // front leg
  drawLeg(fHip, fLeg, fToe, false, 8);
  // neck + head
  cap(neck, at(neck, headUp, 4 * S), 3.4 * S, 3.4 * S, look.topStyle === 'turtleneck' ? R.top : R.skin, 9);
  if (look.topStyle === 'turtleneck') cap(neck, at(neck, headUp, 3 * S), 4.4 * S, 4.4 * S, R.top, 9);
  if (look.chain) {
    const fwd: [number, number] = [Math.cos(rad(pose.t)), Math.sin(rad(pose.t))];
    for (let i = 0; i < 4; i++) px(at(at(neck, up, -(2 + i) * S), fwd, (2 + i * 1.6) * S), R.gold.hi, Math.max(1, Math.round(S)), Math.max(1, Math.round(S)));
  }
  const hx = head[0], hy = head[1];
  const hr = headR;
  const fwdH: [number, number] = [Math.cos(rad(pose.t + pose.h)), Math.sin(rad(pose.t + pose.h))];
  const dn: [number, number] = [-headUp[0], -headUp[1]];
  const H = (u: number, v: number): [number, number] => [hx + fwdH[0] * u * hr + dn[0] * v * hr, hy + fwdH[1] * u * hr + dn[1] * v * hr];
  const k = Math.max(1, Math.round(S));
  if (look.head === 'potato') {
    ell([hx, hy], hr * 1.08, hr * 1.2, R.potato, 10);
    for (const [u, v] of [[-0.5, -0.5], [0.1, 0.7], [-0.7, 0.4], [0.35, -0.75]]) px(H(u, v), R.potato.lo, k, k);
    // sprout
    cap(H(-0.1, -1.15), H(0.2, -1.55), 1 * S, 1.6 * S, ramp('#6fbf4a'), 11);
  } else {
    ell([hx, hy], hr * 0.94, hr * 1.06, R.skin, 10);
    ell(H(0.92, 0.12), hr * 0.2, hr * 0.17, R.skin, 10);
    const jaw = H(0.38, 0.7);
    ell(jaw, hr * 0.62, hr * 0.42, R.skin, 10);
    const hs = look.hairStyle;
    if (hs !== 'none' && HAIR[hs]) {
      const p = HAIR[hs];
      const q: number[] = [];
      for (let i = 0; i < p.length; i += 2) {
        const w = H(p[i], p[i + 1]);
        q.push(w[0], w[1]);
      }
      poly(q, R.hair, 11);
      if (hs === 'curly') {
        for (const [u, v] of [[0.55, -0.95], [0.1, -1.2], [-0.4, -1.18], [-0.85, -0.9], [-1.08, -0.35]]) ell(H(u, v), hr * 0.3, hr * 0.28, R.hair, 11);
      }
    }
    if (look.beard) {
      const b = [H(-0.25, 0.2), H(-0.15, 0.82), H(0.35, 1.12), H(0.85, 0.85), H(1.0, 0.4), H(0.7, 0.45), H(0.3, 0.55)].flat();
      poly(b, R.hair, 12);
    }
    ell(H(-0.18, 0.05), hr * 0.2, hr * 0.26, R.skin, 13);
  }
  // face details
  const eye = look.head === 'potato' ? H(0.5, -0.05) : H(0.5, -0.02);
  const ink = pack(mix(hex(look.skin), [20, 10, 30], 0.85));
  if (look.visor) {
    const vr = ramp(look.visor, false, 0.6);
    const a = H(0.05, -0.28), b = H(1.02, 0.12);
    cap(a, [b[0], a[1] + (b[1] - a[1]) * 0.2], 2.2 * S, 2.6 * S, vr, 14, true);
    px([eye[0], eye[1] - 0.5 * S], vr.hi, 2 * k, k);
  } else if (look.shades) {
    const a = H(0.1, -0.15);
    cap(a, H(1.0, -0.12), 1.9 * S, 2.3 * S, R.dark, 14, true);
    px([eye[0] + k, eye[1] - k], pack([120, 200, 255]), k, k);
  } else {
    px([eye[0], eye[1] - k], ink, k, 2 * k);
    if (look.head !== 'potato') px([eye[0] - k, eye[1] - 3 * k], R.hair.lo, 3 * k, k);
    if (look.glasses) {
      const gc = pack([30, 30, 36]);
      px([eye[0] - 2 * k, eye[1] - 3 * k], gc, 5 * k, k);
      px([eye[0] - 2 * k, eye[1] + 1 * k], gc, 5 * k, k);
      px([eye[0] - 2 * k, eye[1] - 3 * k], gc, k, 4 * k);
      px([eye[0] + 2 * k, eye[1] - 3 * k], gc, k, 4 * k);
      const tmp = H(-0.2, -0.1);
      px([tmp[0], tmp[1]], gc, Math.max(1, Math.round(eye[0] - tmp[0] - 2 * k)), k);
    }
  }
  if (look.head !== 'potato') {
    const m = H(0.62, 0.58);
    px(m, look.beard ? R.hair.line : R.skin.line, 2 * k, k);
  } else {
    const m = H(0.6, 0.45);
    px(m, R.potato.line, 3 * k, k);
  }
  // front arm last
  drawArm(fsh, fArm, false, 15);
  if (look.accent === '#ffffff' && look.topStyle === 'tee') px([fArm.e[0] + 1 * S, fArm.e[1] - 3 * S], R.white.hi, 2 * k, k);
  return { shapes, details, head: T(head), hand: T(fArm.e) };
}

const cache = new Map<string, BuiltSprite>();
const MAX_CACHE = 700;

export function spriteFor(key: string, look: Look, pose: Pose, scale = 1, w = SPR_W, h = SPR_H): BuiltSprite {
  let s = cache.get(key);
  if (s) {
    cache.delete(key);
    cache.set(key, s);
    return s;
  }
  const b = buildShapes(look, pose, scale);
  const r = rasterize(b.shapes, b.details, w, h);
  s = { ...r, headX: b.head[0], headY: b.head[1], handX: b.hand[0], handY: b.hand[1] };
  cache.set(key, s);
  if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value!);
  return s;
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
