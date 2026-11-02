import { ROSTER } from '../content/roster.ts';
import { POSES } from './poses.ts';
import { altLook, buildShapes } from './rig.ts';
import { rasterize } from './raster.ts';

const cache = new Map<string, { c: HTMLCanvasElement; x: number; y: number; s: number }>();
const RES = 7;

// Upper-body close-up rendered at high resolution so it reads as detailed pixel art.
function source(char: number, alt: boolean) {
  const key = `${char}|${alt}`;
  let e = cache.get(key);
  if (e) return e;
  const def = ROSTER[char];
  const look = alt ? altLook(def.look) : def.look;
  const W = 62 * RES;
  const H = 120 * RES;
  const b = buildShapes(look, POSES.portrait, RES, W / 2, H - 2 * RES);
  const r = rasterize(b.shapes, b.details, W, H);
  const c = document.createElement('canvas');
  c.width = r.w;
  c.height = r.h;
  c.getContext('2d')!.drawImage(r.canvas as CanvasImageSource, 0, 0);
  const crop = 34 * RES;
  e = { c, x: b.head[0] - r.x0 - crop * 0.55, y: b.head[1] - r.y0 - crop * 0.42, s: crop };
  cache.set(key, e);
  return e;
}

export function drawPortrait(ctx: CanvasRenderingContext2D, char: number, alt: boolean, x: number, y: number, size: number, flip = false): void {
  const p = source(char, alt);
  const smooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (flip) {
    ctx.save();
    ctx.translate(x + size, y);
    ctx.scale(-1, 1);
    ctx.drawImage(p.c, p.x, p.y, p.s, p.s, 0, 0, size, size);
    ctx.restore();
  } else ctx.drawImage(p.c, p.x, p.y, p.s, p.s, x, y, size, size);
  ctx.imageSmoothingEnabled = smooth;
}
