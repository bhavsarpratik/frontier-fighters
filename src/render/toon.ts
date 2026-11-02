// Vector "toon" fighter renderer: every body part is a sculpted bezier shape with a bold ink
// outline, a cel shadow and a highlight on the lit side, plus an optional stage rim light.
// Driven by the same skeleton/poses as the sim animations; output is cached per pose.
import type { Look } from '../content/types.ts';
import { hex, mix, type RGB } from './color.ts';
import type { Pose } from './poses.ts';

type V = [number, number];
type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

const rad = (d: number) => (d * Math.PI) / 180;
const dirDown = (a: number): V => [Math.sin(rad(a)), Math.cos(rad(a))];
const dirUp = (a: number): V => [Math.sin(rad(a)), -Math.cos(rad(a))];
const add = (a: V, b: V, k = 1): V => [a[0] + b[0] * k, a[1] + b[1] * k];
const lerpV = (a: V, b: V, t: number): V => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const LIGHT: V = [0.55, -0.83];
const SHADOW_RGB: RGB = [38, 22, 74];
const LIGHT_RGB: RGB = [255, 246, 226];
const INK = '#140a20';

const css = (c: RGB) => `rgb(${c[0]},${c[1]},${c[2]})`;

interface Mat { base: string; shade: string; deep: string; light: string; shine: string; rgb: RGB }

function mat(h: string, back = false, gloss = 0.3): Mat {
  let b = hex(h);
  if (back) b = mix(b, SHADOW_RGB, 0.24);
  return {
    base: css(b),
    shade: css(mix(b, SHADOW_RGB, 0.36)),
    deep: css(mix(b, SHADOW_RGB, 0.6)),
    light: css(mix(b, LIGHT_RGB, gloss)),
    shine: css(mix(b, LIGHT_RGB, Math.min(0.9, gloss + 0.45))),
    rgb: b,
  };
}

export interface Face { jaw: number; nose: number; eye: number; brow: number; smile: number; lines: boolean; eyeColor: string }
const DEFAULT_FACE: Face = { jaw: 1, nose: 1, eye: 1, brow: 1, smile: 0, lines: false, eyeColor: '#3a2618' };

export interface ToonOut { canvas: OffscreenCanvas | HTMLCanvasElement; w: number; h: number; x0: number; y0: number; head: V }

