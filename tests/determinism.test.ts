import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMatch, step, hashState, cloneState } from '../src/sim/step.ts';
import { CHARS } from '../src/sim/data.ts';
import { nextRand } from '../src/sim/rng.ts';

function randomInputs(seed: number, n: number): number[][] {
  const out: number[][] = [];
  let r = seed;
  let a = 0, b = 0;
  for (let i = 0; i < n; i++) {
    r = nextRand(r);
    if (r % 6 === 0) a = (r >>> 8) & 0x1ff;
    r = nextRand(r);
    if (r % 6 === 0) b = (r >>> 8) & 0x1ff;
    out.push([a, b]);
  }
  return out;
}

function run(p1: number, p2: number, inputs: number[][]): number[] {
  const s = createMatch({ p1, p2, stage: 0, seed: 1234 });
  const hashes: number[] = [];
  for (const [a, b] of inputs) {
    step(s, a, b);
    hashes.push(hashState(s));
  }
  return hashes;
}

test('same inputs produce identical state every frame (all matchups)', () => {
  const n = CHARS.length;
  for (let p1 = 0; p1 < n; p1++) {
    for (let p2 = 0; p2 < n; p2++) {
      const inputs = randomInputs(77 + p1 * 31 + p2, 4000);
      assert.deepEqual(run(p1, p2, inputs), run(p1, p2, inputs));
    }
  }
});

test('long random match never produces NaN or non-integer positions', () => {
  const inputs = randomInputs(999, 10000);
  const s = createMatch({ p1: 0, p2: CHARS.length - 1, stage: 0, seed: 5 });
  for (const [a, b] of inputs) {
    step(s, a, b);
    for (const f of s.f) {
      for (const k of ['x', 'y', 'vx', 'vy', 'hp', 'meter'] as const) {
        assert.ok(Number.isInteger(f[k]), `${k}=${f[k]} at frame ${s.frame}`);
      }
    }
  }
});

test('clone then step equals step on original', () => {
  const inputs = randomInputs(42, 3000);
  const s = createMatch({ p1: 0, p2: 1 % CHARS.length, stage: 0, seed: 9 });
  for (let i = 0; i < inputs.length; i++) {
    if (i % 97 === 0) {
      const c = cloneState(s);
      step(c, inputs[i][0], inputs[i][1]);
      step(s, inputs[i][0], inputs[i][1]);
      assert.equal(hashState(c), hashState(s));
    } else step(s, inputs[i][0], inputs[i][1]);
  }
});
