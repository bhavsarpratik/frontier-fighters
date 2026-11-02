import { CHARS } from '../sim/data.ts';
import type { Layout } from '../input/devices.ts';
import { curMove, isAirborne } from '../sim/fighter.ts';
import { P_FIGHT, P_INTRO, S_AIR, S_ATTACK, S_BLOCKSTUN, S_HITSTUN, type SimEvent, type SimState } from '../sim/types.ts';
import { drawText, textWidth } from '../render/font.ts';

export const KEYS: Record<Layout, { LP: string; HP: string; LK: string; HK: string; SP: string; move: string; up: string; down: string }> = {
  solo: { LP: 'U', HP: 'I', LK: 'J', HK: 'K', SP: 'L', move: 'WASD', up: 'W', down: 'S' },
  p1duo: { LP: 'T', HP: 'Y', LK: 'G', HK: 'H', SP: 'F', move: 'WASD', up: 'W', down: 'S' },
  p2duo: { LP: 'O', HP: 'P', LK: 'L', HK: ';', SP: '.', move: 'ARROWS', up: '↑', down: '↓' },
};

const MOTION: Record<string, string> = {
  '236': '↓↘→', '214': '↓↙←', '623': '→↓↘', '236236': '↓↘→↓↘→', '[4]6': 'HOLD ← THEN →', '[2]8': 'HOLD ↓ THEN ↑',
};
const SIMPLE: Record<string, string> = { n: '', f: '→', d: '↓', b: '←' };

export interface MoveLine { name: string; input: string; easy: string }

export function moveList(char: number, layout: Layout): MoveLine[] {
  const c = CHARS[char];
  const k = KEYS[layout];
  const out: MoveLine[] = c.specials.map((sp) => {
    const m = c.moves[sp.move];
    const btn = sp.mask & 16 ? k.LP : k.LK;
    const dir = SIMPLE[sp.simple];
    return { name: (m.name ?? m.key).toUpperCase(), input: `${MOTION[sp.motion]} + ${btn}`, easy: `${k.SP}${dir ? ' + ' + dir : ''}` };
  });
  const sup = c.moves[c.superIdx];
  out.push({ name: `${(sup.name ?? 'SUPER').toUpperCase()} (FULL METER)`, input: `${MOTION['236236']} + ${k.LP}`, easy: `${k.SP} + ↑` });
  return out;
}

export function basicsLines(layout: Layout): string[] {
  const k = KEYS[layout];
  return [
    `MOVE ${k.move}   JUMP ${k.up}   CROUCH ${k.down}   BLOCK: HOLD AWAY`,
    `PUNCH ${k.LP} ${k.HP}   KICK ${k.LK} ${k.HK}   SPECIAL ${k.SP}   THROW ${k.LP}+${k.LK}`,
  ];
}

interface Tip { text: string; prio: number }

// Contextual coaching for one human-controlled side.
export class Coach {
  p: number;
  layout: Layout;
  private cur: Tip | null = null;
  private t = 0;
  private cooldown = 0;
  private rot = 0;
  private seen = new Set<string>();
  private blocked = 0;
  private lowHits = 0;
  private hadMeter = false;
  enabled = true;

  constructor(p: number, layout: Layout) {
    this.p = p;
    this.layout = layout;
  }

  private show(text: string, prio: number, once = false): void {
    if (once && this.seen.has(text)) return;
    if (this.cur && this.t < 150 && prio <= this.cur.prio) return;
    this.cur = { text, prio };
    this.t = 0;
    if (once) this.seen.add(text);
  }

  onEvents(evs: SimEvent[], s: SimState): void {
    for (const e of evs) {
      if (e.t === 'block' && e.p === 1 - this.p) this.blocked++;
      if (e.t === 'hit' && e.p === this.p) {
        const o = s.f[1 - this.p];
        const m = curMove(o);
        if (m?.level === 'low') this.lowHits++;
      }
    }
  }

