import type { Transport } from './transport.ts';

export interface LinkSim { latency: number; jitter: number; loss: number; seed: number }

interface Msg { at: number; data: ArrayBuffer | string }

// In-process transport pair with simulated latency, jitter, reordering and loss (binary only).
export class LoopbackNet {
  private queues: [Msg[], Msg[]] = [[], []];
  private handlers: [((d: ArrayBuffer | string) => void)[], ((d: ArrayBuffer | string) => void)[]] = [[], []];
  private closers: [(() => void)[], (() => void)[]] = [[], []];
  private lastReliable = [0, 0];
  private seed: number;
  ends: [Transport, Transport];

  sim: LinkSim;
  private clock: () => number;

  constructor(sim: LinkSim, clock: () => number) {
    this.sim = sim;
    this.clock = clock;
    this.seed = sim.seed || 1;
    const mk = (side: 0 | 1): Transport => ({
      send: (d) => this.push(1 - side, d),
      onMessage: (cb) => { this.handlers[side].push(cb); },
      onClose: (cb) => { this.closers[side].push(cb); },
      close: () => { for (const c of this.closers[1 - side]) c(); },
    });
    this.ends = [mk(0), mk(1)];
  }

  private rand(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  private push(to: number, data: ArrayBuffer | string): void {
    const now = this.clock();
    if (typeof data !== 'string' && this.rand() < this.sim.loss) return;
    let at = now + this.sim.latency + this.rand() * this.sim.jitter;
    if (typeof data === 'string') {
      at = Math.max(at, this.lastReliable[to] + 0.001);
      this.lastReliable[to] = at;
    }
    const copy = typeof data === 'string' ? data : data.slice(0);
    this.queues[to].push({ at, data: copy });
  }

  pump(): void {
    const now = this.clock();
    for (let side = 0; side < 2; side++) {
      const q = this.queues[side];
      const due = q.filter((m) => m.at <= now).sort((a, b) => a.at - b.at);
      this.queues[side] = q.filter((m) => m.at > now);
      for (const m of due) for (const h of this.handlers[side]) h(m.data);
    }
  }
}
