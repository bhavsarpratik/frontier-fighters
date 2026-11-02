// Illustrated key art (generated offline by tools/genart.py). Falls back to the vector
// toon renderer for any fighter whose art is missing or still loading.
import { ROSTER } from '../content/roster.ts';

export interface RigData { w: number; h: number; joints: Record<string, [number, number]>; parts: Record<string, { x: number; y: number; w: number; h: number }> }
interface Art {
  full: HTMLImageElement | null; face: HTMLImageElement | null; poses: Record<string, HTMLImageElement>;
  rig: RigData | null; parts: Record<string, HTMLImageElement>;
}
const PART_NAMES = ['torso', 'head', 'upper', 'fore', 'thigh', 'shin'];
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
    art[i] = { full: load(`assets/art/${c.id}.webp`), face: load(`assets/art/${c.id}_face.webp`), poses: {}, rig: null, parts: {} };
  });
  const attach = (files: string[]) => {
    for (const f of files) {
      const m = /^([a-z]+)_pose_([a-z]+)\.webp$/.exec(f);
      const i = m ? ROSTER.findIndex((c) => c.id === m[1]) : -1;
      if (m && i >= 0) art[i].poses[m[2]] = load(`assets/art/${f}`);
      const rm = /^([a-z]+)_rig\.json$/.exec(f);
      const ri = rm ? ROSTER.findIndex((c) => c.id === rm[1]) : -1;
      if (rm && ri >= 0) {
        const path = `assets/art/${f}`;
        fetch(window.__FF_ASSETS?.[path] ?? path).then((r) => r.json()).then((rig: RigData) => {
          art[ri].rig = rig;
          for (const n of PART_NAMES) art[ri].parts[n] = load(`assets/art/${rm[1]}_part_${n}.webp`);
        }).catch(() => {});
      }
    }
  };
  if (window.__FF_ASSETS) attach(Object.keys(window.__FF_ASSETS).map((k) => k.replace('assets/art/', '')));
  else fetch('assets/art/manifest.json').then((r) => (r.ok ? r.json() : [])).then(attach).catch(() => {});
}

export function artRig(char: number): { rig: RigData; img: Record<string, HTMLImageElement> } | null {
  const a = art[char];
  if (!a?.rig) return null;
  for (const n of PART_NAMES) if (!ready(a.parts[n])) return null;
  return { rig: a.rig, img: a.parts };
}

export function artPose(char: number, name: string): HTMLImageElement | null {
  const a = art[char]?.poses[name];
  return ready(a) ? a : null;
}

let artMode = (() => {
  try { return localStorage.getItem('ff-art') !== '0'; } catch { return true; }
})();
export const useArt = () => artMode;
export function toggleArt(): boolean {
  artMode = !artMode;
  try { localStorage.setItem('ff-art', artMode ? '1' : '0'); } catch { /* ignore */ }
  return artMode;
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
