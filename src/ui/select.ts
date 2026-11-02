import { playMusic, sfx } from '../audio/audio.ts';
import { ROSTER } from '../content/roster.ts';
import { STAGES } from '../content/stages.ts';
import { DIFF_NAMES, type Difficulty } from '../ai/cpu.ts';
import { drawText, wrap } from '../render/font.ts';
import { drawPortrait } from '../render/portrait.ts';
import { samplePose } from '../render/poses.ts';
import { altLook, drawSprite, poseKey, spriteFor } from '../render/rig.ts';
import { drawStage } from '../render/stageArt.ts';
import type { MenuInput } from '../input/devices.ts';
import { app, drawBackdrop, type Screen } from './app.ts';
import { TitleScreen } from './title.ts';
import type { NetLink } from './netlink.ts';
import { VsScreen } from './vs.ts';
import { moveList } from './hints.ts';

export type Mode = 'cpu' | 'local' | 'training' | 'online' | 'arcade';

const COLS = 4;
const CELL = 50;

export function drawIdleFighter(ctx: CanvasRenderingContext2D, char: number, x: number, y: number, t: number, flip: boolean, alt: boolean, scale = 2, anim = 'idle'): void {
  const def = ROSTER[char];
  const look = alt ? altLook(def.look) : def.look;
  const pose = samplePose(anim, t);
  const res = Math.max(2, Math.ceil(scale * 2));
  const spr = spriteFor(`${char}|${alt ? 1 : 0}|${poseKey(pose)}`, look, pose, res);
  drawSprite(ctx, spr, x, y, flip, scale);
}

export class CharSelect implements Screen {
  t = 0;
  cur: [number, number];
  locked: [boolean, boolean] = [false, false];
  phase = 0;

  mode: Mode;
  net?: NetLink;

  constructor(mode: Mode, net?: NetLink, start?: [number, number]) {
    this.mode = mode;
    this.net = net;
    this.cur = start ?? [0, Math.min(1, ROSTER.length - 1)];
  }

  enter(): void {
    playMusic(2);
    if (this.net) {
      this.net.onMsg = (m) => {
        const r = 1 - this.net!.local;
        if (m.t === 'cur') this.cur[r] = m.i;
        if (m.t === 'lock') { this.cur[r] = m.i; this.locked[r] = true; sfx.confirm(); }
        if (m.t === 'unlock') this.locked[r] = false;
        if (m.t === 'go') app.go(new VsScreen({ mode: 'online', p1: m.p1, p2: m.p2, stage: m.stage, seed: m.seed, net: this.net, delay: m.delay }));
        if (m.t === 'leave') this.net!.closed = true;
        this.maybeAdvance();
      };
    }
  }

  private controlled(who: number): number {
    if (this.mode === 'online') return this.net!.local;
    if (this.mode === 'local') return who === 1 ? 1 : 0;
    return this.phase === 0 ? 0 : 1;
  }

  private maybeAdvance(): void {
    if (!this.locked[0] || !this.locked[1]) return;
    if (this.mode === 'online') {
      if (this.net!.local === 0) app.go(new StageSelect('online', this.cur[0], this.cur[1], this.net));
      return;
    }
    if (this.mode === 'arcade') return;
    app.go(new StageSelect(this.mode, this.cur[0], this.cur[1]));
  }

