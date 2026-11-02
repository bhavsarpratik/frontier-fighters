import { sfx } from '../audio/audio.ts';
import { drawText } from '../render/font.ts';
import type { MenuInput } from '../input/devices.ts';

export class MenuList {
  sel = 0;
  items: { label: string; hint?: string; act: () => void }[];
  constructor(items: { label: string; hint?: string; act: () => void }[]) {
    this.items = items;
  }

  update(menu: MenuInput[]): boolean {
    for (const m of menu) {
      if (m.up) { this.sel = (this.sel + this.items.length - 1) % this.items.length; sfx.menu(); }
      if (m.down) { this.sel = (this.sel + 1) % this.items.length; sfx.menu(); }
      if (m.ok) { sfx.confirm(); this.items[this.sel].act(); return true; }
    }
    return false;
  }

  render(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, gap = 16): void {
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
