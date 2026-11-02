// 5x7 bitmap font, rows top to bottom, 5 bits per row (MSB = left).
const G: Record<string, number[]> = {
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30], E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17], I: [14, 4, 4, 4, 4, 4, 14],
  J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17], N: [17, 25, 21, 19, 17, 17, 17], O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16], Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4], U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31],
  3: [31, 2, 4, 2, 1, 17, 14], 4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 30, 1, 1, 17, 14],
  6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8], 8: [14, 17, 17, 14, 17, 17, 14],
  9: [14, 17, 17, 15, 1, 2, 12],
  ' ': [0, 0, 0, 0, 0, 0, 0], '.': [0, 0, 0, 0, 0, 12, 12], ',': [0, 0, 0, 0, 12, 4, 8],
  '!': [4, 4, 4, 4, 4, 0, 4], '?': [14, 17, 1, 2, 4, 0, 4], '-': [0, 0, 0, 31, 0, 0, 0],
  ':': [0, 12, 12, 0, 12, 12, 0], "'": [12, 4, 8, 0, 0, 0, 0], '"': [10, 10, 0, 0, 0, 0, 0],
  '/': [1, 1, 2, 4, 8, 16, 16], '%': [24, 25, 2, 4, 8, 19, 3], '+': [0, 4, 4, 31, 4, 4, 0],
  '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8], '&': [12, 18, 20, 8, 21, 18, 13],
  '*': [0, 4, 21, 14, 21, 4, 0], '#': [10, 10, 31, 10, 31, 10, 10], '>': [8, 4, 2, 1, 2, 4, 8],
  '<': [2, 4, 8, 16, 8, 4, 2], '=': [0, 0, 31, 0, 31, 0, 0], '_': [0, 0, 0, 0, 0, 0, 31],
  '[': [14, 8, 8, 8, 8, 8, 14], ']': [14, 2, 2, 2, 2, 2, 14], '^': [4, 10, 17, 0, 0, 0, 0],
  '@': [14, 17, 23, 21, 23, 16, 14], '|': [4, 4, 4, 4, 4, 4, 4], '~': [0, 0, 8, 21, 2, 0, 0],
};

export const GLYPH_W = 6;
export const GLYPH_H = 8;

export interface TextOpts {
  scale?: number;
  color?: string;
  shadow?: string | null;
  outline?: string | null;
  align?: 'left' | 'center' | 'right';
  gradient?: [string, string];
}

export function textWidth(s: string, scale = 1): number {
  return Math.max(0, s.length * GLYPH_W - 1) * scale;
}

const cache = new Map<string, HTMLCanvasElement>();

function render(s: string, scale: number, o: TextOpts): HTMLCanvasElement {
  const key = `${s}|${scale}|${o.color}|${o.shadow}|${o.outline}|${o.gradient}`;
  let c = cache.get(key);
  if (c) return c;
  const pad = 2 * scale;
  c = document.createElement('canvas');
  c.width = textWidth(s, scale) + pad * 2;
  c.height = 7 * scale + pad * 2;
  const ctx = c.getContext('2d')!;
  const plot = (color: string | CanvasGradient, dx: number, dy: number) => {
    ctx.fillStyle = color;
    let x = pad + dx;
    for (const ch of s.toUpperCase()) {
      const g = G[ch] ?? G['?'];
      for (let r = 0; r < 7; r++) {
        const bits = g[r];
        for (let b = 0; b < 5; b++) if (bits & (16 >> b)) ctx.fillRect(x + b * scale, pad + dy + r * scale, scale, scale);
      }
      x += GLYPH_W * scale;
    }
  };
  if (o.outline) {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) plot(o.outline, dx * Math.max(1, scale >> 1), dy * Math.max(1, scale >> 1));
  }
  if (o.shadow) plot(o.shadow, scale > 1 ? scale >> 1 : 1, scale > 1 ? scale >> 1 : 1);
  let fill: string | CanvasGradient = o.color ?? '#fff';
  if (o.gradient) {
    const g = ctx.createLinearGradient(0, pad, 0, pad + 7 * scale);
    g.addColorStop(0, o.gradient[0]);
    g.addColorStop(1, o.gradient[1]);
    fill = g;
  }
  plot(fill, 0, 0);
  cache.set(key, c);
  if (cache.size > 500) cache.delete(cache.keys().next().value!);
  return c;
}

export function drawText(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, o: TextOpts = {}): void {
  const scale = o.scale ?? 1;
  const opts = { color: '#fff', shadow: '#000', outline: null, ...o };
  const c = render(s, scale, opts);
  const w = textWidth(s, scale);
  const ax = o.align === 'center' ? x - (w >> 1) : o.align === 'right' ? x - w : x;
  ctx.drawImage(c, Math.round(ax - 2 * scale), Math.round(y - 2 * scale));
}

export function wrap(s: string, maxChars: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const w of s.split(' ')) {
    if ((line + ' ' + w).trim().length > maxChars) {
      out.push(line.trim());
      line = w;
    } else line += ' ' + w;
  }
  if (line.trim()) out.push(line.trim());
  return out;
}
