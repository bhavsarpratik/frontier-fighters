import { toggleMute, unlockAudio } from './audio/audio.ts';
import { bindKeys, initMenuKeys } from './input/devices.ts';
import { createPresenter } from './render/present.ts';
import { app } from './ui/app.ts';
import { TitleScreen } from './ui/title.ts';

const params = new URLSearchParams(location.search);
const screenEl = document.getElementById('screen') as HTMLCanvasElement;
const frame = document.createElement('canvas');
frame.width = 480;
frame.height = 270;
const ctx = frame.getContext('2d', { alpha: false })!;
ctx.imageSmoothingEnabled = false;

let presenter = createPresenter(screenEl, params.has('canvas'));
window.addEventListener('resize', () => presenter.resize());
screenEl.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  const fresh = screenEl.cloneNode() as HTMLCanvasElement;
  screenEl.replaceWith(fresh);
  presenter = createPresenter(fresh, true);
});
if (params.has('nocrt')) presenter.crt = false;

bindKeys();
initMenuKeys();
const unlock = () => unlockAudio();
window.addEventListener('keydown', unlock);
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) toggleMute();
  if (e.code === 'F8') { presenter.crt = !presenter.crt; e.preventDefault(); }
  if (/^F[1-5]$/.test(e.code)) e.preventDefault();
});

const room = params.get('room');
if (room) {
  void import('./ui/lobby.ts').then((m) => app.go(new m.LobbyScreen(room)));
} else {
  app.go(new TitleScreen());
}

const STEP = 1000 / 60;
let last = performance.now();
let acc = 0;
function loop(now: number): void {
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
    app.screen.render(ctx);
    ctx.restore();
  }
  presenter.draw(frame);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

(window as unknown as { __ff: unknown }).__ff = { app, presenter: () => presenter };
