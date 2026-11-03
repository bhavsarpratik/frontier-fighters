import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHARS } from '../src/sim/data.ts';
import { createMatch, step } from '../src/sim/step.ts';
import { DOWN, HK, HP, LEFT, LK, LP, RIGHT, SP, UP } from '../src/sim/input.ts';
import { px } from '../src/sim/fixed.ts';
import { S_ATTACK } from '../src/sim/types.ts';
import { ANIMS } from '../src/render/poses.ts';

test('roster has 21 fighters with unique ids', () => {
  assert.equal(CHARS.length, 21);
  assert.equal(new Set(CHARS.map((c) => c.def.id)).size, 21);
});

test('every move has sane frame data and a known animation', () => {
  for (const c of CHARS) {
    for (const m of c.moves) {
      const where = `${c.def.id}.${m.key}`;
      assert.ok(m.startup >= 1 && m.active >= 1 && m.recovery >= 0, `${where} frame data`);
      assert.ok(ANIMS[m.anim], `${where} anim ${m.anim} missing`);
      const effect = m.hit || m.proj || m.grab || m.fx;
      assert.ok(effect, `${where} does nothing`);
      if (m.hit) assert.ok(m.dmg > 0 && m.hitstun > 0, `${where} hits for nothing`);
      if (m.isSuper) assert.ok(m.superFx, `${where} super needs a cinematic theme`);
      if (m.proj) assert.ok(m.proj.frame <= m.total, `${where} projectile spawns after the move ends`);
      if (m.hits && m.hits > 1) assert.ok((m.hits - 1) * (m.hitGap ?? 4) < m.active, `${where} cannot land all ${m.hits} hits`);
    }
    assert.ok(c.moves[c.superIdx].isSuper, `${c.def.id} super flag`);
    assert.equal(c.specials.length, 3, `${c.def.id} should have 3 specials`);
    assert.ok(c.def.quotes.length >= 2);
  }
});

const R = RIGHT; // p1 faces right
const MOTIONS: Record<string, number[]> = {
  '236': [DOWN, DOWN | R, R],
  '214': [DOWN, DOWN | LEFT, LEFT],
  '623': [R, 0, DOWN, DOWN | R],
  '236236': [DOWN, DOWN | R, R, DOWN, DOWN | R, R],
};

function motionInputs(motion: string, button: number): number[] {
  if (motion === '[4]6') return [...new Array(40).fill(LEFT), R | button];
  if (motion === '[2]8') return [...new Array(40).fill(DOWN), UP | button];
  const seq = MOTIONS[motion];
  return [...seq.slice(0, -1), seq[seq.length - 1] | button];
}

function triggers(ci: number, inputs: number[], moveIdx: number, meter = 0): boolean {
  const s = createMatch({ p1: ci, p2: 0, stage: 0, seed: 3, mode: 'training' });
  s.mode = 0;
  s.f[0].x = px(300);
  s.f[1].x = px(360);
  s.f[0].meter = meter;
  for (const i of [...inputs, 0, 0]) {
    step(s, i, 0);
    if (s.f[0].state === S_ATTACK && s.f[0].move === moveIdx) return true;
  }
  return false;
}

test('every special comes out from its motion and from the simple special button', () => {
  for (let ci = 0; ci < CHARS.length; ci++) {
    const c = CHARS[ci];
    for (const sp of c.specials) {
      const btn = sp.mask & (LP | HP) ? LP : LK;
      assert.ok(triggers(ci, motionInputs(sp.motion, btn), sp.move), `${c.def.id} ${sp.motion} -> ${c.moves[sp.move].key}`);
      const dir = sp.simple === 'f' ? R : sp.simple === 'd' ? DOWN : sp.simple === 'b' ? LEFT : 0;
      assert.ok(triggers(ci, [dir | SP], sp.move), `${c.def.id} simple ${sp.simple} -> ${c.moves[sp.move].key}`);
    }
  }
});

test('every super needs full meter and comes out from both inputs', () => {
  for (let ci = 0; ci < CHARS.length; ci++) {
    const c = CHARS[ci];
    assert.ok(!triggers(ci, motionInputs('236236', LP), c.superIdx, 0), `${c.def.id} super without meter`);
    assert.ok(triggers(ci, motionInputs('236236', LP), c.superIdx, 300), `${c.def.id} super motion`);
    assert.ok(triggers(ci, [UP | SP], c.superIdx, 300), `${c.def.id} super simple`);
  }
  void HK;
});

test('only one super per round, and it empties the meter', () => {
  const c = CHARS[0];
  const s = createMatch({ p1: 0, p2: 1, stage: 0, seed: 3, mode: 'training' });
  s.mode = 0;
  s.f[0].x = px(250);
  s.f[1].x = px(420);
  s.f[0].meter = 300;
  for (const i of [UP | SP, 0]) step(s, i, 0);
  assert.equal(s.f[0].move, c.superIdx, 'first super should fire');
  assert.equal(s.f[0].meter, 0);
  for (let k = 0; k < 160; k++) step(s, 0, 0);
  s.f[0].meter = 300;
  let fired = false;
  for (const i of [UP | SP, 0, 0]) { step(s, i, 0); if (s.f[0].move === c.superIdx) fired = true; }
  assert.equal(fired, false, 'second super in the same round must be blocked');
});
