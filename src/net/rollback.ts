import { cloneState, hashState, step } from '../sim/step.ts';
import type { SimEvent, SimState } from '../sim/types.ts';
import type { Transport } from './transport.ts';

// GGPO-style rollback for two players.
// Frame f is simulated with inputs[0][f], inputs[1][f]. The local player's input is scheduled
// `delay` frames ahead; the remote's is predicted (repeat last confirmed) until it arrives,
// at which point a mismatch rewinds to the saved state and resimulates.

const T_INPUT = 1;
const T_HASH = 2;
const T_PING = 3;
const T_PONG = 4;
const MAX_SEND = 40;
export const HASH_EVERY = 30;

export interface RollbackOpts {
  local: 0 | 1;
  transport: Transport;
  init: SimState;
  delay?: number;
  maxRollback?: number;
  now?: () => number;
  record?: boolean;
}

export interface TickResult {
  state: SimState;
  events: SimEvent[];
  advanced: boolean;
  stalled: boolean;
  desync: boolean;
}

export class RollbackSession {
  frame = 0;
  state: SimState;
  readonly local: 0 | 1;
  readonly remote: 0 | 1;
  readonly delay: number;
  readonly maxRollback: number;
  private inputs: [Map<number, number>, Map<number, number>] = [new Map(), new Map()];
  private predicted = new Map<number, number>();
  private states = new Map<number, SimState>();
  remoteConfirmed: number;
  private remoteAck = -1;
  private remoteFrame = 0;
  private remoteAdv = 0;
  private pendingFrom = Infinity;
  private localHashes = new Map<number, number>();
  private remoteHashes = new Map<number, number>();
  private lastHashed = -1;
  private syncCountdown = 0;
  private now: () => number;
  lastRecv: number;
  rtt = 0;
  private pingSent = 0;
  desync = false;
  desyncFrame = -1;
  rollbacks = 0;
  maxRollbackSeen = 0;
  stalls = 0;
  log: [number[], number[]] | null;

  private o: RollbackOpts;

  constructor(o: RollbackOpts) {
    this.o = o;
    this.local = o.local;
    this.remote = (1 - o.local) as 0 | 1;
    this.delay = o.delay ?? 2;
    this.maxRollback = o.maxRollback ?? 8;
    this.now = o.now ?? (() => performance.now());
    this.lastRecv = this.now();
    this.state = cloneState(o.init);
    this.log = o.record ? [[], []] : null;
    for (let f = 0; f < this.delay; f++) {
      this.inputs[0].set(f, 0);
      this.inputs[1].set(f, 0);
      this.log?.[0].push(0);
      this.log?.[1].push(0);
    }
    this.remoteConfirmed = this.delay - 1;
    o.transport.onMessage((d) => {
      if (typeof d !== 'string') this.onPacket(d);
    });
  }

  hashAt(f: number): number | undefined {
    return this.localHashes.get(f);
  }

  get connectionQuiet(): number {
    return this.now() - this.lastRecv;
  }

  private onPacket(buf: ArrayBuffer): void {
    const v = new DataView(buf);
    const type = v.getUint8(0);
    this.lastRecv = this.now();
    if (type === T_INPUT) {
      const frame = v.getUint32(1);
      const ack = v.getInt32(5);
      const adv = v.getInt8(9);
      const start = v.getUint32(10);
      const n = v.getUint8(14);
      this.remoteFrame = Math.max(this.remoteFrame, frame);
      this.remoteAdv = adv;
      this.remoteAck = Math.max(this.remoteAck, ack);
      const rm = this.inputs[this.remote];
      for (let k = 0; k < n; k++) {
        const f = start + k;
        if (f <= this.remoteConfirmed || rm.has(f)) continue;
        const val = v.getUint16(15 + k * 2);
        rm.set(f, val);
        if (f < this.frame && this.predicted.get(f) !== val) this.pendingFrom = Math.min(this.pendingFrom, f);
      }
      while (rm.has(this.remoteConfirmed + 1)) {
        this.remoteConfirmed++;
        this.log?.[this.remote].push(rm.get(this.remoteConfirmed)!);
      }
    } else if (type === T_HASH) {
      const f = v.getUint32(1);
      const h = v.getUint32(5);
      this.remoteHashes.set(f, h);
      this.checkHash(f);
    } else if (type === T_PING) {
      const out = new ArrayBuffer(9);
      const w = new DataView(out);
      w.setUint8(0, T_PONG);
      w.setFloat64(1, v.getFloat64(1));
      this.o.transport.send(out);
    } else if (type === T_PONG) {
      const sample = this.now() - v.getFloat64(1);
      this.rtt = this.rtt ? this.rtt * 0.8 + sample * 0.2 : sample;
    }
  }

  private checkHash(f: number): void {
    const a = this.localHashes.get(f);
    const b = this.remoteHashes.get(f);
    if (a !== undefined && b !== undefined && a !== b && !this.desync) {
      this.desync = true;
      this.desyncFrame = f;
    }
  }

