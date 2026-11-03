// Frame animation from hand-drawn pose sets (tools/gen_queue.py + import_poses.py). Each state
// or move phase shows the matching drawing; light tweens (squash, lunge, recoil) keep it alive.
import { CHARS, type CMove } from '../sim/data.ts';
import {
  S_AIR, S_AIRHIT, S_ATTACK, S_BLOCKSTUN, S_CROUCH, S_DASH, S_GETUP, S_HITSTUN, S_JUMPSQUAT, S_KNOCKDOWN, S_KO, S_LAND,
  S_THROWN, S_WALK, S_WIN, type FighterState,
} from '../sim/types.ts';
import { artFrames, type FrameSet } from './art.ts';
import { FX } from '../sim/fixed.ts';
import { drawSmear } from './puppet.ts';

type Ctx = CanvasRenderingContext2D;
const ease = (t: number) => 1 - (1 - t) * (1 - t);

const FALLBACK: Record<string, string[]> = {
  walk: ['idle'], crouch: ['idle'], jump: ['crouch', 'idle'], punch: ['special', 'idle'], kick: ['punch', 'idle'],
  sweep: ['crouch', 'kick'], uppercut: ['punch', 'jump'], special: ['punch', 'idle'], block: ['idle'], hit: ['idle'],
  knockdown: ['hit'], win: ['idle'], super1: ['special', 'crouch'], super2: ['special', 'punch'],
};

function pick(fs: FrameSet, name: string): string | null {
  if (fs.img[name]) return name;
  for (const alt of FALLBACK[name] ?? []) if (fs.img[alt]) return alt;
  return fs.img.idle ? 'idle' : null;
}

function attackPose(m: CMove): string {
  if (m.isSuper) return 'super';
  const a = m.anim;
  if (a === 'uppercut' || a === 'cHP') return 'uppercut';
  if (a === 'cLK' || a === 'cHK') return 'sweep';
  if (a === 'cLP') return 'crouch';
  if (a === 'sLK' || a === 'sHK' || a === 'jK' || a === 'kickrush') return 'kick';
  if (a === 'cast' || a === 'counter' || a === 'slam' || a === 'spin' || a === 'taunt' || a === 'teleport' || a === 'super') return 'special';
  return 'punch';
}

export function hasFrames(char: number): boolean {
  return !!artFrames(char);
}

