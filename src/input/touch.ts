import { DOWN, HK, HP, LEFT, LK, LP, RIGHT, SP, SUPER, UP } from '../sim/input.ts';
import type { MenuInput } from './devices.ts';

export type TouchMode = 'fight' | 'menu' | 'hidden';

const OK = 1 << 12;
const BACK = 1 << 13;
const PAUSE = 1 << 14;
const DIRS = UP | DOWN | LEFT | RIGHT;

const q = new URLSearchParams(location.search).get('touch');
const detected = q !== null
  ? q !== '0'
  : matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && !matchMedia('(pointer: fine)').matches);

export const isTouch = (): boolean => detected;

let root: HTMLDivElement | null = null;
let pad: HTMLDivElement | null = null;
let knob: HTMLDivElement | null = null;
let mode: TouchMode = 'menu';
const pointers = new Map<number, { pad: boolean; bits: number }>();
let bits = 0;
let prevMenu = 0;
let repeat = 0;
let pendingTap: [number, number] | null = null;
let tap: [number, number] | null = null;

export const takeTap = (): [number, number] | null => tap;

// Gamepad-style diamond (matches readPad: X=P, Y=HP, B=HK, A=K) with SP/SUPER as shoulders.
const FIGHT_BTNS: [string, number, string, string][] = [
  ['SP', SP, 'sp', 'sp'], ['SUPER', SUPER, 'su', 'su'],
  ['HP', HP, 'p', 'hp'], ['P', LP, 'p', 'lp'], ['HK', HK, 'k', 'hk'], ['K', LK, 'k', 'lk'],
];

function padBits(e: PointerEvent): number {
  const r = pad!.getBoundingClientRect();
  const dx = e.clientX - (r.left + r.width / 2);
  const dy = e.clientY - (r.top + r.height / 2);
  const rad = r.width / 2;
  const d = Math.hypot(dx, dy);
  const k = Math.min(1, d / rad) * rad * 0.55;
  knob!.style.transform = d > 0 ? `translate(${(dx / d) * k}px, ${(dy / d) * k}px)` : '';
  if (d < rad * 0.22) return 0;
  const a = Math.atan2(dy, dx);
  const sector = Math.round(a / (Math.PI / 4));
  return [LEFT, UP | LEFT, UP, UP | RIGHT, RIGHT, RIGHT | DOWN, DOWN, DOWN | LEFT, LEFT][sector + 4] ?? 0;
}

function btnBits(x: number, y: number): number {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  const b = el?.closest<HTMLElement>('[data-bits]');
  return b && root!.contains(b) && b.offsetParent ? Number(b.dataset.bits) : 0;
}

function recompute(): void {
  const prev = bits;
  bits = 0;
  for (const p of pointers.values()) bits |= p.bits;
  if (bits & ~prev & ~DIRS && navigator.vibrate) navigator.vibrate(8);
  root!.querySelectorAll<HTMLElement>('[data-bits]').forEach((b) => b.classList.toggle('on', (bits & Number(b.dataset.bits)) !== 0));
  if (!Array.from(pointers.values()).some((p) => p.pad)) knob!.style.transform = '';
}

function onDown(e: PointerEvent): void {
  e.preventDefault();
  const onPad = pad!.contains(e.target as Node);
  pointers.set(e.pointerId, { pad: onPad, bits: onPad ? padBits(e) : btnBits(e.clientX, e.clientY) });
  recompute();
}

function onMove(e: PointerEvent): void {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  e.preventDefault();
  p.bits = p.pad ? padBits(e) : btnBits(e.clientX, e.clientY);
  recompute();
}

function onUp(e: PointerEvent): void {
  if (!pointers.delete(e.pointerId)) return;
  recompute();
}

function goFullscreen(): void {
  const d = document.documentElement;
  if (document.fullscreenElement || !d.requestFullscreen) return;
  d.requestFullscreen({ navigationUI: 'hide' })
    .then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape'))
    .catch(() => {});
}

