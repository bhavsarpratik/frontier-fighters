import { toggleMute, unlockAudio } from './audio/audio.ts';
import { bindKeys, initMenuKeys } from './input/devices.ts';
import { initTouch, setTouchMode } from './input/touch.ts';
import { createPresenter } from './render/present.ts';
import { app } from './ui/app.ts';
import { TitleScreen } from './ui/title.ts';
import { loadArt } from './render/art.ts';

loadArt();

const params = new URLSearchParams(location.search);
const screenEl = document.getElementById('screen') as HTMLCanvasElement;
const frame = document.createElement('canvas');
export const DPR = 2;
frame.width = 480 * DPR;
frame.height = 270 * DPR;
const ctx = frame.getContext('2d', { alpha: false })!;
ctx.imageSmoothingEnabled = false;

let presenter = createPresenter(screenEl, params.has('canvas'));
window.addEventListener('resize', () => presenter.resize());
window.addEventListener('orientationchange', () => setTimeout(() => presenter.resize(), 200));
screenEl.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  const fresh = screenEl.cloneNode() as HTMLCanvasElement;
  screenEl.replaceWith(fresh);
  presenter = createPresenter(fresh, true);
});
if (params.has('nocrt')) presenter.crt = false;

bindKeys();
initMenuKeys();
initTouch();
const overlayEl = document.getElementById('overlay')!;
const unlock = () => unlockAudio();
window.addEventListener('keydown', unlock);
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) toggleMute();
  if (e.code === 'F8') { presenter.crt = !presenter.crt; e.preventDefault(); }
  if (/^F[1-5]$/.test(e.code)) e.preventDefault();
});

const room = params.get('room');
const demo = params.get('demo');
if (demo !== null) {
  const [p1, p2, stage] = (demo || '0,1,0').split(',').map(Number);
  void import('./ui/match.ts').then((m) => app.go(new m.MatchScreen({ mode: 'cpu', p1, p2, stage, seed: 4242, cpu: 2, demo: true })));
} else if (params.get('bc') || params.get('p2p')) {
  // Dev/test entry: connect straight to a room and (with &auto) let the CPU play both sides.
  app.autoplay = params.has('auto');
  const code = (params.get('bc') ?? params.get('p2p'))!;
  const host = params.get('role') !== 'guest';
  void Promise.all([import('./net/broadcast.ts'), import('./net/webrtc.ts'), import('./ui/netlink.ts'), import('./ui/select.ts')]).then(async ([b, w, n, sel]) => {
    const t = params.get('bc')
      ? await b.broadcastConnect(code, () => {})
      : await w.trysteroConnect({ code, strategy: (params.get('strategy') as 'nostr' | 'mqtt') ?? 'nostr', onStatus: (s) => console.log('net:', s) });
    const net = new n.NetLink(host ? 0 : 1, t, params.get('bc') ? 'SAME COMPUTER' : `ROOM ${code}`);
    const pick = Number(params.get('pick') ?? (host ? 0 : 1));
    app.go(new sel.CharSelect('online', net, [pick, pick]));
  });
} else if (params.get('match')) {
  const [p1, p2, stage] = params.get('match')!.split(',').map(Number);
  void import('./ui/match.ts').then((m) => app.go(new m.MatchScreen({ mode: 'cpu', p1, p2, stage, seed: 99, cpu: 1 })));
} else if (params.get('screen') === 'select') {
  void import('./ui/select.ts').then((m) => app.go(new m.CharSelect('local', undefined, [2, 5])));
} else if (room) {
  void import('./ui/lobby.ts').then((m) => app.go(new m.LobbyScreen(room)));
} else {
  app.go(new TitleScreen());
}

const ffFrames = Number(params.get('ff') ?? 0);
if (ffFrames > 0) setTimeout(() => { for (let i = 0; i < ffFrames; i++) app.tick(); }, 50);

const STEP = 1000 / 60;
let last = performance.now();
let acc = 0;
function loop(now: number): void {
  setTouchMode(overlayEl.classList.contains('on') ? 'hidden' : app.screen?.touchMode?.() ?? 'menu');
  acc += Math.min(250, now - last);
  last = now;
  let n = 0;
  while (acc >= STEP && n < 5) {
    app.tick();
    acc -= STEP;
    n++;
  }
  if (n === 5) acc = 0;
  if (app.screen) {
    ctx.save();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.imageSmoothingEnabled = false;
    app.screen.render(ctx);
    ctx.restore();
  }
  presenter.draw(frame);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

(window as unknown as { __ff: unknown }).__ff = { app, presenter: () => presenter };
