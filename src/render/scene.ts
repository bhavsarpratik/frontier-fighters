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
import { altLook, ORIGIN_X, ORIGIN_Y, poseKey, spriteFor } from './rig.ts';
import { drawStage, GROUND_Y } from './stageArt.ts';
import { portrait } from './portrait.ts';

type Ctx = CanvasRenderingContext2D;
const toS = (v: number) => v / FX;

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

export class MatchScene {
  fx = new Effects();
  camX = (STAGE_W - SCREEN_W) / 2;
  hpLag = [0, 0];
  cutin: { p: number; name: string; t: number } | null = null;
  t = 0;
  alt: [boolean, boolean];

  stage: number;

  constructor(stage: number, p1: number, p2: number) {
    this.stage = stage;
    this.alt = [false, p1 === p2];
    this.hpLag = [CHARS[p1].def.hp, CHARS[p2].def.hp];
  }

  onEvents(evs: SimEvent[]): void {
    for (const e of evs) {
      this.fx.onEvent(e);
      if (e.t === 'super') this.cutin = { p: e.p, name: e.s ?? 'SUPER', t: 45 };
      if (e.t === 'rehired') this.fx.pop(this.fighterScreenX(e.p), 120, 'FIRED? REHIRED!', '#9ad0ff');
      if (e.t === 'buff') this.fx.pop(this.fighterScreenX(e.p) + this.camX, 120, 'HARDCORE MODE', '#ff5050');
    }
  }

  private lastState: SimState | null = null;
  private fighterScreenX(p: number): number {
    const s = this.lastState;
    return s ? toS(s.f[p].x) : 0;
  }

  update(s: SimState): void {
    this.lastState = s;
    this.t++;
    this.fx.update();
    for (let i = 0; i < 2; i++) {
      const hp = Math.max(0, s.f[i].hp);
      if (this.hpLag[i] < hp) this.hpLag[i] = hp;
      else if (s.f[1 - i].state !== S_ATTACK || s.f[i].state !== S_HITSTUN) this.hpLag[i] = Math.max(hp, this.hpLag[i] - 4);
    }
    const mid = (toS(s.f[0].x) + toS(s.f[1].x)) / 2;
    const target = Math.max(0, Math.min(STAGE_W - SCREEN_W, mid - SCREEN_W / 2));
    this.camX += (target - this.camX) * 0.25;
    if (this.cutin && --this.cutin.t <= 0) this.cutin = null;
  }

