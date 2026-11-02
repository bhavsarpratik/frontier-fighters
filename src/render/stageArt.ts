import { drawText } from './font.ts';

export const GROUND_Y = 236;

// Per-stage light used on fighters (rim colour) plus floor gloss and depth haze.
export const STAGE_LIGHT: { rim: [number, number, number]; reflect: number; haze: string }[] = [
  { rim: [90, 230, 255], reflect: 0.14, haze: 'rgba(30,80,160,0.22)' },
  { rim: [255, 170, 110], reflect: 0.1, haze: 'rgba(200,90,110,0.16)' },
  { rim: [255, 220, 150], reflect: 0.12, haze: 'rgba(60,50,40,0.25)' },
  { rim: [255, 90, 220], reflect: 0.18, haze: 'rgba(60,20,90,0.25)' },
];
const W = 720;
const FAR_W = 600;
const H = 270;

type Ctx = CanvasRenderingContext2D;

function canvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function bands(x: Ctx, w: number, cols: string[], y0: number, y1: number): void {
  const n = cols.length;
  for (let i = 0; i < n; i++) {
    const a = y0 + ((y1 - y0) * i) / n;
    const b = y0 + ((y1 - y0) * (i + 1)) / n;
    x.fillStyle = cols[i];
    x.fillRect(0, Math.floor(a), w, Math.ceil(b - a));
    if (i < n - 1) {
      x.fillStyle = cols[i + 1];
      for (let px = (i % 2); px < w; px += 2) x.fillRect(px, Math.floor(b) - 1, 1, 1);
    }
  }
}

function floor(x: Ctx, top: string, mid: string, line: string, gap = 48): void {
  x.fillStyle = top;
  x.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  x.fillStyle = mid;
  for (let y = GROUND_Y + 6; y < H; y += 8) x.fillRect(0, y, W, 2);
  x.fillStyle = line;
  for (let gx = -W; gx < W * 2; gx += gap) {
    for (let y = GROUND_Y; y < H; y++) {
      const t = (y - GROUND_Y) / (H - GROUND_Y);
      const xx = Math.round(W / 2 + (gx - W / 2) * (1 + t * 1.6));
      x.fillRect(xx, y, 1, 1);
    }
  }
  x.fillStyle = 'rgba(255,255,255,0.12)';
  x.fillRect(0, GROUND_Y, W, 1);
}

export interface StageLayers {
  far: HTMLCanvasElement;
  mid: HTMLCanvasElement;
  anim: (ctx: Ctx, camX: number, t: number) => void;
  sky: string;
}

function datacenter(): StageLayers {
  const [far, f] = canvas(FAR_W, H);
  bands(f, FAR_W, ['#05060f', '#08102a', '#0b1838', '#0f2148'], 0, 200);
  const r = rng(3);
  for (let i = 0; i < 9; i++) {
    const x = 20 + i * 66;
    f.fillStyle = '#0c1630';
    f.fillRect(x, 60, 46, 150);
    f.fillStyle = '#132250';
    for (let y = 66; y < 205; y += 7) f.fillRect(x + 3, y, 40, 4);
  }
  f.fillStyle = '#1a2a5a';
  for (let i = 0; i < 14; i++) f.fillRect(Math.floor(r() * FAR_W), 30 + Math.floor(r() * 10), 2, 30);
  const [mid, m] = canvas(W, H);
  const racks: [number, number][] = [];
  for (let i = 0; i < 8; i++) {
    const x = 6 + i * 92;
    racks.push([x, 70]);
    m.fillStyle = '#121a2e';
    m.fillRect(x, 70, 62, 166);
    m.fillStyle = '#1d2946';
    m.fillRect(x + 2, 72, 58, 162);
    for (let y = 78; y < 228; y += 10) {
      m.fillStyle = '#0d1424';
      m.fillRect(x + 5, y, 52, 8);
      m.fillStyle = '#2a3a63';
      m.fillRect(x + 5, y, 52, 1);
      m.fillStyle = '#76b900';
      m.fillRect(x + 8, y + 3, 10, 2);
    }
    m.fillStyle = '#0a0f1c';
    m.fillRect(x + 62, 70, 30, 166);
  }
  m.fillStyle = '#2b2f48';
  for (let x = 0; x < W; x += 12) m.fillRect(x, 50, 8, 3);
  m.fillStyle = '#3b3f64';
  m.fillRect(0, 46, W, 4);
  floor(m, '#151b2e', '#1b2440', '#26325a', 40);
  const anim = (ctx: Ctx, camX: number, t: number) => {
    for (let i = 0; i < racks.length; i++) {
      const [x, y0] = racks[i];
      for (let k = 0; k < 15; k++) {
        const on = ((t >> 2) + i * 7 + k * 13) % 11 < 5;
        ctx.fillStyle = on ? '#4cf0ff' : '#1a4b70';
        ctx.fillRect(x + 46 - camX, y0 + 11 + k * 10, 2, 2);
        const on2 = ((t >> 3) + i * 3 + k * 5) % 7 < 2;
        ctx.fillStyle = on2 ? '#ff4f9e' : '#46203a';
        ctx.fillRect(x + 51 - camX, y0 + 11 + k * 10, 2, 2);
      }
    }
    ctx.fillStyle = `rgba(80,180,255,${0.05 + 0.03 * Math.sin(t / 30)})`;
    ctx.fillRect(0, 0, 480, 270);
  };
  return { far, mid, anim, sky: '#05060f' };
}

