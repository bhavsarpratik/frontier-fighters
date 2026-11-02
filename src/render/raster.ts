import type { Ramp } from './color.ts';

// Vector shapes rasterized into crisp pixel art: cel shading from a front-top light,
// darker "sel-out" lines where a limb overlaps the body, and a 1px outline.
export type Shape =
  | { k: 'cap'; ax: number; ay: number; bx: number; by: number; ra: number; rb: number; c: Ramp; g: number; flat?: boolean }
  | { k: 'ell'; x: number; y: number; rx: number; ry: number; c: Ramp; g: number; flat?: boolean }
  | { k: 'poly'; pts: number[]; c: Ramp; g: number; flat?: boolean };

export interface Detail { x: number; y: number; w?: number; h?: number; c: number }

const LX = 0.55;
const LY = -0.83;

export interface Raster { canvas: HTMLCanvasElement | OffscreenCanvas; w: number; h: number }

function makeCanvas(w: number, h: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function rasterize(shapes: Shape[], details: Detail[], w: number, h: number): Raster {
  const n = w * h;
  const id = new Int16Array(n).fill(-1);
  const shade = new Int8Array(n);
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
    const ix0 = Math.max(0, Math.floor(x0));
    const iy0 = Math.max(0, Math.floor(y0));
    const ix1 = Math.min(w - 1, Math.ceil(x1));
    const iy1 = Math.min(h - 1, Math.ceil(y1));
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
          const d2 = ex * ex + ey * ey;
          if (d2 <= r * r) { inside = true; nx = ex / r; ny = ey / r; }
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
        if (s.flat) shade[k] = 0;
        else {
          const l = nx * LX + ny * LY;
          shade[k] = l > 0.42 ? 1 : l < -0.3 ? -1 : 0;
        }
      }
    }
  }
  const img = new ImageData(w, h);
  const out = new Uint32Array(img.data.buffer);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = y * w + x;
      const si = id[k];
      if (si >= 0) {
        const s = shapes[si];
        let col = shade[k] > 0 ? s.c.hi : shade[k] < 0 ? s.c.lo : s.c.base;
        const nb = [x > 0 ? id[k - 1] : -1, x < w - 1 ? id[k + 1] : -1, y > 0 ? id[k - w] : -1, y < h - 1 ? id[k + w] : -1];
        for (const j of nb) {
          if (j >= 0 && j < si && shapes[j].g !== s.g) { col = s.c.lo; break; }
        }
        out[k] = col;
      } else {
        let best = -1;
        if (x > 0 && id[k - 1] >= 0) best = id[k - 1];
        else if (x < w - 1 && id[k + 1] >= 0) best = id[k + 1];
        else if (y > 0 && id[k - w] >= 0) best = id[k - w];
        else if (y < h - 1 && id[k + w] >= 0) best = id[k + w];
        if (best >= 0) out[k] = shapes[best].c.line;
      }
    }
  }
  for (const d of details) {
    const dw = d.w ?? 1, dh = d.h ?? 1;
    for (let yy = 0; yy < dh; yy++) {
      for (let xx = 0; xx < dw; xx++) {
        const x = Math.floor(d.x) + xx, y = Math.floor(d.y) + yy;
        if (x >= 0 && y >= 0 && x < w && y < h) out[y * w + x] = d.c;
      }
    }
  }
  const canvas = makeCanvas(w, h);
  (canvas.getContext('2d') as CanvasRenderingContext2D).putImageData(img, 0, 0);
  return { canvas, w, h };
}
