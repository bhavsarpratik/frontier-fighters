// Animates a single illustration as a fighter: squash/stretch, leans, lunges, recoil, spins,
// plus attack smears that show where each hit lands. If a generated pose image exists
// (assets/art/<id>_<pose>.webp) it is used for that state instead of the base art.
import { CHARS } from '../sim/data.ts';
import { FX } from '../sim/fixed.ts';
import {
  S_AIR, S_AIRHIT, S_ATTACK, S_BLOCKSTUN, S_CROUCH, S_DASH, S_GETUP, S_HITSTUN, S_JUMPSQUAT, S_KNOCKDOWN, S_KO, S_LAND,
  S_THROWN, S_WALK, S_WIN, type FighterState,
} from '../sim/types.ts';
import { artFull, artPose } from './art.ts';

type Ctx = CanvasRenderingContext2D;
const ease = (t: number) => 1 - (1 - t) * (1 - t);

export function drawPuppet(ctx: Ctx, f: FighterState, x: number, y: number, t: number, opts: { alt: boolean; flash: boolean; ghost: boolean }): boolean {
  const base = artFull(f.char);
  if (!base) return false;
  const c = CHARS[f.char];
  const H = c.h * 1.14;
  let img = base;
  let sx = 1, sy = 1, rot = 0, dx = 0, dy = 0;
  let smear: { k: number; low: boolean; up: boolean } | null = null;
  const pose = (name: string) => artPose(f.char, name);
  switch (f.state) {
    case S_WALK: {
      const p = f.sf / 4.5;
      dy = -Math.abs(Math.sin(p)) * 2.2;
      rot = Math.sin(p) * 0.025;
      img = pose('walk') ?? img;
      break;
    }
    case S_CROUCH:
    case S_JUMPSQUAT:
    case S_LAND: {
      const cimg = pose('crouch');
      if (cimg) img = cimg;
      else { sy = 0.7; sx = 1.08; }
      break;
    }
    case S_AIR: {
      const jimg = pose('jump');
      if (jimg) img = jimg;
      sy = jimg ? 1 : 0.92;
      rot = f.vy > 0 ? -0.06 : 0.08;
      if (Math.abs(f.vx) > 0 && !jimg) rot += (f.sf / 34) * Math.PI * 2 * Math.sign(f.vx) * f.facing * 0.5;
      break;
    }
    case S_DASH:
      rot = f.dashDir === f.facing ? 0.14 : -0.1;
      dx = f.dashDir === f.facing ? 3 : -3;
      break;
    case S_ATTACK: {
      const m = c.moves[f.move];
      const k = m.dmg >= 70 || m.isSuper ? 1.4 : 1;
      const low = m.anim[0] === 'c' || m.level === 'low';
      const kick = /K|kick|spin/i.test(m.key + m.anim);
      const up = m.anim === 'uppercut' || m.anim === 'cHP';
      const named = m.isSuper || !!m.name;
      img = (named ? pose('special') : null) ?? (kick ? pose('kick') : pose('punch')) ?? img;
      if (low) {
        const ci = pose('crouch');
        if (ci && !pose(kick ? 'kick' : 'punch')) img = ci;
        else if (!ci) { sy = 0.74; sx = 1.08; }
      }
      if (f.mf < m.startup) {
        const p = f.mf / Math.max(1, m.startup);
        rot = -0.07 * k * ease(p);
        dx = -2.5 * k * ease(p);
        sy *= 1 - 0.03 * p;
      } else if (f.mf < m.startup + m.active) {
        rot = (up ? -0.12 : 0.1) * k;
        dx = 7 * k;
        sx *= 1.05;
        dy = up ? -4 : 0;
        if (m.hit) smear = { k, low, up };
      } else {
        const p = (f.mf - m.startup - m.active) / Math.max(1, m.recovery);
        rot = 0.1 * k * (1 - ease(p));
        dx = 7 * k * (1 - ease(p));
      }
      if (m.air) rot += 0.12;
      break;
    }
    case S_HITSTUN: {
      const p = Math.min(1, f.sf / 14);
      img = pose('hit') ?? img;
      rot = -0.18 * (1 - p);
      dx = -5 * (1 - p);
      if (f.crouchHit && !pose('crouch')) { sy *= 0.74; sx *= 1.06; }
      break;
    }
    case S_BLOCKSTUN:
      img = pose('block') ?? img;
      rot = -0.05;
      dx = -2;
      if (f.crouchHit && !pose('crouch')) { sy = 0.72; sx = 1.06; }
      break;
    case S_AIRHIT:
    case S_THROWN:
      img = pose('hit') ?? img;
      rot = -0.5 - f.sf * 0.06;
      break;
    case S_KNOCKDOWN:
    case S_KO: {
      const kd = pose('kd');
      if (kd) img = kd;
      else { rot = -Math.PI / 2; dy = 0; }
      break;
    }
    case S_GETUP: {
      const p = Math.min(1, f.sf / 14);
      rot = -Math.PI / 2 * (1 - ease(p));
      break;
    }
    case S_WIN:
      img = pose('win') ?? img;
      dy = -Math.abs(Math.sin(f.sf / 7)) * 7;
      break;
    default: {
      const b = Math.sin(t / 14 + f.char);
      sy = 1 + b * 0.012;
      sx = 1 - b * 0.006;
    }
  }
  const w = (img.naturalWidth / img.naturalHeight) * H;
  const lying = rot <= -Math.PI / 2 + 0.01 && !pose('kd');
  ctx.save();
  ctx.translate(x, y);
  if (f.facing < 0) ctx.scale(-1, 1);
  ctx.translate(dx, dy + (lying ? -w * 0.18 : 0));
  ctx.rotate(rot);
  ctx.scale(sx, sy);
  const smooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (opts.alt) ctx.filter = 'hue-rotate(160deg) saturate(1.2)';
  if (opts.ghost) {
    ctx.globalAlpha *= 0.25;
    ctx.drawImage(img, -w / 2 - 10, -H, w, H);
    ctx.globalAlpha *= 2;
    ctx.drawImage(img, -w / 2 - 5, -H, w, H);
    ctx.globalAlpha /= 0.5;
  }
  ctx.drawImage(img, -w / 2, -H, w, H);
  if (opts.flash) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.35;
    ctx.drawImage(img, -w / 2, -H, w, H);
  }
  ctx.filter = 'none';
  ctx.imageSmoothingEnabled = smooth;
  ctx.restore();
  if (smear) drawSmear(ctx, f, x, y, H, smear);
  return true;
}

