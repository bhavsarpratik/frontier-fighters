import { drawText } from '../render/font.ts';
import { LAYOUT_HELP, type MenuInput } from '../input/devices.ts';
import { app, drawBackdrop, type Screen } from './app.ts';
import { TitleScreen } from './title.ts';

export class ControlsScreen implements Screen {
  t = 0;
  update(m: MenuInput[]): void {
    this.t++;
    if (m.some((x) => x.back || x.ok)) app.go(new TitleScreen());
  }
  render(ctx: CanvasRenderingContext2D): void {
    drawBackdrop(ctx, this.t, '#0b1838', '#05060f');
    drawText(ctx, 'CONTROLS', 240, 12, { scale: 3, align: 'center', gradient: ['#fff', '#7ad7ff'], outline: '#000', shadow: null });
    let y = 44;
    const block = (title: string, lines: string[]) => {
      drawText(ctx, title, 30, y, { color: '#ffd23e' });
      y += 11;
      for (const l of lines) { drawText(ctx, l, 40, y, { color: '#ddd' }); y += 10; }
      y += 4;
    };
    block('ONE PLAYER (CPU, TRAINING, ONLINE)', LAYOUT_HELP.solo);
    block('TWO PLAYERS, ONE KEYBOARD', [...LAYOUT_HELP.p1duo, ...LAYOUT_HELP.p2duo]);
    block('GAMEPAD', ['X/Y PUNCH  A/B KICK  RB SPECIAL  RT SUPER  LB THROW  START MENU']);
    const x = 270;
    y = 44;
    drawText(ctx, 'MOTIONS (FACING RIGHT)', x, y, { color: '#ffd23e' }); y += 11;
    for (const l of [
      'QCF  DOWN, DOWN-FWD, FWD + BTN', 'DP   FWD, DOWN, DOWN-FWD + BTN', 'QCB  DOWN, DOWN-BACK, BACK + BTN',
      'SUPER QCF QCF + PUNCH (FULL METER)', 'CHARGE HOLD BACK 1/2 SEC, FWD',
      'EX   SPECIAL WITH 2 BUTTONS (1 BAR)', 'THROW LIGHT PUNCH + LIGHT KICK', 'DASH  TAP FWD TWICE', 'BLOCK HOLD BACK (DOWN-BACK FOR LOWS)',
    ]) { drawText(ctx, l, x + 6, y, { color: '#ddd' }); y += 10; }
    y += 6;
    drawText(ctx, 'SIMPLE MODE', x, y, { color: '#ffd23e' }); y += 11;
    for (const l of ['SPECIAL BTN + NEUTRAL/FWD/DOWN/BACK', 'SUPER BTN = SUPER (FULL METER)', 'ONE SUPER PER ROUND', 'ESC = PAUSE MENU (ANY MODE)']) { drawText(ctx, l, x + 6, y, { color: '#ddd' }); y += 10; }
    drawText(ctx, 'PRESS ENTER TO GO BACK', 240, 252, { align: 'center', color: '#7ad7ff' });
  }
}
