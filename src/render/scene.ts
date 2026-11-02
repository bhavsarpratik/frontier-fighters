import { ROSTER } from '../content/roster.ts';
import { CHARS } from '../sim/data.ts';
import { BAR, FX, MAX_METER, SCREEN_W, STAGE_W } from '../sim/fixed.ts';
import { activeHitbox, hurtboxes, projBox, pushbox, type WBox } from '../sim/combat.ts';
import { FIGHT_CALL as INTRO_FIGHT_FRAME } from '../sim/step.ts';
import {
  P_INTRO, P_KO, P_MATCH_END, S_AIR, S_AIRHIT, S_ATTACK, S_BLOCKSTUN, S_CROUCH, S_DASH, S_GETUP, S_HITSTUN, S_IDLE,
  S_INTRO, S_JUMPSQUAT, S_KNOCKDOWN, S_KO, S_LAND, S_TECH, S_THROWN, S_WALK, S_WIN, type FighterState, type SimEvent, type SimState,
} from '../sim/types.ts';
import { Effects, drawProjectile } from './fx.ts';
import { drawText } from './font.ts';
import { samplePose, type Pose } from './poses.ts';
import { altLook, drawSprite, poseKey, spriteFor, type Sprite } from './rig.ts';
import { drawStage, GROUND_Y, STAGE_LIGHT } from './stageArt.ts';
import { drawPortrait } from './portrait.ts';
import { artFull, useArt } from './art.ts';
import { drawPuppet } from './puppet.ts';

type Ctx = CanvasRenderingContext2D;
const toS = (v: number) => v / FX;
export const CAM_ZOOM = 1.15;
const VIEW_W = SCREEN_W / CAM_ZOOM;
const ANCHOR_Y = GROUND_Y + 14;
const SPRITE_RES = 2 * CAM_ZOOM;

export function fighterPose(s: SimState, f: FighterState): Pose {
  const c = CHARS[f.char];
  switch (f.state) {
    case S_ATTACK: {
      const m = c.moves[f.move];
      return samplePose(m.anim, f.mf, { startup: m.startup, active: m.active, total: m.total });
    }
    case S_IDLE: return samplePose('idle', s.frame + f.char * 7);
    case S_WALK: {
      const back = Math.sign(f.vx) !== f.facing;
      return samplePose('walk', back ? 1000 - f.sf : f.sf);
    }
    case S_CROUCH: return samplePose('crouch', 0);
    case S_JUMPSQUAT: return samplePose('land', 0);
    case S_AIR: return samplePose('jump', f.sf);
    case S_LAND: return samplePose('land', f.sf);
    case S_DASH: return samplePose(f.dashDir === f.facing ? 'dash' : 'bdash', f.sf);
    case S_HITSTUN: return samplePose(f.crouchHit ? 'hitc' : 'hit', f.sf);
    case S_BLOCKSTUN: return samplePose(f.crouchHit ? 'cblock' : 'block', 0);
    case S_AIRHIT: return samplePose('air', f.sf);
    case S_THROWN: return samplePose('thrown', f.grabT);
    case S_KNOCKDOWN:
    case S_KO: return samplePose('kd', f.sf);
    case S_GETUP: return samplePose('getup', f.sf);
    case S_WIN: return samplePose('win', f.sf);
    case S_INTRO: return samplePose('intro', s.phase === P_INTRO ? s.phaseT : 200);
    case S_TECH: return samplePose('tech', f.sf);
  }
  return samplePose('idle', s.frame);
}

export interface SceneOpts { boxes?: boolean; labels?: [string, string]; hideHud?: boolean; training?: boolean; inputDisplay?: number[][] }

interface Ghost { spr: Sprite; x: number; y: number; flip: boolean; life: number; color: string }

