import type { Transport } from './transport.ts';

// Two tabs of the same browser talking over BroadcastChannel. Used for local testing/demos.
export function broadcastConnect(code: string, onStatus: (s: string) => void): Promise<Transport> {
  return new Promise((resolve) => {
    const id = Math.random().toString(36).slice(2);
    const ch = new BroadcastChannel(`ff-bc-${code}`);
    let peer: string | null = null;
    const handlers: ((d: ArrayBuffer | string) => void)[] = [];
    const closers: (() => void)[] = [];
    const t: Transport = {
      send: (data) => ch.postMessage({ from: id, to: peer, kind: 'data', data }),
      onMessage: (cb) => { handlers.push(cb); },
      onClose: (cb) => { closers.push(cb); },
      close: () => { ch.postMessage({ from: id, to: peer, kind: 'bye' }); ch.close(); },
    };
    ch.onmessage = (e) => {
      const m = e.data as { from: string; to: string | null; kind: string; data?: ArrayBuffer | string };
      if (m.from === id) return;
      if (m.kind === 'hello' && !peer) {
        peer = m.from;
        ch.postMessage({ from: id, to: peer, kind: 'hello' });
        onStatus('Connected (same computer)');
        resolve(t);
        return;
      }
      if (m.from !== peer || (m.to && m.to !== id)) return;
      if (m.kind === 'data' && m.data !== undefined) for (const h of handlers) h(m.data);
      if (m.kind === 'bye') for (const c of closers) c();
    };
    onStatus('Waiting for the other tab...');
    ch.postMessage({ from: id, to: null, kind: 'hello' });
    const again = setInterval(() => {
      if (peer) clearInterval(again);
      else ch.postMessage({ from: id, to: null, kind: 'hello' });
    }, 500);
  });
}