  update(menu: MenuInput[]): void {
    this.t++;
    const n = ROSTER.length;
    if (app.autoplay && this.t === 30 && this.net && !this.locked[this.net.local]) menu = [...menu, { up: false, down: false, left: false, right: false, ok: true, back: false, who: 0 }];
    for (const m of menu) {
      const p = this.controlled(m.who);
      if (m.back) {
        sfx.back();
        if (this.locked[p]) {
          this.locked[p] = false;
          if (this.mode === 'cpu' || this.mode === 'training') this.phase = 0;
          this.net?.send({ t: 'unlock' });
        } else if (this.phase === 1 && !this.locked[1]) {
          this.phase = 0;
          this.locked[0] = false;
        } else {
          this.net?.close();
          app.go(new TitleScreen());
          return;
        }
        continue;
      }
      if (this.locked[p]) continue;
      const c = this.cur[p];
      let nc = c;
      if (m.left) nc = (c + n - 1) % n;
      if (m.right) nc = (c + 1) % n;
      if (m.up) nc = (c + n - COLS) % n;
      if (m.down) nc = (c + COLS) % n;
      if (nc !== c) {
        this.cur[p] = nc;
        sfx.menu();
        this.net?.send({ t: 'cur', i: nc });
      }
      if (m.ok) {
        this.locked[p] = true;
        sfx.confirm();
        this.net?.send({ t: 'lock', i: this.cur[p] });
        if (this.mode === 'arcade') {
          void import('./arcade.ts').then((a) => a.startArcade(this.cur[0]));
          return;
        }
        if ((this.mode === 'cpu' || this.mode === 'training') && p === 0) this.phase = 1;
        this.maybeAdvance();
      }
    }
    if (this.net?.closed) {
      app.go(new TitleScreen());
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    drawBackdrop(ctx, this.t);
    drawText(ctx, 'SELECT YOUR FIGHTER', 240, 8, { scale: 2, align: 'center', gradient: ['#fff', '#ffd23e'], outline: '#000', shadow: null });
    const n = ROSTER.length;
    const rows = Math.ceil(n / COLS);
    const gx = 240 - (COLS * CELL) / 2;
    const gy = 270 - rows * CELL - 22;
    for (let i = 0; i < n; i++) {
      const x = gx + (i % COLS) * CELL;
      const y = gy + Math.floor(i / COLS) * CELL;
      ctx.fillStyle = '#000';
      ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
      drawPortrait(ctx, i, false, x + 2, y + 2, CELL - 4);
    }
    const label = this.mode === 'online' ? ['P1', 'P2'] : this.mode === 'local' ? ['P1', 'P2'] : ['P1', this.mode === 'training' ? 'DUMMY' : 'CPU'];
    for (let p = 0; p < 2; p++) {
      if ((this.mode === 'cpu' || this.mode === 'training' || this.mode === 'arcade') && p === 1 && this.phase === 0) continue;
      const i = this.cur[p];
      const x = gx + (i % COLS) * CELL;
      const y = gy + Math.floor(i / COLS) * CELL;
      const col = p === 0 ? '#3ec8ff' : '#ff3e8a';
      const blink = this.locked[p] || (this.t >> 3) % 2 === 0;
      ctx.strokeStyle = blink ? col : '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1 + p, y + 1 + p, CELL - 2 - p * 2, CELL - 2 - p * 2);
      drawText(ctx, label[p], x + (p === 0 ? 3 : CELL - 3), y + CELL - 10, { align: p === 0 ? 'left' : 'right', color: col, outline: '#000', shadow: null });
    }
    for (let p = 0; p < 2; p++) {
      if ((this.mode === 'cpu' || this.mode === 'training' || this.mode === 'arcade') && p === 1 && this.phase === 0) continue;
      const def = ROSTER[this.cur[p]];
      const x = p === 0 ? 70 : 410;
      drawIdleFighter(ctx, this.cur[p], x, 210, this.t, p === 1, p === 1 && this.cur[0] === this.cur[1], 1.6, this.locked[p] ? 'win' : 'idle');
      const g = ctx.createLinearGradient(p === 0 ? 0 : 480, 0, p === 0 ? 230 : 250, 0);
      g.addColorStop(0, 'rgba(6,3,18,0.86)');
      g.addColorStop(0.75, 'rgba(6,3,18,0.6)');
      g.addColorStop(1, 'rgba(6,3,18,0)');
      ctx.fillStyle = g;
      ctx.fillRect(p === 0 ? 0 : 250, 28, 230, 136);
      const tx = p === 0 ? 6 : 474;
      const al = p === 0 ? 'left' : 'right';
      drawText(ctx, def.name, tx, 34, { align: al, color: '#fff' });
      drawText(ctx, def.title.toUpperCase(), tx, 44, { align: al, color: p === 0 ? '#7ad7ff' : '#ff8ab0' });
      drawText(ctx, def.archetype.toUpperCase(), tx, 54, { align: al, color: '#aaa' });
      const layout = this.mode === 'local' ? (p === 0 ? 'p1duo' : 'p2duo') : 'solo';
      if (p === 0 || this.mode === 'local') {
        moveList(this.cur[p], layout).forEach((l, k) => {
          drawText(ctx, l.name, tx, 70 + k * 20, { align: al, color: '#ffd23e' });
          drawText(ctx, `${l.easy}  OR  ${l.input}`, tx, 79 + k * 20, { align: al, color: '#bfe9ff' });
        });
      }
      if (this.locked[p]) drawText(ctx, 'READY!', p === 0 ? 70 : 410, 214, { scale: 2, align: 'center', color: '#ffd23e', outline: '#000', shadow: null });
    }
    const hint = this.mode === 'local' ? 'P1: WASD + T   P2: ARROWS + O   BACK: ESC / P' : this.mode === 'online' ? `${this.net!.label}` : 'ARROWS/WASD + ENTER   BACK: ESC';
    drawText(ctx, hint, 240, 260, { align: 'center', color: '#8a84a8' });
    if (this.mode === 'online' && this.locked[this.net!.local] && !this.locked[1 - this.net!.local]) {
      drawText(ctx, 'WAITING FOR OPPONENT...', 240, 30, { align: 'center', color: '#ffd23e' });
    }
    if (this.mode === 'online' && this.locked[0] && this.locked[1] && this.net!.local === 1) {
      drawText(ctx, 'HOST IS PICKING THE STAGE...', 240, 30, { align: 'center', color: '#ffd23e' });
    }
  }
}

export class StageSelect implements Screen {
  t = 0;
  sel = 0;
  diff: Difficulty = 1;