const tinted = new WeakMap<Sprite, Map<string, Sprite>>();
function tint(spr: Sprite, color: string): Sprite {
  let m = tinted.get(spr);
  if (!m) { m = new Map(); tinted.set(spr, m); }
  let t = m.get(color);
  if (!t) {
    const c = document.createElement('canvas');
    c.width = spr.w;
    c.height = spr.h;
    const x = c.getContext('2d')!;
    x.drawImage(spr.canvas as CanvasImageSource, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = color;
    x.fillRect(0, 0, spr.w, spr.h);
    t = { ...spr, canvas: c };
    m.set(color, t);
  }
  return t;
}

export class MatchScene {
  fx = new Effects();
  camX = (STAGE_W - VIEW_W) / 2;
  hpLag = [0, 0];
  cutin: { p: number; name: string; t: number } | null = null;
  t = 0;
  alt: [boolean, boolean];
  stage: number;
  zoom = 1;
  ghosts: Ghost[] = [];
  praiseText: { text: string; side: number; t: number } | null = null;
  private lastState: SimState | null = null;

  constructor(stage: number, p1: number, p2: number) {
    this.stage = stage;
    this.alt = [false, p1 === p2];
    this.hpLag = [CHARS[p1].def.hp, CHARS[p2].def.hp];
  }

  onEvents(evs: SimEvent[]): void {
    for (const e of evs) {
      this.fx.onEvent(e);
      if (e.t === 'super') {
        this.cutin = { p: e.p, name: e.s ?? 'SUPER', t: 45 };
        this.zoom = Math.max(this.zoom, 1.1);
      }
      if (e.t === 'hit' && (e.k ?? 0) >= 1) this.zoom = Math.max(this.zoom, e.k === 2 ? 1.06 : 1.035);
      if (e.t === 'ko') this.zoom = 1.12;
      const fx = this.lastState ? toS(this.lastState.f[Math.max(0, e.p)].x) : 240;
      if (e.t === 'rehired') this.fx.pop(fx, 120, 'FIRED? REHIRED!', '#9ad0ff');
      if (e.t === 'buff') this.fx.pop(fx, 120, 'HARDCORE MODE', '#ff5050');
      if (e.t === 'dash' || e.t === 'jump' || e.t === 'land') this.fx.dust(fx, GROUND_Y, e.t === 'land' ? 6 : 4);
    }
  }

  praise(text: string, side: number): void {
    this.praiseText = { text, side, t: 70 };
  }

  update(s: SimState): void {
    this.lastState = s;
    if (this.praiseText && --this.praiseText.t <= 0) this.praiseText = null;
    this.t++;
    this.fx.update();
    for (let i = 0; i < 2; i++) {
      const hp = Math.max(0, s.f[i].hp);
      if (this.hpLag[i] < hp) this.hpLag[i] = hp;
      else if (s.f[i].state !== S_HITSTUN && s.f[i].state !== S_AIRHIT) this.hpLag[i] = Math.max(hp, this.hpLag[i] - 5);
    }
    const mid = (toS(s.f[0].x) + toS(s.f[1].x)) / 2;
    const target = Math.max(0, Math.min(STAGE_W - VIEW_W, mid - VIEW_W / 2));
    this.camX += (target - this.camX) * 0.22;
    this.zoom += (1 - this.zoom) * (s.freeze > 0 ? 0.04 : 0.14);
    if (this.cutin && --this.cutin.t <= 0) this.cutin = null;
    for (const g of this.ghosts) g.life--;
    this.ghosts = this.ghosts.filter((g) => g.life > 0);
  }

  draw(ctx: Ctx, s: SimState, o: SceneOpts = {}): void {
    const shx = this.fx.shake ? (Math.random() - 0.5) * this.fx.shake * 2 : 0;
    const shy = this.fx.shake ? (Math.random() - 0.5) * this.fx.shake : 0;
    const cam = Math.round(this.camX);
    const light = STAGE_LIGHT[this.stage % STAGE_LIGHT.length];
    ctx.save();
    ctx.translate(0, ANCHOR_Y);
    ctx.scale(CAM_ZOOM, CAM_ZOOM);
    ctx.translate(0, -ANCHOR_Y);
    const focusX = (toS(s.f[0].x) + toS(s.f[1].x)) / 2 - cam;
    const focusY = GROUND_Y - 50;
    ctx.translate(focusX + shx, focusY + shy);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-focusX, -focusY);
    drawStage(ctx, this.stage, cam, this.t);
    if (light.reflect > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(-40, GROUND_Y, 560, 60);
      ctx.clip();
      ctx.globalAlpha = light.reflect;
      ctx.translate(0, GROUND_Y * 2);
      ctx.scale(1, -1);
      for (const i of [0, 1]) this.drawFighter(ctx, s, i, cam, light.rim, false);
      ctx.restore();
      const g = ctx.createLinearGradient(0, GROUND_Y, 0, 270);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = g;
      ctx.fillRect(-40, GROUND_Y, 560, 40);
    }
    if (s.freeze > 0) this.drawSuperBackdrop(ctx, s, cam);
    for (const f of s.f) {
      const x = toS(f.x) - cam;
      const w = 22 - Math.min(14, toS(f.y) / 8);
      const g = ctx.createRadialGradient(x, GROUND_Y, 1, x, GROUND_Y, w);
      g.addColorStop(0, 'rgba(0,0,0,0.55)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.translate(x, GROUND_Y);
      ctx.scale(1, 0.22);
      ctx.translate(-x, -GROUND_Y);
      ctx.fillStyle = g;
      ctx.fillRect(x - w, GROUND_Y - w, w * 2, w * 2);
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const g of this.ghosts) {
      ctx.globalAlpha = (g.life / 10) * 0.55;
      drawSprite(ctx, tint(g.spr, g.color), g.x - cam, g.y, g.flip);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    const order = s.f[0].state === S_ATTACK && s.f[1].state !== S_ATTACK ? [1, 0] : [0, 1];
    for (const i of order) this.drawFighter(ctx, s, i, cam, light.rim, true);
    for (const p of s.proj) drawProjectile(ctx, p, cam, this.t);
    this.fx.draw(ctx, cam);
    if (o.boxes) drawBoxes(ctx, s, cam);
    ctx.restore();
    const v = ctx.createRadialGradient(240, 140, 120, 240, 140, 320);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, 480, 270);
    if (this.fx.flash > 0) {
      ctx.globalAlpha = this.fx.flash / 12;
      ctx.fillStyle = this.fx.flashColor;
      ctx.fillRect(0, 0, 480, 270);
      ctx.globalAlpha = 1;
    }
    if (this.cutin) this.drawCutin(ctx, s);
    if (!o.hideHud) this.drawHud(ctx, s, o);
  }

  private drawSuperBackdrop(ctx: Ctx, s: SimState, cam: number): void {
    const p = s.f[Math.max(0, s.freezeOwner)];
    const cx = toS(p.x) - cam;
    const cy = GROUND_Y - 50;
    ctx.fillStyle = 'rgba(8,0,24,0.72)';
    ctx.fillRect(-40, -40, 560, 350);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.t * 0.01);
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      ctx.fillStyle = i % 2 ? 'rgba(255,62,138,0.22)' : 'rgba(255,210,62,0.16)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * 420, Math.sin(a) * 420);
      ctx.lineTo(Math.cos(a + 0.09) * 420, Math.sin(a + 0.09) * 420);
      ctx.fill();
    }
    ctx.restore();
    const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 70);
    g.addColorStop(0, 'rgba(255,240,200,0.8)');
    g.addColorStop(1, 'rgba(255,62,138,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 70, cy - 70, 140, 140);
  }

  private drawFighter(ctx: Ctx, s: SimState, i: number, cam: number, rim: [number, number, number], main: boolean): void {
    const f = s.f[i];
    if (useArt() && artFull(f.char)) {
      const m = f.state === S_ATTACK ? CHARS[f.char].moves[f.move] : null;
      const ghost = main && ((!!m && (!!m.name || !!m.isSuper) && f.mf < m.startup + m.active) || f.state === S_DASH);
      if (main && f.inv > 0 && f.state !== S_ATTACK && (this.t >> 1) % 2 === 0) ctx.globalAlpha = 0.55;
      if (main && (f.buff > 0 || (s.freeze > 0 && s.freezeOwner === i))) {
        ctx.save();
        ctx.shadowColor = f.buff > 0 ? '#ff2020' : '#ffd23e';
        ctx.shadowBlur = 12;
        drawPuppet(ctx, f, toS(f.x) - cam, GROUND_Y - toS(f.y), this.t, { alt: this.alt[i], flash: false, ghost: false });
        ctx.restore();
      }
      drawPuppet(ctx, f, toS(f.x) - cam, GROUND_Y - toS(f.y), this.t, {
        alt: this.alt[i], ghost, flash: main && f.hitstop > 0 && (f.state === S_HITSTUN || f.state === S_AIRHIT),
      });
      ctx.globalAlpha = 1;
      return;
    }
    const def = ROSTER[f.char];
    const look = this.alt[i] ? altLook(def.look) : def.look;
    const pose = fighterPose(s, f);
    const spr = spriteFor(`${f.char}|${this.alt[i] ? 1 : 0}|${poseKey(pose)}`, look, pose, SPRITE_RES, rim);
    const x = toS(f.x) - cam;
    const y = GROUND_Y - toS(f.y);
    const flip = f.facing < 0;
    if (main) {
      const m = f.state === S_ATTACK ? CHARS[f.char].moves[f.move] : null;
      const trail = (m && (m.name || m.isSuper) && f.mf < m.startup + m.active) || f.state === S_DASH;
      if (trail && this.t % 2 === 0 && s.freeze === 0) this.ghosts.push({ spr, x: x + cam, y, flip, life: 10, color: m?.isSuper ? '#ff3e8a' : i === 0 ? '#3ec8ff' : '#ff8a3e' });
      if (f.inv > 0 && f.state !== S_ATTACK && (this.t >> 1) % 2 === 0) ctx.globalAlpha = 0.55;
      if (f.buff > 0 || (s.freeze > 0 && s.freezeOwner === i)) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = f.buff > 0 ? 0.3 + 0.15 * Math.sin(this.t / 3) : 0.5;
        for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) drawSprite(ctx, spr, x + dx, y + dy, flip);
        ctx.restore();
      }
    }
    drawSprite(ctx, spr, x, y, flip);
    ctx.globalAlpha = 1;
    if (main && f.hitstop > 0 && (f.state === S_HITSTUN || f.state === S_AIRHIT)) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.32;
      drawSprite(ctx, spr, x, y, flip);
      ctx.restore();
    }
  }

  private drawCutin(ctx: Ctx, s: SimState): void {
    const c = this.cutin!;
    const k = 45 - c.t;
    const e = 1 - Math.pow(1 - Math.min(1, k / 8), 3);
    const out = c.t < 8 ? c.t / 8 : 1;
    const y = 88;
    const left = c.p === 0;
    const bx = left ? -500 + 520 * e : 980 - 520 * e;
    ctx.save();
    ctx.globalAlpha = out;
    ctx.beginPath();
    ctx.moveTo(bx, y);
    ctx.lineTo(left ? bx + 480 : bx - 480, y);
    ctx.lineTo(left ? bx + 460 : bx - 460, y + 80);
    ctx.lineTo(left ? bx - 20 : bx + 20, y + 80);
    ctx.closePath();
    const grd = ctx.createLinearGradient(0, y, 0, y + 80);
    grd.addColorStop(0, '#ff3e8a');
    grd.addColorStop(0.5, '#a12bd8');
    grd.addColorStop(1, '#3a0d8a');
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    for (let i = 0; i < 16; i++) ctx.fillRect(((i * 61 + k * (left ? 14 : -14)) % 560 + 560) % 560 - 40, y + 4 + (i % 5) * 16, 40, 1.5);
    drawPortrait(ctx, s.f[c.p].char, this.alt[c.p], left ? 26 - (1 - e) * 100 : 480 - 26 - 76 + (1 - e) * 100, y + 2, 76, !left);
    ctx.restore();
    ctx.globalAlpha = out;
    drawText(ctx, c.name, left ? 112 + (1 - e) * 200 : 368 - (1 - e) * 200, y + 30, {
      scale: 2, align: left ? 'left' : 'right', gradient: ['#fff8c0', '#ffb000'], outline: '#2a0040', shadow: null,
    });
    ctx.globalAlpha = 1;
  }

  private drawHud(ctx: Ctx, s: SimState, o: SceneOpts): void {
    const W = 180;
    for (let i = 0; i < 2; i++) {
      const f = s.f[i];
      const def = ROSTER[f.char];
      const max = def.hp;
      const L = i === 0;
      const x0 = L ? 40 : 480 - 40 - W;
      const y0 = 12;
      const plate = (pad: number, col: string | CanvasGradient) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        if (L) {
          ctx.moveTo(x0 - pad - 6, y0 - pad);
          ctx.lineTo(x0 + W + pad, y0 - pad);
          ctx.lineTo(x0 + W + pad - 6, y0 + 11 + pad);
          ctx.lineTo(x0 - pad, y0 + 11 + pad);
        } else {
          ctx.moveTo(x0 - pad, y0 - pad);
          ctx.lineTo(x0 + W + pad + 6, y0 - pad);
          ctx.lineTo(x0 + W + pad, y0 + 11 + pad);
          ctx.lineTo(x0 - pad + 6, y0 + 11 + pad);
        }
        ctx.closePath();
        ctx.fill();
      };
      const metal = ctx.createLinearGradient(0, y0 - 3, 0, y0 + 14);
      metal.addColorStop(0, '#e8e4f8');
      metal.addColorStop(0.5, '#6a6488');
      metal.addColorStop(1, '#2a2440');
      plate(3, '#000');
      plate(2, metal);
      plate(0, '#2a0812');
      const hpW = (W * Math.max(0, f.hp)) / max;
      const lagW = (W * this.hpLag[i]) / max;
      const fill = (w: number, top: string, bot: string) => {
        const g = ctx.createLinearGradient(0, y0, 0, y0 + 11);
        g.addColorStop(0, top);
        g.addColorStop(1, bot);
        ctx.fillStyle = g;
        if (L) ctx.fillRect(x0 + W - w, y0, w, 11);
        else ctx.fillRect(x0, y0, w, 11);
      };
      fill(lagW, '#ff8080', '#c01020');
      const blink = f.hp < max * 0.25 && (this.t >> 3) % 2 === 0;
      fill(hpW, blink ? '#ffd0a0' : '#fff6a8', blink ? '#ff5a20' : '#ffae00');
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      if (L) ctx.fillRect(x0 + W - hpW, y0 + 1, hpW, 2);
      else ctx.fillRect(x0, y0 + 1, hpW, 2);
      const gleam = ((this.t * 2) % (W + 60)) - 30;
      if (gleam > 0 && gleam < W - 8) {
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fillRect(x0 + gleam, y0, 8, 11);
      }
      const pxm = L ? 4 : 480 - 4 - 32;
      ctx.fillStyle = '#000';
      ctx.fillRect(pxm - 1, 6, 34, 34);
      ctx.fillStyle = L ? '#3ec8ff' : '#ff3e8a';
      ctx.fillRect(pxm, 7, 32, 32);
      drawPortrait(ctx, f.char, this.alt[i], pxm + 1, 8, 30, !L);
      const nx = L ? 40 : 440;
      drawText(ctx, def.short, nx, 29, { align: L ? 'left' : 'right', color: '#fff', outline: '#000', shadow: null });
      if (o.labels) {
        const off = def.short.length * 6 + 6;
        drawText(ctx, o.labels[i], L ? nx + off : nx - off, 29, { align: L ? 'left' : 'right', color: L ? '#7ad7ff' : '#ff8ab0', outline: '#000', shadow: null });
      }
      for (let r = 0; r < 2; r++) star(ctx, L ? 214 - r * 11 : 266 + r * 11, 34, 4.5, f.wins > r ? '#ffd23e' : '#2a2440', f.wins > r ? '#fff6c0' : '#4a4468');
      const mx0 = L ? 14 : 480 - 14 - 126;
      const my = 250;
      ctx.fillStyle = '#000';
      ctx.fillRect(mx0 - 2, my - 2, 130, 11);
      ctx.fillStyle = '#140a28';
      ctx.fillRect(mx0, my, 126, 7);
      const full = f.meter >= MAX_METER;
      const mw = (126 * f.meter) / MAX_METER;
      const mg = ctx.createLinearGradient(0, my, 0, my + 7);
      if (full) {
        const hue = (this.t * 6) % 360;
        mg.addColorStop(0, `hsl(${hue},100%,80%)`);
        mg.addColorStop(1, `hsl(${(hue + 60) % 360},100%,50%)`);
      } else {
        mg.addColorStop(0, '#a8f0ff');
        mg.addColorStop(1, '#1a7ad0');
      }
      ctx.fillStyle = mg;
      if (L) ctx.fillRect(mx0, my, mw, 7);
      else ctx.fillRect(mx0 + 126 - mw, my, mw, 7);
      ctx.fillStyle = '#000';
      ctx.fillRect(mx0 + 42, my, 1, 7);
      ctx.fillRect(mx0 + 84, my, 1, 7);
      const lv = Math.floor(f.meter / BAR);
      const bx = L ? mx0 + 137 : mx0 - 11;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(bx, my + 3.5, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = full ? '#ff3e8a' : '#1a7ad0';
      ctx.beginPath();
      ctx.arc(bx, my + 3.5, 6, 0, Math.PI * 2);
      ctx.fill();
      drawText(ctx, full ? 'S' : `${lv}`, bx + 0.5, my + 0.5, { align: 'center', color: '#fff', shadow: null });
      if (full && (this.t >> 4) % 2 === 0) drawText(ctx, 'SUPER READY', L ? mx0 : mx0 + 126, my - 11, { align: L ? 'left' : 'right', color: '#ffd23e', outline: '#000', shadow: null });
      const d = s.f[1 - i];
      if (d.combo >= 2 && (d.state === S_HITSTUN || d.state === S_AIRHIT || d.state === S_KNOCKDOWN)) {
        const sc = d.hitstop > 0 ? 4 : 3;
        drawText(ctx, `${d.combo}`, L ? 16 : 464, 62, { scale: sc, align: L ? 'left' : 'right', gradient: ['#fff', '#ffb000'], outline: '#401000', shadow: null });
        drawText(ctx, 'HITS!', L ? 18 : 462, 64 + sc * 8, { align: L ? 'left' : 'right', color: '#ffd23e', outline: '#000', shadow: null });
      }
    }
    if (!o.training) {
      const secs = Math.max(0, Math.ceil(s.timer / 60));
      ctx.fillStyle = '#000';
      hexagon(ctx, 240, 21, 19);
      const tg = ctx.createLinearGradient(0, 4, 0, 38);
      tg.addColorStop(0, '#4a4468');
      tg.addColorStop(1, '#14102a');
      ctx.fillStyle = tg;
      hexagon(ctx, 240, 21, 17);
      drawText(ctx, String(secs).padStart(2, '0'), 240, 14, { scale: 2, align: 'center', color: secs <= 10 && (this.t >> 4) % 2 ? '#ff5050' : '#fff', shadow: '#000' });
    } else {
      drawText(ctx, 'TRAINING', 240, 14, { align: 'center', color: '#7ad7ff', outline: '#000', shadow: null });
    }
    this.drawAnnouncer(ctx, s);
    if (this.praiseText) {
      const p = this.praiseText;
      const k = 70 - p.t;
      const pop = k < 5 ? 1 : 0;
      ctx.globalAlpha = Math.min(1, p.t / 12);
      drawText(ctx, p.text, p.side === 0 ? 16 : 464, 104 - pop * 2, { scale: 2 + pop, align: p.side === 0 ? 'left' : 'right', gradient: ['#ffffff', '#ff3e8a'], outline: '#2a0040', shadow: null });
      ctx.globalAlpha = 1;
    }
    if (o.inputDisplay) drawInputs(ctx, o.inputDisplay);
  }

  private drawAnnouncer(ctx: Ctx, s: SimState): void {
    const big = (t: string, c: [string, string], sc = 4, age = 99) => {
      const pop = age < 6 ? 1 : 0;
      drawText(ctx, t, 240, 100 - pop * 4, { scale: sc + pop, align: 'center', gradient: c, outline: '#1a0030', shadow: null });
    };
    if (s.phase === P_INTRO) {
      if (s.phaseT < INTRO_FIGHT_FRAME - 6) big(`ROUND ${s.round}`, ['#fff', '#9ad0ff'], 4, s.phaseT);
      else if (s.phaseT < 100) big('FIGHT!', ['#fff8c0', '#ff6a00'], 6, s.phaseT - INTRO_FIGHT_FRAME + 6);
    } else if (s.phase === P_KO) {
      if (s.phaseT < 100) {
        if (s.timeUp) big('TIME', ['#fff', '#ff9a3a']);
        else big(s.roundWinner === 2 ? 'DOUBLE K.O.' : 'K.O.', ['#fff', '#ff3040'], s.roundWinner === 2 ? 4 : 7, s.phaseT);
      } else if (s.phaseT > 112) {
        const w = s.roundWinner;
        big(w === 2 ? 'DRAW' : `${ROSTER[s.f[w].char].short} WINS`, ['#fff', '#ffd23e'], 3);
        if (w < 2 && s.f[w].hp === CHARS[s.f[w].char].def.hp) drawText(ctx, 'PERFECT', 240, 132, { scale: 2, align: 'center', color: '#ff6ad5', outline: '#000', shadow: null });
      }
    } else if (s.phase === P_MATCH_END) {
      const w = s.matchWinner;
      big(w === 2 ? 'DRAW GAME' : `${ROSTER[s.f[w].char].short} WINS`, ['#fff', '#ffd23e'], 3);
    }
  }
}

