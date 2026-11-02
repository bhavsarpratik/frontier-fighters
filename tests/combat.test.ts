import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMatch, step } from '../src/sim/step.ts';
import { DOWN, HK, HP, LEFT, LK, LP, RIGHT, SP, UP } from '../src/sim/input.ts';
import { px } from '../src/sim/fixed.ts';
import { CHARS } from '../src/sim/data.ts';
import { P_FIGHT, P_INTRO, P_KO, P_MATCH_END, S_AIR, type SimEvent, type SimState } from '../src/sim/types.ts';

const KARP = CHARS.findIndex((c) => c.def.id === 'karpathink');
const CODE = CHARS.findIndex((c) => c.def.id === 'codeaux');

function setup(gap = 40, p1 = KARP, p2 = KARP): SimState {
  const s = createMatch({ p1, p2, stage: 0, seed: 1, mode: 'training' });
  s.mode = 0; // skip the intro but keep versus rules
  s.f[0].x = px(360 - gap / 2);
  s.f[1].x = px(360 + gap / 2);
  return s;
}

function run(s: SimState, frames: number, i1: number | ((f: number) => number), i2: number | ((f: number) => number) = 0): SimEvent[] {
  const ev: SimEvent[] = [];
  for (let k = 0; k < frames; k++) {
    step(s, typeof i1 === 'function' ? i1(k) : i1, typeof i2 === 'function' ? i2(k) : i2);
    ev.push(...s.events.map((e) => ({ ...e, k: s.frame })));
  }
  return ev;
}

const once = (bits: number) => (k: number) => (k === 0 ? bits : 0);
const P2_BACK = RIGHT; // p2 faces left

test('jab connects only after its startup and only in range', () => {
  const s = setup(40);
  const ev = run(s, 20, once(LP));
  const hit = ev.find((e) => e.t === 'hit');
  assert.ok(hit, 'jab should hit at close range');
  const sLP = CHARS[KARP].def.moves.sLP;
  assert.ok(hit.k! - 1 >= sLP.startup, `hit on frame ${hit.k} before startup ${sLP.startup}`);
  const far = setup(200);
  assert.ok(!run(far, 20, once(LP)).some((e) => e.t === 'hit'), 'jab must whiff from far away');
});

test('standing block stops mids, crouch block stops lows, standing block loses to lows', () => {
  let s = setup(40);
  assert.ok(run(s, 20, once(LP), P2_BACK).some((e) => e.t === 'block'));
  s = setup(40);
  assert.ok(run(s, 20, once(DOWN | LK), DOWN | P2_BACK).some((e) => e.t === 'block'));
  s = setup(40);
  const ev = run(s, 20, once(DOWN | LK), P2_BACK);
  assert.ok(ev.some((e) => e.t === 'hit') && !ev.some((e) => e.t === 'block'));
});

test('jump-ins are overheads: crouch-blocking them fails', () => {
  const s = setup(40);
  s.f[0].state = S_AIR;
  s.f[0].y = px(40);
  s.f[0].vy = 0;
  const ev = run(s, 20, once(HK), DOWN | P2_BACK);
  assert.ok(ev.some((e) => e.t === 'hit'), 'overhead should beat crouch block');
});

test('throws land, and can be teched', () => {
  let s = setup(30);
  const hp0 = s.f[1].hp;
  let ev = run(s, 60, once(LP | LK));
  assert.ok(ev.some((e) => e.t === 'throw'));
  assert.ok(s.f[1].hp < hp0, 'throw should deal damage');
  s = setup(30);
  ev = run(s, 60, once(LP | LK), (k) => (k === 3 ? LP | LK : 0));
  assert.ok(ev.some((e) => e.t === 'tech'), 'pressing throw quickly should tech');
  assert.equal(s.f[1].hp, CHARS[KARP].def.hp);
});

test('combo damage scales down', () => {
  const s = setup(40, CODE, KARP);
  s.f[0].meter = 300;
  const hp0 = s.f[1].hp;
  const ev = run(s, 200, once(SP | UP));
  const hits = ev.filter((e) => e.t === 'hit').length;
  const dealt = hp0 - s.f[1].hp;
  const raw = CHARS[CODE].def.moves.mergeConflict.dmg * hits;
  assert.ok(hits >= 4, `super should multi-hit, got ${hits}`);
  assert.ok(dealt < raw, `scaled ${dealt} should be below raw ${raw}`);
});

test('KO ends the round and two round wins end the match', () => {
  const s = setup(40);
  for (let round = 0; round < 2; round++) {
    while (s.phase !== P_FIGHT) step(s, 0, 0);
    s.f[0].x = px(340);
    s.f[1].x = px(380);
    s.f[1].hp = 1;
    const ev = run(s, 30, once(HP));
    assert.ok(ev.some((e) => e.t === 'ko'), `round ${round + 1} should end in KO`);
    assert.equal(s.phase, P_KO);
    while (s.phase === P_KO) step(s, 0, 0);
    assert.equal(s.phase, round === 0 ? P_INTRO : P_MATCH_END);
  }
  assert.equal(s.matchWinner, 0);
  assert.equal(s.f[0].wins, 2);
});

test('specials come out from motions', () => {
  const s = setup(150);
  const qcf = [DOWN, DOWN | RIGHT, RIGHT | LP, 0];
  const ev = run(s, 30, (k) => qcf[k] ?? 0);
  assert.ok(ev.some((e) => e.t === 'proj'), 'qcf+P should throw Backprop Blast');
  const s2 = setup(150);
  const ev2 = run(s2, 30, once(SP));
  assert.ok(ev2.some((e) => e.t === 'proj'), 'simple-mode special button should work');
  void LEFT; void HP;
});