// A bright crescent from the shoulder (or hip) to the active hitbox.
export function drawSmear(ctx: Ctx, f: FighterState, x: number, y: number, H: number, s: { k: number; low: boolean; up: boolean }): void {
  const m = CHARS[f.char].moves[f.move];
  const hb = m.hit!;
  const fy = f.y / FX;
  const ox = 6;
  const oy = s.low ? H * 0.3 : H * 0.62;
  const tx = hb.x + hb.w;
  const ty = hb.y + hb.h / 2 - fy * 0;
  const ang = Math.atan2(-(ty - oy), tx - ox);
  const r = Math.hypot(tx - ox, ty - oy);
  const span = s.up ? 0.9 : 0.55;
  const prog = Math.min(1, (f.mf - m.startup + 1) / Math.max(1, m.active));
  ctx.save();
  ctx.translate(x, y);
  if (f.facing < 0) ctx.scale(-1, 1);
  ctx.translate(ox, -oy);
  const a0 = s.up ? ang + span : ang - span;
  const a1 = ang;
  const g = ctx.createLinearGradient(Math.cos(a0) * r, Math.sin(a0) * r, Math.cos(a1) * r, Math.sin(a1) * r);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(1, s.k > 1 ? 'rgba(255,230,140,0.95)' : 'rgba(220,245,255,0.9)');
  ctx.strokeStyle = g;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    ctx.globalAlpha = (1 - prog * 0.6) * (1 - i * 0.28);
    ctx.lineWidth = (s.k > 1 ? 7 : 5) - i * 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, r - i * 3, Math.min(a0, a1), Math.max(a0, a1));
    ctx.stroke();
  }
  ctx.restore();
}

export { S_LAND };