function hexagon(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
    const px = x + Math.cos(a) * r * 1.25;
    const py = y + Math.sin(a) * r;
    if (k) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function star(ctx: Ctx, x: number, y: number, r: number, fill: string, edge: string): void {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#000';
  ctx.stroke();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 0.6;
  ctx.strokeStyle = edge;
  ctx.stroke();
}

function strokeBox(ctx: Ctx, b: WBox, cam: number, color: string): void {
  const x = toS(b.x0) - cam;
  const w = toS(b.x1 - b.x0);
  const y1 = GROUND_Y - toS(b.y1);
  const h = toS(b.y1 - b.y0);
  ctx.fillStyle = color.replace('1)', '0.25)');
  ctx.fillRect(x, y1, w, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x, y1, w, h);
}

export function drawBoxes(ctx: Ctx, s: SimState, cam: number): void {
  for (const f of s.f) {
    strokeBox(ctx, pushbox(f), cam, 'rgba(255,255,255,1)');
    for (const h of hurtboxes(f)) strokeBox(ctx, h, cam, 'rgba(60,140,255,1)');
    const hb = activeHitbox(f);
    if (hb) strokeBox(ctx, hb, cam, 'rgba(255,40,60,1)');
    if (f.state === S_ATTACK) {
      const m = CHARS[f.char].moves[f.move];
      const ph = f.mf < m.startup ? 'STARTUP' : f.mf < m.startup + m.active ? 'ACTIVE' : 'RECOVERY';
      drawText(ctx, `${m.key} ${f.mf}/${m.total} ${ph}`, Math.round(toS(f.x) - cam), GROUND_Y - 112, { align: 'center', color: '#ffd23e' });
    }
  }
  for (const p of s.proj) strokeBox(ctx, projBox(p), cam, 'rgba(255,120,40,1)');
}

const ARROWS = ['', '↙', '↓', '↘', '←', '.', '→', '↖', '↑', '↗'];
function drawInputs(ctx: Ctx, rows: number[][]): void {
  rows.slice(-12).forEach((r, i) => {
    const [dir, btns] = r;
    const names = ['LP', 'HP', 'LK', 'HK', 'SP'].filter((_, k) => btns & (1 << k)).join(' ');
    drawText(ctx, `${ARROWS[dir] ?? ''} ${names}`, 8, 64 + i * 10, { color: '#bfe9ff', outline: '#000', shadow: null });
  });
}

export { S_AIR, S_CROUCH };