  draw(ctx: Ctx, s: SimState, o: SceneOpts = {}): void {
    const shx = this.fx.shake ? Math.round((Math.random() - 0.5) * this.fx.shake * 2) : 0;
    const shy = this.fx.shake ? Math.round((Math.random() - 0.5) * this.fx.shake) : 0;
    const cam = Math.round(this.camX) - shx;
    ctx.save();
    ctx.translate(0, shy);
    drawStage(ctx, this.stage, cam, this.t);
    if (s.freeze > 0) {
      ctx.fillStyle = 'rgba(10,0,30,0.55)';
      ctx.fillRect(0, 0, 480, 270);
    }
    // shadows
    for (const f of s.f) {
      const x = Math.round(toS(f.x) - cam);
      const w = 18 - Math.min(10, Math.floor(toS(f.y) / 12));
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x - w, GROUND_Y - 1, w * 2, 3);
      ctx.fillRect(x - w + 3, GROUND_Y - 2, w * 2 - 6, 1);
    }
    const order = s.f[0].state === S_ATTACK && s.f[1].state !== S_ATTACK ? [1, 0] : [0, 1];
    for (const i of order) this.drawFighter(ctx, s, i, cam);
    for (const p of s.proj) drawProjectile(ctx, p, cam, this.t);
    this.fx.draw(ctx, cam);
    if (o.boxes) drawBoxes(ctx, s, cam);
    ctx.restore();
    if (this.fx.flash > 0) {
      ctx.globalAlpha = this.fx.flash / 12;
      ctx.fillStyle = this.fx.flashColor;
      ctx.fillRect(0, 0, 480, 270);
      ctx.globalAlpha = 1;
    }
    if (this.cutin) this.drawCutin(ctx, s);
    if (!o.hideHud) this.drawHud(ctx, s, o);
  }

  private drawFighter(ctx: Ctx, s: SimState, i: number, cam: number): void {
    const f = s.f[i];
    const def = ROSTER[f.char];
    const look = this.alt[i] ? altLook(def.look) : def.look;
    const pose = fighterPose(s, f);
    const spr = spriteFor(`${f.char}|${this.alt[i] ? 1 : 0}|${poseKey(pose)}`, look, pose);
    const x = Math.round(toS(f.x) - cam);
    const y = Math.round(GROUND_Y - toS(f.y));
    if (f.inv > 0 && f.state !== S_ATTACK && (this.t >> 1) % 2 === 0) ctx.globalAlpha = 0.6;
    const img = spr.canvas as CanvasImageSource;
    ctx.save();
    ctx.translate(x, y);
    if (f.facing < 0) ctx.scale(-1, 1);
    if (f.buff > 0) {
      ctx.globalAlpha = 0.35 + 0.15 * Math.sin(this.t / 3);
      ctx.filter = 'drop-shadow(0 0 3px #ff2020)';
    }
    ctx.drawImage(img, -ORIGIN_X, -ORIGIN_Y);
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    if (f.hitstop > 0 && (f.state === S_HITSTUN || f.state === S_AIRHIT)) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55;
      ctx.drawImage(img, -ORIGIN_X, -ORIGIN_Y);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    if (f.frozen > 0 && f.state === S_HITSTUN) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(80,255,160,0.25)';
      ctx.fillRect(-40, -110, 80, 110);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  private drawCutin(ctx: Ctx, s: SimState): void {
    const c = this.cutin!;
    const k = 45 - c.t;
    const slide = Math.min(1, k / 8);
    const out = c.t < 8 ? c.t / 8 : 1;
    const y = 92;
    ctx.globalAlpha = out;
    const grd = ctx.createLinearGradient(0, y, 0, y + 74);
    grd.addColorStop(0, '#ff3e8a');
    grd.addColorStop(1, '#6a1fd0');
    ctx.fillStyle = grd;
    const left = c.p === 0;
    const bx = left ? -480 + 480 * slide : 480 - 480 * slide;
    ctx.fillRect(bx, y, 480, 74);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 12; i++) ctx.fillRect(bx + ((i * 47 + k * 9) % 520) - 20, y + 4 + (i % 4) * 18, 30, 2);
    const por = portrait(s.f[c.p].char, this.alt[c.p], 64);
    ctx.save();
    if (!left) {
      ctx.translate(480, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(por, 30 + (1 - slide) * -100, y + 5);
    ctx.restore();
    drawText(ctx, c.name, left ? 110 + (1 - slide) * 200 : 370 - (1 - slide) * 200, y + 30, {
      scale: 2, align: left ? 'left' : 'right', gradient: ['#fff8c0', '#ffb000'], outline: '#2a0040', shadow: null,
    });
    ctx.globalAlpha = 1;
  }

  private drawHud(ctx: Ctx, s: SimState, o: SceneOpts): void {
    const W = 186;
    for (let i = 0; i < 2; i++) {
      const f = s.f[i];
      const def = ROSTER[f.char];
      const max = def.hp;
      const x0 = i === 0 ? 14 : 480 - 14 - W;
      const y0 = 14;
      ctx.fillStyle = '#000';
      ctx.fillRect(x0 - 2, y0 - 2, W + 4, 14);
      ctx.fillStyle = '#3a0a12';
      ctx.fillRect(x0, y0, W, 10);
      const hpW = Math.round((W * Math.max(0, f.hp)) / max);
      const lagW = Math.round((W * this.hpLag[i]) / max);
      const fromRight = i === 0;
      const put = (w: number, c: string, yy = y0, h = 10) => {
        ctx.fillStyle = c;
        if (fromRight) ctx.fillRect(x0 + W - w, yy, w, h);
        else ctx.fillRect(x0, yy, w, h);
      };
      put(lagW, '#ff4040');
      const low = f.hp < max * 0.25;
      put(hpW, low && (this.t >> 3) % 2 ? '#ff9a3a' : '#ffd23e');
      put(hpW, low && (this.t >> 3) % 2 ? '#ffc070' : '#fff1a0', y0, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      for (let k = 1; k < 10; k++) ctx.fillRect(x0 + Math.round((W * k) / 10), y0, 1, 10);
      const por = portrait(f.char, this.alt[i], 24);
      ctx.save();
      if (i === 1) {
        ctx.translate(480, 0);
        ctx.scale(-1, 1);
      }
      ctx.fillStyle = '#000';
      ctx.fillRect(2, 30, 26, 26);
      ctx.drawImage(por, 3, 31);
      ctx.restore();
      drawText(ctx, def.short, i === 0 ? 32 : 448, 30, { align: i === 0 ? 'left' : 'right', color: '#fff' });
      if (o.labels) drawText(ctx, o.labels[i], i === 0 ? 32 : 448, 40, { align: i === 0 ? 'left' : 'right', color: i === 0 ? '#7ad7ff' : '#ff8ab0' });
      // round pips
      for (let r = 0; r < 2; r++) {
        const px = i === 0 ? 206 - r * 10 : 268 + r * 10;
        ctx.fillStyle = '#000';
        ctx.fillRect(px - 1, 29, 8, 8);
        ctx.fillStyle = f.wins > r ? '#ffd23e' : '#444';
        ctx.fillRect(px, 30, 6, 6);
      }
      // meter
      const mx0 = i === 0 ? 14 : 480 - 14 - 120;
      const my = 252;
      ctx.fillStyle = '#000';
      ctx.fillRect(mx0 - 2, my - 2, 124, 10);
      ctx.fillStyle = '#1a1030';
      ctx.fillRect(mx0, my, 120, 6);
      const mw = Math.round((120 * f.meter) / MAX_METER);
      const full = f.meter >= MAX_METER;
      ctx.fillStyle = full ? ((this.t >> 2) % 2 ? '#ff6ad5' : '#ffd23e') : '#3ec8ff';
      if (i === 0) ctx.fillRect(mx0, my, mw, 6);
      else ctx.fillRect(mx0 + 120 - mw, my, mw, 6);
      ctx.fillStyle = '#000';
      ctx.fillRect(mx0 + 40, my, 1, 6);
      ctx.fillRect(mx0 + 80, my, 1, 6);
      const lv = Math.floor(f.meter / BAR);
      drawText(ctx, full ? 'MAX' : `${lv}`, i === 0 ? mx0 + 126 : mx0 - 6, my - 1, { align: i === 0 ? 'left' : 'right', color: full ? '#ffd23e' : '#bfe9ff' });
      // combo
      const d = s.f[1 - i];
      if (d.combo >= 2 && (d.state === S_HITSTUN || d.state === S_AIRHIT || d.state === S_KNOCKDOWN)) {
        drawText(ctx, `${d.combo} HITS`, i === 0 ? 16 : 464, 74, { scale: 2, align: i === 0 ? 'left' : 'right', gradient: ['#fff', '#ffb000'], outline: '#401000', shadow: null });
      }
    }
    if (!o.training) {
      const secs = Math.ceil(s.timer / 60);
      ctx.fillStyle = '#000';
      ctx.fillRect(222, 8, 36, 24);
      drawText(ctx, String(Math.max(0, secs)).padStart(2, '0'), 240, 12, { scale: 2, align: 'center', color: secs <= 10 && (this.t >> 4) % 2 ? '#ff5050' : '#fff' });
    } else {
      drawText(ctx, 'TRAINING', 240, 14, { align: 'center', color: '#7ad7ff' });
    }
    this.drawAnnouncer(ctx, s);
    if (o.inputDisplay) drawInputs(ctx, o.inputDisplay);
  }

  private drawAnnouncer(ctx: Ctx, s: SimState): void {
    const big = (t: string, c: [string, string], sc = 4) =>
      drawText(ctx, t, 240, 110, { scale: sc, align: 'center', gradient: c, outline: '#1a0030', shadow: null });
    if (s.phase === P_INTRO) {
      if (s.phaseT < INTRO_FIGHT_FRAME - 6) big(`ROUND ${s.round}`, ['#fff', '#9ad0ff']);
      else if (s.phaseT < 100) big('FIGHT!', ['#fff8c0', '#ff6a00'], 5);
    } else if (s.phase === P_KO) {
      if (s.phaseT < 100) {
        if (s.timeUp) big('TIME', ['#fff', '#ff9a3a']);
        else big(s.roundWinner === 2 ? 'DOUBLE K.O.' : 'K.O.', ['#fff', '#ff3040'], s.roundWinner === 2 ? 3 : 6);
      } else if (s.phaseT > 112) {
        const w = s.roundWinner;
        const name = w === 2 ? 'DRAW' : `${ROSTER[s.f[w].char].short} WINS`;
        big(name, ['#fff', '#ffd23e'], 3);
        if (w < 2 && s.f[w].hp === CHARS[s.f[w].char].def.hp) drawText(ctx, 'PERFECT', 240, 142, { scale: 2, align: 'center', color: '#ff6ad5', outline: '#000', shadow: null });
      }
    } else if (s.phase === P_MATCH_END) {
      const w = s.matchWinner;
      big(w === 2 ? 'DRAW GAME' : `${ROSTER[s.f[w].char].short} WINS`, ['#fff', '#ffd23e'], 3);
    }
  }
}

function strokeBox(ctx: Ctx, b: WBox, cam: number, color: string): void {
  const x = Math.round(toS(b.x0) - cam);
  const w = Math.round(toS(b.x1 - b.x0));
  const y1 = Math.round(GROUND_Y - toS(b.y1));
  const h = Math.round(toS(b.y1 - b.y0));
  ctx.fillStyle = color.replace('1)', '0.25)');
  ctx.fillRect(x, y1, w, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y1 + 0.5, w - 1, h - 1);
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

const ARROWS = ['', '1', '2', '3', '4', 'N', '6', '7', '8', '9'];
function drawInputs(ctx: Ctx, rows: number[][]): void {
  rows.slice(-12).forEach((r, i) => {
    const [dir, btns] = r;
    const names = ['LP', 'HP', 'LK', 'HK', 'SP'].filter((_, k) => btns & (1 << k)).join(' ');
    drawText(ctx, `${ARROWS[dir]} ${names}`, 8, 64 + i * 10, { color: '#bfe9ff' });
  });
}


