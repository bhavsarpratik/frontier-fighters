import { ROSTER } from '../content/roster.ts';
import { POSES } from './poses.ts';
import { altLook, buildShapes } from './rig.ts';
import { rasterize } from './raster.ts';

const cache = new Map<string, HTMLCanvasElement>();

// Upper-body close-up rendered at 3x scale so it reads as a hi-res pixel portrait.
export function portrait(char: number, alt = false, size = 64): HTMLCanvasElement {
  const key = `${char}|${alt}|${size}`;
  let c = cache.get(key);
  if (c) return c;
  const def = ROSTER[char];
  const look = alt ? altLook(def.look) : def.look;
  const scale = 3;
  const W = 300;
  const H = 420;
  const b = buildShapes(look, { ...POSES.intro, t: 2, h: 4 }, scale);
  const dx = 150 - 80;
  const dy = 410 - 146;
  for (const s of b.shapes) {
    if (s.k === 'cap') { s.ax += dx; s.bx += dx; s.ay += dy; s.by += dy; }
    else if (s.k === 'ell') { s.x += dx; s.y += dy; }
    else for (let i = 0; i < s.pts.length; i += 2) { s.pts[i] += dx; s.pts[i + 1] += dy; }
  }
  for (const d of b.details) { d.x += dx; d.y += dy; }
  const r = rasterize(b.shapes, b.details, W, H);
  c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const crop = 96;
  const hx = b.head[0] + dx;
  const hy = b.head[1] + dy;
  ctx.drawImage(r.canvas as CanvasImageSource, hx - crop / 2 - 6, hy - crop * 0.38, crop, crop, 0, 0, size, size);
  cache.set(key, c);
  return c;
}