function rooftop(): StageLayers {
  const [far, f] = canvas(FAR_W, H);
  bands(f, FAR_W, ['#2b1d4f', '#5a2a6b', '#9a3a6e', '#d9566a', '#f08a5d', '#f8c070'], 0, 190);
  f.fillStyle = '#ffe2a0';
  f.beginPath();
  f.arc(420, 150, 26, 0, Math.PI * 2);
  f.fill();
  f.fillStyle = '#f8c070';
  for (let y = 140; y < 180; y += 6) f.fillRect(380, y, 80, 2);
  // distant bridge silhouette
  f.fillStyle = '#7a2a3a';
  f.fillRect(60, 120, 6, 70);
  f.fillRect(190, 120, 6, 70);
  f.fillRect(30, 168, 210, 4);
  for (let x = 66; x < 190; x += 4) {
    const t = (x - 66) / 124;
    f.fillRect(x, 124 + Math.round(36 * 4 * t * (1 - t) * 0.9), 1, 1);
  }
  const r = rng(11);
  f.fillStyle = '#3a2350';
  for (let x = 0; x < FAR_W; x += 14) {
    const h = 30 + Math.floor(r() * 60);
    f.fillRect(x, 190 - h, 13, h + 20);
  }
  const [mid, m] = canvas(W, H);
  m.fillStyle = '#2a1838';
  for (let x = 0; x < W; x += 34) {
    const h = 50 + Math.floor(r() * 80);
    m.fillRect(x, 210 - h, 30, h + 30);
    m.fillStyle = '#ffcf7a';
    for (let wy = 210 - h + 6; wy < 200; wy += 9) for (let wx = x + 4; wx < x + 26; wx += 7) if (r() < 0.35) m.fillRect(wx, wy, 3, 4);
    m.fillStyle = '#2a1838';
  }
  // rooftop props
  m.fillStyle = '#4b3a52';
  m.fillRect(40, 196, 60, 40);
  m.fillStyle = '#5c4a63';
  m.fillRect(44, 200, 52, 6);
  m.fillStyle = '#6b4a3a';
  m.fillRect(600, 150, 50, 60);
  m.fillStyle = '#5a3a2a';
  m.fillRect(596, 146, 58, 8);
  m.fillRect(605, 210, 4, 26);
  m.fillRect(640, 210, 4, 26);
  m.fillStyle = '#3a2a40';
  m.fillRect(0, 226, W, 10);
  floor(m, '#3d2f45', '#45364f', '#53425f', 56);
  const anim = (ctx: Ctx, camX: number, t: number) => {
    ctx.fillStyle = '#1e1428';
    for (let i = 0; i < 4; i++) {
      const bx = ((t * 0.3 + i * 140) % 700) - 100;
      const by = 40 + i * 12 + Math.round(Math.sin(t / 20 + i) * 3);
      ctx.fillRect(Math.round(bx - camX * 0.2), by, 3, 1);
      ctx.fillRect(Math.round(bx - camX * 0.2) + ((t >> 3) % 2 ? -2 : 3), by - 1, 2, 1);
    }
  };
  return { far, mid, anim, sky: '#2b1d4f' };
}

