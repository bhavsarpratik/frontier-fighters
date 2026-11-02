import { ROSTER } from '../content/roster.ts';
import { POSES } from '../render/poses.ts';
import { spriteFor, poseKey, SPR_W, SPR_H } from '../render/rig.ts';

const names = Object.keys(POSES);
const cols = 12;
const cell = 110;
const scale = 2;
const c = document.getElementById('c') as HTMLCanvasElement;
const rowsPer = Math.ceil(names.length / cols);
c.width = cols * cell * scale;
c.height = rowsPer * ROSTER.length * (cell + 14) * scale;
const ctx = c.getContext('2d')!;
ctx.imageSmoothingEnabled = false;
ctx.scale(scale, scale);
ROSTER.forEach((ch, ri) => {
  names.forEach((n, i) => {
    const p = POSES[n];
    const s = spriteFor(`${ch.id}|${poseKey(p)}`, ch.look, p);
    const x = (i % cols) * cell;
    const y = (ri * rowsPer + Math.floor(i / cols)) * (cell + 14);
    ctx.fillStyle = '#3a3550';
    ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
    ctx.drawImage(s.canvas as CanvasImageSource, x + cell / 2 - SPR_W / 2, y + cell - 6 - SPR_H + 10);
    ctx.fillStyle = '#ccc';
    ctx.font = '7px monospace';
    ctx.fillText(n, x + 4, y + 10);
  });
});
