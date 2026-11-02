import { pollMenu, type MenuInput } from '../input/devices.ts';

export interface Screen {
  update(menu: MenuInput[]): void;
  render(ctx: CanvasRenderingContext2D): void;
  enter?(): void;
  leave?(): void;
}

export const app = {
  screen: null as Screen | null,
  boxes: false,
  frame: 0,
  go(s: Screen): void {
    this.screen?.leave?.();
    this.screen = s;
    s.enter?.();
  },
  tick(): void {
    this.frame++;
    const menu = pollMenu();
    this.screen?.update(menu);
  },
};

export function drawBackdrop(ctx: CanvasRenderingContext2D, t: number, a = '#1a0b3a', b = '#06030f'): void {
  const g = ctx.createLinearGradient(0, 0, 0, 270);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 480, 270);
  ctx.fillStyle = 'rgba(255,62,138,0.08)';
  for (let i = -10; i < 30; i++) {
    const x = ((i * 40 + t) % 800) - 160;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 18, 0);
    ctx.lineTo(x - 120, 270);
    ctx.lineTo(x - 138, 270);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(120,200,255,0.25)';
  for (let y = 200; y < 270; y += 6) {
    const k = (y - 200) / 70;
    ctx.fillRect(0, y + ((t >> 1) % 6) * k, 480, 1);
  }
}
