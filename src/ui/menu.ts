import { sfx } from '../audio/audio.ts';
import { drawText } from '../render/font.ts';
import type { MenuInput } from '../input/devices.ts';
import { takeTap } from '../input/touch.ts';

export class MenuList {
  sel = 0;
  items: { label: string; hint?: string; act: () => void }[];
  constructor(items: { label: string; hint?: string; act: () => void }[]) {
    this.items = items;
  }

  private box: [number, number, number] | null = null;

  update(menu: MenuInput[]): boolean {
    const tp = takeTap();
    if (tp && this.box) {
      const [x, y, gap] = this.box;
      const i = Math.floor((tp[1] - y + gap / 2 - 3) / gap);
      if (Math.abs(tp[0] - x) < 100 && i >= 0 && i < this.items.length) {
        this.sel = i;
        sfx.confirm();
        this.items[i].act();
        return true;
      }
    }
    for (const m of menu) {
      if (m.up) { this.sel = (this.sel + this.items.length - 1) % this.items.length; sfx.menu(); }
      if (m.down) { this.sel = (this.sel + 1) % this.items.length; sfx.menu(); }
      if (m.ok) { sfx.confirm(); this.items[this.sel].act(); return true; }
    }
    return false;
  }

  render(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, gap = 16): void {
    this.box = [x, y, gap];
    this.items.forEach((it, i) => {
      const on = i === this.sel;
      if (on) {
        ctx.fillStyle = 'rgba(255,62,138,0.35)';
        ctx.fillRect(x - 90, y + i * gap - 3, 180, 13);
        drawText(ctx, '>', x - 84 + ((t >> 3) % 2), y + i * gap, { color: '#ffd23e' });
      }
      drawText(ctx, it.label, x, y + i * gap, { align: 'center', color: on ? '#fff8c0' : '#9a94b8' });
    });
    const hint = this.items[this.sel].hint;
    if (hint) drawText(ctx, hint, x, y + this.items.length * gap + 6, { align: 'center', color: '#7ad7ff' });
  }
}
