export function nextRand(seed: number): number {
  let x = seed | 0 || 0x9e3779b9;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return x >>> 0;
}

export function rngInt(s: { seed: number }, n: number): number {
  s.seed = nextRand(s.seed);
  return s.seed % n;
}
