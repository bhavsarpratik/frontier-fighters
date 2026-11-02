// Box Gym: scrub any move frame by frame and edit its hitbox with the mouse.
import { ROSTER } from '../content/roster.ts';
import type { Box } from '../content/types.ts';
import { CHARS } from '../sim/data.ts';
import { samplePose } from '../render/poses.ts';
import { ORIGIN_X, ORIGIN_Y, poseKey, spriteFor } from '../render/rig.ts';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('c');
const ctx = canvas.getContext('2d')!;
const charSel = $<HTMLSelectElement>('char');
const moveSel = $<HTMLSelectElement>('move');
const frameIn = $<HTMLInputElement>('frame');
const play = $<HTMLInputElement>('play');
const S = 3;
const GX = 120;
const GY = 160;
const edited = new Map<string, Box>();

ROSTER.forEach((c, i) => charSel.append(new Option(c.name, String(i))));
const cur = () => CHARS[Number(charSel.value)];
const move = () => cur().moves[Number(moveSel.value)];

function fillMoves(): void {
  moveSel.replaceChildren(...cur().moves.map((m, i) => new Option(`${m.key}${m.name ? ` (${m.name})` : ''}`, String(i))));
  fillFrames();
}
function fillFrames(): void {
  frameIn.max = String(move().total - 1);
  frameIn.value = '0';
}
charSel.onchange = fillMoves;
moveSel.onchange = fillFrames;

const toScreen = (x: number, y: number): [number, number] => [(GX + x) * S, (GY - y) * S];

function boxRect(b: Box): [number, number, number, number] {
  const [x0, y1] = toScreen(b.x, b.y + b.h);
  return [x0, y1, b.w * S, b.h * S];
}

function draw(): void {
  const c = cur();
  const m = move();
  const f = Number(frameIn.value);
  $('fl').textContent = `${f} / ${m.total - 1}`;
  const phase = f < m.startup ? 'startup' : f < m.startup + m.active ? 'ACTIVE' : 'recovery';
  $('info').textContent = `startup ${m.startup}  active ${m.active}  recovery ${m.recovery}  dmg ${m.dmg}  [${phase}]`;
  ctx.fillStyle = '#1a1430';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#2a2448';
  ctx.fillRect(0, GY * S, canvas.width, canvas.height);
  ctx.strokeStyle = '#3a3460';
  for (let x = 0; x < canvas.width; x += 10 * S) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
  const pose = samplePose(m.anim, f, { startup: m.startup, active: m.active, total: m.total });
  const spr = spriteFor(`gym|${c.def.id}|${poseKey(pose)}`, c.def.look, pose);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(spr.canvas as CanvasImageSource, (GX - ORIGIN_X) * S, (GY - ORIGIN_Y) * S, spr.w * S, spr.h * S);
  const stroke = (b: Box, col: string) => {
    const [x, y, w, h] = boxRect(b);
    ctx.fillStyle = col + '40';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  };
  stroke({ x: -c.w + 2, y: 0, w: (c.w - 2) * 2, h: Math.round(c.h * 0.8) }, '#ffffff');
  const crouch = m.anim[0] === 'c';
  stroke({ x: -c.w, y: 0, w: c.w * 2, h: Math.round(c.h * (crouch ? 0.62 : 1)) }, '#3c8cff');
  if (m.hit) {
    const active = f >= m.startup && f < m.startup + m.active;
    stroke(m.hit, active ? '#ff2840' : '#7a3040');
    const [x, y, w, h] = boxRect(m.hit);
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + w - 5, y + h - 5, 10, 10);
  }
  if (m.proj) {
    ctx.fillStyle = '#ff7828';
    ctx.fillText(`projectile ${m.proj.kind} spawns on frame ${m.proj.frame}`, 10, 20);
  }
}

let drag: { mode: 'move' | 'size'; sx: number; sy: number; box: Box } | null = null;
canvas.addEventListener('mousedown', (e) => {
  const m = move();
  if (!m.hit) return;
  const [x, y, w, h] = boxRect(m.hit);
  const mx = e.offsetX, my = e.offsetY;
  if (Math.abs(mx - (x + w)) < 10 && Math.abs(my - (y + h)) < 10) drag = { mode: 'size', sx: mx, sy: my, box: { ...m.hit } };
  else if (mx >= x && mx <= x + w && my >= y && my <= y + h) drag = { mode: 'move', sx: mx, sy: my, box: { ...m.hit } };
});
window.addEventListener('mousemove', (e) => {
  if (!drag) return;
  const r = canvas.getBoundingClientRect();
  const dx = Math.round((e.clientX - r.left - drag.sx) / S);
  const dy = Math.round((e.clientY - r.top - drag.sy) / S);
  const m = move();
  const b = drag.box;
  if (drag.mode === 'move') Object.assign(m.hit!, { x: b.x + dx, y: b.y - dy });
  else Object.assign(m.hit!, { w: Math.max(2, b.w + dx), h: Math.max(2, b.h + dy), y: b.y - dy });
  edited.set(`${cur().def.id}.${m.key}`, m.hit!);
  draw();
});
window.addEventListener('mouseup', () => { drag = null; });
$('export').onclick = () => {
  const out: Record<string, Record<string, Box>> = {};
  for (const [k, b] of edited) {
    const [c, mv] = k.split('.');
    (out[c] ??= {})[mv] = { ...b };
  }
  $<HTMLTextAreaElement>('out').value = JSON.stringify(out, null, 2) || '{}';
};
frameIn.oninput = draw;
fillMoves();
let t = 0;
const loop = () => {
  if (play.checked && ++t % 4 === 0) {
    frameIn.value = String((Number(frameIn.value) + 1) % move().total);
  }
  draw();
  requestAnimationFrame(loop);
};
loop();
