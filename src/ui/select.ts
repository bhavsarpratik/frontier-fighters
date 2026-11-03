import { isTouch } from '../input/touch.ts';
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
import { drawArt } from '../render/art.ts';

export type Mode = 'cpu' | 'local' | 'training' | 'online' | 'arcade';

const COLS = 11;
const CELL = 40;

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
  lockT = [0, 0];
  phase = 0;

  mode: Mode;
  net?: NetLink;

  constructor(mode: Mode, net?: NetLink, start?: [number, number]) {
    this.mode = mode;
    this.net = net;
    this.cur = start ?? [0, Math.min(1, ROSTER.length - 1)];
  }

  enter(): void {
    playMusic(4);
    if (this.net) {
      this.net.onMsg = (m) => {
        const r = 1 - this.net!.local;
        if (m.t === 'cur') this.cur[r] = m.i;
        if (m.t === 'lock') { this.cur[r] = m.i; this.locked[r] = true; this.lockT[r] = 12; sfx.confirm(); }
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
      app.go(new StageSelect('online', this.cur[0], this.cur[1], this.net));
      return;
    }
    if (this.mode === 'arcade') return;
    app.go(new StageSelect(this.mode, this.cur[0], this.cur[1]));
  }

  update(menu: MenuInput[]): void {
    this.t++;
    for (let p = 0; p < 2; p++) if (this.lockT[p] > 0) this.lockT[p]--;
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
      if (m.up || m.down) nc = c >= COLS ? c - COLS : Math.min(n - 1, c + COLS);
      if (nc !== c) {
        this.cur[p] = nc;
        sfx.menu();
        this.net?.send({ t: 'cur', i: nc });
      }
      if (m.ok) {
        this.locked[p] = true;
        this.lockT[p] = 12;
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
    const t = this.t;
    const n = ROSTER.length;
    const solo = this.mode === 'cpu' || this.mode === 'training' || this.mode === 'arcade';
    const show = (p: number) => !(solo && p === 1 && this.phase === 0);
    const COL = ['#3ec8ff', '#ff3e8a'];

    drawBackdrop(ctx, t, '#160828', '#04020a');
    for (let p = 0; p < 2; p++) {
      const cx = p === 0 ? 112 : 368;
      const g = ctx.createRadialGradient(cx, 110, 10, cx, 110, 170);
      g.addColorStop(0, p === 0 ? 'rgba(62,200,255,0.42)' : 'rgba(255,62,138,0.42)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 480, 270);
    }

    // the two fighters, big
    for (let p = 0; p < 2; p++) {
      const x = p === 0 ? 112 : 368;
      if (!show(p)) {
        drawText(ctx, '?', x, 60, { scale: 10, align: 'center', color: 'rgba(255,255,255,0.18)', shadow: null });
        continue;
      }
      ctx.save();
      ctx.shadowColor = COL[p];
      ctx.shadowBlur = this.locked[p] ? 24 : 12;
      const bounce = this.lockT[p] > 0 ? Math.sin((this.lockT[p] / 12) * Math.PI) * 4 : 0;
      if (!drawArt(ctx, this.cur[p], x, 190 - bounce, 196, p === 1, t)) {
        drawIdleFighter(ctx, this.cur[p], x, 186, t, p === 1, p === 1 && this.cur[0] === this.cur[1], 1.7, this.locked[p] ? 'win' : 'idle');
      }
      ctx.restore();
      if (this.lockT[p] > 0) {
        ctx.globalAlpha = this.lockT[p] / 12 * 0.5;
        ctx.fillStyle = '#fff';
        ctx.fillRect(p === 0 ? 0 : 240, 0, 240, 186);
        ctx.globalAlpha = 1;
      }
    }

    // name plates over a dark band
    const band = ctx.createLinearGradient(0, 128, 0, 186);
    band.addColorStop(0, 'rgba(4,2,12,0)');
    band.addColorStop(1, 'rgba(4,2,12,0.92)');
    ctx.fillStyle = band;
    ctx.fillRect(0, 128, 480, 58);
    for (let p = 0; p < 2; p++) {
      if (!show(p)) continue;
      const def = ROSTER[this.cur[p]];
      const L = p === 0;
      const tx = L ? 10 : 470;
      const al = L ? 'left' : 'right';
      drawText(ctx, def.short, tx, 143, { scale: 3, align: al, gradient: L ? ['#ffffff', '#7ad7ff'] : ['#ffffff', '#ff8ab0'], outline: '#000', shadow: null });
      drawText(ctx, def.title.toUpperCase(), tx, 167, { align: al, color: '#ffd23e', outline: '#000', shadow: null });
      drawText(ctx, def.archetype.toUpperCase(), tx, 176, { align: al, color: '#a8a2c8', outline: '#000', shadow: null });
      if (this.locked[p]) {
        ctx.save();
        ctx.translate(L ? 112 : 368, 112);
        ctx.rotate(-0.12);
        drawText(ctx, 'READY!', 0, 0, { scale: 3, align: 'center', gradient: ['#fff8c0', '#ffb000'], outline: '#401000', shadow: null });
        ctx.restore();
      }
    }

    const pulse = 1 + Math.sin(t / 10) * 0.04;
    ctx.save();
    ctx.translate(240, 92);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = '#ff3e8a';
    ctx.shadowBlur = 16;
    drawText(ctx, 'VS', 0, -14, { scale: 4, align: 'center', gradient: ['#fff8c0', '#ff3e8a'], outline: '#2a0040', shadow: null });
    ctx.restore();
    if (this.mode === 'online' && this.locked[this.net!.local] && !this.locked[1 - this.net!.local]) {
      drawText(ctx, 'WAITING FOR OPPONENT...', 240, 120, { align: 'center', color: '#ffd23e', outline: '#000', shadow: null });
    }

    // portrait strip
    const rows = Math.ceil(n / COLS);
    const gx = 240 - (COLS * CELL) / 2;
    const gy = 188;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, gy - 2, 480, rows * CELL + 4);
    const hot = new Set<number>();
    for (let p = 0; p < 2; p++) if (show(p)) hot.add(this.cur[p]);
    for (let i = 0; i < n; i++) {
      if (hot.has(i)) continue;
      const x = gx + (i % COLS) * CELL;
      const y = gy + Math.floor(i / COLS) * CELL;
      ctx.fillStyle = '#1a1030';
      ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
      ctx.globalAlpha = 0.7;
      drawPortrait(ctx, i, false, x + 2, y + 2, CELL - 4);
      ctx.globalAlpha = 1;
    }
    const labels = this.mode === 'online' || this.mode === 'local' ? ['P1', 'P2'] : ['P1', this.mode === 'training' ? 'DUMMY' : 'CPU'];
    for (let p = 0; p < 2; p++) {
      if (!show(p)) continue;
      const i = this.cur[p];
      const pop = 4;
      const x = gx + (i % COLS) * CELL - pop;
      const y = gy + Math.floor(i / COLS) * CELL - pop;
      const sz = CELL + pop * 2;
      ctx.save();
      ctx.shadowColor = COL[p];
      ctx.shadowBlur = 10;
      ctx.fillStyle = COL[p];
      ctx.fillRect(x - 1, y - 1, sz + 2, sz + 2);
      ctx.restore();
      drawPortrait(ctx, i, p === 1 && this.cur[0] === this.cur[1], x + 1, y + 1, sz - 2);
      if (!this.locked[p] && (t >> 3) % 2 === 0) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, sz - 1, sz - 1);
      }
      const tagW = labels[p].length * 6 + 6;
      const tx = p === 0 ? x : x + sz - tagW;
      ctx.fillStyle = COL[p];
      ctx.fillRect(tx, y + sz - 9, tagW, 9);
      drawText(ctx, labels[p], tx + 3, y + sz - 8, { color: '#000', shadow: null });
    }
    const hint = this.mode === 'local' ? 'P1 F   P2 O   ESC BACK' : this.mode === 'online' ? `${this.net!.label}` : isTouch() ? 'PAD MOVE   OK SELECT   BACK BACK' : 'ENTER SELECT   ESC BACK';
    drawText(ctx, hint, 240, 6, { align: 'center', color: '#c8c2e8', outline: '#000', shadow: null });
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

  // Online: the host chooses, the guest sees the same screen and follows every move.
  private get follower(): boolean {
    return !!this.net && this.net.local === 1;
  }

  enter(): void {
    const net = this.net;
    if (!net) return;
    net.onMsg = (m) => {
      if (m.t === 'stagecur' && this.follower) {
        if (m.i !== this.sel) sfx.menu();
        this.sel = m.i;
      }
      if (m.t === 'go') app.go(new VsScreen({ mode: 'online', p1: m.p1, p2: m.p2, stage: m.stage, seed: m.seed, net, delay: m.delay }));
      if (m.t === 'leave') net.closed = true;
    };
    if (!this.follower) net.send({ t: 'stagecur', i: this.sel });
  }

  update(menu: MenuInput[]): void {
    this.t++;
    if (this.net?.closed) {
      app.go(new TitleScreen());
      return;
    }
    if (app.autoplay && this.t === 30 && !this.follower) menu = [...menu, { up: false, down: false, left: false, right: false, ok: true, back: false, who: 0 }];
    for (const m of menu) {
      if (this.follower && !m.back) continue;
      const before = this.sel;
      if (m.left) { this.sel = (this.sel + STAGES.length - 1) % STAGES.length; sfx.menu(); }
      if (m.right) { this.sel = (this.sel + 1) % STAGES.length; sfx.menu(); }
      if (this.sel !== before) this.net?.send({ t: 'stagecur', i: this.sel });
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
    if (this.follower) {
      const dots = '.'.repeat(((this.t >> 4) % 3) + 1);
      drawText(ctx, `HOST IS PICKING THE ARENA${dots}`, 240, 30, { align: 'center', color: '#ffd23e' });
      drawText(ctx, isTouch() ? 'YOUR SCREEN FOLLOWS THE HOST   BACK: LEAVE' : 'YOUR SCREEN FOLLOWS THE HOST   ESC: LEAVE', 240, 252, { align: 'center', color: '#8a84a8' });
    } else {
      if (this.net) drawText(ctx, 'YOU PICK THE ARENA - YOUR RIVAL SEES IT LIVE', 240, 30, { align: 'center', color: '#ffd23e' });
      drawText(ctx, isTouch() ? '< > CHOOSE   OK TO FIGHT' : '< > CHOOSE   ENTER TO FIGHT', 240, 252, { align: 'center', color: '#8a84a8' });
    }
  }
}
