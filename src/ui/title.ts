import { playMusic } from '../audio/audio.ts';
import { ROSTER } from '../content/roster.ts';
import { drawText } from '../render/font.ts';
import { drawPortrait } from '../render/portrait.ts';
import { app, drawBackdrop, type Screen } from './app.ts';
import { MenuList } from './menu.ts';
import type { MenuInput } from '../input/devices.ts';
import { CharSelect } from './select.ts';
import { STAGES } from '../content/stages.ts';
import { drawStage } from '../render/stageArt.ts';
import { drawArt } from '../render/art.ts';
import { ControlsScreen } from './controls.ts';

export const VERSION = 'v0.2';
const SHOW = 240;
const ease = (x: number) => 1 - (1 - x) * (1 - x);

export class TitleScreen implements Screen {
  t = 0;
  idle = 0;
  menu = new MenuList([
    { label: 'ARCADE', hint: 'CLIMB THE LADDER TO THE FINAL BOSS', act: () => app.go(new CharSelect('arcade')) },
    { label: 'VERSUS CPU', hint: 'FIGHT THE FRONTIER, ONE MODEL AT A TIME', act: () => app.go(new CharSelect('cpu')) },
    { label: 'VERSUS LOCAL', hint: 'TWO PLAYERS, ONE KEYBOARD (OR GAMEPADS)', act: () => app.go(new CharSelect('local')) },
    { label: 'ONLINE', hint: 'PEER-TO-PEER ROLLBACK. NO SERVERS.', act: () => void import('./lobby.ts').then((m) => app.go(new m.LobbyScreen())) },
    { label: 'TRAINING', hint: 'HITBOXES, FRAME DATA, DUMMY', act: () => app.go(new CharSelect('training')) },
    { label: 'CONTROLS', hint: 'KEYBOARD AND GAMEPAD', act: () => app.go(new ControlsScreen()) },
  ]);

  enter(): void {
    playMusic(1);
  }

  update(m: MenuInput[]): void {
    this.t++;
    if (m.length) this.idle = 0;
    else if (++this.idle > 60 * 25) {
      const n = ROSTER.length;
      const p1 = Math.floor(Math.random() * n);
      const p2 = (p1 + 1 + Math.floor(Math.random() * (n - 1))) % n;
      void import('./match.ts').then((x) => app.go(new x.MatchScreen({ mode: 'cpu', p1, p2, stage: ROSTER[p2].stage, seed: (Math.random() * 1e9) >>> 0, cpu: 2, demo: true })));
      this.idle = -1e9;
    }
    this.menu.update(m);
  }

  render(ctx: CanvasRenderingContext2D): void {
    const n = ROSTER.length;
    const t = this.t;
    // live arena behind everything, changing every few showcases
    const stage = Math.floor(t / (SHOW * 3)) % STAGES.length;
    drawStage(ctx, stage, 120 + Math.sin(t / 240) * 110, t);
    const veil = ctx.createLinearGradient(0, 0, 0, 270);
    veil.addColorStop(0, 'rgba(10,3,30,0.55)');
    veil.addColorStop(0.55, 'rgba(10,3,30,0.35)');
    veil.addColorStop(1, 'rgba(5,2,15,0.92)');
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, 480, 270);

    // two fighters face off, a new pair every few seconds
    const k = Math.floor(t / SHOW);
    const phase = (t % SHOW) / SHOW;
    const a = (k * 2) % n;
    const b = (k * 2 + 1 + (k % 3)) % n === a ? (a + 1) % n : (k * 2 + 1 + (k % 3)) % n;
    const slide = phase < 0.12 ? 1 - ease(phase / 0.12) : phase > 0.9 ? -ease((phase - 0.9) / 0.1) : 0;
    const fade = phase > 0.9 ? 1 - (phase - 0.9) / 0.1 : Math.min(1, phase / 0.08);
    ctx.globalAlpha = fade;
    this.fighter(ctx, a, 78 - slide * 120, false);
    this.fighter(ctx, b, 402 + slide * 120, true);
    ctx.globalAlpha = 1;

    // logo with glow and a light sweep
    const bob = Math.round(Math.sin(t / 30) * 2);
    ctx.save();
    ctx.shadowColor = '#ff3e8a';
    ctx.shadowBlur = 18 + Math.sin(t / 20) * 6;
    drawText(ctx, 'FRONTIER', 240, 18 + bob, { scale: 6, align: 'center', gradient: ['#fff8c0', '#ff6a00'], outline: '#2a0040', shadow: null });
    drawText(ctx, 'FIGHTERS', 240, 64 + bob, { scale: 6, align: 'center', gradient: ['#ffd0f0', '#ff3e8a'], outline: '#2a0040', shadow: null });
    ctx.restore();
    const sweep = ((t * 3) % 700) - 110;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const sg = ctx.createLinearGradient(sweep - 30, 0, sweep + 30, 0);
    sg.addColorStop(0, 'rgba(255,255,255,0)');
    sg.addColorStop(0.5, 'rgba(255,255,255,0.22)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(96, 16 + bob, 288, 94);
    ctx.restore();
    drawText(ctx, 'THE AI FRONTIER, SETTLED WITH FISTS', 240, 113, { align: 'center', color: '#7ad7ff', outline: '#000', shadow: null });

    // matchup caption under the fighters
    const cap = (i: number, x: number, al: 'left' | 'right') => {
      drawText(ctx, ROSTER[i].short, x, 214, { scale: 2, align: al, color: '#fff', outline: '#000', shadow: null });
      drawText(ctx, ROSTER[i].title.toUpperCase(), x, 232, { align: al, color: '#ffd23e', outline: '#000', shadow: null });
    };
    ctx.globalAlpha = fade;
    cap(a, 8 - slide * 120, 'left');
    cap(b, 472 + slide * 120, 'right');
    ctx.globalAlpha = 1;

    // menu panel
    ctx.fillStyle = 'rgba(8,4,24,0.78)';
    ctx.fillRect(140, 124, 200, 104);
    ctx.fillStyle = '#ff3e8a';
    ctx.fillRect(140, 124, 200, 2);
    ctx.fillStyle = 'rgba(255,62,138,0.35)';
    ctx.fillRect(140, 226, 200, 1);
    this.menu.render(ctx, 240, 131, t, 13);

    // bottom strip: how to play at a glance
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 243, 480, 27);
    drawText(ctx, 'ARROWS MOVE   A PUNCH  S KICK  D SPECIAL  W SUPER   ENTER SELECT   ESC MENU', 240, 247, { align: 'center', color: '#bfe9ff', shadow: null });
    drawText(ctx, `${n} FIGHTERS - ${STAGES.length} ARENAS - ONLINE ROLLBACK - PARODY, NOT AFFILIATED WITH ANYONE`, 240, 259, { align: 'center', color: '#8a84a8', shadow: null });
    drawText(ctx, VERSION, 474, 4, { align: 'right', color: '#8a84a8', outline: '#000', shadow: null });
    drawText(ctx, 'M MUTE  F8 CRT', 6, 4, { color: '#8a84a8', outline: '#000', shadow: null });
  }

  private fighter(ctx: CanvasRenderingContext2D, char: number, x: number, flip: boolean): void {
    ctx.save();
    ctx.shadowColor = flip ? 'rgba(255,62,138,0.8)' : 'rgba(62,200,255,0.8)';
    ctx.shadowBlur = 14;
    if (!drawArt(ctx, char, x, 246, 210, flip, this.t)) drawPortrait(ctx, char, false, x - 40, 120, 80, flip);
    ctx.restore();
  }
}
