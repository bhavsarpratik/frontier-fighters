import { playMusic } from '../audio/audio.ts';
import { ROSTER } from '../content/roster.ts';
import { drawText } from '../render/font.ts';
import { portrait } from '../render/portrait.ts';
import { app, drawBackdrop, type Screen } from './app.ts';
import { MenuList } from './menu.ts';
import type { MenuInput } from '../input/devices.ts';
import { CharSelect } from './select.ts';
import { ControlsScreen } from './controls.ts';

export const VERSION = 'v0.1';

export class TitleScreen implements Screen {
  t = 0;
  idle = 0;
  menu = new MenuList([
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
    drawBackdrop(ctx, this.t);
    const n = ROSTER.length;
    for (let i = 0; i < n * 2; i++) {
      const x = ((i * 70 - this.t * 0.6) % (n * 140)) + (i * 70 - this.t * 0.6 < 0 ? n * 140 : 0) - 60;
      ctx.globalAlpha = 0.28;
      ctx.drawImage(portrait(i % n, false, 64), Math.round(x), 196);
    }
    ctx.globalAlpha = 1;
    const bob = Math.round(Math.sin(this.t / 30) * 2);
    drawText(ctx, 'FRONTIER', 240, 34 + bob, { scale: 6, align: 'center', gradient: ['#fff8c0', '#ff6a00'], outline: '#2a0040', shadow: null });
    drawText(ctx, 'FIGHTERS', 240, 82 + bob, { scale: 6, align: 'center', gradient: ['#ffd0f0', '#ff3e8a'], outline: '#2a0040', shadow: null });
    drawText(ctx, 'THE AI FRONTIER, SETTLED WITH FISTS', 240, 130, { align: 'center', color: '#7ad7ff' });
    this.menu.render(ctx, 240, 148, this.t, 14);
    drawText(ctx, 'PARODY. NOT AFFILIATED WITH OR ENDORSED BY ANYONE DEPICTED.', 240, 258, { align: 'center', color: '#8a84a8' });
    drawText(ctx, VERSION, 474, 4, { align: 'right', color: '#555' });
    drawText(ctx, 'M MUTE  F8 CRT', 6, 4, { color: '#555' });
  }
}
