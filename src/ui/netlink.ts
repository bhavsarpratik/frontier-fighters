import type { Transport } from '../net/transport.ts';

export type CtlMsg =
  | { t: 'hello'; v: string }
  | { t: 'cur'; i: number }
  | { t: 'lock'; i: number }
  | { t: 'unlock' }
  | { t: 'stagecur'; i: number }
  | { t: 'go'; p1: number; p2: number; stage: number; seed: number; delay: number }
  | { t: 'rematch' }
  | { t: 'leave' };

// A connected online peer: reliable JSON control channel plus the raw transport for inputs.
export class NetLink {
  onMsg: ((m: CtlMsg) => void) | null = null;
  onClose: (() => void) | null = null;
  closed = false;

  local: 0 | 1;
  transport: Transport;
  label: string;

  constructor(local: 0 | 1, transport: Transport, label: string) {
    this.local = local;
    this.transport = transport;
    this.label = label;
    transport.onMessage((d) => {
      if (typeof d !== 'string') return;
      try {
        this.onMsg?.(JSON.parse(d) as CtlMsg);
      } catch {
        // ignore malformed control messages
      }
    });
    transport.onClose(() => {
      this.closed = true;
      this.onClose?.();
    });
  }

  send(m: CtlMsg): void {
    if (!this.closed) this.transport.send(JSON.stringify(m));
  }

  close(): void {
    if (this.closed) return;
    this.send({ t: 'leave' });
    this.closed = true;
    this.transport.close();
  }
}
