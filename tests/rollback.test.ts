import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMatch, hashState, step, cloneState } from '../src/sim/step.ts';
import { RollbackSession, HASH_EVERY } from '../src/net/rollback.ts';
import { LoopbackNet, type LinkSim } from '../src/net/loopback.ts';
import { nextRand } from '../src/sim/rng.ts';
import { CHARS } from '../src/sim/data.ts';

function play(link: LinkSim, frames: number, jitterTicks = false) {
  let now = 0;
  const net = new LoopbackNet(link, () => now);
  const init = createMatch({ p1: 0, p2: CHARS.length - 1, stage: 0, seed: 777 });
  const mk = (local: 0 | 1) => new RollbackSession({ local, transport: net.ends[local], init: cloneState(init), delay: 2, now: () => now, record: true });
  const a = mk(0);
  const b = mk(1);
  let ra = 5, rb = 9, ia = 0, ib = 0;
  let maxLead = 0;
  for (let k = 0; k < frames; k++) {
    now = k * (1000 / 60);
    net.pump();
    ra = nextRand(ra);
    if (ra % 5 === 0) ia = (ra >>> 7) & 0x1ff;
    a.tick(ia);
    net.pump();
    rb = nextRand(rb);
    if (rb % 5 === 0) ib = (rb >>> 7) & 0x1ff;
    if (!jitterTicks || k % 7 !== 3) b.tick(ib);
    maxLead = Math.max(maxLead, a.frame - a.remoteConfirmed, b.frame - b.remoteConfirmed);
  }
  // drain: lossless link, neutral inputs, until both sides have confirmed everything
  link.loss = 0;
  for (let k = 0; k < 600; k++) {
    now += 1000 / 60;
    net.pump();
    a.tick(0);
    net.pump();
    b.tick(0);
  }
  return { a, b, init, maxLead };
}

function replay(init: ReturnType<typeof createMatch>, log: [number[], number[]], upto: number): Map<number, number> {
  const s = cloneState(init);
  const out = new Map<number, number>();
  for (let f = 0; f < upto; f++) {
    step(s, log[0][f], log[1][f]);
    if ((f + 1) % HASH_EVERY === 0) out.set(f + 1, hashState(s));
  }
  return out;
}

for (const [name, link] of [
  ['clean 30ms', { latency: 30, jitter: 0, loss: 0, seed: 1 }],
  ['60ms + jitter + 10% loss', { latency: 60, jitter: 40, loss: 0.1, seed: 2 }],
  ['150ms + 30ms jitter + 10% loss', { latency: 150, jitter: 30, loss: 0.1, seed: 3 }],
] as [string, LinkSim][]) {
  test(`rollback peers stay in sync: ${name}`, () => {
    const { a, b, init, maxLead } = play({ ...link }, 2500);
    assert.equal(a.desync, false, `desync at ${a.desyncFrame}`);
    assert.equal(b.desync, false, `desync at ${b.desyncFrame}`);
    const upto = Math.min(a.remoteConfirmed, b.remoteConfirmed, a.frame - 1, b.frame - 1);
    assert.ok(upto > 2000, `confirmed only ${upto} frames`);
    const la = a.log!, lb = b.log!;
    for (let f = 0; f < upto; f++) {
      assert.equal(la[0][f], lb[0][f], `p1 input differs at ${f}`);
      assert.equal(la[1][f], lb[1][f], `p2 input differs at ${f}`);
    }
    // Checksums each peer computed for confirmed frames equal an offline replay of the inputs.
    const ref = replay(init, la, upto);
    let matched = 0;
    for (const [f, h] of ref) {
      for (const peer of [a, b]) {
        const got = peer.hashAt(f);
        if (got === undefined) continue;
        assert.equal(got, h, `peer ${peer.local} state at frame ${f} differs from offline replay`);
        matched++;
      }
    }
    assert.ok(matched >= 20, `only ${matched} checksums compared`);
    assert.ok(maxLead <= a.maxRollback + 1, `prediction window ${maxLead} exceeded max rollback`);
  });
}

test('uneven tick rates and heavy loss still converge without desync', () => {
  const { a, b } = play({ latency: 80, jitter: 50, loss: 0.15, seed: 9 }, 1500, true);
  assert.equal(a.desync || b.desync, false);
  assert.ok(Math.min(a.frame, b.frame) > 1500);
  assert.ok(a.rollbacks > 0 && b.rollbacks > 0, 'lossy link should cause rollbacks');
});