function warehouse(): StageLayers {
  const [far, f] = canvas(FAR_W, H);
  bands(f, FAR_W, ['#1c1a22', '#24212c', '#2c2836'], 0, 200);
  f.fillStyle = '#3a3546';
  for (let x = 0; x < FAR_W; x += 50) f.fillRect(x, 0, 4, 200);
  f.fillStyle = '#e8e4c8';
  for (let x = 20; x < FAR_W; x += 100) f.fillRect(x, 12, 40, 3);
  const [mid, m] = canvas(W, H);
  const r = rng(21);
  const boxes: [number, number, number, number][] = [];
  for (let s = 0; s < 6; s++) {
    const x = 10 + s * 122;
    m.fillStyle = '#5a4632';
    m.fillRect(x, 60, 4, 176);
    m.fillRect(x + 96, 60, 4, 176);
    for (let y = 100; y <= 220; y += 60) {
      m.fillStyle = '#6a5440';
      m.fillRect(x, y, 100, 4);
      let bx = x + 6;
      while (bx < x + 90) {
        const bw = 14 + Math.floor(r() * 12);
        const bh = 14 + Math.floor(r() * 22);
        m.fillStyle = r() < 0.5 ? '#b08a5a' : '#9a7448';
        m.fillRect(bx, y - bh, bw, bh);
        m.fillStyle = '#c9a26c';
        m.fillRect(bx, y - bh, bw, 2);
        m.fillStyle = '#7a5a38';
        m.fillRect(bx + (bw >> 1) - 1, y - bh, 2, bh);
        if (r() < 0.55) boxes.push([bx - 1, y - bh - 1, bw + 2, bh + 2]);
        bx += bw + 3;
      }
    }
  }
  floor(m, '#3a3a40', '#434349', '#4d4d55', 64);
  m.fillStyle = '#e0c000';
  for (let x = 0; x < W; x += 24) m.fillRect(x, GROUND_Y + 3, 12, 2);
  const anim = (ctx: Ctx, camX: number, t: number) => {
    boxes.forEach(([x, y, w, h], i) => {
      if (((t >> 4) + i * 5) % 9 > 5) return;
      const c = ['#22e27a', '#ff3e8a', '#3ec8ff', '#ffd23e'][i % 4];
      ctx.strokeStyle = c;
      ctx.lineWidth = 1;
      ctx.strokeRect(x - camX + 0.5, y + 0.5, w - 1, h - 1);
      ctx.fillStyle = c;
      ctx.fillRect(x - camX, y - 4, 10, 4);
    });
  };
  return { far, mid, anim, sky: '#1c1a22' };
}

function queue(): StageLayers {
  const [far, f] = canvas(FAR_W, H);
  bands(f, FAR_W, ['#070512', '#120a26', '#1d0f38', '#2a1446'], 0, 200);
  const r = rng(7);
  f.fillStyle = '#fff';
  for (let i = 0; i < 70; i++) f.fillRect(Math.floor(r() * FAR_W), Math.floor(r() * 110), 1, 1);
  f.fillStyle = '#e8e0ff';
  f.beginPath();
  f.arc(120, 50, 16, 0, Math.PI * 2);
  f.fill();
  f.fillStyle = '#120a26';
  f.beginPath();
  f.arc(127, 46, 14, 0, Math.PI * 2);
  f.fill();
  f.fillStyle = '#180c2c';
  for (let x = 0; x < FAR_W; x += 22) {
    const h = 40 + Math.floor(r() * 70);
    f.fillRect(x, 200 - h, 20, h);
  }
  const [mid, m] = canvas(W, H);
  m.fillStyle = '#1e1230';
  m.fillRect(0, 120, W, 116);
  m.fillStyle = '#2a1a40';
  for (let x = 0; x < W; x += 60) m.fillRect(x, 120, 2, 116);
  floor(m, '#1d1726', '#241c30', '#2e2440', 52);
  const crowd: [number, number, number][] = [];
  for (let i = 0; i < 26; i++) crowd.push([10 + i * 27 + Math.floor(r() * 10), 0, Math.floor(r() * 4)]);
  const anim = (ctx: Ctx, camX: number, t: number) => {
    const flick = (t >> 2) % 23 === 0 ? 0.3 : 1;
    ctx.globalAlpha = flick;
    drawText(ctx, 'RESET', 360 - camX * 1, 130, { scale: 3, color: '#ff4fd8', shadow: '#5a1050' });
    drawText(ctx, 'OPEN 24/7', 372 - camX, 156, { scale: 1, color: '#7af0ff', shadow: '#103a50' });
    ctx.globalAlpha = 1;
    for (const [x0, , kind] of crowd) {
      const x = Math.round(x0 - camX * 1.0);
      if (x < -20 || x > 500) continue;
      const bob = Math.round(Math.sin(t / 12 + x0) * 2);
      const base = 214 + bob;
      ctx.fillStyle = ['#4a6a4a', '#5a7a52', '#466048', '#6a7a5a'][kind];
      ctx.fillRect(x, base - 22, 10, 22);
      ctx.fillStyle = '#7f9a70';
      ctx.fillRect(x + 1, base - 32, 8, 9);
      ctx.fillStyle = '#ff3355';
      ctx.fillRect(x + 6, base - 29, 2, 1);
      const armUp = ((t >> 4) + x0) % 3 === 0;
      ctx.fillStyle = '#7f9a70';
      ctx.fillRect(x + 9, base - (armUp ? 34 : 22), 3, armUp ? 14 : 10);
      if (kind === 0) {
        ctx.fillStyle = '#e8e0c8';
        ctx.fillRect(x + 6, base - 46, 18, 10);
        ctx.fillStyle = '#c03030';
        ctx.fillRect(x + 8, base - 43, 3, 1);
        ctx.fillRect(x + 13, base - 43, 3, 1);
        ctx.fillRect(x + 18, base - 43, 3, 1);
      }
    }
  };
  return { far, mid, anim, sky: '#070512' };
}

