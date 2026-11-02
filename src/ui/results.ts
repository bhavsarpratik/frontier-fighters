import { playMusic } from '../audio/audio.ts';
import { ROSTER } from '../content/roster.ts';
import { drawText, wrap } from '../render/font.ts';
import { portrait } from '../render/portrait.ts';
import type { SimState } from '../sim/types.ts';
import type { MenuInput } from '../input/devices.ts';
import { app, drawBackdrop, type Screen } from './app.ts';
import { MenuList } from './menu.ts';
import { CharSelect } from './select.ts';
import { TitleScreen } from './title.ts';
import { VsScreen, type MatchConfig } from './vs.ts';
import { drawIdleFighter } from './select.ts';

export class ResultsScreen implements Screen {
  t = 0;
  menu: MenuList;
  winner: number;
  quote: string;
  cfg: MatchConfig;
  rematchAsked = [false, false];

  constructor(cfg: MatchConfig, s: SimState) {
    this.cfg = cfg;
    this.winner = s.matchWinner;
    const w = this.winner === 2 ? 0 : this.winner;
    const def = ROSTER[w === 0 ? cfg.p1 : cfg.p2];
    this.quote = def.quotes[(cfg.seed >>> 3) % def.quotes.length];
    const net = cfg.net;
    this.menu = new MenuList(
      net
        ? [
            { label: 'REMATCH', act: () => this.askRematch() },
            { label: 'LEAVE', act: () => { net.close(); app.go(new TitleScreen()); } },
          ]
        : [
            { label: 'REMATCH', act: () => app.go(new VsScreen({ ...cfg, seed: (Math.random() * 0xffffffff) >>> 0 })) },
            { label: 'CHARACTER SELECT', act: () => app.go(new CharSelect(cfg.mode, undefined, [cfg.p1, cfg.p2])) },
            { label: 'MAIN MENU', act: () => app.go(new TitleScreen()) },
          ],
    );
  }

  enter(): void {
    playMusic(1);
    const net = this.cfg.net;
    if (net) {
      net.onMsg = (m) => {
        if (m.t === 'rematch') {
          this.rematchAsked[1 - net.local] = true;
          this.tryRematch();
        }
        if (m.t === 'go') app.go(new VsScreen({ ...this.cfg, p1: m.p1, p2: m.p2, stage: m.stage, seed: m.seed, delay: m.delay }));
        if (m.t === 'leave') net.closed = true;
      };
    }
  }

  private askRematch(): void {
    const net = this.cfg.net!;
    this.rematchAsked[net.local] = true;
    net.send({ t: 'rematch' });
    this.tryRematch();
  }

  private tryRematch(): void {
    const net = this.cfg.net!;
    if (!this.rematchAsked[0] || !this.rematchAsked[1] || net.local !== 0) return;
    const go = { t: 'go' as const, p1: this.cfg.p1, p2: this.cfg.p2, stage: this.cfg.stage, seed: (Math.random() * 0xffffffff) >>> 0, delay: this.cfg.delay ?? 2 };
    net.send(go);
    app.go(new VsScreen({ ...this.cfg, seed: go.seed }));
  }

  update(m: MenuInput[]): void {
    this.t++;
    if (this.t > 30) this.menu.update(m);
    if (this.cfg.net?.closed && this.t > 30) app.go(new TitleScreen());
  }

  render(ctx: CanvasRenderingContext2D): void {
    drawBackdrop(ctx, this.t, '#2a1446', '#06030f');
    if (this.winner === 2) {
      drawText(ctx, 'DRAW GAME', 240, 40, { scale: 4, align: 'center', gradient: ['#fff', '#ffd23e'], outline: '#000', shadow: null });
    } else {
      const ch = this.winner === 0 ? this.cfg.p1 : this.cfg.p2;
      const alt = this.winner === 1 && this.cfg.p1 === this.cfg.p2;
      ctx.drawImage(portrait(ch, alt, 112), 24, 30);
      drawIdleFighter(ctx, ch, 380, 200, this.t, true, alt, 1.5, 'win');
      drawText(ctx, `${ROSTER[ch].short} WINS`, 150, 34, { scale: 3, gradient: ['#fff', '#ffd23e'], outline: '#000', shadow: null });
      wrap(`"${this.quote}"`, 30).forEach((l, i) => drawText(ctx, l, 150, 70 + i * 12, { color: '#fff8c0' }));
    }
    this.menu.render(ctx, 240, 190, this.t, 14);
    if (this.cfg.net) {
      const n = this.rematchAsked.filter(Boolean).length;
      if (n) drawText(ctx, `REMATCH ${n}/2`, 240, 176, { align: 'center', color: '#7ad7ff' });
    }
  }
}
