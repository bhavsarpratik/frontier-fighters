import { pack, type Ramp, type RGB } from './color.ts';

// Vector shapes rasterized into pixel art: five-tone cel shading from a front-top key light
// with dithered transitions, a back rim light, darker "sel-out" lines where a part overlaps
// another, and a 1px coloured outline. Output is cropped to the drawn area.
export type Shape =
  | { k: 'cap'; ax: number; ay: number; bx: number; by: number; ra: number; rb: number; c: Ramp; g: number; flat?: boolean }
  | { k: 'ell'; x: number; y: number; rx: number; ry: number; c: Ramp; g: number; flat?: boolean }
  | { k: 'poly'; pts: number[]; c: Ramp; g: number; flat?: boolean };

export interface Detail { x: number; y: number; w?: number; h?: number; c: number }

const LX = 0.55;
const LY = -0.83;

export interface Raster { canvas: HTMLCanvasElement | OffscreenCanvas; w: number; h: number; x0: number; y0: number }

function makeCanvas(w: number, h: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

const T_HI2 = 0.64, T_HI = 0.3, T_LO = -0.2, T_LO2 = -0.56, DITHER = 0.055;

function tone(l: number, x: number, y: number, spec: boolean): number {
  const chk = ((x + y) & 1) === 0;
  const pick = (t: number, above: number, below: number) => (l > t + DITHER ? above : l < t - DITHER ? below : chk ? above : below);
  if (l > T_HI - DITHER) {
    if (spec && l > T_HI2 - DITHER) return pick(T_HI2, 2, 1);
    return pick(T_HI, 1, 0);
  }
  if (l > T_LO - DITHER) return pick(T_LO, 0, -1);
  if (l > T_LO2 - DITHER) return pick(T_LO2, -1, -2);
  return -2;
}

export function rasterize(shapes: Shape[], details: Detail[], w: number, h: number, rim?: RGB): Raster {
  const n = w * h;
  const id = new Int16Array(n).fill(-1);
  const shade = new Int8Array(n);
  let bx0 = w, by0 = h, bx1 = 0, by1 = 0;
  for (let si = 0; si < shapes.length; si++) {
    const s = shapes[si];
    let x0: number, y0: number, x1: number, y1: number;
    if (s.k === 'cap') {
      const r = Math.max(s.ra, s.rb);
      x0 = Math.min(s.ax, s.bx) - r; x1 = Math.max(s.ax, s.bx) + r;
      y0 = Math.min(s.ay, s.by) - r; y1 = Math.max(s.ay, s.by) + r;
    } else if (s.k === 'ell') {
      x0 = s.x - s.rx; x1 = s.x + s.rx; y0 = s.y - s.ry; y1 = s.y + s.ry;
    } else {
      x0 = Infinity; y0 = Infinity; x1 = -Infinity; y1 = -Infinity;
      for (let i = 0; i < s.pts.length; i += 2) {
        x0 = Math.min(x0, s.pts[i]); x1 = Math.max(x1, s.pts[i]);
        y0 = Math.min(y0, s.pts[i + 1]); y1 = Math.max(y1, s.pts[i + 1]);
      }
    }
    const ix0 = Math.max(1, Math.floor(x0));
    const iy0 = Math.max(1, Math.floor(y0));
    const ix1 = Math.min(w - 2, Math.ceil(x1));
    const iy1 = Math.min(h - 2, Math.ceil(y1));
    let cx = 0, cy = 0, rad = 1;
    if (s.k === 'poly') {
      for (let i = 0; i < s.pts.length; i += 2) { cx += s.pts[i]; cy += s.pts[i + 1]; }
      cx /= s.pts.length / 2; cy /= s.pts.length / 2;
      rad = Math.max(1, Math.max(x1 - x0, y1 - y0) / 2);
    }
    for (let y = iy0; y <= iy1; y++) {
      const py = y + 0.5;
      for (let x = ix0; x <= ix1; x++) {
        const px = x + 0.5;
        let nx = 0, ny = 0, inside = false;
        if (s.k === 'cap') {
          const dx = s.bx - s.ax, dy = s.by - s.ay;
          const L = dx * dx + dy * dy;
          let t = L > 0 ? ((px - s.ax) * dx + (py - s.ay) * dy) / L : 0;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const qx = s.ax + dx * t, qy = s.ay + dy * t;
          const r = s.ra + (s.rb - s.ra) * t;
          const ex = px - qx, ey = py - qy;
          if (ex * ex + ey * ey <= r * r) { inside = true; nx = ex / r; ny = ey / r; }
        } else if (s.k === 'ell') {
          const ex = (px - s.x) / s.rx, ey = (py - s.y) / s.ry;
          if (ex * ex + ey * ey <= 1) { inside = true; nx = ex; ny = ey; }
        } else {
          let c = false;
          const p = s.pts;
          for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
            if ((p[i + 1] > py) !== (p[j + 1] > py) && px < ((p[j] - p[i]) * (py - p[i + 1])) / (p[j + 1] - p[i + 1]) + p[i]) c = !c;
          }
          if (c) { inside = true; nx = (px - cx) / rad; ny = (py - cy) / rad; }
        }
        if (!inside) continue;
        const k = y * w + x;
        id[k] = si;
        shade[k] = s.flat ? 0 : tone(nx * LX + ny * LY, x, y, s.c.spec);
        if (x < bx0) bx0 = x;
        if (x > bx1) bx1 = x;
        if (y < by0) by0 = y;
        if (y > by1) by1 = y;
      }
    }
  }
  bx0 = Math.max(0, bx0 - 2); by0 = Math.max(0, by0 - 2);
  bx1 = Math.min(w - 1, bx1 + 2); by1 = Math.min(h - 1, by1 + 2);
  if (bx1 < bx0) { bx0 = 0; by0 = 0; bx1 = 0; by1 = 0; }
  const cw = bx1 - bx0 + 1;
  const ch = by1 - by0 + 1;
  const img = new ImageData(cw, ch);
  const out = new Uint32Array(img.data.buffer);
  const rimC = rim ? rim : null;
  for (let y = by0; y <= by1; y++) {
    for (let x = bx0; x <= bx1; x++) {
      const k = y * w + x;
      const o = (y - by0) * cw + (x - bx0);
      const si = id[k];
      const nb0 = id[k - 1], nb1 = id[k + 1], nb2 = id[k - w], nb3 = id[k + w];
      if (si >= 0) {
        const s = shapes[si];
        const sh = shade[k];
        let col = sh === 2 ? s.c.hi2 : sh === 1 ? s.c.hi : sh === 0 ? s.c.base : sh === -1 ? s.c.lo : s.c.lo2;
        const edge = nb0 < 0 || nb1 < 0 || nb2 < 0 || nb3 < 0;
        if (edge && rimC && sh <= -1 && !s.flat) {
          const b = s.c.rgb;
          col = pack([(b[0] + rimC[0] * 2) / 3 | 0, (b[1] + rimC[1] * 2) / 3 | 0, (b[2] + rimC[2] * 2) / 3 | 0]);
        } else {
          for (const j of [nb0, nb1, nb2, nb3]) {
            if (j >= 0 && j < si && shapes[j].g !== s.g) { col = s.c.lo2; break; }
          }
        }
        out[o] = col;
      } else {
        const best = nb0 >= 0 ? nb0 : nb1 >= 0 ? nb1 : nb2 >= 0 ? nb2 : nb3;
        if (best >= 0) out[o] = shapes[best].c.line;
      }
    }
  }
  for (const d of details) {
    const dw = Math.max(1, Math.round(d.w ?? 1)), dh = Math.max(1, Math.round(d.h ?? 1));
    for (let yy = 0; yy < dh; yy++) {
      for (let xx = 0; xx < dw; xx++) {
        const x = Math.floor(d.x) + xx - bx0, y = Math.floor(d.y) + yy - by0;
        if (x >= 0 && y >= 0 && x < cw && y < ch) out[y * cw + x] = d.c;
      }
    }
  }
  const canvas = makeCanvas(cw, ch);
  (canvas.getContext('2d') as CanvasRenderingContext2D).putImageData(img, 0, 0);
  return { canvas, w: cw, h: ch, x0: bx0, y0: by0 };
}