export function drawFrames(ctx: Ctx, f: FighterState, x: number, y: number, t: number, opts: { alt: boolean; flash: boolean }): boolean {
  const fs = artFrames(f.char);
  if (!fs) return false;
  const c = CHARS[f.char];
  let pose = 'idle';
  let sx = 1, sy = 1, rot = 0, dx = 0, dy = 0;
  let smear: { k: number; low: boolean; up: boolean } | null = null;
  let pivot = 0; // rotation centre as a fraction of the drawn height (0 = feet)
  let blend: { name: string; a: number } | null = null;
  switch (f.state) {
    case S_WALK:
      pose = Math.floor(f.sf / 9) % 2 === 0 ? 'walk' : 'idle';
      dy = -Math.abs(Math.sin(f.sf / 4.5)) * 1.5;
      break;
    case S_CROUCH:
    case S_JUMPSQUAT:
    case S_LAND:
      pose = 'crouch';
      break;
    case S_GETUP: {
      // rise out of the lying drawing into the crouch instead of popping
      pose = 'crouch';
      const p = Math.min(1, f.sf / 10);
      blend = { name: 'knockdown', a: 1 - p };
      dy = 6 * (1 - ease(p));
      sy = 0.9 + 0.1 * ease(p);
      break;
    }
    case S_AIR:
      pose = 'jump';
      rot = f.vy > 0 ? -0.04 : 0.05;
      break;
    case S_DASH:
      pose = 'walk';
      rot = f.dashDir === f.facing ? 0.12 : -0.08;
      break;
    case S_ATTACK: {
      const m = c.moves[f.move];
      const ap = attackPose(m);
      const k = m.dmg >= 70 || m.isSuper ? 1.35 : 1;
      if (ap === 'super') {
        pose = f.mf < m.startup ? 'super1' : 'super2';
      } else if (f.mf < m.startup * 0.4) {
        pose = ap === 'sweep' || ap === 'crouch' ? 'crouch' : ap === 'uppercut' ? 'crouch' : 'idle';
        rot = -0.05 * k;
        dx = -2 * k;
      } else if (f.mf < m.startup + m.active + m.recovery * 0.6) {
        pose = ap;
        const active = f.mf >= m.startup && f.mf < m.startup + m.active;
        if (active) {
          dx = 4 * k;
          sx = 1.03;
          if (m.hit) smear = { k, low: ap === 'sweep' || ap === 'crouch', up: ap === 'uppercut' };
        }
      } else {
        pose = ap === 'sweep' || ap === 'crouch' ? 'crouch' : 'idle';
      }
      break;
    }
    case S_HITSTUN: {
      const p = Math.min(1, f.sf / 12);
      pose = f.crouchHit ? 'crouch' : 'hit';
      dx = -4 * (1 - p) + (f.hitstop > 0 ? (t % 2 ? 1 : -1) : 0);
      break;
    }
    case S_BLOCKSTUN:
      pose = f.crouchHit ? 'crouch' : 'block';
      dx = -1.5;
      break;
    case S_THROWN:
      pose = 'hit';
      rot = -0.3 - 0.4 * ease(Math.min(1, f.sf / 20));
      pivot = 0.5;
      break;
    case S_AIRHIT: {
      // Recoil, tip back while rising, then fall flat with the head leading toward the floor.
      const hgt = f.y / FX;
      if (f.sf < 6 || f.vy > 0) {
        pose = 'hit';
        rot = -0.12 - 0.5 * ease(Math.min(1, f.sf / 18));
        pivot = 0.5;
        dx = f.sf < 6 ? -3 * (1 - f.sf / 6) : 0;
      } else {
        pose = 'knockdown';
        rot = -Math.min(0.55, 0.12 + hgt / 70);
        pivot = 0.5;
      }
      break;
    }
    case S_KNOCKDOWN:
    case S_KO: {
      pose = 'knockdown';
      if (f.sf < 14) {
        // one small bounce and a squash on impact
        const b = f.sf < 3 ? 0 : Math.sin(((f.sf - 3) / 11) * Math.PI);
        dy = -b * 5;
        rot = -b * 0.08;
        pivot = 0.5;
        sy = f.sf < 3 ? 0.9 + f.sf * 0.03 : 1;
        sx = f.sf < 3 ? 1.04 : 1;
      }
      break;
    }
    case S_WIN:
      pose = 'win';
      dy = -Math.abs(Math.sin(f.sf / 8)) * 4;
      break;
    default: {
      const b = Math.sin(t / 15 + f.char);
      sy = 1 + b * 0.012;
      sx = 1 - b * 0.006;
    }
  }
  const name = pick(fs, pose);
  if (!name) return false;
  const img = fs.img[name];
  const m = fs.meta[name];
  // A knockdown drawn standing would look wrong: rotate the hit pose flat instead.
  if (pose === 'knockdown' && name !== 'knockdown') rot = -Math.PI / 2;
  const H = c.h * 1.18;
  const k = H / m.stand;
  const smooth = ctx.imageSmoothingEnabled;
  const layer = (lname: string, alpha: number) => {
    const im = fs.img[lname];
    const mm = fs.meta[lname];
    const lift = rot <= -Math.PI / 2 + 0.01 ? -mm.w * k * 0.12 : 0;
    const py = pivot * mm.h * k;
    ctx.save();
    ctx.translate(x, y);
    if (f.facing < 0) ctx.scale(-1, 1);
    ctx.translate(dx, dy - py);
    ctx.rotate(rot);
    ctx.translate(0, py);
    ctx.scale(sx, sy);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (opts.alt) ctx.filter = 'hue-rotate(160deg) saturate(1.15)';
    ctx.globalAlpha = alpha;
    ctx.drawImage(im, -mm.ax * k, -mm.ay * k + lift, mm.w * k, mm.h * k);
    if (opts.flash) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35 * alpha;
      ctx.drawImage(im, -mm.ax * k, -mm.ay * k + lift, mm.w * k, mm.h * k);
    }
    ctx.restore();
  };
  if (blend && blend.a > 0.02 && fs.img[blend.name]) {
    const keep = { dy, sy };
    dy = 0; sy = 1;
    layer(blend.name, blend.a);
    dy = keep.dy; sy = keep.sy;
    layer(name, 1 - blend.a * 0.6);
  } else layer(name, 1);
  ctx.imageSmoothingEnabled = smooth;
  if (smear) drawSmear(ctx, f, x, y, H, smear);
  return true;
}

export { S_LAND };