function makeCanvas(w: number, h: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function renderToon(look: Look, pose: Pose, res: number, w: number, h: number, ox: number, oy: number, rim?: RGB, crop = true): ToonOut {
  // Paint the body into a layer, then composite: a continuous ink silhouette (layer stamped
  // around in a ring) under the layer itself. Internal lines stay thin.
  const layer = makeCanvas(w, h);
  const lctx = layer.getContext('2d') as Ctx;
  lctx.lineJoin = 'round';
  lctx.lineCap = 'round';
  const head = paint(lctx, look, pose, res, ox, oy, rim);
  const sil = makeCanvas(w, h);
  const sctx = sil.getContext('2d') as Ctx;
  sctx.drawImage(layer as CanvasImageSource, 0, 0);
  sctx.globalCompositeOperation = 'source-in';
  sctx.fillStyle = INK;
  sctx.fillRect(0, 0, w, h);
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d') as Ctx;
  const o = Math.max(1, 1.15 * res);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    ctx.drawImage(sil as CanvasImageSource, Math.cos(a) * o, Math.sin(a) * o);
  }
  ctx.drawImage(layer as CanvasImageSource, 0, 0);
  if (!crop) return { canvas, w, h, x0: 0, y0: 0, head };
  const data = ctx.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    for (let x = 0; x < w; x++) {
      if (data[row + x * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return { canvas: makeCanvas(1, 1), w: 1, h: 1, x0: 0, y0: 0, head };
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  const out = makeCanvas(cw, ch);
  (out.getContext('2d') as Ctx).drawImage(canvas as CanvasImageSource, -x0, -y0);
  return { canvas: out, w: cw, h: ch, x0, y0, head };
}

function paint(ctx: Ctx, look: Look, pose: Pose, res: number, ox: number, oy: number, rim?: RGB): V {
  const S = res * look.height;
  const B = look.bulk;
  const face: Face = { ...DEFAULT_FACE, ...look.face };
  const ink = Math.max(1.2, 1.25 * res);
  const potato = look.head === 'potato';

  const M = {
    skin: mat(look.skin, false, 0.32), skinB: mat(look.skin, true, 0.25),
    hair: mat(look.hair, false, 0.38), top: mat(look.top, false, look.topStyle === 'jacket' ? 0.5 : 0.28),
    topB: mat(look.top, true, 0.25), top2: mat(look.top2), pants: mat(look.pants), pantsB: mat(look.pants, true),
    shoes: mat(look.shoes, false, 0.4), shoesB: mat(look.shoes, true, 0.3), accent: mat(look.accent, false, 0.45),
    potato: mat('#c99a5b', false, 0.35), white: mat('#f6f2ea'), gold: mat('#e8b23a', false, 0.55), dark: mat('#1c1826', false, 0.35),
  };
  const shoeLum = hex(look.shoes).reduce((a, b) => a + b, 0);
  const sole = mat(shoeLum > 500 ? '#8c8c9c' : '#f2f2f6');

  // ---------- skeleton ----------
  const thigh = 22 * S, shin = 21 * S, foot = 13 * S, torsoL = 30 * S, ua = 16 * S, fa = 15 * S;
  const hr = (potato ? 12.5 : 10) * S;
  const hip0: V = [(pose.dx ?? 0) * S, (pose.dy ?? 0) * S];
  const up = dirUp(pose.t);
  const fwd: V = [Math.cos(rad(pose.t)), Math.sin(rad(pose.t))];
  const at = (o: V, d: V, l: number): V => [o[0] + d[0] * l, o[1] + d[1] * l];
  const chest = at(hip0, up, torsoL * 0.66);
  const neck = at(hip0, up, torsoL);
  const sh = at(hip0, up, torsoL * 0.86);
  const headUp = dirUp(pose.t + pose.h);
  const headFwd: V = [Math.cos(rad(pose.t + pose.h)), Math.sin(rad(pose.t + pose.h))];
  const headC = at(neck, headUp, hr * 0.86 + 1.2 * S);
  const limb = (o: V, a: [number, number], l1: number, l2: number, leg: boolean) => {
    const j = at(o, dirDown(a[0]), l1);
    const second = leg ? a[0] - a[1] : a[0] + a[1];
    const e = at(j, dirDown(second), l2);
    return { o, j, e, a1: a[0], a2: second };
  };
  const bsh: V = add(sh, fwd, -6.2 * S * B);
  const fsh: V = add(add(sh, fwd, 4.6 * S * B), up, -0.8 * S);
  const bArm = limb(bsh, pose.ba, ua, fa, false);
  const fArm = limb(fsh, pose.fa, ua, fa, false);
  const bHip = add(hip0, fwd, -3.6 * S);
  const fHip = add(hip0, fwd, 3.6 * S);
  const bLeg = limb(bHip, pose.bl, thigh, shin, true);
  const fLeg = limb(fHip, pose.fl, thigh, shin, true);
  const toe = (l: { e: V; a2: number }) => at(l.e, dirDown(l.a2 + 90), foot);
  const bToe = toe(bLeg);
  const fToe = toe(fLeg);
  let maxY = -Infinity;
  for (const p of [hip0, chest, neck, headC, bArm.e, fArm.e, bLeg.e, fLeg.e, bToe, fToe, bLeg.j, fLeg.j]) maxY = Math.max(maxY, p[1]);
  maxY = Math.max(maxY + 5.5 * S, headC[1] + hr, chest[1] + 13 * S * B);
  ctx.translate(ox, oy - maxY);

  // ---------- painting helpers ----------
  const part = (path: () => void, m: Mat, opt: { outline?: boolean; shade?: number; hl?: number; gloss?: boolean; rimW?: number } = {}) => {
    const size = opt.shade ?? 2.4 * S;
    ctx.save();
    path();
    ctx.fillStyle = m.shade;
    ctx.fill();
    ctx.clip();
    ctx.save();
    ctx.translate(LIGHT[0] * size, LIGHT[1] * size);
    path();
    ctx.fillStyle = m.base;
    ctx.fill();
    ctx.restore();
    const hl = opt.hl ?? 1.7 * S;
    ctx.save();
    ctx.translate(-LIGHT[0] * hl * 0.9, -LIGHT[1] * hl * 0.9);
    path();
    ctx.strokeStyle = opt.gloss ? m.shine : m.light;
    ctx.lineWidth = hl * 1.6;
    ctx.stroke();
    ctx.restore();
    if (rim) {
      ctx.save();
      ctx.translate(LIGHT[0] * 1.3 * S, LIGHT[1] * 1.3 * S);
      path();
      ctx.strokeStyle = `rgba(${rim[0]},${rim[1]},${rim[2]},0.5)`;
      ctx.lineWidth = (opt.rimW ?? 1.1) * S;
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    if (opt.outline !== false) {
      path();
      ctx.strokeStyle = m.deep;
      ctx.lineWidth = ink * 0.55;
      ctx.stroke();
    }
  };
  const smooth = (pts: V[]) => () => {
    ctx.beginPath();
    const n = pts.length;
    const m0 = lerpV(pts[n - 1], pts[0], 0.5);
    ctx.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const q = lerpV(p, pts[(i + 1) % n], 0.5);
      ctx.quadraticCurveTo(p[0], p[1], q[0], q[1]);
    }
    ctx.closePath();
  };
  const limbPath = (a: V, b: V, ra: number, rb: number, bulgeL = 1, bulgeR = 1, t = 0.4) => () => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.max(0.001, Math.hypot(dx, dy));
    const u: V = [dx / len, dy / len];
    const n: V = [-u[1], u[0]];
    const m = lerpV(a, b, t);
    const rm = ra + (rb - ra) * t;
    const c1 = add(m, n, rm * (2 * bulgeL - 1) + (rm - (ra + rb) / 2));
    const c2 = add(m, n, -(rm * (2 * bulgeR - 1) + (rm - (ra + rb) / 2)));
    const an = Math.atan2(n[1], n[0]);
    ctx.beginPath();
    const p0 = add(a, n, ra);
    ctx.moveTo(p0[0], p0[1]);
    const p1 = add(b, n, rb);
    ctx.quadraticCurveTo(c1[0], c1[1], p1[0], p1[1]);
    ctx.arc(b[0], b[1], rb, an, an + Math.PI, true);
    const p2 = add(a, n, -ra);
    ctx.quadraticCurveTo(c2[0], c2[1], p2[0], p2[1]);
    ctx.arc(a[0], a[1], ra, an + Math.PI, an, true);
    ctx.closePath();
  };
  const ellPath = (c: V, rx: number, ry: number, rot = 0) => () => {
    ctx.beginPath();
    ctx.ellipse(c[0], c[1], rx, ry, rot, 0, Math.PI * 2);
  };
  const stroke = (pts: V[], color: string, width: number) => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    if (pts.length === 3) ctx.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
    else for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  };
  const dot = (c: V, r: number, color: string) => {
    ctx.beginPath();
    ctx.arc(c[0], c[1], r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  };
  // local frames
  const T = (o: V, fx: V, ux: V) => (x: number, y: number): V => [o[0] + fx[0] * x + ux[0] * y, o[1] + fx[1] * x + ux[1] * y];
  const torsoP = T(hip0, fwd, up);
  const Hd = (x: number, y: number): V => [headC[0] + headFwd[0] * x * hr + headUp[0] * y * hr, headC[1] + headFwd[1] * x * hr + headUp[1] * y * hr];

  const longSleeve = look.topStyle !== 'tee';
  const jacketish = look.topStyle === 'jacket' || look.topStyle === 'suit';

  // ---------- parts ----------
  const fist = (arm: ReturnType<typeof limb>, back: boolean) => {
    const sk = back ? M.skinB : M.skin;
    const d = dirDown(arm.a2);
    const n: V = [-d[1], d[0]];
    const c = at(arm.e, d, 2.6 * S);
    const r = 5.8 * S * B;
    if (pose.open) {
      const palm = smooth([add(c, n, r * 0.9), add(add(c, d, r * 0.9), n, r * 0.7), add(c, d, r * 1.3), add(add(c, d, r * 0.9), n, -r * 0.8), add(c, n, -r * 0.9), add(c, d, -r * 0.6)]);
      part(palm, sk);
      for (let k = -1; k <= 1; k++) stroke([add(add(c, d, r * 0.5), n, k * r * 0.4), add(add(c, d, r * 1.15), n, k * r * 0.45)], sk.deep, 0.7 * S);
      return c;
    }
    const pts: V[] = [add(add(c, d, -r * 0.7), n, r * 0.85), add(add(c, d, r * 0.6), n, r * 1.0), add(add(c, d, r * 1.05), n, r * 0.35),
      add(add(c, d, r * 1.05), n, -r * 0.4), add(add(c, d, r * 0.55), n, -r * 0.95), add(add(c, d, -r * 0.7), n, -r * 0.8)];
    part(smooth(pts), sk, { shade: 1.8 * S });
    if (!back) {
      for (let k = 0; k < 3; k++) {
        const s0 = lerpV(add(add(c, d, r * 0.95), n, r * 0.5), add(add(c, d, r * 0.95), n, -r * 0.55), (k + 1) / 4);
        stroke([s0, add(s0, d, -r * 0.45)], sk.deep, 0.7 * S);
      }
      part(limbPath(add(add(c, d, -r * 0.1), n, r * 0.75), add(add(c, d, r * 0.55), n, r * 0.15), 1.6 * S, 1.4 * S), sk, { shade: 1 * S, hl: 0.8 * S });
    }
    return c;
  };

  const arm = (s0: V, a: ReturnType<typeof limb>, back: boolean) => {
    const sk = back ? M.skinB : M.skin;
    const tp = back ? M.topB : M.top;
    const r1 = 5.5 * S * B, r2 = 4.8 * S * B, r3 = 3.8 * S * B;
    // forearm under upper arm so the elbow overlap reads correctly
    part(limbPath(a.j, a.e, r2, r3, 1.12, 1.0, 0.3), longSleeve ? tp : sk);
    if (longSleeve) {
      const cuffA = lerpV(a.j, a.e, 0.82);
      part(limbPath(cuffA, a.e, r3 + 0.9 * S, r3 + 0.7 * S), look.topStyle === 'suit' ? M.top2 : back ? M.topB : look.topStyle === 'sweater' ? M.top : M.top, { shade: 1.2 * S });
      if (look.topStyle === 'sweater') for (let k = 1; k < 3; k++) stroke([add(lerpV(cuffA, a.e, k / 3), [-dirDown(a.a2)[1], dirDown(a.a2)[0]], r3), add(lerpV(cuffA, a.e, k / 3), [-dirDown(a.a2)[1], dirDown(a.a2)[0]], -r3)], tp.shade, 0.6 * S);
    }
    fist(a, back);
    part(limbPath(s0, a.j, r1, r2 + 0.3 * S, 1.1, 1.02, 0.45), longSleeve ? tp : sk);
    if (!longSleeve) {
      const sleeveEnd = lerpV(s0, a.j, 0.52);
      part(limbPath(s0, sleeveEnd, r1 + 1.3 * S, r1 + 0.9 * S, 1.05, 1.05), tp);
    }
    // hide the elbow seam
    const m = longSleeve ? tp : sk;
    ctx.beginPath();
    ctx.arc(a.j[0], a.j[1], r2 * 0.78, 0, Math.PI * 2);
    ctx.fillStyle = m.base;
    ctx.fill();
  };

  const leg = (h0: V, l: ReturnType<typeof limb>, toeP: V, back: boolean) => {
    const pn = back ? M.pantsB : M.pants;
    const kr = 6.8 * S * B;
    part(limbPath(l.j, l.e, kr, 5.0 * S * B, 1.0, 1.18, 0.32), pn);
    part(limbPath(h0, l.j, 8.8 * S * B, kr + 0.4 * S, 1.06, 1.08, 0.4), pn);
    ctx.beginPath();
    ctx.arc(l.j[0], l.j[1], kr * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = pn.base;
    ctx.fill();
    // knee fold
    const kd = dirDown(l.a1);
    const kn: V = [-kd[1], kd[0]];
    stroke([add(add(l.j, kn, 3 * S), kd, -1 * S), add(l.j, kn, 0.5 * S), add(add(l.j, kn, -2 * S), kd, 1.5 * S)], pn.deep, 0.8 * S);
    // sneaker, authored in a foot frame: x forward along the foot, y up from the ground
    const d = dirDown(l.a2);
    const f = dirDown(l.a2 + 90);
    const g0 = add(l.e, d, 5.5 * S);
    const F = (x: number, y: number): V => [g0[0] + f[0] * x * S - d[0] * y * S, g0[1] + f[1] * x * S - d[1] * y * S];
    const sh = back ? M.shoesB : M.shoes;
    part(smooth([F(-4.6, 0.2), F(5, 0), F(12.6, 0.2), F(13.8, 1.4), F(12.8, 2.8), F(-4.4, 2.8), F(-5.2, 1.4)]), sole, { shade: 0.8 * S, hl: 0.5 * S });
    part(smooth([F(-4.4, 2.4), F(-4.8, 6.4), F(-2, 8.6), F(2.6, 8.4), F(5.4, 6.2), F(9.6, 5), F(13, 3.4), F(12.4, 2.2), F(4, 2.2)]), sh, { gloss: true, shade: 1.8 * S });
    if (!back) {
      for (let k = 0; k < 3; k++) stroke([F(1.6 + k * 1.6, 7.4 - k * 0.8), F(3 + k * 1.6, 6.2 - k * 0.8)], shoeLum > 500 ? '#7a7a8a' : '#f6f6f8', 0.8 * S);
      stroke([F(7, 3.3), F(11.6, 3.2)], sh.shine, 0.7 * S);
      stroke([F(-3.6, 3.6), F(-3.8, 6.2)], shoeLum > 500 ? sh.deep : M.accent.base, 1 * S);
    }
  };

  // ---------- back layer ----------
  arm(bsh, bArm, true);
  leg(bHip, bLeg, bToe, true);
  if (look.topStyle === 'hoodie') part(smooth([Hd(-0.2, -0.9), Hd(-1.25, -0.4), Hd(-1.3, 0.6), Hd(-0.6, 1.25), Hd(0.2, 1.1)]), M.topB);

  // ---------- torso ----------
  const tb = B;
  const pelvis = smooth([torsoP(-10.6 * tb * S, 3 * S), torsoP(-10.2 * tb * S, -3 * S), torsoP(0, -4.6 * S), torsoP(11 * tb * S, -2.8 * S), torsoP(11.4 * tb * S, 3 * S), torsoP(10.4 * tb * S, torsoL * 0.26), torsoP(-10.2 * tb * S, torsoL * 0.26)]);
  part(pelvis, M.pants);
  const hemY = jacketish ? -1.5 * S : torsoL * 0.2;
  const torsoPts: V[] = [
    torsoP(-10.4 * tb * S, hemY), torsoP(-11.6 * tb * S, torsoL * 0.45), torsoP(-13.4 * tb * S, torsoL * 0.76), torsoP(-11.4 * tb * S, torsoL * 1.0),
    torsoP(-4 * S, torsoL * 1.06), torsoP(4.5 * S, torsoL * 1.05), torsoP(11.6 * tb * S, torsoL * 0.96), torsoP(14.4 * tb * S, torsoL * 0.72),
    torsoP(12.4 * tb * S, torsoL * 0.48), torsoP(10.8 * tb * S, torsoL * 0.3), torsoP(11 * tb * S, hemY),
  ];
  part(smooth(torsoPts), M.top, { gloss: look.topStyle === 'jacket', shade: 3.2 * S });
  // belt
  if (!jacketish) {
    const by = torsoL * 0.2;
    stroke([torsoP(-9.4 * tb * S, by - 1 * S), torsoP(10.3 * tb * S, by - 1 * S)], INK, 1.6 * S);
    ctx.fillStyle = M.gold.light;
    const bk = torsoP(8.4 * tb * S, by - 1 * S);
    ctx.fillRect(bk[0] - 1.4 * S, bk[1] - 1.4 * S, 2.8 * S, 2.8 * S);
  }
  // clothing details
  const fr = (y: number, inset = 0) => {
    const k = Math.min(1, y / 0.7);
    const x = (10.9 + (14.4 - 10.9) * k) * tb * S - inset * S;
    return torsoP(x, torsoL * y);
  };
  const sd = (pts: V[], w = 0.9) => stroke(pts, M.top.deep, w * S);
  if (look.topStyle === 'tee' || look.topStyle === 'sweater') {
    stroke([torsoP(1 * S, torsoL * 1.0), fr(0.9, 3.5), torsoP(9 * tb * S, torsoL * 0.95)], M.top.deep, 1.1 * S);
    sd([torsoP(-2 * S, torsoL * 0.5), torsoP(4 * S, torsoL * 0.42), fr(0.36, 2)]);
    sd([torsoP(-6 * S, torsoL * 0.3), torsoP(0, torsoL * 0.27)]);
    if (look.topStyle === 'sweater') for (let k = 0; k < 4; k++) sd([torsoP((-8 + k * 5) * S, torsoL * 0.2), torsoP((-8 + k * 5) * S, torsoL * 0.26)], 0.6);
  }
  if (look.topStyle === 'hoodie') {
    const p1 = fr(0.86, 2.5), p2 = fr(0.86, 5);
    stroke([p1, add(p1, up, -9 * S)], M.top2.base, 1 * S);
    stroke([p2, add(p2, up, -7 * S)], M.top2.base, 1 * S);
    dot(add(p1, up, -9 * S), 0.9 * S, M.top2.light);
    dot(add(p2, up, -7 * S), 0.9 * S, M.top2.light);
    sd([fr(0.42, 1), torsoP(-1 * S, torsoL * 0.4), torsoP(-2 * S, torsoL * 0.26)], 1);
    sd([fr(0.98, 6), torsoP(-6 * S, torsoL * 0.98)], 1.2);
  }
  if (jacketish) {
    const shirt = smooth([fr(0.98, 7), fr(0.98, 0.5), fr(0.6, -0.5), fr(0.12, 0), fr(0.12, 3.5), fr(0.55, 5)]);
    part(shirt, look.topStyle === 'suit' ? M.white : M.top2, { shade: 1.6 * S });
    if (look.topStyle === 'suit') {
      const knot = fr(0.9, 2.4);
      part(smooth([add(knot, fwd, -1.6 * S), add(knot, fwd, 1.6 * S), add(fr(0.36, 1.4), fwd, 1.8 * S), fr(0.3, 1.6), add(fr(0.36, 1.4), fwd, -1.8 * S)]), M.accent, { shade: 1 * S });
    }
    // lapels
    const lap = smooth([fr(1.0, 9), fr(0.98, 6.5), fr(0.62, 4.5), fr(0.5, 2), fr(0.7, 7)]);
    part(lap, M.top, { gloss: look.topStyle === 'jacket', shade: 1.6 * S });
    if (look.topStyle === 'jacket') {
      sd([fr(0.45, 0.5), fr(0.05, 0.6)], 1);
      stroke([torsoP(-6 * S, torsoL * 0.8), torsoP(2 * S, torsoL * 0.55)], M.top.shine, 0.9 * S);
      stroke([torsoP(-8 * S, torsoL * 0.5), torsoP(-4 * S, torsoL * 0.3)], M.top.shine, 0.7 * S);
    }
  }
  if (look.emblem === 'rocket') {
    const c = fr(0.62, 5.5);
    part(smooth([add(c, up, 3.4 * S), add(add(c, fwd, 1.3 * S), up, 0.5 * S), add(add(c, fwd, 1.8 * S), up, -2.6 * S), add(c, up, -1.8 * S), add(add(c, fwd, -1.8 * S), up, -2.6 * S), add(add(c, fwd, -1.3 * S), up, 0.5 * S)]), M.white, { shade: 0.6 * S, hl: 0.4 * S });
    dot(add(c, up, -3.4 * S), 0.9 * S, '#ffb000');
    dot(add(c, up, 1 * S), 0.6 * S, M.accent.base);
  }
  if (look.chain) {
    for (let k = 0; k < 7; k++) {
      const p = add(add(neck, up, -(1.4 + k * 0.95) * S), fwd, (1.2 + k * 1.25) * S);
      dot(p, 0.95 * S, k % 2 ? M.gold.shine : M.gold.base);
    }
  }

  // ---------- front leg ----------
  leg(fHip, fLeg, fToe, false);

  // ---------- neck + head ----------
  part(limbPath(add(neck, headUp, -1.5 * S), add(neck, headUp, 4.5 * S), 5.4 * S * B, 4.8 * S, 1.05, 1.05), look.topStyle === 'turtleneck' ? M.top : M.skin, { shade: 2.4 * S });
  if (look.topStyle === 'turtleneck') part(limbPath(neck, add(neck, headUp, 3.6 * S), 5.6 * S, 5.4 * S), M.top);
  if (potato) {
    part(ellPath(headC, hr * 1.04, hr * 1.18, rad(pose.t + pose.h)), M.potato, { shade: 3 * S, hl: 2 * S });
    for (const [a, b] of [[-0.5, 0.5], [0.1, -0.7], [-0.7, -0.4], [0.3, 0.75], [-0.2, -0.1]]) {
      dot(Hd(a, b), 0.9 * S, M.potato.deep);
      dot(add(Hd(a, b), [-0.4 * S, -0.4 * S]), 0.4 * S, M.potato.light);
    }
    part(limbPath(Hd(-0.05, 1.08), Hd(0.25, 1.55), 1.2 * S, 1.8 * S), mat('#5fb03c', false, 0.4));
    part(ellPath(Hd(0.42, 1.55), 2.8 * S, 1.4 * S, rad(pose.t - 20)), mat('#7fd95a', false, 0.4), { shade: 0.8 * S });
  } else {
    const j = face.jaw;
    const nz = face.nose;
    const prof: V[] = [
      Hd(0.56, 0.98), Hd(0.86, 0.62), Hd(0.95, 0.26), Hd(1.0, 0.04), Hd(1.12 + 0.18 * nz, -0.16), Hd(1.06 + 0.16 * nz, -0.27), Hd(0.96, -0.32),
      Hd(0.98, -0.44), Hd(0.92, -0.54), Hd(0.92 * j, -0.64), Hd(0.84 * j, -0.86), Hd(0.6 * j, -1.0), Hd(0.2 * j, -1.02), Hd(-0.15, -0.88),
      Hd(-0.5, -0.62), Hd(-0.92, -0.2), Hd(-0.98, 0.3), Hd(-0.62, 0.86), Hd(0.0, 1.08),
    ];
    part(smooth(prof), M.skin, { shade: 3 * S, hl: 1.8 * S });
    // ear
    part(ellPath(Hd(-0.14, -0.1), hr * 0.12, hr * 0.18, rad(pose.t + pose.h)), M.skin, { shade: 0.8 * S, hl: 0.4 * S, outline: false });
    stroke([Hd(-0.18, 0.0), Hd(-0.1, -0.12), Hd(-0.18, -0.2)], M.skin.deep, 0.6 * S);
    // hair
    hair(ctx, look, Hd, hr, S, M.hair, part, smooth, stroke);
    if (look.beard) {
      part(smooth([Hd(-0.24, -0.15), Hd(-0.1, -0.72), Hd(0.35, -1.12), Hd(0.86 * j, -0.9), Hd(1.0, -0.42), Hd(0.74, -0.5), Hd(0.34, -0.58), Hd(0.1, -0.3)]), M.hair, { shade: 1.6 * S });
      for (let k = 0; k < 4; k++) stroke([Hd(0.1 + k * 0.18, -0.7), Hd(0.14 + k * 0.18, -0.95)], M.hair.light, 0.6 * S);
    }
    // cheek / jaw shading and nose
    stroke([Hd(0.3, -0.62), Hd(0.55, -0.84), Hd(0.8 * j, -0.78)], M.skin.shade, 0.9 * S);
    stroke([Hd(0.9, -0.02), Hd(1.0, -0.22), Hd(1.06 + 0.12 * nz, -0.27)], M.skin.deep, 0.8 * S);
    if (face.lines) {
      stroke([Hd(0.62, -0.3), Hd(0.7, -0.5)], M.skin.deep, 0.7 * S);
      stroke([Hd(0.35, 0.5), Hd(0.6, 0.55)], M.skin.shade, 0.6 * S);
    }
  }
  // eyes / eyewear
  const eyeC = potato ? Hd(0.48, 0.1) : Hd(0.6, 0.1);
  const e = face.eye;
  const expr = pose.expr;
  if (look.visor) {
    const vm = mat(look.visor, false, 0.6);
    part(limbPath(Hd(0.05, 0.3), Hd(1.02, 0.18), 2.6 * S, 3.0 * S), vm, { gloss: true, shade: 1.2 * S });
    stroke([Hd(0.25, 0.36), Hd(0.95, 0.28)], vm.shine, 0.9 * S);
    ctx.globalAlpha = 0.5;
    for (let k = 0; k < 3; k++) stroke([Hd(0.3 + k * 0.2, 0.2), Hd(0.42 + k * 0.2, 0.2)], '#eafff4', 0.5 * S);
    ctx.globalAlpha = 1;
  } else if (look.shades) {
    part(limbPath(Hd(0.08, 0.16), Hd(1.02, 0.16), 2.2 * S, 2.8 * S), M.dark, { gloss: true, shade: 1 * S });
    stroke([Hd(0.55, 0.26), Hd(0.85, 0.24)], '#a8e4ff', 0.9 * S);
  } else {
    const ex = eyeC;
    const ew = 1.9 * S * e, eh = 1.35 * S * e;
    const rot = rad(pose.t + pose.h);
    if (expr === 'pain') {
      stroke([add(ex, [-ew, -0.4 * S]), add(ex, [0, 0.6 * S]), add(ex, [ew, -0.6 * S])], INK, 1 * S);
    } else {
      ctx.beginPath();
      ctx.ellipse(ex[0], ex[1], ew, eh, rot, 0, Math.PI * 2);
      ctx.fillStyle = '#fbf8f2';
      ctx.fill();
      dot(add(ex, headFwd, 0.55 * S), 1.05 * S * e, face.eyeColor);
      dot(add(ex, headFwd, 0.7 * S), 0.5 * S * e, '#0a0610');
      dot(add(add(ex, headFwd, 1.0 * S), headUp, 0.45 * S), 0.32 * S, '#ffffff');
      stroke([add(add(ex, headFwd, -ew), headUp, 0.1 * S), add(ex, headUp, eh * 0.95), add(add(ex, headFwd, ew * 1.05), headUp, 0.2 * S)], INK, 0.95 * S);
    }
    // brow: thick, furrowed for a fighting face
    const bw = face.brow;
    const browCol = potato ? M.potato.deep : css(mix(hex(look.hair), [20, 10, 30], 0.35));
    stroke([Hd(0.32, 0.36), Hd(0.62, 0.4), Hd(0.88, 0.28)], browCol, 1.5 * S * bw);
    if (look.glasses) {
      ctx.strokeStyle = '#1e1e26';
      ctx.lineWidth = 0.8 * S;
      ctx.beginPath();
      ctx.ellipse(ex[0], ex[1], ew * 1.5, eh * 1.6, rot, 0, Math.PI * 2);
      ctx.stroke();
      stroke([add(ex, headFwd, -ew * 1.5), Hd(-0.18, 0.12)], '#1e1e26', 0.8 * S);
    }
  }
  // mouth
  {
    const m0 = potato ? Hd(0.5, -0.42) : Hd(0.74, -0.5);
    const m1 = potato ? Hd(0.86, -0.38) : Hd(0.94, -0.48);
    if (expr === 'shout') {
      const mc = lerpV(m0, m1, 0.6);
      ctx.beginPath();
      ctx.ellipse(mc[0], mc[1] + 0.6 * S, 1.6 * S, 1.3 * S, rad(pose.t), 0, Math.PI * 2);
      ctx.fillStyle = '#3a0a14';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.7 * S;
      ctx.stroke();
      stroke([add(mc, [-1.2 * S, 0]), add(mc, [1.2 * S, 0])], '#f6f2ea', 0.5 * S);
    } else if (expr === 'pain') {
      stroke([m0, lerpV(m0, m1, 0.33), lerpV(m0, m1, 0.66), m1].map((p, k) => add(p, [0, (k % 2 ? 0.5 : -0.5) * S])), INK, 0.8 * S);
    } else {
      const mid = add(lerpV(m0, m1, 0.5), headUp, -(0.3 + face.smile * 0.9) * S);
      stroke([m0, mid, m1], look.beard ? INK : css(mix(hex(look.skin), [90, 20, 30], 0.55)), 0.8 * S);
    }
  }

  // ---------- front arm ----------
  arm(fsh, fArm, false);
  if (look.accent === '#ffffff' && look.topStyle === 'tee') {
    const c = at(fArm.e, dirDown(fArm.a2), 4.5 * S);
    part(limbPath(c, add(c, dirDown(fArm.a2 + 90), 3 * S), 0.8 * S, 0.8 * S), M.white, { shade: 0.3 * S });
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return [headC[0] + ox, headC[1] + oy - maxY];
}

type Part = (path: () => void, m: Mat, opt?: { outline?: boolean; shade?: number; hl?: number; gloss?: boolean; rimW?: number }) => void;
type Smooth = (pts: V[]) => () => void;
type Stroke = (pts: V[], color: string, width: number) => void;

function hair(ctx: Ctx, look: Look, Hd: (x: number, y: number) => V, hr: number, S: number, m: Mat, part: Part, smooth: Smooth, stroke: Stroke): void {
  const st = look.hairStyle;
  const P = (pts: number[][]) => pts.map(([x, y]) => Hd(x, y));
  const strands = (lines: number[][], w = 0.7) => { for (const l of lines) stroke(P([[l[0], l[1]], [l[2], l[3]], [l[4], l[5]]]), m.light, w * S); };
  void ctx; void hr;
  const lock = (pts: number[][]) => part(smooth(P(pts)), m, { shade: 1.4 * S, hl: 0.9 * S });
  if (st === 'short') {
    part(smooth(P([[0.62, 0.42], [0.94, 0.44], [1.02, 0.68], [0.78, 0.94], [0.4, 1.14], [0, 1.2], [-0.46, 1.12], [-0.86, 0.86], [-1.06, 0.42], [-1.06, -0.1],
      [-0.84, -0.3], [-0.66, -0.06], [-0.48, 0.2], [-0.28, 0.32], [0.02, 0.3], [0.12, 0.06], [0.24, 0.06], [0.3, 0.36]])), m, { shade: 2 * S });
    strands([[0.7, 0.86, 0.2, 1.06, -0.5, 0.94], [0.4, 0.68, -0.2, 0.86, -0.8, 0.5], [0.9, 0.62, 0.7, 0.8, 0.4, 0.84]]);
  } else if (st === 'messy') {
    part(smooth(P([[0.94, 0.36], [0.98, 0.84], [0.62, 0.98], [0.62, 1.36], [0.2, 1.12], [-0.08, 1.44], [-0.36, 1.12], [-0.84, 1.28], [-0.9, 0.86], [-1.18, 0.5], [-1.1, -0.36], [-0.62, -0.5], [-0.44, 0.12], [0.3, 0.46]])), m, { shade: 2 * S });
    lock([[0.96, 0.62], [1.12, 0.92], [0.7, 0.9]]);
    lock([[0.5, 1.0], [0.78, 1.4], [0.2, 1.16]]);
    strands([[0.7, 0.86, 0.2, 1.1, -0.4, 1.0], [0.4, 0.6, -0.1, 0.9, -0.8, 0.7]]);
  } else if (st === 'curly') {
    part(smooth(P([[0.86, 0.4], [0.8, 0.96], [0.3, 1.2], [-0.3, 1.2], [-0.86, 0.96], [-1.12, 0.4], [-1.04, -0.24], [-0.62, -0.3], [-0.44, 0.14], [0.3, 0.46]])), m, { shade: 2 * S });
    for (const [x, y, r] of [[0.7, 0.92, 0.24], [0.36, 1.14, 0.26], [-0.06, 1.2, 0.27], [-0.48, 1.12, 0.26], [-0.86, 0.86, 0.25], [-1.06, 0.4, 0.23], [0.86, 0.6, 0.2], [0.1, 0.9, 0.22], [-0.42, 0.82, 0.22]]) {
      const c = Hd(x, y);
      part(() => { ctx.beginPath(); ctx.arc(c[0], c[1], hr * r, 0, Math.PI * 2); }, m, { shade: 0.9 * S, hl: 0.7 * S });
      stroke([Hd(x - r * 0.4, y + r * 0.1), Hd(x, y + r * 0.45), Hd(x + r * 0.4, y + r * 0.1)], m.deep, 0.5 * S);
    }
  } else if (st === 'swept') {
    part(smooth(P([[0.82, 0.46], [0.86, 1.06], [0.34, 1.36], [-0.5, 1.34], [-1.14, 0.98], [-1.28, 0.2], [-1.0, -0.36], [-0.56, -0.26], [-0.42, 0.22], [0.26, 0.58]])), m, { shade: 2 * S, gloss: true });
    lock([[0.86, 0.9], [1.0, 1.2], [0.4, 1.32], [0.5, 1.06]]);
    strands([[0.7, 1.0, -0.1, 1.24, -0.9, 0.9], [0.6, 0.78, -0.2, 0.98, -1.0, 0.5], [0.4, 0.6, -0.3, 0.72, -1.0, 0.1]], 0.8);
  } else if (st === 'side') {
    part(smooth(P([[0.5, 0.4], [0.92, 0.36], [1.06, 0.58], [0.86, 0.9], [0.4, 1.16], [-0.1, 1.24], [-0.72, 1.08], [-1.1, 0.52], [-1.08, -0.2],
      [-0.82, -0.36], [-0.6, -0.04], [-0.42, 0.22], [-0.1, 0.34], [0.12, 0.08], [0.26, 0.1], [0.3, 0.38]])), m, { shade: 2 * S, gloss: true });
    strands([[0.9, 0.62, 0.3, 1.06, -0.5, 1.02], [0.7, 0.42, 0.1, 0.84, -0.8, 0.7]], 0.8);
    stroke(P([[0.0, 1.22], [0.3, 0.86], [0.8, 0.62]]), m.deep, 0.8 * S);
  } else if (st === 'buzz') {
    part(smooth(P([[0.76, 0.48], [0.54, 0.92], [0, 1.08], [-0.6, 0.96], [-1.0, 0.44], [-1.0, -0.2], [-0.6, -0.3], [-0.42, 0.14], [0.25, 0.56]])), m, { shade: 1.6 * S });
  }
}