export function initTouch(): void {
  if (!detected || root) return;
  document.body.classList.add('touch');
  root = document.createElement('div');
  root.id = 'touch';
  const btn = (label: string, b: number, cls: string, area = '') => `<div class="tb ${cls}" data-bits="${b}"${area ? ` style="grid-area:${area}"` : ''}><span>${label}</span></div>`;
  root.innerHTML = `
    <div class="tpad"><div class="tring"></div><div class="tknob"></div></div>
    <div class="tbtns fight">${FIGHT_BTNS.map(([l, b, c, a]) => btn(l, b, c, a)).join('')}</div>
    <div class="tbtns menu">${btn('BACK', BACK, 'k')}${btn('OK', OK, 'p')}</div>
    <div class="tpause" data-bits="${PAUSE}"><span>II</span></div>`;
  document.body.appendChild(root);
  const rot = document.createElement('div');
  rot.id = 'rotate';
  rot.innerHTML = '<div class="phone"></div><p>ROTATE TO LANDSCAPE</p>';
  document.body.appendChild(rot);
  pad = root.querySelector('.tpad');
  knob = root.querySelector('.tknob');
  root.addEventListener('pointerdown', onDown);
  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerup', onUp);
  root.addEventListener('pointercancel', onUp);
  root.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('pointerup', goFullscreen);
  // iOS Safari ignores user-scalable=no, so cancel the native gestures (double-tap and pinch zoom)
  // everywhere except the HTML lobby panel, whose inputs and buttons need normal taps.
  const native = (e: Event) => (e.target as Element | null)?.closest?.('.panel');
  document.addEventListener('touchstart', (e) => { if (!native(e)) e.preventDefault(); }, { passive: false });
  document.addEventListener('touchmove', (e) => { if (!native(e)) e.preventDefault(); }, { passive: false });
  document.addEventListener('touchend', (e) => { if (!native(e)) e.preventDefault(); }, { passive: false });
  for (const g of ['gesturestart', 'gesturechange', 'gestureend', 'dblclick']) document.addEventListener(g, (e) => e.preventDefault(), { passive: false });
  document.addEventListener('pointerdown', (e) => {
    const c = e.target as HTMLElement;
    if (c.tagName !== 'CANVAS' || mode !== 'menu') return;
    const r = c.getBoundingClientRect();
    pendingTap = [((e.clientX - r.left) / r.width) * 480, ((e.clientY - r.top) / r.height) * 270];
  });
  window.addEventListener('blur', () => { pointers.clear(); recompute(); });
  root.dataset.mode = mode;
}

export function setTouchMode(m: TouchMode): void {
  if (!root || m === mode) return;
  mode = m;
  root.dataset.mode = m;
  for (const [id, p] of pointers) if (!p.pad) pointers.delete(id);
  recompute();
  prevMenu = 0xffff;
}

export function readTouch(): number {
  return mode === 'fight' ? bits & ~(OK | BACK | PAUSE) : 0;
}

// Edge-detected menu input from the on-screen pad, with auto-repeat on held directions.
export function pollTouchMenu(): MenuInput[] {
  tap = pendingTap;
  pendingTap = null;
  if (!root || mode === 'hidden') return [];
  const cur = bits;
  let edge = cur & ~prevMenu;
  if (cur & DIRS && !(edge & DIRS)) {
    if (++repeat > 22 && repeat % 7 === 0) edge |= cur & DIRS;
  } else repeat = 0;
  prevMenu = cur;
  if (mode === 'fight') edge &= PAUSE;
  if (!edge) return [];
  return [{
    up: !!(edge & UP), down: !!(edge & DOWN), left: !!(edge & LEFT), right: !!(edge & RIGHT),
    ok: !!(edge & OK), back: !!(edge & BACK), esc: !!(edge & PAUSE), who: 0,
  }];
}
