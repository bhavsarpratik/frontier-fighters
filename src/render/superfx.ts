// Cinematic super-move backgrounds. Drawn behind the fighters while a super is flashing or
// active, so every super transforms the whole screen into its own themed world.
import type { SuperFx } from '../content/types.ts';
import { drawText } from './font.ts';

type Ctx = CanvasRenderingContext2D;

function rand(seed: number) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function drawSuperTheme(ctx: Ctx, theme: SuperFx, t: number, alpha: number, cx: number, ground: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const W = 560, X0 = -40, H = 330, Y0 = -40;
  const fill = (c: string) => { ctx.fillStyle = c; ctx.fillRect(X0, Y0, W, H); };
  const r = rand(7);
  switch (theme) {
    case 'chalk': {
      fill('#173a2a');
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      for (let i = 0; i < 40; i++) ctx.fillRect(X0 + r() * W, Y0 + r() * H, 20 + r() * 60, 1);
      const eq = ['L = -SUM log p', 'dL/dW', 'softmax(QK^T)V', 'x = x + attn(x)', 'lr = 3e-4', 'BACKPROP'];
      eq.forEach((e, i) => drawText(ctx, e, 20 + ((i * 97 + t * 0.6) % 520) - 40, 30 + i * 30, { color: 'rgba(240,250,240,0.85)', shadow: null }));
      break;
    }
    case 'code': {
      fill('#020a04');
      for (let col = 0; col < 40; col++) {
        const x = X0 + col * 14;
        const sp = 1 + (col % 5) * 0.4;
        for (let k = 0; k < 12; k++) {
          const y = ((t * 2 * sp + k * 22 + col * 37) % (H + 40)) + Y0 - 20;
          ctx.fillStyle = k === 0 ? '#d0ffe0' : `rgba(52,211,153,${0.9 - k * 0.07})`;
          ctx.fillRect(x, y, 3, 6);
        }
      }
      break;
    }
    case 'zombie': {
      fill('#1a0a24');
      for (let i = 0; i < 18; i++) {
        const x = X0 + ((i * 33 + t * 0.4) % W);
        const y = ground - 10 - (i % 3) * 18;
        ctx.fillStyle = 'rgba(80,120,70,0.7)';
        ctx.fillRect(x, y - 30, 12, 30);
        ctx.fillRect(x + 1, y - 40, 10, 10);
        ctx.fillStyle = '#ff3355';
        ctx.fillRect(x + 6, y - 37, 2, 1);
      }
      break;
    }
    case 'boxes': {
      fill('#06120c');
      for (let i = 0; i < 30; i++) {
        const x = X0 + r() * W, y = Y0 + r() * H, w = 20 + r() * 50, h = 20 + r() * 50;
        const on = ((t >> 2) + i) % 6 < 4;
        ctx.strokeStyle = on ? ['#22e27a', '#ff3e8a', '#3ec8ff', '#ffd23e'][i % 4] : 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, w, h);
      }
      break;
    }
    case 'cosmos':
    case 'space': {
      fill(theme === 'cosmos' ? '#0a0420' : '#02030a');
      for (let i = 0; i < 120; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.7})`;
        const s = r() < 0.1 ? 2 : 1;
        ctx.fillRect(X0 + ((r() * W - t * (0.5 + r())) % W + W) % W, Y0 + r() * H, s, s);
      }
      const g = ctx.createRadialGradient(cx, 120, 10, cx, 120, 220);
      g.addColorStop(0, theme === 'cosmos' ? 'rgba(180,90,255,0.55)' : 'rgba(80,140,255,0.4)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(X0, Y0, W, H);
      if (theme === 'space') {
        ctx.fillStyle = '#1a4a8a';
        ctx.beginPath();
        ctx.arc(240, ground + 520, 560, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(140,200,255,0.6)';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      break;
    }
    case 'gpu': {
      fill('#04140a');
      ctx.strokeStyle = 'rgba(118,185,0,0.5)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 26; i++) {
        let x = X0 + r() * W, y = Y0 + r() * H;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let k = 0; k < 5; k++) {
          if (k % 2) x += (r() - 0.5) * 120; else y += (r() - 0.5) * 80;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      for (let i = 0; i < 40; i++) {
        const on = ((t >> 2) + i * 3) % 7 < 3;
        ctx.fillStyle = on ? '#b6ff3a' : '#2a4a10';
        ctx.fillRect(X0 + r() * W, Y0 + r() * H, 3, 3);
      }
      break;
    }
    case 'void':
    case 'wireframe': {
      fill(theme === 'void' ? '#000006' : '#020a14');
      const col = theme === 'void' ? 'rgba(60,140,255,0.55)' : 'rgba(80,240,255,0.6)';
      ctx.strokeStyle = col;
      ctx.lineWidth = 1;
      for (let i = -20; i <= 20; i++) {
        ctx.beginPath();
        ctx.moveTo(240 + i * 14, ground - 60);
        ctx.lineTo(240 + i * 80, ground + 80);
        ctx.stroke();
      }
      for (let k = 0; k < 10; k++) {
        const y = ground - 60 + Math.pow(k / 10, 1.8) * 140 + ((t * 0.8) % 14) * (k / 10);
        ctx.beginPath();
        ctx.moveTo(X0, y);
        ctx.lineTo(X0 + W, y);
        ctx.stroke();
      }
      if (theme === 'wireframe') {
        for (let i = 0; i < 6; i++) {
          const x = 40 + i * 80, h = 40 + ((i * 53) % 90);
          ctx.strokeRect(x, ground - 60 - h, 40, h);
        }
      }
      break;
    }
    case 'classroom': {
      fill('#2a2016');
      ctx.fillStyle = '#1e3a2a';
      ctx.fillRect(40, 20, 400, 110);
      drawText(ctx, 'WEEK 1: WHAT IS A NEURAL NETWORK?', 240, 60, { align: 'center', color: '#f0f0e0', shadow: null });
      for (let row = 0; row < 3; row++) {
        for (let i = 0; i < 9; i++) {
          const x = 20 + i * 52 + (row % 2) * 26, y = 170 + row * 28;
          ctx.fillStyle = '#5a3a20';
          ctx.fillRect(x, y, 40, 6);
          ctx.fillStyle = `hsl(${(i * 40 + row * 70) % 360},40%,40%)`;
          ctx.fillRect(x + 14, y - 16 - (Math.sin(t / 6 + i + row) > 0.6 ? 6 : 0), 12, 16);
        }
      }
      break;
    }
    case 'neural': {
      fill('#04060f');
      const layers = [5, 8, 8, 6, 3];
      const pts: [number, number][][] = layers.map((n, li) => Array.from({ length: n }, (_, k) => [60 + li * 90, 30 + (k + 0.5) * (200 / n)] as [number, number]));
      for (let li = 0; li < pts.length - 1; li++) {
        for (const a of pts[li]) for (const b of pts[li + 1]) {
          const pulse = (Math.sin(t / 5 - li * 1.2 + a[1] / 30) + 1) / 2;
          ctx.strokeStyle = `rgba(120,200,255,${0.08 + pulse * 0.35})`;
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
          ctx.stroke();
        }
      }
      for (const layer of pts) for (const p of layer) {
        ctx.fillStyle = '#bfe9ff';
        ctx.beginPath();
        ctx.arc(p[0], p[1], 3, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'film': {
      fill('#0c0a10');
      for (let row = 0; row < 3; row++) {
        const y = 20 + row * 80;
        const off = ((row % 2 ? -1 : 1) * t * 2) % 80;
        ctx.fillStyle = '#1a1820';
        ctx.fillRect(X0, y, W, 60);
        for (let i = -1; i < 9; i++) {
          const x = X0 + i * 80 + off;
          ctx.fillStyle = `hsl(${(i * 47 + row * 90 + t) % 360},60%,45%)`;
          ctx.fillRect(x + 6, y + 8, 68, 44);
          ctx.fillStyle = '#e8e8e8';
          for (let k = 0; k < 4; k++) { ctx.fillRect(x + 8 + k * 18, y + 2, 8, 4); ctx.fillRect(x + 8 + k * 18, y + 54, 8, 4); }
        }
      }
      break;
    }
    case 'heat': {
      const g = ctx.createLinearGradient(0, Y0, 0, H);
      g.addColorStop(0, '#2a0400');
      g.addColorStop(1, '#ff4a00');
      ctx.fillStyle = g;
      ctx.fillRect(X0, Y0, W, H);
      for (let i = 0; i < 14; i++) {
        ctx.strokeStyle = `rgba(255,${180 + i * 5},80,0.35)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = X0; x < X0 + W; x += 8) {
          const y = ground - i * 16 + Math.sin(x / 20 + t / 4 + i) * 5;
          if (x === X0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      break;
    }
    case 'chess': {
      fill('#100c08');
      for (let row = 0; row < 8; row++) {
        for (let col = -6; col < 14; col++) {
          const y0 = ground - 70 + row * row * 2.4 + row * 6;
          const y1 = ground - 70 + (row + 1) * (row + 1) * 2.4 + (row + 1) * 6;
          const w0 = 30 + row * 6;
          ctx.fillStyle = (row + col) % 2 ? '#e8dcc0' : '#3a2a1a';
          ctx.beginPath();
          ctx.moveTo(240 + (col - 4) * w0, y0);
          ctx.lineTo(240 + (col - 3) * w0, y0);
          ctx.lineTo(240 + (col - 3) * (w0 + 6), y1);
          ctx.lineTo(240 + (col - 4) * (w0 + 6), y1);
          ctx.fill();
        }
      }
      break;
    }
  }
  // speed lines toward the centre for extra punch
  ctx.globalAlpha = alpha * 0.35;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2 + t * 0.02;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 140, 130 + Math.sin(a) * 140);
    ctx.lineTo(cx + Math.cos(a) * 300, 130 + Math.sin(a) * 300);
    ctx.stroke();
  }
  ctx.restore();
}
