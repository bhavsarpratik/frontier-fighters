import type { Transport } from './transport.ts';

// Trystero only handles signaling (finding the peer through public Nostr relays or MQTT
// brokers). Once connected we open our own negotiated channel that is unordered and never
// retransmits: rollback netcode sends redundant inputs, so a late packet is worthless.

const APP_ID = 'frontier-fighters-2026';
const INPUT_CHANNEL_ID = 101;
export const STUN: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  { urls: 'stun:stun.cloudflare.com:3478' },
];
const CDN = {
  nostr: 'https://esm.sh/trystero@0.26.0',
  mqtt: 'https://esm.sh/@trystero-p2p/mqtt@0.26.0',
};

export type Strategy = keyof typeof CDN;

interface TrysteroAction { send(data: unknown, opts?: { target?: string }): Promise<unknown>; onMessage: ((d: unknown, ctx: { peerId: string }) => void) | null }
interface TrysteroRoom {
  onPeerJoin: ((id: string) => void) | null;
  onPeerLeave: ((id: string) => void) | null;
  makeAction(name: string): TrysteroAction;
  getPeers(): Record<string, RTCPeerConnection>;
  leave(): Promise<void> | void;
}
interface TrysteroModule { joinRoom(cfg: object, room: string, cb?: object): TrysteroRoom }

export interface ConnectOpts { code: string; strategy: Strategy; turn?: RTCIceServer | null; onStatus: (s: string) => void }

function makeTransport(sendBin: (b: ArrayBuffer) => void, sendStr: (s: string) => void, close: () => void) {
  const handlers: ((d: ArrayBuffer | string) => void)[] = [];
  const closers: (() => void)[] = [];
  let closed = false;
  const t: Transport = {
    send: (d) => (typeof d === 'string' ? sendStr(d) : sendBin(d)),
    onMessage: (cb) => { handlers.push(cb); },
    onClose: (cb) => { closers.push(cb); },
    close: () => { if (!closed) { closed = true; close(); } },
  };
  return {
    t,
    emit: (d: ArrayBuffer | string) => { for (const h of handlers) h(d); },
    closed: () => { if (!closed) { closed = true; for (const c of closers) c(); } },
  };
}

export async function trysteroConnect(o: ConnectOpts): Promise<Transport> {
  o.onStatus('Loading peer-to-peer library...');
  let mod: TrysteroModule;
  try {
    mod = (await import(/* @vite-ignore */ CDN[o.strategy])) as TrysteroModule;
  } catch {
    throw new Error('Could not load the P2P library from the CDN. Check your internet connection, or use manual mode.');
  }
  o.onStatus('Looking for your opponent on public relays...');
  const cfg: Record<string, unknown> = { appId: APP_ID };
  if (o.turn) cfg.turnConfig = [o.turn];
  const room = mod.joinRoom(cfg, `ff-${o.code}`);
  const ctl = room.makeAction('ctl');
  return new Promise((resolve) => {
    let peer: string | null = null;
    let ch: RTCDataChannel | null = null;
    const pending: string[] = [];
    let ready = false;
    const io = makeTransport(
      (b) => { if (ch && ch.readyState === 'open') ch.send(b); },
      (s) => { if (peer) void ctl.send(s, { target: peer }); },
      () => { void room.leave(); ch?.close(); },
    );
    ctl.onMessage = (d, { peerId }) => {
      if (peerId !== peer || typeof d !== 'string') return;
      if (ready) io.emit(d);
      else pending.push(d);
    };
    room.onPeerLeave = (id) => { if (id === peer) io.closed(); };
    room.onPeerJoin = (id) => {
      if (peer) return; // a third visitor; this room is full
      peer = id;
      o.onStatus('Opponent found, opening fast channel...');
      const pc = room.getPeers()[id];
      if (!pc) return;
      pc.addEventListener('connectionstatechange', () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') io.closed();
      });
      ch = pc.createDataChannel('ff-inputs', { negotiated: true, id: INPUT_CHANNEL_ID, ordered: false, maxRetransmits: 0 });
      ch.binaryType = 'arraybuffer';
      ch.onmessage = (e) => { if (e.data instanceof ArrayBuffer) io.emit(e.data); };
      ch.onclose = () => io.closed();
      ch.onopen = () => {
        ready = true;
        o.onStatus('Connected!');
        resolve(io.t);
        for (const s of pending.splice(0)) io.emit(s);
      };
    };
  });
}

// --- Manual mode: copy/paste the offer and answer. Needs no signaling service at all. ---

function waitIce(pc: RTCPeerConnection, ms = 5000): Promise<void> {
  return new Promise((res) => {
    if (pc.iceGatheringState === 'complete') return res();
    const done = () => { if (pc.iceGatheringState === 'complete') { pc.removeEventListener('icegatheringstatechange', done); res(); } };
    pc.addEventListener('icegatheringstatechange', done);
    setTimeout(res, ms);
  });
}

const enc = (d: RTCSessionDescriptionInit) => 'FF1:' + btoa(JSON.stringify({ t: d.type, s: d.sdp }));
function dec(s: string): RTCSessionDescriptionInit {
  const m = s.trim().replace(/^FF1:/, '');
  const j = JSON.parse(atob(m)) as { t: RTCSdpType; s: string };
  return { type: j.t, sdp: j.s };
}

export class ManualPeer {
  pc: RTCPeerConnection;
  private ctlCh: RTCDataChannel;
  private inCh: RTCDataChannel;
  private io: ReturnType<typeof makeTransport>;
  ready: Promise<Transport>;

  constructor(turn?: RTCIceServer | null) {
    this.pc = new RTCPeerConnection({ iceServers: turn ? [...STUN, turn] : STUN });
    this.ctlCh = this.pc.createDataChannel('ctl', { negotiated: true, id: 0 });
    this.inCh = this.pc.createDataChannel('in', { negotiated: true, id: 1, ordered: false, maxRetransmits: 0 });
    this.inCh.binaryType = 'arraybuffer';
    this.io = makeTransport(
      (b) => { if (this.inCh.readyState === 'open') this.inCh.send(b); },
      (s) => { if (this.ctlCh.readyState === 'open') this.ctlCh.send(s); },
      () => this.pc.close(),
    );
    this.ctlCh.onmessage = (e) => { if (typeof e.data === 'string') this.io.emit(e.data); };
    this.inCh.onmessage = (e) => { if (e.data instanceof ArrayBuffer) this.io.emit(e.data); };
    this.ctlCh.onclose = () => this.io.closed();
    this.pc.addEventListener('connectionstatechange', () => {
      if (this.pc.connectionState === 'failed') this.io.closed();
    });
    this.ready = new Promise((res) => {
      let n = 0;
      const open = () => { if (++n === 2) res(this.io.t); };
      this.ctlCh.onopen = open;
      this.inCh.onopen = open;
    });
  }

  async createOffer(): Promise<string> {
    await this.pc.setLocalDescription(await this.pc.createOffer());
    await waitIce(this.pc);
    return enc(this.pc.localDescription!);
  }

  async acceptOffer(offer: string): Promise<string> {
    await this.pc.setRemoteDescription(dec(offer));
    await this.pc.setLocalDescription(await this.pc.createAnswer());
    await waitIce(this.pc);
    return enc(this.pc.localDescription!);
  }

  async acceptAnswer(answer: string): Promise<void> {
    await this.pc.setRemoteDescription(dec(answer));
  }
}