const builders = [datacenter, rooftop, warehouse, queue];
const built = new Map<number, StageLayers>();

export function stageLayers(i: number): StageLayers {
  let s = built.get(i);
  if (!s) {
    s = builders[i % builders.length]();
    built.set(i, s);
  }
  return s;
}

export function drawStage(ctx: Ctx, i: number, camX: number, t: number): void {
  const s = stageLayers(i);
  ctx.fillStyle = s.sky;
  ctx.fillRect(0, 0, 480, 270);
  const farX = Math.round(camX * ((FAR_W - 480) / (W - 480)));
  ctx.drawImage(s.far, -farX, 0);
  const light = STAGE_LIGHT[i % STAGE_LIGHT.length];
  ctx.fillStyle = light.haze;
  ctx.fillRect(0, 0, 480, GROUND_Y);
  ctx.drawImage(s.mid, -Math.round(camX), 0);
  s.anim(ctx, Math.round(camX), t);
  // depth haze so the fighters pop off the background
  const g = ctx.createLinearGradient(0, 60, 0, GROUND_Y);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, light.haze);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 480, GROUND_Y);
  lights(ctx, i, camX, t);
}

function lights(ctx: Ctx, i: number, camX: number, t: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (i === 1) {
    for (let k = 0; k < 5; k++) {
      const x = 420 - camX * 0.3 - k * 70;
      const g = ctx.createLinearGradient(x, 60, x - 160, 260);
      g.addColorStop(0, 'rgba(255,190,120,0.14)');
      g.addColorStop(1, 'rgba(255,190,120,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x, 40);
      ctx.lineTo(x + 18, 40);
      ctx.lineTo(x - 120, 270);
      ctx.lineTo(x - 190, 270);
      ctx.fill();
    }
  } else if (i === 2) {
    for (let k = 0; k < 4; k++) {
      const x = 60 + k * 130 - (camX % 130);
      const g = ctx.createLinearGradient(0, 0, 0, 240);
      g.addColorStop(0, 'rgba(255,240,200,0.18)');
      g.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 30, 0);
      ctx.lineTo(x + 70, 240);
      ctx.lineTo(x - 20, 240);
      ctx.fill();
    }
  } else if (i === 0) {
    const pulse = 0.08 + 0.04 * Math.sin(t / 25);
    const g = ctx.createRadialGradient(240, 300, 20, 240, 300, 260);
    g.addColorStop(0, `rgba(80,220,255,${pulse})`);
    g.addColorStop(1, 'rgba(80,220,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 480, 270);
  } else if (i === 3) {
    const x = 400 - camX;
    const flick = (t >> 2) % 23 === 0 ? 0.3 : 1;
    const g = ctx.createRadialGradient(x, 140, 4, x, 140, 140);
    g.addColorStop(0, `rgba(255,80,220,${0.35 * flick})`);
    g.addColorStop(1, 'rgba(255,80,220,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 140, 0, 280, 270);
  }
  ctx.restore();
}


