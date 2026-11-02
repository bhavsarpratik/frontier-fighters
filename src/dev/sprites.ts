import { ROSTER } from '../content/roster.ts';
import { POSES } from '../render/poses.ts';
import { spriteFor, poseKey, SPR_W, SPR_H } from '../render/rig.ts';
import { portrait } from '../render/portrait.ts';

const q = new URLSearchParams(location.search);
const names = (q.get('poses') ?? 'stance,sHP,sHK,cHK,uppercut,cast,block,win').split(',');
const cell = 110;
const scale = 2;
const c = document.getElementById('c') as HTMLCanvasElement;
c.width = (names.length + 1) * cell * scale;
c.height = ROSTER.length * cell * scale;
const ctx = c.getContext('2d')!;
ctx.imageSmoothingEnabled = false;
ctx.scale(scale, scale);
ROSTER.forEach((ch, ri) => {
  const y = ri * cell;
  ctx.drawImage(portrait(ri, false, 96), 6, y + 6);
  names.forEach((n, i) => {
    const p = POSES[n];
    const s = spriteFor(`${ch.id}|${poseKey(p)}`, ch.look, p);
    const x = (i + 1) * cell;
    ctx.fillStyle = '#3a3550';
    ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
    ctx.drawImage(s.canvas as CanvasImageSource, x + cell / 2 - SPR_W / 2, y + cell - 6 - SPR_H + 10);
  });
});
