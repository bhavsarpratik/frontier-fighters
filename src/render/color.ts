export type RGB = [number, number, number];

export function hex(h: string): RGB {
  const v = parseInt(h.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

export const mix = (a: RGB, b: RGB, t: number): RGB => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

export const css = (c: RGB, a = 1) => (a >= 1 ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${a})`);

// Little-endian packed RGBA for Uint32Array views over ImageData.
export const pack = (c: RGB, a = 255) => ((a << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0;

const LIGHT: RGB = [255, 246, 222];
const SHADOW: RGB = [40, 22, 76];
const INK: RGB = [16, 8, 28];

// Five tones per material plus an outline colour. `spec` enables the brightest tone (gloss).
export interface Ramp { hi2: number; hi: number; base: number; lo: number; lo2: number; line: number; rgb: RGB; spec: boolean }

export function ramp(h: string, back = false, gloss = 0.26, spec = false): Ramp {
  let base = hex(h);
  if (back) base = mix(base, SHADOW, 0.22);
  return {
    hi2: pack(mix(base, LIGHT, Math.min(0.85, gloss + 0.4))),
    hi: pack(mix(base, LIGHT, gloss)),
    base: pack(base),
    lo: pack(mix(base, SHADOW, 0.34)),
    lo2: pack(mix(base, SHADOW, 0.6)),
    line: pack(mix(base, INK, 0.78)),
    rgb: base,
    spec,
  };
}

export function rotateHue(h: string, deg: number): string {
  const [r, g, b] = hex(h).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let s = 0;
  let hh = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    hh = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    hh *= 60;
  }
  hh = (hh + deg + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * Math.max(s, 0.35);
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = l - c / 2;
  const [r1, g1, b1] = hh < 60 ? [c, x, 0] : hh < 120 ? [x, c, 0] : hh < 180 ? [0, c, x] : hh < 240 ? [0, x, c] : hh < 300 ? [x, 0, c] : [c, 0, x];
  const to = (v: number) => Math.max(0, Math.min(255, Math.round((v + m) * 255))).toString(16).padStart(2, '0');
  return `#${to(r1)}${to(g1)}${to(b1)}`;
}
