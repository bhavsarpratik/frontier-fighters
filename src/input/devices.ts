import { DOWN, HK, HP, LEFT, LK, LP, RIGHT, SP, SUPER, UP } from '../sim/input.ts';

export type Layout = 'solo' | 'p1duo' | 'p2duo';

const MAPS: Record<Layout, Record<string, number>> = {
  solo: {
    ArrowUp: UP, ArrowDown: DOWN, ArrowLeft: LEFT, ArrowRight: RIGHT,
    KeyA: LP, KeyS: LK, KeyD: SP, KeyW: SUPER, KeyQ: HP, KeyE: HK,
  },
  p1duo: {
    KeyW: UP, KeyS: DOWN, KeyA: LEFT, KeyD: RIGHT,
    KeyF: LP, KeyG: LK, KeyH: SP, KeyR: HP, KeyT: HK, KeyY: SUPER,
  },
  p2duo: {
    ArrowUp: UP, ArrowDown: DOWN, ArrowLeft: LEFT, ArrowRight: RIGHT,
    KeyO: LP, KeyP: HP, KeyL: LK, Semicolon: HK, Period: SP, Slash: SUPER,
    Numpad4: LP, Numpad5: HP, Numpad1: LK, Numpad2: HK, Numpad3: SP, Numpad6: SP,
  },
};

export const LAYOUT_HELP: Record<Layout, string[]> = {
  solo: ['MOVE  ARROW KEYS  (UP JUMP, DOWN CROUCH)', 'A PUNCH   S KICK   D SPECIAL   W SUPER', 'Q HEAVY PUNCH   E HEAVY KICK   THROW A + S'],
  p1duo: ['P1 MOVE W A S D', 'F PUNCH  G KICK  H SPECIAL  Y SUPER', 'R HEAVY PUNCH  T HEAVY KICK'],
  p2duo: ['P2 MOVE ARROWS', 'O PUNCH  L KICK  . SPECIAL  / SUPER', 'P HEAVY PUNCH  ; HEAVY KICK'],
};

const held = new Set<string>();
let anyKey: ((code: string) => void) | null = null;
let keysBound = false;

export function bindKeys(): void {
  if (keysBound) return;
  keysBound = true;
  window.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    held.add(e.code);
    anyKey?.(e.code);
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => held.clear());
}

export function onAnyKey(cb: ((code: string) => void) | null): void {
  anyKey = cb;
}

export function readKeys(layout: Layout): number {
  const m = MAPS[layout];
  let v = 0;
  for (const code of held) v |= m[code] ?? 0;
  return v;
}

export const isHeld = (code: string) => held.has(code);

const DEAD = 0.45;
export function readPad(index: number): number {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const pads2 = Array.from(pads).filter((p): p is Gamepad => !!p && p.connected);
  const p = pads2[index];
  if (!p) return 0;
  const b = (i: number) => !!p.buttons[i]?.pressed;
  let v = 0;
  const ax = p.axes[0] ?? 0;
  const ay = p.axes[1] ?? 0;
  if (b(12) || ay < -DEAD) v |= UP;
  if (b(13) || ay > DEAD) v |= DOWN;
  if (b(14) || ax < -DEAD) v |= LEFT;
  if (b(15) || ax > DEAD) v |= RIGHT;
  if (b(2)) v |= LP;
  if (b(3)) v |= HP;
  if (b(0)) v |= LK;
  if (b(1)) v |= HK;
  if (b(5)) v |= SP;
  if (b(7)) v |= SUPER;
  if (b(4) || b(6)) v |= LP | LK;
  return v;
}

export function padCount(): number {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  return Array.from(pads).filter((p) => !!p && p.connected).length;
}

// Menu-level input with edge detection, merged across every device.
export interface MenuInput { up: boolean; down: boolean; left: boolean; right: boolean; ok: boolean; back: boolean; esc?: boolean; who: number }

const MENU_KEYS: Record<string, [keyof Omit<MenuInput, 'who'>, number]> = {
  ArrowUp: ['up', 1], ArrowDown: ['down', 1], ArrowLeft: ['left', 1], ArrowRight: ['right', 1],
  KeyW: ['up', 0], KeyS: ['down', 0], KeyA: ['left', 0], KeyD: ['right', 0],
  Enter: ['ok', 0], Space: ['ok', 0], KeyJ: ['ok', 0], KeyF: ['ok', 0], KeyO: ['ok', 1], NumpadEnter: ['ok', 1],
  Escape: ['back', 0], Backspace: ['back', 0], KeyK: ['back', 0], KeyP: ['back', 1],
};

let prevPad: number[] = [0, 0, 0, 0];
const queue: MenuInput[] = [];

export function initMenuKeys(): void {
  bindKeys();
  window.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    if (e.repeat && !e.code.startsWith('Arrow') && !'KeyWKeySKeyAKeyD'.includes(e.code)) return;
    const k = MENU_KEYS[e.code];
    if (!k) return;
    const mi: MenuInput = { up: false, down: false, left: false, right: false, ok: false, back: false, who: k[1] };
    mi[k[0]] = true;
    if (e.code === 'Escape') mi.esc = true;
    queue.push(mi);
  });
}

export function pollMenu(): MenuInput[] {
  const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter((p): p is Gamepad => !!p && p.connected) : [];
  pads.forEach((p, i) => {
    const v = readPad(i);
    const ok = p.buttons[0]?.pressed || p.buttons[9]?.pressed ? 1 : 0;
    const back = p.buttons[1]?.pressed ? 1 : 0;
    const start = p.buttons[9]?.pressed ? 1 : 0;
    const bits = v | (ok << 12) | (back << 13) | (start << 14);
    const edge = bits & ~prevPad[i];
    prevPad[i] = bits;
    if (!edge) return;
    queue.push({ up: !!(edge & UP), down: !!(edge & DOWN), left: !!(edge & LEFT), right: !!(edge & RIGHT), ok: !!(edge & (1 << 12)), back: !!(edge & (1 << 13)), esc: !!(edge & (1 << 14)), who: i });
  });
  const out = queue.splice(0);
  return out;
}

export function resetPadEdges(): void {
  prevPad = [0xffff, 0xffff, 0xffff, 0xffff];
}