  update(s: SimState): void {
    if (!this.enabled) return;
    this.t++;
    if (this.cooldown > 0) this.cooldown--;
    const me = s.f[this.p];
    const op = s.f[1 - this.p];
    const c = CHARS[me.char];
    const k = KEYS[this.layout];
    const list = moveList(me.char, this.layout);
    if (s.phase === P_INTRO && s.round === 1) {
      this.cur = null;
      return;
    }
    if (s.phase !== P_FIGHT) return;
    if (me.meter >= 300 && !this.hadMeter) this.show(`SUPER READY!  ${k.SP} + ↑   (OR ${list[3].input})`, 5);
    this.hadMeter = me.meter >= 300;
    if ((op.state === S_AIR || (op.state === S_ATTACK && isAirborne(op))) && op.vy < 0 && Math.abs(op.x - me.x) < 140 * 256) {
      const aa = c.specials.find((x) => x.motion === '623' || x.motion === '[2]8');
      if (aa) {
        const line = list[c.specials.indexOf(aa)];
        this.show(`ANTI-AIR!  ${line.name}: ${line.easy}  (OR ${line.input})`, 4);
      } else this.show(`ANTI-AIR!  CROUCH + HEAVY PUNCH: ${k.down} + ${k.HP}`, 4);
    }
    if (this.lowHits >= 2) {
      this.lowHits = 0;
      this.show(`LOW ATTACKS: BLOCK BY HOLDING AWAY + ${k.down}`, 4);
    }
    if (this.blocked >= 4) {
      this.blocked = 0;
      this.show(`THEY KEEP BLOCKING. GET CLOSE AND THROW: ${k.LP} + ${k.LK}`, 3);
    }
    if (op.state === S_HITSTUN && me.state === S_ATTACK && me.connected) {
      this.show(`COMBO: HIT, THEN QUICKLY PRESS ${k.SP} TO CANCEL INTO A SPECIAL`, 2, true);
    }
    if (me.state === S_BLOCKSTUN) this.show('NICE BLOCK. PUNISH WHEN THEY MISS!', 1, true);
    if (this.t > 260 && this.cooldown === 0) {
      const fresh = [
        ...basicsLines(this.layout),
        ...list.slice(0, 3).map((l) => `TRY ${l.name}: ${l.easy}   (PRO: ${l.input})`),
        `DASH: TAP ${this.layout === 'p2duo' ? '→ →' : 'D D'}    PAUSE + MOVE LIST: ESC`,
      ];
      this.show(fresh[this.rot++ % fresh.length], 0);
      this.cooldown = 60;
    }
    void S_HITSTUN;
  }

  draw(ctx: CanvasRenderingContext2D, side: 'center' | 'left' | 'right'): void {
    if (!this.enabled || !this.cur) return;
    const a = this.t < 10 ? this.t / 10 : this.t > 230 ? Math.max(0, 1 - (this.t - 230) / 30) : 1;
    if (a <= 0) return;
    const txt = this.cur.text;
    const w = textWidth(txt) + 12;
    const x = side === 'center' ? 240 - w / 2 : side === 'left' ? 8 : 472 - w;
    const y = 228;
    ctx.globalAlpha = a * 0.85;
    ctx.fillStyle = this.cur.prio >= 4 ? '#5a0a2a' : '#0a1a3a';
    ctx.fillRect(x, y - 3, w, 13);
    ctx.fillStyle = this.cur.prio >= 4 ? '#ff3e8a' : '#3ec8ff';
    ctx.fillRect(x, y - 3, 2, 13);
    ctx.globalAlpha = a;
    drawText(ctx, txt, x + 7, y, { color: this.cur.prio >= 4 ? '#fff8c0' : '#ffffff' });
    ctx.globalAlpha = 1;
  }
}

export function hintsEnabled(): boolean {
  try {
    return localStorage.getItem('ff-hints') !== '0';
  } catch {
    return true;
  }
}
export function setHints(on: boolean): void {
  try {
    localStorage.setItem('ff-hints', on ? '1' : '0');
  } catch {
    // storage unavailable
  }
}

export function drawMoveList(ctx: CanvasRenderingContext2D, char: number, layout: Layout, x: number, y: number, title: string): void {
  const lines = moveList(char, layout);
  drawText(ctx, title, x, y, { color: '#ffd23e' });
  lines.forEach((l, i) => {
    const yy = y + 14 + i * 24;
    drawText(ctx, l.name, x, yy, { color: '#fff' });
    drawText(ctx, `EASY ${l.easy}`, x + 8, yy + 10, { color: '#7ad7ff' });
    drawText(ctx, `PRO  ${l.input}`, x + 110, yy + 10, { color: '#ff8ab0' });
  });
  basicsLines(layout).forEach((b, i) => drawText(ctx, b, x, y + 14 + lines.length * 24 + 6 + i * 10, { color: '#aaa' }));
}
