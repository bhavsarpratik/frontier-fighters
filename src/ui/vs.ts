import { ROSTER } from '../content/roster.ts';
import { STAGES } from '../content/stages.ts';
import type { Difficulty } from '../ai/cpu.ts';
import { drawText } from '../render/font.ts';
import { portrait } from '../render/portrait.ts';
import type { MenuInput } from '../input/devices.ts';
import { app, drawBackdrop, type Screen } from './app.ts';
import type { NetLink } from './netlink.ts';
import { MatchScreen } from './match.ts';
import type { Mode } from './select.ts';

export interface MatchConfig {
  mode: Mode;
  p1: number;
  p2: number;
  stage: number;
  seed: number;
  cpu?: Difficulty;
  net?: NetLink;
  delay?: number;
  demo?: boolean;
}

export class VsScreen implements Screen {
  t = 0;
  cfg: MatchConfig;
  constructor(cfg: MatchConfig) {
    this.cfg = cfg;
  }

  update(menu: MenuInput[]): void {
    this.t++;
    const skip = this.cfg.mode !== 'online' && menu.some((m) => m.ok) && this.t > 20;
    if (this.t > 120 || skip || this.cfg.mode === 'training') app.go(new MatchScreen(this.cfg));
  }

  render(ctx: CanvasRenderingContext2D): void {
    drawBackdrop(ctx, this.t * 3, '#3a0a2a', '#06030f');
    const slide = Math.min(1, this.t / 18);
    const e = 1 - Math.pow(1 - slide, 3);
    const [a, b] = [this.cfg.p1, this.cfg.p2];
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(portrait(a, false, 128), -140 + 180 * e, 60);
    ctx.save();
    ctx.translate(480, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(portrait(b, a === b, 128), -140 + 180 * e, 60);
    ctx.restore();
    drawText(ctx, ROSTER[a].name, 20 + (1 - e) * -200, 200, { scale: 1, color: '#7ad7ff', outline: '#000', shadow: null });
    drawText(ctx, ROSTER[b].name, 460 + (1 - e) * 200, 200, { scale: 1, align: 'right', color: '#ff8ab0', outline: '#000', shadow: null });
    if (this.t > 16) {
      const pulse = 5 + ((this.t >> 2) % 2);
      drawText(ctx, 'VS', 240, 100, { scale: pulse, align: 'center', gradient: ['#fff8c0', '#ff3e8a'], outline: '#2a0040', shadow: null });
    }
    drawText(ctx, STAGES[this.cfg.stage].name, 240, 240, { align: 'center', color: '#ffd23e' });
    if (this.cfg.net) drawText(ctx, this.cfg.net.label, 240, 252, { align: 'center', color: '#8a84a8' });
  }
}
