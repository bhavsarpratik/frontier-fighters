// Binary payloads are latency-critical inputs (may be dropped/reordered);
// strings are control messages and must arrive reliably and in order.
export interface Transport {
  send(data: ArrayBuffer | string): void;
  onMessage(cb: (data: ArrayBuffer | string) => void): void;
  onClose(cb: () => void): void;
  close(): void;
  rtt?(): number;
}

export class Emitter<T> {
  private cbs: ((v: T) => void)[] = [];
  on(cb: (v: T) => void): void {
    this.cbs.push(cb);
  }
  emit(v: T): void {
    for (const cb of this.cbs) cb(v);
  }
}
