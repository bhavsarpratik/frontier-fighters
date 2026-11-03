import { playMusic, sfx } from '../audio/audio.ts';
import { broadcastConnect } from '../net/broadcast.ts';
import type { Transport } from '../net/transport.ts';
import { ManualPeer, trysteroConnect, type Strategy } from '../net/webrtc.ts';
import { drawText } from '../render/font.ts';
import type { MenuInput } from '../input/devices.ts';
import { app, drawBackdrop, type Screen } from './app.ts';
import { NetLink } from './netlink.ts';
import { CharSelect } from './select.ts';
import { TitleScreen, VERSION } from './title.ts';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from({ length: 8 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

const h = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> & { cls?: string } = {}, ...kids: (Node | string)[]) => {
  const el = document.createElement(tag);
  const { cls, ...rest } = props;
  Object.assign(el, rest);
  if (cls) el.className = cls;
  for (const k of kids) el.append(k);
  return el;
};

export class LobbyScreen implements Screen {
  t = 0;
  private overlay = document.getElementById('overlay')!;
  private status!: HTMLDivElement;
  private body!: HTMLDivElement;
  private busy = false;
  private joinCode: string | undefined;
  private timer: number | null = null;
  private strategy: Strategy = 'nostr';
  private sameComputer = false;
  private turn: { urls: string; username: string; credential: string } = { urls: '', username: '', credential: '' };

  constructor(joinCode?: string) {
    this.joinCode = joinCode?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  }

  enter(): void {
    playMusic(3);
    this.build();
    if (this.joinCode) this.connect('guest', this.joinCode);
  }

  leave(): void {
    this.overlay.classList.remove('on');
    this.overlay.replaceChildren();
    if (this.timer) clearTimeout(this.timer);
  }

  private setStatus(s: string, err = false): void {
    this.status.textContent = s;
    this.status.className = err ? 'status err' : 'status';
  }

  private build(): void {
    this.status = h('div', { cls: 'status' });
    this.body = h('div');
    const code = h('input', { placeholder: 'CODE', maxLength: 12 });
    code.addEventListener('keydown', (e) => { if (e.key === 'Enter') join.click(); });
    const create = h('button', { textContent: 'CREATE ROOM' });
    const join = h('button', { textContent: 'JOIN' });
    const back = h('button', { textContent: 'BACK', cls: 'ghost' });
    create.onclick = () => this.connect('host', newCode());
    join.onclick = () => {
      const c = code.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (c.length < 8) return this.setStatus('Enter the 8-character code your friend shared.', true);
      this.connect('guest', c);
    };
    back.onclick = () => this.exit();

    const strat = h('select') as HTMLSelectElement;
    strat.append(h('option', { value: 'nostr', textContent: 'Nostr relays (default)' }), h('option', { value: 'mqtt', textContent: 'MQTT brokers (fallback)' }));
    strat.onchange = () => { this.strategy = strat.value as Strategy; };
    const same = h('input', { type: 'checkbox' }) as HTMLInputElement;
    same.style.width = 'auto';
    same.onchange = () => { this.sameComputer = same.checked; };
    const turnUrl = h('input', { placeholder: 'turn:host:3478' });
    const turnUser = h('input', { placeholder: 'username' });
    const turnPass = h('input', { placeholder: 'password', type: 'password' });
    for (const i of [turnUrl, turnUser, turnPass]) { i.style.width = '10em'; i.style.textTransform = 'none'; i.style.letterSpacing = '0'; }
    const syncTurn = () => { this.turn = { urls: turnUrl.value.trim(), username: turnUser.value, credential: turnPass.value }; };
    for (const i of [turnUrl, turnUser, turnPass]) i.oninput = syncTurn;
    const manualHost = h('button', { textContent: 'CREATE OFFER' });
    const manualGuest = h('button', { textContent: 'I HAVE AN OFFER' });
    manualHost.onclick = () => this.manual('host');
    manualGuest.onclick = () => this.manual('guest');

    const panel = h('div', { cls: 'panel' },
      h('h2', { textContent: 'ONLINE VERSUS' }),
      h('p', { textContent: 'Peer-to-peer with rollback netcode. Your browsers connect directly; public relays are used only to introduce you.' }),
      h('div', { cls: 'row' }, create, h('span', { textContent: 'or' }), code, join, back),
      this.status,
      this.body,
      h('details', {},
        h('summary', { textContent: 'Connection options' }),
        h('div', { cls: 'row' }, h('span', { textContent: 'Signaling:' }), strat),
        h('div', { cls: 'row' }, same, h('span', { textContent: 'Same-computer test (two tabs, no network)' })),
        h('p', { textContent: 'Strict NAT (some office Wi-Fi, mobile carriers) can block direct connections. If you have a TURN server, add it here:' }),
        h('div', { cls: 'row' }, turnUrl, turnUser, turnPass),
        h('p', { textContent: 'Manual mode needs no relays at all: one player creates an offer, the other pastes it and sends back the answer.' }),
        h('div', { cls: 'row' }, manualHost, manualGuest),
      ),
    );
    this.overlay.replaceChildren(panel);
    this.overlay.classList.add('on');
    code.focus();
  }

  private turnServer(): RTCIceServer | null {
    return this.turn.urls ? { urls: this.turn.urls, username: this.turn.username, credential: this.turn.credential } : null;
  }

  private async connect(role: 'host' | 'guest', code: string): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    sfx.confirm();
    const link = `${location.origin}${location.pathname}?room=${code}`;
    if (role === 'host') {
      const copy = h('button', { textContent: 'COPY LINK' });
      copy.onclick = () => void navigator.clipboard?.writeText(link).then(() => { copy.textContent = 'COPIED!'; });
      this.body.replaceChildren(
        h('p', { textContent: 'Share this code or link with your opponent:' }),
        h('div', { cls: 'row' }, h('span', { cls: 'code', textContent: code }), copy),
        h('p', { textContent: link }),
      );
    } else {
      this.body.replaceChildren(h('p', { textContent: `Joining room ${code}...` }));
    }
    this.timer = window.setTimeout(() => {
      this.setStatus('Still no connection. Both players need the same code. If it never connects, a strict NAT may be blocking you: try the MQTT option, the same Wi-Fi, a phone hotspot, a TURN server, or manual mode.', true);
    }, 30000);
    try {
      const t = this.sameComputer
        ? await broadcastConnect(code, (s) => this.setStatus(s))
        : await trysteroConnect({ code, strategy: this.strategy, turn: this.turnServer(), onStatus: (s) => this.setStatus(s) });
      this.connected(t, role, this.sameComputer ? 'SAME COMPUTER' : `ROOM ${code}`);
    } catch (e) {
      this.setStatus((e as Error).message, true);
      this.busy = false;
    }
  }

  private async manual(role: 'host' | 'guest'): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    const peer = new ManualPeer(this.turnServer());
    const mine = h('textarea', { readOnly: true }) as HTMLTextAreaElement;
    const theirs = h('textarea', { placeholder: 'Paste here' }) as HTMLTextAreaElement;
    const copy = h('button', { textContent: 'COPY' });
    copy.onclick = () => void navigator.clipboard?.writeText(mine.value).then(() => { copy.textContent = 'COPIED!'; });
    const apply = h('button', { textContent: role === 'host' ? 'CONNECT' : 'MAKE ANSWER' });
    void peer.ready.then((t) => this.connected(t, role, 'DIRECT (MANUAL)'));
    if (role === 'host') {
      this.setStatus('Creating offer (gathering network routes)...');
      mine.value = await peer.createOffer();
      this.body.replaceChildren(
        h('p', { textContent: '1. Send this offer to your opponent:' }), mine, h('div', { cls: 'row' }, copy),
        h('p', { textContent: '2. Paste their answer:' }), theirs, h('div', { cls: 'row' }, apply),
      );
      this.setStatus('Waiting for the answer...');
      apply.onclick = () => void peer.acceptAnswer(theirs.value).then(() => this.setStatus('Connecting...')).catch(() => this.setStatus('That answer does not look right.', true));
    } else {
      this.body.replaceChildren(h('p', { textContent: "1. Paste your opponent's offer:" }), theirs, h('div', { cls: 'row' }, apply));
      apply.onclick = async () => {
        try {
          this.setStatus('Creating answer...');
          mine.value = await peer.acceptOffer(theirs.value);
          this.body.replaceChildren(h('p', { textContent: '2. Send this answer back:' }), mine, h('div', { cls: 'row' }, copy));
          this.setStatus('Waiting for them to connect...');
        } catch {
          this.setStatus('That offer does not look right.', true);
        }
      };
    }
  }

  private connected(t: Transport, role: 'host' | 'guest', label: string): void {
    if (this.timer) clearTimeout(this.timer);
    const net = new NetLink(role === 'host' ? 0 : 1, t, label);
    net.send({ t: 'hello', v: VERSION });
    sfx.confirm();
    app.go(new CharSelect('online', net));
  }

  private exit(): void {
    sfx.back();
    if (this.joinCode) history.replaceState(null, '', location.pathname);
    app.go(new TitleScreen());
  }

  update(m: MenuInput[]): void {
    this.t++;
    if (m.some((x) => x.back) && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') this.exit();
  }

  render(ctx: CanvasRenderingContext2D): void {
    drawBackdrop(ctx, this.t, '#06243a', '#05030c');
    drawText(ctx, 'ONLINE', 240, 16, { scale: 3, align: 'center', gradient: ['#fff', '#3ec8ff'], outline: '#000', shadow: null });
  }
}
