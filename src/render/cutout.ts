// Cutout animation: key art sliced into parts (tools/cutout.py) and re-posed with the same
// skeleton/poses as everything else, so limbs actually move. The single visible arm and leg
// are reused, slightly darkened, for the far side of the body.
import { CHARS } from '../sim/data.ts';
import type { FighterState } from '../sim/types.ts';
import type { Pose } from './poses.ts';
import { artRig, type RigData } from './art.ts';

type Ctx = CanvasRenderingContext2D;
type V = [number, number];

const rad = (d: number) => (d * Math.PI) / 180;
const dirDown = (a: number): V => [Math.sin(rad(a)), Math.cos(rad(a))];
const dirUp = (a: number): V => [Math.sin(rad(a)), -Math.cos(rad(a))];
const angOf = (v: V) => Math.atan2(v[1], v[0]);
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
const add = (a: V, b: V, k = 1): V => [a[0] + b[0] * k, a[1] + b[1] * k];
const len = (v: V) => Math.hypot(v[0], v[1]);
const rot = (v: V, a: number): V => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];

export function drawCutout(ctx: Ctx, f: FighterState, pose: Pose, x: number, y: number, opts: { alt: boolean; flash: boolean }): boolean {
  const r = artRig(f.char);
  if (!r) return false;
  const { rig, img } = r;
  const J = rig.joints;
  const c = CHARS[f.char];
  const footDrop = Math.max(J.heel[1], J.toe[1]) - J.ankle[1] + 6;
  const artH = J.ankle[1] + footDrop - J.headTop[1];
  const k = (c.h * 1.16) / artH;
  const unit = artH / 92;
  const L = {
    torso: len(sub(J.neck, J.hipC)), upper: len(sub(J.elbow, J.shoulder)), fore: len(sub(J.fist, J.elbow)),
    thigh: len(sub(J.knee, J.hip)), shin: len(sub(J.ankle, J.knee)),
  };
  const src = {
    torso: angOf(sub(J.neck, J.hipC)), upper: angOf(sub(J.elbow, J.shoulder)), fore: angOf(sub(J.fist, J.elbow)),
    thigh: angOf(sub(J.knee, J.hip)), shin: angOf(sub(J.ankle, J.knee)),
  };
  // forward kinematics in art pixels, hip centre at origin
  const hip0: V = [(pose.dx ?? 0) * unit, (pose.dy ?? 0) * unit];
  const up = dirUp(pose.t);
  const fwd: V = [Math.cos(rad(pose.t)), Math.sin(rad(pose.t))];
  const rT = angOf(up) - src.torso;
  const T = (p: V): V => add(hip0, rot(sub(p, J.hipC), rT));
  const neckT = T(J.neck);
  const shF = T(J.shoulder);
  const shB = add(shF, fwd, -0.16 * L.torso);
  const arm = (s0: V, a: [number, number]) => {
    const e = add(s0, dirDown(a[0]), L.upper);
    const h = add(e, dirDown(a[0] + a[1]), L.fore);
    return { s0, e, h, a1: angOf(dirDown(a[0])), a2: angOf(dirDown(a[0] + a[1])) };
  };
  const legHipF = add(hip0, rot(sub(J.hip, J.hipC), rT * 0.35));
  const legHipB = add(legHipF, fwd, -0.14 * L.torso);
  const leg = (h0: V, a: [number, number]) => {
    const kn = add(h0, dirDown(a[0]), L.thigh);
    const an = add(kn, dirDown(a[0] - a[1]), L.shin);
    return { h0, kn, an, a1: angOf(dirDown(a[0])), a2: angOf(dirDown(a[0] - a[1])) };
  };
  const aF = arm(shF, pose.fa);
  const aB = arm(shB, pose.ba);
  const lF = leg(legHipF, pose.fl);
  const lB = leg(legHipB, pose.bl);
  // ground: lowest of the feet (and the head/hips when lying down)
  let bottom = -Infinity;
  for (const l of [lF, lB]) {
    const r2 = l.a2 - src.shin;
    for (const p of [J.heel, J.toe]) bottom = Math.max(bottom, add(l.kn, rot(sub(p, J.knee), r2))[1] + 10);
  }
  const headC = add(neckT, rot(sub([J.headTop[0], (J.headTop[1] + J.neck[1]) / 2], J.neck), rT));
  bottom = Math.max(bottom, headC[1] + L.torso * 0.25, hip0[1] + L.torso * 0.2);

  ctx.save();
  ctx.translate(x, y);
  if (f.facing < 0) ctx.scale(-1, 1);
  ctx.scale(k, k);
  ctx.translate(0, -bottom);
  const smooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const baseFilter = opts.alt ? 'hue-rotate(160deg) saturate(1.2) ' : '';
  const part = (name: string, pivotSrc: V, pivotDst: V, angle: number, dark = false) => {
    const m = rig.parts[name];
    const im = img[name];
    if (!m || !im) return;
    ctx.save();
    ctx.translate(pivotDst[0], pivotDst[1]);
    ctx.rotate(angle);
    ctx.filter = dark ? `${baseFilter}brightness(0.6) saturate(0.85)` : baseFilter || 'none';
    ctx.drawImage(im, m.x - pivotSrc[0], m.y - pivotSrc[1]);
    if (opts.flash && !dark) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35;
      ctx.drawImage(im, m.x - pivotSrc[0], m.y - pivotSrc[1]);
    }
    ctx.restore();
  };
  const two = !!rig.parts.upper2 && !!img.upper2;
  const s2 = two ? {
    upper: angOf(sub(J.elbow2, J.shoulder2)), fore: angOf(sub(J.fist2, J.elbow2)),
    thigh: angOf(sub(J.knee2, J.hip2)), shin: angOf(sub(J.ankle2, J.knee2)),
  } : null;
  const drawArm = (a: ReturnType<typeof arm>, dark: boolean) => {
    if (dark && s2) {
      part('upper2', J.shoulder2, a.s0, a.a1 - s2.upper, false);
      part('fore2', J.elbow2, a.e, a.a2 - s2.fore, false);
      return;
    }
    part('upper', J.shoulder, a.s0, a.a1 - src.upper, dark);
    part('fore', J.elbow, a.e, a.a2 - src.fore, dark);
  };
  const drawLeg = (l: ReturnType<typeof leg>, dark: boolean) => {
    if (dark && s2) {
      part('thigh2', J.hip2, l.h0, l.a1 - s2.thigh, false);
      part('shin2', J.knee2, l.kn, l.a2 - s2.shin, false);
      return;
    }
    part('thigh', J.hip, l.h0, l.a1 - src.thigh, dark);
    part('shin', J.knee, l.kn, l.a2 - src.shin, dark);
  };
  drawArm(aB, true);
  drawLeg(lB, true);
  drawLeg(lF, false);
  part('torso', J.hipC, hip0, rT);
  part('head', J.neck, neckT, rT + rad(pose.h));
  drawArm(aF, false);
  ctx.imageSmoothingEnabled = smooth;
  ctx.restore();
  return true;
}

export type { RigData };