  mode: Mode;
  p1: number;
  p2: number;
  net?: NetLink;

  constructor(mode: Mode, p1: number, p2: number, net?: NetLink) {
    this.mode = mode;
    this.p1 = p1;
    this.p2 = p2;
    this.net = net;
    this.sel = ROSTER[p2].stage % STAGES.length;
  }

  update(menu: MenuInput[]): void {
    this.t++;
    if (app.autoplay && this.t === 30) menu = [...menu, { up: false, down: false, left: false, right: false, ok: true, back: false, who: 0 }];
    for (const m of menu) {
      if (m.left) { this.sel = (this.sel + STAGES.length - 1) % STAGES.length; sfx.menu(); }
      if (m.right) { this.sel = (this.sel + 1) % STAGES.length; sfx.menu(); }
      if (this.mode === 'cpu' && (m.up || m.down)) {
        this.diff = ((this.diff + (m.up ? 1 : 2)) % 3) as Difficulty;
        sfx.menu();
      }
      if (m.back) {
        sfx.back();
        if (this.net) {
          this.net.close();
          app.go(new TitleScreen());
        } else app.go(new CharSelect(this.mode, undefined, [this.p1, this.p2]));
        return;
      }
      if (m.ok) {
        sfx.confirm();
        const seed = (Math.random() * 0xffffffff) >>> 0;
        if (this.net) {
          const go = { t: 'go' as const, p1: this.p1, p2: this.p2, stage: this.sel, seed, delay: 2 };
          this.net.send(go);
          app.go(new VsScreen({ mode: 'online', p1: this.p1, p2: this.p2, stage: this.sel, seed, net: this.net, delay: 2 }));
        } else {
          app.go(new VsScreen({ mode: this.mode, p1: this.p1, p2: this.p2, stage: this.sel, seed, cpu: this.diff }));
        }
        return;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    drawStage(ctx, this.sel, 120 + Math.sin(this.t / 80) * 110, this.t);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, 480, 46);
    ctx.fillRect(0, 196, 480, 74);
    drawText(ctx, 'SELECT STAGE', 240, 8, { scale: 2, align: 'center', gradient: ['#fff', '#ffd23e'], outline: '#000', shadow: null });
    const s = STAGES[this.sel];
    drawText(ctx, `< ${s.name} >`, 240, 206, { scale: 2, align: 'center', color: '#fff', outline: '#000', shadow: null });
    wrap(s.subtitle.toUpperCase(), 60).forEach((l, i) => drawText(ctx, l, 240, 228 + i * 10, { align: 'center', color: '#7ad7ff' }));
    if (this.mode === 'cpu') drawText(ctx, `CPU: ${DIFF_NAMES[this.diff]}  (UP/DOWN)`, 240, 30, { align: 'center', color: '#ffd23e' });
    drawText(ctx, 'ENTER TO FIGHT', 240, 252, { align: 'center', color: '#8a84a8' });
  }
}