  private remoteInputFor(f: number): number {
    const rm = this.inputs[this.remote];
    const v = rm.get(f);
    if (v !== undefined) return v;
    const guess = rm.get(this.remoteConfirmed) ?? 0;
    this.predicted.set(f, guess);
    return guess;
  }

  private simulate(f: number): void {
    const li = this.inputs[this.local].get(f) ?? 0;
    const ri = this.remoteInputFor(f);
    if (this.local === 0) step(this.state, li, ri);
    else step(this.state, ri, li);
  }

  private rollback(): void {
    if (this.pendingFrom >= this.frame) {
      this.pendingFrom = Infinity;
      return;
    }
    const f0 = this.pendingFrom;
    this.pendingFrom = Infinity;
    const snap = this.states.get(f0);
    if (!snap) throw new Error(`rollback target ${f0} missing`);
    this.state = cloneState(snap);
    for (let f = f0; f < this.frame; f++) {
      if (f > f0) this.states.set(f, cloneState(this.state));
      this.simulate(f);
    }
    this.rollbacks++;
    this.maxRollbackSeen = Math.max(this.maxRollbackSeen, this.frame - f0);
  }

  private send(): void {
    const lm = this.inputs[this.local];
    const last = this.frame - 1 + this.delay;
    let start = Math.max(this.remoteAck + 1, 0);
    if (last - start + 1 > MAX_SEND) start = last - MAX_SEND + 1;
    const n = Math.max(0, last - start + 1);
    const buf = new ArrayBuffer(15 + n * 2);
    const v = new DataView(buf);
    v.setUint8(0, T_INPUT);
    v.setUint32(1, this.frame);
    v.setInt32(5, this.remoteConfirmed);
    v.setInt8(9, Math.max(-127, Math.min(127, this.frame - this.remoteFrame)));
    v.setUint32(10, start);
    v.setUint8(14, n);
    for (let k = 0; k < n; k++) v.setUint16(15 + k * 2, lm.get(start + k) ?? 0);
    this.o.transport.send(buf);
  }

  private hashes(): void {
    const upto = Math.min(this.remoteConfirmed + 1, this.frame - 1);
    let f = (Math.floor(this.lastHashed / HASH_EVERY) + 1) * HASH_EVERY;
    if (this.lastHashed < 0) f = HASH_EVERY;
    for (; f <= upto; f += HASH_EVERY) {
      const st = this.states.get(f);
      if (!st) continue;
      const h = hashState(st);
      this.localHashes.set(f, h);
      this.lastHashed = f;
      const buf = new ArrayBuffer(9);
      const v = new DataView(buf);
      v.setUint8(0, T_HASH);
      v.setUint32(1, f);
      v.setUint32(5, h);
      this.o.transport.send(buf);
      this.checkHash(f);
    }
  }

  private gc(): void {
    const keepStates = Math.min(this.remoteConfirmed, this.frame) - 2;
    for (const k of this.states.keys()) if (k < keepStates && k !== this.lastHashed) this.states.delete(k);
    for (const k of this.predicted.keys()) if (k <= this.remoteConfirmed) this.predicted.delete(k);
    const lm = this.inputs[this.local];
    for (const k of lm.keys()) if (k < Math.min(this.remoteAck, this.frame - 1) - 2) lm.delete(k);
    const rm = this.inputs[this.remote];
    for (const k of rm.keys()) if (k < this.remoteConfirmed - 2) rm.delete(k);
    for (const k of this.localHashes.keys()) if (k < this.lastHashed - HASH_EVERY * 20) { this.localHashes.delete(k); this.remoteHashes.delete(k); }
  }

  ping(): void {
    const buf = new ArrayBuffer(9);
    const v = new DataView(buf);
    v.setUint8(0, T_PING);
    v.setFloat64(1, this.now());
    this.o.transport.send(buf);
    this.pingSent++;
  }

  tick(localInput: number): TickResult {
    this.rollback();
    let advanced = false;
    let stalled = false;
    let events: SimEvent[] = [];
    // Time sync: if we're ahead of the peer, idle a frame now and then so both converge.
    let skip = false;
    if (--this.syncCountdown <= 0) {
      this.syncCountdown = 20;
      const localAdv = this.frame - this.remoteFrame;
      const diff = (localAdv - this.remoteAdv) / 2;
      if (diff >= 1.5) skip = true;
    }
    if (this.frame - this.remoteConfirmed > this.maxRollback) {
      stalled = true;
      this.stalls++;
    } else if (!skip) {
      const target = this.frame + this.delay;
      if (!this.inputs[this.local].has(target)) {
        this.inputs[this.local].set(target, localInput);
        this.log?.[this.local].push(localInput);
      }
      this.states.set(this.frame, cloneState(this.state));
      this.simulate(this.frame);
      events = this.state.events.slice();
      this.frame++;
      advanced = true;
    }
    this.send();
    this.hashes();
    if (this.frame % 60 === 0 && advanced) this.ping();
    this.gc();
    return { state: this.state, events, advanced, stalled, desync: this.desync };
  }
}
