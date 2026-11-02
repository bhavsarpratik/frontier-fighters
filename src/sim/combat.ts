import type { Box } from '../content/types.ts';
import { CHARS, type CMove } from './data.ts';
import { STAGE_MARGIN, STAGE_W, px } from './fixed.ts';
import { addMeter, curMove, isAirborne, isCrouching, isInvuln, setState } from './fighter.ts';
import { isBack, isDown } from './input.ts';
import {
  S_AIRHIT, S_ATTACK, S_BLOCKSTUN, S_CROUCH, S_HITSTUN, S_IDLE, S_JUMPSQUAT, S_KNOCKDOWN, S_KO,
  S_TECH, S_THROWN, S_WALK, type FighterState, type Projectile, type SimState,
} from './types.ts';

export interface WBox { x0: number; y0: number; x1: number; y1: number }

export function worldBox(f: FighterState, b: Box): WBox {
  const xa = f.x + f.facing * px(b.x);
  const xb = f.x + f.facing * px(b.x + b.w);
  return { x0: Math.min(xa, xb), x1: Math.max(xa, xb), y0: f.y + px(b.y), y1: f.y + px(b.y + b.h) };
}

const overlap = (a: WBox, b: WBox) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

export function hurtboxes(f: FighterState): WBox[] {
  if (f.state === S_KO || f.state === S_KNOCKDOWN) return [];
  const c = CHARS[f.char];
  const out: WBox[] = [];
  const w = c.w;
  if (f.state === S_AIRHIT || (isAirborne(f) && f.state !== S_ATTACK) || (f.state === S_ATTACK && isAirborne(f))) {
    out.push(worldBox(f, { x: -w + 2, y: 10, w: w * 2 - 4, h: Math.round(c.h * 0.72) }));
  } else if (isCrouching(f)) {
    out.push(worldBox(f, { x: -w, y: 0, w: w * 2, h: Math.round(c.h * 0.62) }));
  } else {
    out.push(worldBox(f, { x: -w, y: 0, w: w * 2, h: c.h }));
  }
  const m = curMove(f);
  if (m && m.hit && f.mf >= m.startup) {
    const hb = m.hit;
    out.push(worldBox(f, { x: hb.x, y: hb.y + 2, w: Math.max(4, hb.w - 6), h: Math.max(4, hb.h - 4) }));
  }
  return out;
}

export function pushbox(f: FighterState): WBox {
  const c = CHARS[f.char];
  return worldBox(f, { x: -c.w + 2, y: 0, w: (c.w - 2) * 2, h: Math.round(c.h * 0.8) });
}

export function activeHitbox(f: FighterState): WBox | null {
  if (f.state !== S_ATTACK) return null;
  const m = curMove(f)!;
  if (!m.hit || m.grab) return null;
  if (f.mf < m.startup || f.mf >= m.startup + m.active) return null;
  if (f.hitsDone >= m.nHits || f.mf < f.nextHit) return null;
  return worldBox(f, m.hit);
}

const canBlockState = (d: FighterState) =>
  !isAirborne(d) && (d.state === S_IDLE || d.state === S_WALK || d.state === S_CROUCH || d.state === S_BLOCKSTUN);

function guardOk(d: FighterState, level: string): boolean {
  if (!canBlockState(d) || !isBack(d.dir)) return false;
  const crouch = isDown(d.dir);
  if (level === 'low') return crouch;
  if (level === 'overhead') return !crouch;
  return true;
}

interface HitSpec {
  dmg: number; chip: number; hitstun: number; blockstun: number; hitstop: number; push: number;
  level: string; kd: boolean; launch: number; juggle: boolean; isSuper: boolean; freeze: number; heavy: boolean;
}

