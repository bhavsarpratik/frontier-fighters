import { FX } from '../sim/fixed.ts';
import type { Projectile, SimEvent } from '../sim/types.ts';
import { drawText } from './font.ts';
import { GROUND_Y } from './stageArt.ts';

type Ctx = CanvasRenderingContext2D;

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; g: number }
interface Pop { x: number; y: number; text: string; color: string; life: number }
interface Burst { x: number; y: number; life: number; max: number; size: number; rot: number; colors: [string, string, string]; ring: boolean }
interface Puff { x: number; y: number; vx: number; r: number; life: number; max: number }

const sx = (v: number) => v / FX;

export class Effects {
  parts: Particle[] = [];
  pops: Pop[] = [];
  bursts: Burst[] = [];
  puffs: Puff[] = [];
  shake = 0;
  flash = 0;
  flashColor = '#fff';

  burst(x: number, y: number, n: number, colors: string[], speed: number, size = 2, g = 0.12): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.8);
      const life = 10 + Math.floor(Math.random() * 14);
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life, max: life, color: colors[i % colors.length], size, g });
    }
  }

  spark(x: number, y: number, size: number, colors: [string, string, string], ring = true): void {
    const life = 9 + Math.round(size / 6);
    this.bursts.push({ x, y, life, max: life, size, rot: Math.random() * Math.PI, colors, ring });
  }

  dust(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const life = 18 + Math.floor(Math.random() * 10);
      this.puffs.push({ x: x + (Math.random() - 0.5) * 16, y: y - 2, vx: (Math.random() - 0.5) * 1.6, r: 2 + Math.random() * 3, life, max: life });
    }
  }

  pop(x: number, y: number, text: string, color: string): void {
    this.pops.push({ x, y, text, color, life: 50 });
  }

  onEvent(e: SimEvent): void {
    const x = e.x !== undefined ? sx(e.x) : 0;
    const y = e.y !== undefined ? GROUND_Y - sx(e.y) : 0;
    switch (e.t) {
      case 'hit':
        this.spark(x, y, e.k === 2 ? 30 : e.k === 1 ? 22 : 13, e.k === 2 ? ['#ffffff', '#ff6ad5', '#7a2bff'] : ['#ffffff', '#ffe066', '#ff6a1a']);
        this.burst(x, y, e.k === 2 ? 26 : e.k === 1 ? 18 : 10, e.k === 2 ? ['#fff', '#ffe066', '#ff6ad5'] : ['#fff', '#ffd166', '#ff8c42'], e.k ? 4 : 3, e.k ? 3 : 2);
        this.shake = Math.max(this.shake, e.k === 2 ? 6 : e.k === 1 ? 4 : 2);
        break;
      case 'block':
        this.spark(x, y, 12, ['#ffffff', '#9ae0ff', '#2a7aff'], false);
        this.burst(x, y, 8, ['#bfe9ff', '#5ac8fa', '#fff'], 2.5, 2, 0);
        this.shake = Math.max(this.shake, 1);
        break;
      case 'counter':
        this.spark(x, y, 28, ['#ffffff', '#a7f3d0', '#10a37f']);
        this.burst(x, y, 24, ['#fff', '#34d399', '#a7f3d0'], 4, 3);
        this.pop(x, y - 20, 'COUNTER!', '#34d399');
        this.shake = 5;
        break;
      case 'armor':
        this.burst(x, y, 10, ['#ffd23e', '#fff'], 2, 2, 0);
        this.pop(x, y - 16, 'ARMOR', '#ffd23e');
        break;
      case 'tech':
        this.burst(x, y, 12, ['#fff', '#9ad'], 3, 2, 0);
        this.pop(x, y - 10, 'TECH!', '#9adfff');
        break;
      case 'clash':
        this.burst(x, y, 16, ['#fff', '#c9b6ff'], 3, 2, 0);
        break;
      case 'knockdown':
        this.dust(x, GROUND_Y, 10);
        this.shake = Math.max(this.shake, 2);
        break;
      case 'super':
        this.flash = 6;
        this.flashColor = '#ffffff';
        break;
      case 'ko':
        this.flash = 10;
        this.flashColor = '#ffffff';
        this.shake = 8;
        break;
    }
  }

  update(): void {
    for (const p of this.parts) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.g;
      p.vx *= 0.94;
      p.life--;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const p of this.pops) { p.life--; p.y -= 0.4; }
    this.pops = this.pops.filter((p) => p.life > 0);
    for (const b of this.bursts) b.life--;
    this.bursts = this.bursts.filter((b) => b.life > 0);
    for (const p of this.puffs) { p.life--; p.x += p.vx; p.y -= 0.25; p.r += 0.25; }
    this.puffs = this.puffs.filter((p) => p.life > 0);
    this.shake *= 0.82;
    if (this.shake < 0.3) this.shake = 0;
    if (this.flash > 0) this.flash--;
  }

  draw(ctx: Ctx, camX: number): void {
    for (const p of this.puffs) {
      ctx.globalAlpha = (p.life / p.max) * 0.55;
      ctx.fillStyle = '#d8d0c8';
      ctx.beginPath();
      ctx.arc(p.x - camX, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const b of this.bursts) {
      const t = 1 - b.life / b.max;
      const x = b.x - camX;
      if (b.ring) {
        ctx.globalAlpha = (1 - t) * 0.9;
        ctx.strokeStyle = b.colors[1];
        ctx.lineWidth = 2.5 * (1 - t) + 0.5;
        ctx.beginPath();
        ctx.ellipse(x, b.y, b.size * (0.4 + t * 1.4), b.size * (0.25 + t * 0.9), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      const s = b.size * (t < 0.25 ? 0.6 + t * 1.6 : 1 - (t - 0.25) * 1.2);
      if (s > 0) {
        ctx.globalAlpha = 1;
        for (let layer = 0; layer < 3; layer++) {
          const r = s * [1, 0.7, 0.38][layer];
          ctx.fillStyle = b.colors[2 - layer];
          ctx.beginPath();
          const spikes = 8;
          for (let k = 0; k < spikes * 2; k++) {
            const a = b.rot + (k / (spikes * 2)) * Math.PI * 2;
            const rr = k % 2 ? r * 0.32 : r * (k % 4 === 0 ? 1 : 0.7);
            ctx.lineTo(x + Math.cos(a) * rr, b.y + Math.sin(a) * rr);
          }
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
    for (const p of this.parts) {
      ctx.globalAlpha = Math.min(1, (p.life / p.max) * 1.5);
      ctx.fillStyle = p.color;
      const s = p.life > p.max / 2 ? p.size : Math.max(1, p.size - 1);
      ctx.fillRect(Math.round(p.x - camX), Math.round(p.y), s, s);
    }
    ctx.globalAlpha = 1;
    for (const p of this.pops) {
      ctx.globalAlpha = Math.min(1, p.life / 15);
      drawText(ctx, p.text, Math.round(p.x - camX), Math.round(p.y), { color: p.color, align: 'center', outline: '#000', shadow: null });
    }
    ctx.globalAlpha = 1;
  }
}

function glow(ctx: Ctx, x: number, y: number, r: number, inner: string, outer: string): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

export function drawProjectile(ctx: Ctx, p: Projectile, camX: number, t: number): void {
  const cx = Math.round(sx(p.x) - camX);
  const w = Math.round(sx(p.w));
  const h = Math.round(sx(p.h));
  const by = Math.round(GROUND_Y - sx(p.y));
  const cy = by - (h >> 1);
  const f = p.facing;
  const a = p.age;
  switch (p.kind) {
    case 'chalk': {
      glow(ctx, cx, cy, 18, 'rgba(180,220,255,0.55)', 'rgba(180,220,255,0)');
      drawText(ctx, a % 8 < 4 ? 'dL/dW' : 'VL', cx, cy - 3, { color: '#ffffff', shadow: '#5a8ab0', align: 'center' });
      ctx.fillStyle = '#e8f4ff';
      for (let i = 1; i < 5; i++) ctx.fillRect(cx - f * (8 + i * 5), cy + ((i * 7 + a) % 5) - 2, 2, 1);
      break;
    }
    case 'orb':
    case 'bigorb': {
      const r = (w >> 1) + Math.round(Math.sin(a / 3) * 2);
      glow(ctx, cx, cy, r + 8, 'rgba(255,255,255,0.95)', 'rgba(140,90,255,0)');
      glow(ctx, cx, cy, r, 'rgba(255,255,255,1)', 'rgba(160,110,255,0.4)');
      ctx.fillStyle = '#fff';
      ctx.fillRect(cx - 2, cy - 2, 4, 4);
      if (p.kind === 'bigorb') drawText(ctx, 'AGI', cx, cy - 3, { color: '#4b2a99', shadow: null, align: 'center' });
      break;
    }
    case 'box': {
      const col = a % 6 < 3 ? '#22e27a' : '#ff3e8a';
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - (w >> 1) + 1, by - h + 1, w - 2, h - 2);
      ctx.fillStyle = col;
      ctx.fillRect(cx - (w >> 1), by - h - 7, 26, 7);
      drawText(ctx, 'LABEL', cx - (w >> 1) + 1, by - h - 6, { color: '#000', shadow: null });
      for (const [dx, dy] of [[0, 0], [w - 4, 0], [0, h - 4], [w - 4, h - 4]]) ctx.fillRect(cx - (w >> 1) + dx, by - h + dy, 4, 4);
      break;
    }
    case 'zombie': {
      const step = (a >> 3) % 2;
      ctx.fillStyle = '#3d5a3d';
      ctx.fillRect(cx - 5, by - 24, 10, 16);
      ctx.fillStyle = '#7fa070';
      ctx.fillRect(cx - 4, by - 33, 9, 9);
      ctx.fillStyle = '#ff3355';
      ctx.fillRect(cx + (f > 0 ? 2 : -3), by - 30, 2, 1);
      ctx.fillStyle = '#7fa070';
      ctx.fillRect(f > 0 ? cx + 4 : cx - 14, by - 22, 10, 3);
      ctx.fillStyle = '#2a3a4a';
      ctx.fillRect(cx - 5, by - 8, 4, 8 - step * 2);
      ctx.fillRect(cx + 1, by - 8, 4, 6 + step * 2);
      if (a % 40 < 22) {
        ctx.fillStyle = '#f2ead8';
        ctx.fillRect(cx - 14, by - 48, 28, 10);
        drawText(ctx, 'RESET?', cx, by - 46, { color: '#b02020', shadow: null, align: 'center' });
      }
      break;
    }
    case 'spud': {
      ctx.fillStyle = '#7a5530';
      ctx.beginPath();
      ctx.ellipse(cx, cy, (w >> 1) + 1, (h >> 1) + 1, a / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c99a5b';
      ctx.beginPath();
      ctx.ellipse(cx, cy, w >> 1, h >> 1, a / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8a6438';
      ctx.fillRect(cx - 2 + Math.round(Math.cos(a / 4) * 3), cy - 1, 2, 2);
      ctx.fillRect(cx + 2 - Math.round(Math.cos(a / 4) * 3), cy + 2, 1, 1);
      break;
    }
    case 'labeler': {
      const step = (a >> 2) % 2;
      ctx.fillStyle = '#26324a';
      ctx.fillRect(cx - 4, by - 26, 8, 14);
      ctx.fillStyle = '#e0b08a';
      ctx.fillRect(cx - 3, by - 34, 7, 7);
      ctx.fillStyle = '#ffd23e';
      ctx.fillRect(cx - 4, by - 36, 8, 3);
      ctx.fillStyle = '#1b1724';
      ctx.fillRect(cx - 4 + step * 3, by - 12, 3, 12);
      ctx.fillRect(cx + 1 - step * 3, by - 12, 3, 12);
      ctx.fillStyle = '#22e27a';
      ctx.fillRect(cx + f * 6 - 3, by - 28, 8, 6);
      break;
    }
    case 'gpu': {
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(cx - (w >> 1), cy - (h >> 1), w, h);
      ctx.fillStyle = '#76b900';
      ctx.fillRect(cx - (w >> 1), cy - (h >> 1), w, 2);
      ctx.fillStyle = '#e8b23a';
      ctx.fillRect(cx - (w >> 1), cy + (h >> 1) - 2, w, 2);
      ctx.fillStyle = '#444';
      for (const k of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(cx + k * (w >> 2), cy, (h >> 1) - 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#888';
      const sp = (a % 4) - 2;
      for (const k of [-1, 1]) ctx.fillRect(cx + k * (w >> 2) + sp, cy - 1, 2, 2);
      glow(ctx, cx, cy + (h >> 1) + 4, 10, 'rgba(118,185,0,0.6)', 'rgba(118,185,0,0)');
      break;
    }
    case 'beam': {
      const x0 = cx - (w >> 1);
      ctx.fillStyle = '#7a4a24';
      ctx.fillRect(x0 - 3, by - h - 3, w + 6, h + 6);
      ctx.fillStyle = '#1f4a34';
      ctx.fillRect(x0, by - h, w, h);
      const lines = ['ATTN', 'SOFTMAX', 'QK^T/VD', 'LOSS:0.0', 'GPT.PY'];
      lines.forEach((l, i) => drawText(ctx, l, x0 + 3, by - h + 4 + i * 12, { color: i === (a >> 3) % 5 ? '#fff' : '#d8efe0', shadow: null }));
      glow(ctx, cx + f * (w >> 1), cy, 24, 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0)');
      break;
    }
    case 'pr': {
      for (let i = 0; i < 3; i++) {
        const yy = cy - 10 + i * 10 + Math.round(Math.sin((a + i * 5) / 3) * 2);
        const xx = cx - f * i * 6;
        ctx.fillStyle = '#238636';
        ctx.fillRect(xx - 9, yy - 4, 18, 8);
        drawText(ctx, 'PR', xx, yy - 3, { color: '#fff', shadow: null, align: 'center' });
      }
      break;
    }
    case 'cloud': {
      ctx.fillStyle = 'rgba(230,240,255,0.85)';
      for (const [dx, dy, r] of [[-8, 2, 7], [0, -3, 9], [9, 2, 7]]) {
        ctx.beginPath();
        ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'rocket': {
      ctx.fillStyle = '#e8e8f0';
      ctx.fillRect(cx - 10, cy - 3, 20, 6);
      ctx.fillStyle = '#c03040';
      ctx.fillRect(cx + f * 10 - (f > 0 ? 0 : 4), cy - 2, 4, 4);
      const fl = 6 + (a % 3) * 3;
      ctx.fillStyle = '#ffb000';
      ctx.fillRect(f > 0 ? cx - 10 - fl : cx + 10, cy - 2, fl, 4);
      ctx.fillStyle = '#fff6c0';
      ctx.fillRect(f > 0 ? cx - 10 - (fl >> 1) : cx + 10, cy - 1, fl >> 1, 2);
      break;
    }
    case 'wave': {
      ctx.strokeStyle = 'rgba(255,220,120,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx - f * 6, by - 4, 10 + (a % 6), f > 0 ? -1.2 : Math.PI - 1.2, f > 0 ? 0.2 : Math.PI + 0.2);
      ctx.stroke();
      break;
    }
    case 'tiles': {
      for (let i = 0; i < 6; i++) {
        const ox = (i % 3) * 11 - 11 - f * (a % 6), oy = Math.floor(i / 3) * 13 - 13 + Math.sin(a / 4 + i) * 2;
        ctx.fillStyle = `hsl(${(i * 60 + a * 4) % 360},65%,55%)`;
        ctx.fillRect(cx + ox, cy + oy, 10, 12);
        ctx.strokeStyle = '#22e27a';
        ctx.strokeRect(cx + ox - 0.5, cy + oy - 0.5, 11, 13);
      }
      glow(ctx, cx, cy, 26, 'rgba(120,255,200,0.35)', 'rgba(0,0,0,0)');
      break;
    }
    case 'ice': {
      glow(ctx, cx, cy, 30, 'rgba(190,240,255,0.7)', 'rgba(120,200,255,0)');
      ctx.fillStyle = '#e8fbff';
      for (let i = 0; i < 7; i++) {
        const ang = a / 6 + i * 0.9;
        const rr = 8 + (i % 3) * 6;
        ctx.save();
        ctx.translate(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr);
        ctx.rotate(ang);
        ctx.fillRect(-1, -5, 2, 10);
        ctx.fillRect(-5, -1, 10, 2);
        ctx.restore();
      }
      break;
    }
    case 'lightning': {
      ctx.strokeStyle = a % 3 ? '#fffbe0' : '#9ad0ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      let lx = cx;
      ctx.moveTo(lx, by - h);
      for (let yy = by - h; yy < by; yy += 12) { lx = cx + (Math.random() - 0.5) * 16; ctx.lineTo(lx, yy + 12); }
      ctx.stroke();
      glow(ctx, cx, by - h / 2, 40, 'rgba(160,210,255,0.6)', 'rgba(0,0,0,0)');
      break;
    }
    case 'netbeam': {
      const x0 = cx - (w >> 1);
      const g = ctx.createLinearGradient(0, cy - (h >> 1), 0, cy + (h >> 1));
      g.addColorStop(0, 'rgba(120,200,255,0)');
      g.addColorStop(0.5, 'rgba(230,248,255,0.95)');
      g.addColorStop(1, 'rgba(120,200,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x0, cy - (h >> 1), w, h);
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 14; i++) ctx.fillRect(x0 + ((i * 37 + a * 9) % w), cy - 3 + Math.sin(i + a / 3) * (h / 3), 6, 2);
      break;
    }
    case 'clone': {
      ctx.fillStyle = `rgba(200,200,255,${0.25 + 0.1 * Math.sin(a)})`;
      ctx.beginPath();
      ctx.ellipse(cx, by - h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      glow(ctx, cx, by - h / 2, 30, 'rgba(255,255,255,0.4)', 'rgba(0,0,0,0)');
      break;
    }
    case 'portal': {
      ctx.fillStyle = '#1a1820';
      ctx.fillRect(cx - (w >> 1), cy - (h >> 1), w, h);
      ctx.fillStyle = `hsl(${(a * 9) % 360},70%,55%)`;
      ctx.fillRect(cx - (w >> 1) + 3, cy - (h >> 1) + 5, w - 6, h - 10);
      ctx.fillStyle = '#eee';
      for (let k = 0; k < 4; k++) ctx.fillRect(cx - (w >> 1) + 3 + k * 10, cy - (h >> 1) + 1, 5, 2);
      break;
    }
    case 'chip': {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a / 2);
      ctx.fillStyle = '#2a2a30';
      ctx.fillRect(-11, -11, 22, 22);
      ctx.fillStyle = '#ff6a00';
      ctx.fillRect(-6, -6, 12, 12);
      ctx.fillStyle = '#e8b23a';
      for (let k = -9; k <= 9; k += 4) { ctx.fillRect(k, -14, 2, 3); ctx.fillRect(k, 11, 2, 3); ctx.fillRect(-14, k, 3, 2); ctx.fillRect(11, k, 3, 2); }
      ctx.restore();
      glow(ctx, cx, cy, 20, 'rgba(255,120,0,0.4)', 'rgba(0,0,0,0)');
      break;
    }
    case 'fire': {
      for (let i = 0; i < 18; i++) {
        const fx = cx - (w >> 1) + ((i * 29 + a * 3) % w);
        const fh = h * (0.4 + ((i * 7 + a) % 10) / 16);
        const g = ctx.createLinearGradient(0, by, 0, by - fh);
        g.addColorStop(0, 'rgba(255,240,160,0.95)');
        g.addColorStop(0.5, 'rgba(255,120,0,0.8)');
        g.addColorStop(1, 'rgba(200,20,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(fx, by - fh / 2, 9, fh / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'chess': {
      ctx.fillStyle = a % 2 ? '#f2ead8' : '#1a1410';
      ctx.fillRect(cx - 7, by - 6, 14, 6);
      ctx.fillRect(cx - 4, by - 26, 8, 20);
      ctx.beginPath();
      ctx.arc(cx, by - 30, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffd23e';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 7.5, by - 36.5, 15, 37);
      break;
    }
    case 'students': {
      const step = (a >> 2) % 2;
      ctx.fillStyle = `hsl(${(p.id * 53) % 360},45%,45%)`;
      ctx.fillRect(cx - 5, by - 28, 10, 16);
      ctx.fillStyle = '#e8c19a';
      ctx.fillRect(cx - 4, by - 37, 8, 8);
      ctx.fillStyle = '#1b1724';
      ctx.fillRect(cx - 5 + step * 3, by - 12, 3, 12);
      ctx.fillRect(cx + 2 - step * 3, by - 12, 3, 12);
      ctx.fillStyle = '#f2f2f2';
      ctx.fillRect(cx + f * 5 - 3, by - 26, 7, 9);
      break;
    }
    case 'wireframe': {
      ctx.strokeStyle = `rgba(80,240,255,${0.6 + 0.3 * Math.sin(a / 2)})`;
      ctx.lineWidth = 1.5;
      const x0 = cx - (w >> 1);
      for (let k = 0; k <= 6; k++) {
        ctx.beginPath(); ctx.moveTo(x0 + (k * w) / 6, by); ctx.lineTo(x0 + (k * w) / 6, by - h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x0, by - (k * h) / 6); ctx.lineTo(x0 + w, by - (k * h) / 6); ctx.stroke();
      }
      glow(ctx, cx, by - h / 2, 60, 'rgba(80,240,255,0.3)', 'rgba(0,0,0,0)');
      break;
    }
    case 'slide': {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - (w >> 1), cy - (h >> 1), w, h);
      ctx.fillStyle = '#1a73e8';
      ctx.fillRect(cx - (w >> 1), cy - (h >> 1), w, 5);
      ctx.fillStyle = '#555';
      for (let k = 0; k < 3; k++) ctx.fillRect(cx - (w >> 1) + 4, cy - (h >> 1) + 9 + k * 5, w - 10 - k * 6, 2);
      glow(ctx, cx, cy, 24, 'rgba(120,180,255,0.4)', 'rgba(0,0,0,0)');
      break;
    }
    default:
      glow(ctx, cx, cy, 10, '#fff', 'rgba(255,255,255,0)');
  }
  void t;
}
