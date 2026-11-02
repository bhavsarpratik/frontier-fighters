// Raw per-frame input: 9 bits. Directions are absolute (screen space).
export const UP = 1;
export const DOWN = 2;
export const LEFT = 4;
export const RIGHT = 8;
export const LP = 16;
export const HP = 32;
export const LK = 64;
export const HK = 128;
export const SP = 256;
export const PUNCHES = LP | HP;
export const KICKS = LK | HK;
export const BUTTONS = LP | HP | LK | HK | SP;

export const HIST = 32;

export function cleanSocd(raw: number): number {
  let r = raw;
  if ((r & (LEFT | RIGHT)) === (LEFT | RIGHT)) r &= ~(LEFT | RIGHT);
  if ((r & (UP | DOWN)) === (UP | DOWN)) r &= ~DOWN;
  return r;
}

// Numpad notation relative to facing (6 = toward opponent).
export function numpad(raw: number, facing: number): number {
  const fwd = facing > 0 ? (raw & RIGHT) !== 0 : (raw & LEFT) !== 0;
  const back = facing > 0 ? (raw & LEFT) !== 0 : (raw & RIGHT) !== 0;
  const h = fwd ? 2 : back ? 0 : 1;
  const v = raw & UP ? 2 : raw & DOWN ? 0 : 1;
  return v * 3 + h + 1;
}

export const isDown = (d: number) => d <= 3;
export const isUp = (d: number) => d >= 7;
export const isBack = (d: number) => d === 1 || d === 4 || d === 7;
export const isFwd = (d: number) => d === 3 || d === 6 || d === 9;

export type Motion = '236' | '214' | '623' | '236236' | '[4]6' | '[2]8';

const PATTERNS: Record<string, number[][]> = {
  '236': [[1, 2, 3], [6]],
  '214': [[1, 2, 3], [4]],
  '623': [[6], [1, 2, 3], [3, 6]],
  '236236': [[1, 2, 3], [6, 3], [1, 2, 3], [6]],
};
const WINDOW: Record<string, number> = { '236': 14, '214': 14, '623': 18, '236236': 30 };
const BUFFER = 5;

// hist: newest last. Each entry is raw input bits.
export function matchMotion(hist: number[], facing: number, m: Motion): boolean {
  const pat = PATTERNS[m];
  if (!pat) return false;
  const win = WINDOW[m];
  const n = hist.length;
  let step = pat.length - 1;
  let first = -1;
  for (let i = n - 1; i >= 0 && n - 1 - i < win + BUFFER; i--) {
    const d = numpad(hist[i], facing);
    if (step === pat.length - 1 && n - 1 - i > BUFFER && first < 0) return false;
    if (pat[step].includes(d)) {
      if (first < 0) first = i;
      step--;
      if (step < 0) return first - i <= win;
    }
  }
  return false;
}

export function pressed(cur: number, prev: number): number {
  return cur & ~prev & BUFFERED_MASK;
}
const BUFFERED_MASK = BUTTONS;
