import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOWN, LEFT, RIGHT, UP, matchMotion, numpad } from '../src/sim/input.ts';

const D: Record<number, number> = { 1: DOWN | LEFT, 2: DOWN, 3: DOWN | RIGHT, 4: LEFT, 5: 0, 6: RIGHT, 7: UP | LEFT, 8: UP, 9: UP | RIGHT };
const mirror = (raw: number) => (raw & ~(LEFT | RIGHT)) | (raw & LEFT ? RIGHT : 0) | (raw & RIGHT ? LEFT : 0);
function hist(seq: number[], facing = 1, pad = 8): number[] {
  const h = new Array(pad).fill(0);
  for (const d of seq) h.push(facing > 0 ? D[d] : mirror(D[d]));
  return h;
}

test('numpad is relative to facing', () => {
  assert.equal(numpad(RIGHT, 1), 6);
  assert.equal(numpad(RIGHT, -1), 4);
  assert.equal(numpad(DOWN | LEFT, -1), 3);
});

test('quarter-circle forward', () => {
  assert.ok(matchMotion(hist([2, 3, 6]), 1, '236'));
  assert.ok(matchMotion(hist([2, 6]), 1, '236'));
  assert.ok(matchMotion(hist([2, 3, 6], -1), -1, '236'));
  assert.ok(!matchMotion(hist([2, 3, 6], -1), 1, '236'));
  assert.ok(!matchMotion(hist([6, 6]), 1, '236'));
});

test('buffer: motion completed a few frames before the press still counts', () => {
  assert.ok(matchMotion(hist([2, 3, 6, 5, 5, 5]), 1, '236'));
  assert.ok(!matchMotion(hist([2, 3, 6, 5, 5, 5, 5, 5, 5, 5]), 1, '236'));
});

test('dragon punch and quarter-circle back', () => {
  assert.ok(matchMotion(hist([6, 5, 2, 3]), 1, '623'));
  assert.ok(matchMotion(hist([6, 2, 3]), 1, '623'));
  assert.ok(!matchMotion(hist([2, 3, 6]), 1, '623'));
  assert.ok(matchMotion(hist([2, 1, 4]), 1, '214'));
});

test('double quarter-circle for supers', () => {
  assert.ok(matchMotion(hist([2, 3, 6, 2, 3, 6]), 1, '236236'));
  assert.ok(!matchMotion(hist([2, 3, 6]), 1, '236236'));
});

test('too slow motions are rejected', () => {
  const slow = [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 6];
  assert.ok(matchMotion(hist(slow), 1, '236'));
  const verySlow = [2, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6];
  assert.ok(!matchMotion(hist(verySlow), 1, '236'));
});