function specFromMove(m: CMove, ex: number): HitSpec {
  const isSpecial = !!m.name || !!m.isSuper;
  return {
    dmg: ex ? Math.floor((m.dmg * 13) / 10) : m.dmg,
    chip: m.chip ?? (isSpecial ? Math.floor(m.dmg / 6) : 0),
    hitstun: m.hitstun, blockstun: m.blockstun,
    hitstop: m.hitstop ?? (m.dmg >= 70 ? 11 : 8),
    push: px(m.push ?? 6), level: m.level ?? 'mid',
    kd: !!m.kd || ex === 1 && !!m.launch, launch: px(m.launch ?? 0), juggle: !!m.juggle || !!m.isSuper,
    isSuper: !!m.isSuper, freeze: 0, heavy: m.dmg >= 70,
  };
}

function specFromProj(p: Projectile): HitSpec {
  return {
    dmg: p.dmg, chip: Math.max(1, Math.floor(p.dmg / 6)), hitstun: p.hitstun, blockstun: p.blockstun,
    hitstop: 6, push: px(4), level: p.level, kd: p.kd === 1, launch: p.launch, juggle: p.isSuper === 1 || p.kd === 1,
    isSuper: p.isSuper === 1, freeze: p.freeze, heavy: p.dmg >= 60,
  };
}

function pushApart(s: SimState, ai: number, amount: number): void {
  const a = s.f[ai];
  const d = s.f[1 - ai];
  const dirAway = d.x >= a.x ? 1 : -1;
  const lo = px(STAGE_MARGIN + 2);
  const hi = px(STAGE_W - STAGE_MARGIN - 2);
  const target = d.x + dirAway * amount;
  if (target < lo || target > hi) {
    a.vx = -dirAway * Math.floor(amount / 3);
    d.vx = 0;
  } else {
    d.vx = dirAway * Math.floor(amount / 3);
  }
}

// Returns true if hit (or block) was applied.
function applyHit(s: SimState, ai: number, h: HitSpec, cx: number, cy: number, proj: boolean): 'hit' | 'block' | 'counter' | 'armor' | 'none' {
  const a = s.f[ai];
  const d = s.f[1 - ai];
  const dm = curMove(d);
  if (d.state === S_AIRHIT && d.juggle >= 1 && !h.juggle) return 'none';
  if (d.state === S_AIRHIT && d.juggle >= 4 && !h.isSuper) return 'none';
  // counter stance
  if (dm && d.state === S_ATTACK && dm.fx === 'counter' && d.mf >= dm.startup && d.mf < dm.startup + dm.active) {
    const dmg = dm.fxArg ?? 100;
    a.hp -= dmg;
    a.lastDmgFrame = s.frame;
    setState(a, S_AIRHIT);
    a.y = Math.max(a.y, px(1));
    a.vy = px(5);
    a.vx = d.facing * px(3);
    a.juggle = 4;
    addMeter(d, 60);
    d.hitstop = 14;
    a.hitstop = 14;
    d.mf = dm.startup + dm.active;
    s.events.push({ t: 'counter', p: 1 - ai, x: cx, y: cy, k: 2 });
    return 'counter';
  }
  if (guardOk(d, h.level)) {
    const chip = h.chip;
    d.hp -= chip;
    if (d.hp <= 0 && !h.isSuper) d.hp = 1;
    setState(d, S_BLOCKSTUN);
    d.stun = h.blockstun;
    d.crouchHit = isDown(d.dir) ? 1 : 0;
    pushApart(s, ai, h.push);
    addMeter(a, Math.floor(h.dmg / 10));
    addMeter(d, Math.floor(h.dmg / 12));
    const stop = Math.max(4, h.hitstop - 3);
    d.hitstop = stop;
    if (!proj) a.hitstop = stop;
    s.events.push({ t: 'block', p: 1 - ai, x: cx, y: cy, k: h.heavy ? 1 : 0 });
    return 'block';
  }
  if (dm && d.state === S_ATTACK && d.armor > 0 && !h.isSuper) {
    d.armor--;
    d.hp -= Math.floor(h.dmg / 2);
    d.lastDmgFrame = s.frame;
    d.hitstop = h.hitstop;
    if (!proj) a.hitstop = h.hitstop;
    s.events.push({ t: 'armor', p: 1 - ai, x: cx, y: cy });
    return 'armor';
  }
  const n = d.state === S_HITSTUN || d.state === S_AIRHIT ? d.combo : 0;
  const scale = n < 2 ? 100 : Math.max(30, 100 - (n - 1) * 10);
  let dmg = Math.floor((h.dmg * scale) / 100);
  if (a.buff > 0) dmg = Math.floor((dmg * 5) / 4);
  if (d.buff > 0) dmg = Math.floor((dmg * 5) / 4);
  dmg = Math.max(1, dmg);
  d.hp -= dmg;
  d.lastDmgFrame = s.frame;
  d.combo = n + 1;
  const wasAir = isAirborne(d);
  if (wasAir || h.kd || h.launch > 0) {
    setState(d, S_AIRHIT);
    d.y = Math.max(d.y, px(1));
    d.vy = h.launch > 0 ? h.launch : wasAir ? px(3) : px(2.5);
    d.vx = (d.x >= a.x ? 1 : -1) * px(wasAir ? 1.5 : 2.5);
    d.juggle++;
  } else {
    d.crouchHit = isCrouching(d) ? 1 : 0;
    setState(d, S_HITSTUN);
    d.stun = h.hitstun + h.freeze;
    d.frozen = h.freeze;
    pushApart(s, ai, h.push);
  }
  addMeter(a, Math.floor(dmg / 3));
  addMeter(d, Math.floor(dmg / 5));
  d.hitstop = h.hitstop;
  if (!proj) a.hitstop = h.hitstop;
  s.events.push({ t: 'hit', p: 1 - ai, x: cx, y: cy, k: h.isSuper ? 2 : h.heavy ? 1 : 0 });
  return 'hit';
}

