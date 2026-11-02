// Illustrated key art (generated offline by tools/genart.py). Falls back to the vector
// toon renderer for any fighter whose art is missing or still loading.
import { ROSTER } from '../content/roster.ts';

interface Art { full: HTMLImageElement | null; face: HTMLImageElement | null }
const art: Art[] = [];
let started = false;

declare global {
  interface Window { __FF_ASSETS?: Record<string, string> }
}

function load(path: string): HTMLImageElement {
  const img = new Image();
  img.decoding = 'async';
  img.src = window.__FF_ASSETS?.[path] ?? path;
  return img;
}

export function loadArt(): void {
  if (started || typeof Image === 'undefined') return;
  started = true;
  ROSTER.forEach((c, i) => {
    art[i] = { full: load(`assets/art/${c.id}.webp`), face: load(`assets/art/${c.id}_face.webp`) };
  });
}

const ready = (img: HTMLImageElement | null | undefined): img is HTMLImageElement => !!img && img.complete && img.naturalWidth > 0;

export function artFull(char: number): HTMLImageElement | null {
  loadArt();
  const a = art[char]?.full;
  return ready(a) ? a : null;
}

export function artFace(char: number): HTMLImageElement | null {
  loadArt();
  const a = art[char]?.face;
  return ready(a) ? a : null;
}

// Draw full-body art with feet at (x, y) and the given height. Art faces right.
export function drawArt(ctx: CanvasRenderingContext2D, char: number, x: number, y: number, height: number, flip = false, t = 0): boolean {
  const img = artFull(char);
  if (!img) return false;
  const bob = Math.sin(t / 22) * height * 0.008;
  const w = (img.naturalWidth / img.naturalHeight) * height;
  const smooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -w / 2, -height - bob, w, height + bob);
  ctx.restore();
  ctx.imageSmoothingEnabled = smooth;
  return true;
}
