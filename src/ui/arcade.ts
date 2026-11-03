import { isTouch } from '../input/touch.ts';
import { announce, playMusic, sfx } from '../audio/audio.ts';
import type { Difficulty } from '../ai/cpu.ts';
import { ROSTER } from '../content/roster.ts';
import { drawText, wrap } from '../render/font.ts';
import { drawPortrait } from '../render/portrait.ts';
import type { MenuInput } from '../input/devices.ts';
import { app, drawBackdrop, type Screen } from './app.ts';
import { TitleScreen } from './title.ts';
import { VsScreen } from './vs.ts';
import { drawIdleFighter } from './select.ts';
import { drawArt } from '../render/art.ts';

export interface ArcadeRun { p1: number; ladder: number[]; idx: number; continues: number }

const BOSS_ORDER = [5, 7, 4];

export function startArcade(p1: number): void {
  const boss = BOSS_ORDER.find((b) => b !== p1 && b < ROSTER.length) ?? (p1 + 1) % ROSTER.length;
  const rest = ROSTER.map((_, i) => i).filter((i) => i !== p1 && i !== boss);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  app.go(new LadderScreen({ p1, ladder: [...rest, boss], idx: 0, continues: 0 }));
}

export function difficultyFor(run: ArcadeRun): Difficulty {
  const last = run.ladder.length - 1;
  if (run.idx >= last) return 2;
  return run.idx < 2 ? 0 : run.idx < 5 ? 1 : 2;
}

export function nextFight(run: ArcadeRun): void {
  const p2 = run.ladder[run.idx];
  app.go(new VsScreen({ mode: 'arcade', p1: run.p1, p2, stage: ROSTER[p2].stage, seed: (Math.random() * 0xffffffff) >>> 0, cpu: difficultyFor(run), arcade: run }));
}

export class LadderScreen implements Screen {
  t = 0;
  run: ArcadeRun;
  constructor(run: ArcadeRun) {
    this.run = run;
  }
  enter(): void {
    playMusic(0);
    const last = this.run.idx === this.run.ladder.length - 1;
    announce(last ? 'Final battle!' : `Battle ${this.run.idx + 1}`, 0.95);
  }
  update(m: MenuInput[]): void {
    this.t++;
    if (m.some((x) => x.back)) { app.go(new TitleScreen()); return; }
    if (this.t > 150 || (this.t > 30 && m.some((x) => x.ok))) nextFight(this.run);
  }
  render(ctx: CanvasRenderingContext2D): void {
    drawBackdrop(ctx, this.t, '#0b1838', '#05030c');
    const r = this.run;
    const last = r.idx === r.ladder.length - 1;
    drawText(ctx, last ? 'FINAL BOSS' : `BATTLE ${r.idx + 1} / ${r.ladder.length}`, 240, 12, { scale: 3, align: 'center', gradient: last ? ['#fff', '#ff3e8a'] : ['#fff', '#ffd23e'], outline: '#000', shadow: null });
    const n = r.ladder.length;
    for (let i = 0; i < n; i++) {
      const y = 228 - i * 28;
      const x = 330;
      const done = i < r.idx;
      const cur = i === r.idx;
      ctx.fillStyle = cur ? '#ff3e8a' : done ? '#2a2440' : '#000';
      ctx.fillRect(x - 2, y - 2, 30, 30);
      ctx.globalAlpha = done ? 0.35 : 1;
      drawPortrait(ctx, r.ladder[i], r.ladder[i] === r.p1, x, y, 26, true);
      ctx.globalAlpha = 1;
      if (done) drawText(ctx, 'X', x + 13, y + 9, { scale: 2, align: 'center', color: '#ff3040', outline: '#000', shadow: null });
      drawText(ctx, ROSTER[r.ladder[i]].short, x + 36, y + 9, { color: cur ? '#fff8c0' : done ? '#555' : '#9a94b8' });
    }
    if (!drawArt(ctx, r.p1, 120, 240, 170, false, this.t)) drawIdleFighter(ctx, r.p1, 120, 236, this.t, false, false, 1.5, 'idle');
    drawText(ctx, ROSTER[r.p1].name, 120, 246, { align: 'center', color: '#7ad7ff', outline: '#000', shadow: null });
    const opp = ROSTER[r.ladder[r.idx]];
    wrap(`NEXT: ${opp.name}, ${opp.title.toUpperCase()}`, 34).forEach((l, i) => drawText(ctx, l, 120, 40 + i * 10, { align: 'center', color: '#ffd23e' }));
    if ((this.t >> 4) % 2) drawText(ctx, isTouch() ? 'PRESS OK' : 'PRESS ENTER', 120, 64, { align: 'center', color: '#fff' });
  }
}

export class EndingScreen implements Screen {
  t = 0;
  run: ArcadeRun;
  constructor(run: ArcadeRun) {
    this.run = run;
  }
  enter(): void {
    playMusic(1);
    announce('Congratulations!', 0.9);
    sfx.confirm();
  }
  update(m: MenuInput[]): void {
    this.t++;
    if (this.t > 60 && m.some((x) => x.ok || x.back)) app.go(new TitleScreen());
  }
  render(ctx: CanvasRenderingContext2D): void {
    drawBackdrop(ctx, this.t * 2, '#3a0a2a', '#06030f');
    const d = ROSTER[this.run.p1];
    drawText(ctx, 'FRONTIER CONQUERED!', 240, 16, { scale: 3, align: 'center', gradient: ['#fff8c0', '#ff6a00'], outline: '#2a0040', shadow: null });
    drawPortrait(ctx, this.run.p1, false, 30, 60, 128);
    if (!drawArt(ctx, this.run.p1, 380, 266, 230, true, this.t)) drawIdleFighter(ctx, this.run.p1, 380, 236, this.t, true, false, 1.6, 'win');
    const lines = [
      `${d.name} BEAT ALL ${this.run.ladder.length} RIVALS${this.run.continues ? ` WITH ${this.run.continues} CONTINUE${this.run.continues > 1 ? 'S' : ''}` : ' WITHOUT A SINGLE CONTINUE'}.`,
      `"${d.quotes[0]}"`,
      'THE FRONTIER IS YOURS... UNTIL THE NEXT MODEL DROPS.',
    ];
    let y = 70;
    for (const l of lines) for (const w of wrap(l, 26)) { drawText(ctx, w, 170, y, { color: '#fff' }); y += 11; }
    if (this.t > 60 && (this.t >> 4) % 2) drawText(ctx, isTouch() ? 'PRESS OK' : 'PRESS ENTER', 240, 256, { align: 'center', color: '#7ad7ff' });
  }
}