const throwable = (d: FighterState) =>
  !isAirborne(d) && !isInvuln(d) &&
  d.state !== S_HITSTUN && d.state !== S_BLOCKSTUN && d.state !== S_JUMPSQUAT && d.state !== S_THROWN;

function tryGrab(s: SimState, ai: number): void {
  const a = s.f[ai];
  const d = s.f[1 - ai];
  const m = curMove(a);
  if (!m || !m.grab || a.state !== S_ATTACK || a.mf !== m.startup + 1 || a.connected) return;
  const c = CHARS[a.char];
  const range = px(m.grab.range + c.w + CHARS[d.char].w);
  if (Math.abs(a.x - d.x) > range || !throwable(d)) return;
  const dm = curMove(d);
  if (m.grab.tech && dm && dm.grab && dm.grab.tech && d.state === S_ATTACK && d.mf <= dm.startup + 1) {
    setState(a, S_TECH);
    setState(d, S_TECH);
    a.vx = -a.facing * px(4);
    d.vx = -d.facing * px(4);
    s.events.push({ t: 'tech', p: ai, x: (a.x + d.x) >> 1, y: px(50) });
    return;
  }
  a.connected = 1;
  setState(d, S_THROWN);
  d.grabbedBy = ai;
  d.grabT = 0;
  d.vx = 0;
  d.vy = 0;
  s.events.push({ t: 'throw', p: 1 - ai, x: d.x, y: px(50), k: 0 });
}

function centerOf(a: WBox, b: WBox): [number, number] {
  return [(Math.max(a.x0, b.x0) + Math.min(a.x1, b.x1)) >> 1, (Math.max(a.y0, b.y0) + Math.min(a.y1, b.y1)) >> 1];
}

