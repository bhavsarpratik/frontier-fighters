import { ROSTER } from '../content/roster.ts';
import { POSES } from '../render/poses.ts';
import { spriteFor, poseKey, drawSprite } from '../render/rig.ts';
import { drawPortrait } from '../render/portrait.ts';

const q = new URLSearchParams(location.search);
const names = (q.get('poses') ?? 'stance,sHP,sHK,cHK,uppercut,cast,block,win').split(',');
const scale = Number(q.get('scale') ?? 2);
const cell = 110;
const chars = q.get('chars') ? q.get('chars')!.split(',').map(Number) : null;
const c = document.getElementById('c') as HTMLCanvasElement;
c.width = (names.length + 1) * cell * scale;
c.height = ROSTER.length * cell * scale;
const ctx = c.getContext('2d')!;
ctx.imageSmoothingEnabled = false;
ctx.scale(scale, scale);
ROSTER.forEach((ch, ri) => {
  if (chars && !chars.includes(ri)) return;
  const y = (chars ? chars.indexOf(ri) : ri) * cell;
  drawPortrait(ctx, ri, false, 6, y + 6, 96);
  names.forEach((n, i) => {
    const p = POSES[n];
    const s = spriteFor(`${ch.id}|${poseKey(p)}`, ch.look, p, 2);
    const x = (i + 1) * cell;
    ctx.fillStyle = '#3a3550';
    ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
    drawSprite(ctx, s, x + cell / 2, y + cell - 6, false, 1);
  });
});
