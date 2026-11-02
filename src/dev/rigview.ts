import { createMatch } from '../sim/step.ts';
import { POSES } from '../render/poses.ts';
import { drawCutout } from '../render/cutout.ts';
import { loadArt, artRig } from '../render/art.ts';

const q = new URLSearchParams(location.search);
const char = Number(q.get('c') ?? 0);
const names = (q.get('poses') ?? 'stance,sLP,sHP,sHK,cLK,cHK,uppercut,jK,hit,kd,win,crouch').split(',');
const c = document.getElementById('c') as HTMLCanvasElement;
const zoom = Number(q.get('z') ?? 2);
const cell = 150;
c.width = names.length * cell * zoom;
c.height = 180 * zoom;
const ctx = c.getContext('2d')!;
loadArt();
const s = createMatch({ p1: char, p2: 0, stage: 0, seed: 1 });
const tick = () => {
  if (!artRig(char)) { requestAnimationFrame(tick); return; }
  ctx.fillStyle = '#3a3550';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.save();
  ctx.scale(zoom, zoom);
  names.forEach((n, i) => {
    ctx.fillStyle = '#ddd';
    ctx.fillText(n, i * cell + 4, 10);
    ctx.fillStyle = '#2a2440';
    ctx.fillRect(i * cell + 2, 160, cell - 4, 2);
    drawCutout(ctx, s.f[0], POSES[n], i * cell + cell / 2, 160, { alt: false, flash: false });
  });
  ctx.restore();
};
tick();