export function resolveCombat(s: SimState): void {
  const f = s.f;
  tryGrab(s, 0);
  tryGrab(s, 1);
  const pending: { ai: number; box: WBox; hurt: WBox; m: CMove; ex: number }[] = [];
  for (let ai = 0; ai < 2; ai++) {
    const hb = activeHitbox(f[ai]);
    if (!hb) continue;
    const d = f[1 - ai];
    if (isInvuln(d)) continue;
    const hurt = hurtboxes(d).find((h) => overlap(hb, h));
    if (hurt) pending.push({ ai, box: hb, hurt, m: curMove(f[ai])!, ex: f[ai].ex });
  }
  for (const p of pending) {
    const a = f[p.ai];
    const m = p.m;
    const [cx, cy] = centerOf(p.box, p.hurt);
    const r = applyHit(s, p.ai, specFromMove(m, p.ex), cx, cy, false);
    if (r !== 'none' && r !== 'counter' && a.state === S_ATTACK) {
      a.hitsDone++;
      a.nextHit = a.mf + (m.hitGap ?? 4);
      a.connected = 1;
    }
  }
  updateProjectiles(s);
  separate(s);
}

function updateProjectiles(s: SimState): void {
  const list = s.proj;
  for (const p of list) {
    p.age++;
    p.life--;
    p.x += p.vx;
    p.vy -= p.g;
    p.y += p.vy;
    if (p.cd > 0) p.cd--;
    if (p.g > 0 && p.y <= 0 && p.vy < 0) {
      if (p.kind === 'gpu' || p.kind === 'spud') p.life = 0;
      p.y = 0;
    }
    if (p.x < px(-40) || p.x > px(STAGE_W + 40)) p.life = 0;
  }
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      if (a.owner === b.owner || a.life <= 0 || b.life <= 0) continue;
      if (overlap(projBox(a), projBox(b))) {
        if (a.isSuper && !b.isSuper) b.life = 0;
        else if (b.isSuper && !a.isSuper) a.life = 0;
        else {
          a.hits--;
          b.hits--;
          if (a.hits <= 0) a.life = 0;
          if (b.hits <= 0) b.life = 0;
        }
        s.events.push({ t: 'clash', p: a.owner, x: (a.x + b.x) >> 1, y: (a.y + b.y) >> 1 });
      }
    }
  }
  for (const p of list) {
    if (p.life <= 0 || p.cd > 0) continue;
    const d = s.f[1 - p.owner];
    if (isInvuln(d)) continue;
    const pb = projBox(p);
    const hurt = hurtboxes(d).find((h) => overlap(pb, h));
    if (!hurt) continue;
    const [cx, cy] = centerOf(pb, hurt);
    const r = applyHit(s, p.owner, specFromProj(p), cx, cy, true);
    if (r === 'none') continue;
    p.hits--;
    p.cd = p.gap;
    if (p.hits <= 0 || r === 'counter') p.life = 0;
  }
  s.proj = list.filter((p) => p.life > 0);
}

export function projBox(p: Projectile): WBox {
  return { x0: p.x - (p.w >> 1), x1: p.x + (p.w >> 1), y0: p.y, y1: p.y + p.h };
}

function separate(s: SimState): void {
  const [a, b] = s.f;
  if (a.state === S_THROWN || b.state === S_THROWN || a.state === S_KO || b.state === S_KO) return;
  const pa = pushbox(a);
  const pb = pushbox(b);
  if (!overlap(pa, pb)) return;
  const ov = Math.min(pa.x1, pb.x1) - Math.max(pa.x0, pb.x0);
  const dir = a.x < b.x ? -1 : a.x > b.x ? 1 : a.facing === 1 ? -1 : 1;
  const half = (ov >> 1) + 1;
  const lo = px(STAGE_MARGIN);
  const hi = px(STAGE_W - STAGE_MARGIN);
  let ax = a.x + dir * half;
  let bx = b.x - dir * half;
  if (ax < lo || ax > hi) { ax = a.x; bx = b.x - dir * ov; }
  if (bx < lo || bx > hi) { bx = b.x; ax = a.x + dir * ov; }
  a.x = Math.min(hi, Math.max(lo, ax));
  b.x = Math.min(hi, Math.max(lo, bx));
}

