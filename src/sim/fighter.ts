import { CHARS, BTN_ORDER, type CMove } from './data.ts';
import { BAR, MAX_METER, MAX_SEPARATION, STAGE_MARGIN, STAGE_W, clamp, px } from './fixed.ts';
import {
  BUTTONS, HIST, LK, LP, PUNCHES, SP, cleanSocd, isBack, isDown, isFwd, isUp, matchMotion, numpad,
} from './input.ts';
import {
  S_AIR, S_AIRHIT, S_ATTACK, S_BLOCKSTUN, S_CROUCH, S_DASH, S_GETUP, S_HITSTUN, S_IDLE, S_INTRO, S_JUMPSQUAT,
  S_KNOCKDOWN, S_KO, S_LAND, S_TECH, S_THROWN, S_WALK, S_WIN, type FighterState, type SimState,
} from './types.ts';

export const KD_FRAMES = 36;
const NORMAL_RANK: Record<string, number> = { sLP: 0, cLP: 0, sLK: 1, cLK: 1, sHP: 2, cHP: 2, sHK: 3, cHK: 3 };
export const GETUP_FRAMES = 16;
const BUFFER_FRAMES = 6;
const DASH_FRAMES = 16;

export function newFighter(char: number, x: number, facing: number): FighterState {
  return {
    char, x: px(x), y: 0, vx: 0, vy: 0, facing,
    hp: CHARS[char].def.hp, meter: 0,
    state: S_INTRO, sf: 0, move: -1, mf: 0,
    hitsDone: 0, nextHit: 0, connected: 0, ex: 0,
    stun: 0, crouchHit: 0, hitstop: 0,
    combo: 0, comboHits: 0, juggle: 0,
    hist: new Array(HIST).fill(0), prev: 0,
    chargeB: 0, chargeD: 0, chargeBOk: 0, chargeDOk: 0,
    inv: 0, armor: 0, airUsed: 0, dashDir: 0,
    grabbedBy: -1, grabT: 0, wins: 0, rehired: 0, buff: 0, frozen: 0, lastDmgFrame: 0, dir: 5,
    buf: 0, bufT: 0, jumpDir: 0,
  };
}

export function setState(f: FighterState, st: number): void {
  f.state = st;
  f.sf = 0;
  if (st !== S_ATTACK) f.move = -1;
}

export const curMove = (f: FighterState): CMove | null => (f.move >= 0 ? CHARS[f.char].moves[f.move] : null);

export const isAirborne = (f: FighterState) => f.y > 0 || f.state === S_AIR || f.state === S_AIRHIT;

export function isCrouching(f: FighterState): boolean {
  if (f.state === S_CROUCH) return true;
  if (f.state === S_BLOCKSTUN || f.state === S_HITSTUN) return f.crouchHit === 1;
  if (f.state === S_ATTACK) {
    const m = curMove(f);
    return !!m && m.anim[0] === 'c';
  }
  return false;
}

export function isInvuln(f: FighterState): boolean {
  if (f.inv > 0) return true;
  if (f.state === S_KNOCKDOWN || f.state === S_GETUP || f.state === S_KO || f.state === S_THROWN || f.state === S_TECH) return true;
  if (f.state === S_INTRO || f.state === S_WIN) return true;
  const m = curMove(f);
  if (m && f.state === S_ATTACK) {
    if (m.inv && f.mf >= m.inv[0] && f.mf <= m.inv[1]) return true;
    if (f.ex && f.mf < m.startup) return true;
    if (m.isSuper && f.mf < m.startup) return true;
  }
  return false;
}

export function faceOpponent(f: FighterState, o: FighterState): void {
  if (o.x > f.x) f.facing = 1;
  else if (o.x < f.x) f.facing = -1;
}

function addMeter(f: FighterState, v: number): void {
  f.meter = clamp(f.meter + v, 0, MAX_METER);
}

export function startMove(s: SimState, i: number, idx: number, ex: number): void {
  const f = s.f[i];
  const o = s.f[1 - i];
  const c = CHARS[f.char];
  const m = c.moves[idx];
  setState(f, S_ATTACK);
  f.move = idx;
  f.mf = 0;
  f.hitsDone = 0;
  f.nextHit = 0;
  f.connected = 0;
  f.ex = ex;
  f.armor = m.armor ?? 0;
  f.bufT = 0;
  f.buf = 0;
  if (m.isSuper) {
    f.meter -= m.cost ?? MAX_METER;
    s.freeze = 45;
    s.freezeOwner = i;
    s.events.push({ t: 'super', p: i, s: m.name ?? m.key });
  } else if (ex) {
    f.meter -= BAR;
    s.events.push({ t: 'special', p: i, s: m.name ?? m.key, k: 1 });
  } else if (m.name) {
    s.events.push({ t: 'special', p: i, s: m.name, k: 0 });
  }
  if (!m.air && !isAirborne(f)) f.vx = 0;
  if (m.fx === 'warp-behind') {
    const side = f.x < o.x ? 1 : -1;
    f.x = clamp(o.x + side * px(46), px(STAGE_MARGIN), px(STAGE_W - STAGE_MARGIN));
    faceOpponent(f, o);
    s.events.push({ t: 'teleport', p: i });
  } else if (m.fx === 'teleport') {
    f.x = clamp(f.x - f.facing * px(m.fxArg ?? 120), px(STAGE_MARGIN), px(STAGE_W - STAGE_MARGIN));
    s.events.push({ t: 'teleport', p: i });
  }
}

const bitCount = (v: number) => {
  let n = 0;
  for (let b = v; b; b &= b - 1) n++;
  return n;
};

function doubleTap(hist: number[], facing: number, want: number): boolean {
  const n = hist.length;
  if (numpad(hist[n - 1], facing) !== want || numpad(hist[n - 2], facing) === want) return false;
  let sawNeutral = false;
  for (let i = n - 2; i >= Math.max(0, n - 14); i--) {
    const d = numpad(hist[i], facing);
    if (d === want && sawNeutral) return true;
    if (d !== want) sawNeutral = true;
  }
  return false;
}

// Try specials/super/throw/normals. `allow`: 3 everything, 2 specials+super, 1 super only.
function tryAttack(s: SimState, i: number, press: number, raw: number, allow: number): boolean {
  const f = s.f[i];
  const c = CHARS[f.char];
  const d = f.dir;
  if (!press) return false;
  const superMove = c.moves[c.superIdx];
  if (f.meter >= (superMove.cost ?? MAX_METER)) {
    if ((press & PUNCHES && matchMotion(f.hist, f.facing, '236236')) || (press & SP && isUp(d))) {
      startMove(s, i, c.superIdx, 0);
      return true;
    }
  }
  if (allow < 2) return false;
  if (press & SP) {
    const key = isDown(d) ? 'd' : isFwd(d) ? 'f' : isBack(d) ? 'b' : 'n';
    const sp = c.specials.find((x) => x.simple === key) ?? c.specials.find((x) => x.simple === 'n');
    if (sp) {
      startMove(s, i, sp.move, 0);
      return true;
    }
  }
  for (const sp of c.specials) {
    if (!(press & sp.mask)) continue;
    let ok = false;
    if (sp.motion === '[4]6') ok = (f.chargeBOk > 0 || f.chargeB >= 30) && isFwd(d);
    else if (sp.motion === '[2]8') ok = (f.chargeDOk > 0 || f.chargeD >= 30) && isUp(d);
    else ok = matchMotion(f.hist, f.facing, sp.motion);
    if (!ok) continue;
    const ex = sp.ex && f.meter >= BAR && bitCount((press | raw) & sp.mask) >= 2 ? 1 : 0;
    f.chargeB = 0; f.chargeD = 0; f.chargeBOk = 0; f.chargeDOk = 0;
    startMove(s, i, sp.move, ex);
    return true;
  }
  if (allow < 3) return false;
  const air = isAirborne(f);
  if (!air && raw & LP && raw & LK && press & (LP | LK)) {
    startMove(s, i, c.throwIdx, 0);
    return true;
  }
  const set = air ? c.normals.j : isDown(d) ? c.normals.c : c.normals.s;
  for (let b = 0; b < 4; b++) {
    if (press & BTN_ORDER[b]) {
      if (air) {
        if (f.airUsed) return false;
        f.airUsed = 1;
      }
      const keepVx = f.vx;
      const keepVy = f.vy;
      startMove(s, i, set[b], 0);
      if (air) { f.vx = keepVx; f.vy = keepVy; }
      return true;
    }
  }
  return false;
}

function neutral(s: SimState, i: number, press: number, raw: number): void {
  const f = s.f[i];
  const o = s.f[1 - i];
  const c = CHARS[f.char];
  faceOpponent(f, o);
  f.dir = numpad(raw, f.facing);
  const d = f.dir;
  if (tryAttack(s, i, press, raw, 3)) return;
  if (isUp(d)) {
    setState(f, S_JUMPSQUAT);
    f.jumpDir = isFwd(d) ? f.facing : isBack(d) ? -f.facing : 0;
    return;
  }
  if (doubleTap(f.hist, f.facing, 6) || doubleTap(f.hist, f.facing, 4)) {
    const fwd = numpad(f.hist[f.hist.length - 1], f.facing) === 6;
    setState(f, S_DASH);
    f.dashDir = fwd ? f.facing : -f.facing;
    s.events.push({ t: 'dash', p: i });
    return;
  }
  if (isDown(d)) {
    if (f.state !== S_CROUCH) setState(f, S_CROUCH);
    f.vx = 0;
  } else if (d === 6) {
    if (f.state !== S_WALK) setState(f, S_WALK);
    f.vx = c.walkF * f.facing;
  } else if (d === 4) {
    if (f.state !== S_WALK) setState(f, S_WALK);
    f.vx = -c.walkB * f.facing;
  } else {
    if (f.state !== S_IDLE) setState(f, S_IDLE);
    f.vx = 0;
  }
}

function runMove(s: SimState, i: number, press: number, raw: number): void {
  const f = s.f[i];
  const c = CHARS[f.char];
  const m = c.moves[f.move];
  f.dir = numpad(raw, f.facing);
  // cancels
  if (f.connected && m.cancel && f.mf >= m.startup) {
    if (tryAttack(s, i, press, raw, m.cancel === 1 ? 2 : 1)) return;
  }
  if (m.chain && f.mf >= m.startup + m.active && press) {
    const set = isDown(f.dir) ? c.normals.c : c.normals.s;
    for (let b = 2; b < 4; b++) {
      if (press & BTN_ORDER[b] && c.moves[set[b]].chain) {
        startMove(s, i, set[b], 0);
        return;
      }
    }
  }
  // Chain combos: a ground normal that connected can chain into any stronger normal.
  const rank = NORMAL_RANK[m.key];
  if (rank !== undefined && f.connected && f.mf >= m.startup && press && !isAirborne(f)) {
    const set = isDown(f.dir) ? c.normals.c : c.normals.s;
    for (let b = 0; b < 4; b++) {
      const nm = c.moves[set[b]];
      if (press & BTN_ORDER[b] && (NORMAL_RANK[nm.key] ?? -1) > rank) {
        startMove(s, i, set[b], 0);
        return;
      }
    }
  }
  let velSet = false;
  for (const [a, b, vx, vy] of m.fvel) {
    if (f.mf >= a && f.mf <= b) {
      f.vx = vx * f.facing;
      if (vy !== null) f.vy = vy;
      velSet = true;
    }
  }
  if (!velSet && !m.air && !m.gravity && f.y === 0) f.vx = 0;
  if (m.proj && f.mf === m.proj.frame) spawnProjectiles(s, i, m);
  if (m.fx === 'buff' && f.mf === m.startup) {
    f.buff = m.fxArg ?? 600;
    s.events.push({ t: 'buff', p: i });
  }
  f.mf++;
  if (m.grab && f.connected && s.f[1 - i].state === S_THROWN && f.mf >= m.total) f.mf = m.total - 1;
  if (f.mf >= m.total) {
    if (isAirborne(f)) {
      setState(f, S_AIR);
    } else {
      setState(f, S_IDLE);
      neutral(s, i, 0, raw);
    }
  }
}

export function spawnProjectiles(s: SimState, i: number, m: CMove): void {
  const f = s.f[i];
  const o = s.f[1 - i];
  const p = m.proj!;
  const n = p.count ?? 1;
  for (let k = 0; k < n; k++) {
    const off = px((p.spread ?? 0) * (k - (n - 1) / 2));
    const baseX = p.atOpponent ? o.x : f.x + f.facing * px(p.x);
    s.proj.push({
      id: s.nextId++, owner: i, kind: p.kind,
      x: baseX + off * (p.atOpponent ? 1 : f.facing), y: (p.atOpponent ? 0 : f.y) + px(p.y) + (p.atOpponent ? px(k * 18) : 0),
      vx: px(p.vx) * f.facing, vy: px(p.vy ?? 0), g: px(p.gravity ?? 0),
      w: px(p.w), h: px(p.h), life: p.life, age: 0,
      hits: (p.hits ?? 1) + (f.ex ? 1 : 0), gap: p.hitGap ?? 8, cd: 0,
      dmg: f.ex ? Math.floor((p.dmg * 13) / 10) : p.dmg, hitstun: p.hitstun ?? 18, blockstun: p.blockstun ?? 14,
      level: p.level ?? 'mid', freeze: p.freeze ?? 0, launch: px(p.launch ?? 0), kd: p.kd ? 1 : 0,
      facing: f.facing, isSuper: m.isSuper ? 1 : 0,
    });
  }
  s.events.push({ t: 'proj', p: i, s: p.kind });
}

// One sim frame for fighter i. Returns nothing; mutates s.
export function updateFighter(s: SimState, i: number, rawIn: number): void {
  const f = s.f[i];
  const o = s.f[1 - i];
  const c = CHARS[f.char];
  const raw = cleanSocd(rawIn);
  f.hist.push(raw);
  f.hist.shift();
  const newPress = raw & ~f.prev & BUTTONS;
  f.prev = raw;
  if (newPress) {
    f.buf |= newPress;
    f.bufT = BUFFER_FRAMES;
  } else if (f.hitstop === 0 && f.bufT > 0 && --f.bufT === 0) f.buf = 0;
  const press = newPress | (f.bufT > 0 ? f.buf : 0);

  const rel = numpad(raw, f.facing);
  if (isBack(rel)) f.chargeB++;
  else {
    if (f.chargeB >= 30) f.chargeBOk = 10;
    f.chargeB = 0;
  }
  if (isDown(rel)) f.chargeD++;
  else {
    if (f.chargeD >= 30) f.chargeDOk = 10;
    f.chargeD = 0;
  }
  if (f.chargeBOk > 0) f.chargeBOk--;
  if (f.chargeDOk > 0) f.chargeDOk--;

  if (f.hitstop > 0) {
    f.hitstop--;
    return;
  }
  if (f.inv > 0) f.inv--;
  if (f.buff > 0) f.buff--;
  f.sf++;

  switch (f.state) {
    case S_INTRO:
    case S_WIN:
      f.vx = 0;
      break;
    case S_IDLE:
    case S_WALK:
    case S_CROUCH:
      neutral(s, i, press, raw);
      break;
    case S_JUMPSQUAT:
      f.dir = rel;
      if (f.sf >= 4) {
        setState(f, S_AIR);
        f.vy = c.jumpV;
        f.vx = c.jumpX * f.jumpDir;
        f.y = 1;
        f.airUsed = 0;
        s.events.push({ t: 'jump', p: i });
      }
      break;
    case S_AIR:
      f.dir = rel;
      tryAttack(s, i, press, raw, 3);
      break;
    case S_LAND:
      if (f.sf >= 3) {
        setState(f, S_IDLE);
        neutral(s, i, press, raw);
      }
      break;
    case S_DASH:
      f.vx = (f.dashDir === f.facing ? c.dashF : c.dashB) * f.dashDir;
      if (f.sf > 4) f.vx = Math.trunc((f.vx * (DASH_FRAMES - f.sf)) / DASH_FRAMES);
      if (f.sf >= DASH_FRAMES) {
        setState(f, S_IDLE);
        f.vx = 0;
      }
      break;
    case S_ATTACK:
      runMove(s, i, press, raw);
      break;
    case S_HITSTUN:
    case S_BLOCKSTUN:
      f.vx = Math.trunc((f.vx * 7) / 8);
      if (--f.stun <= 0) {
        f.combo = f.state === S_HITSTUN ? 0 : f.combo;
        f.juggle = 0;
        setState(f, f.crouchHit ? S_CROUCH : S_IDLE);
        neutral(s, i, press, raw);
      }
      break;
    case S_AIRHIT:
      break;
    case S_KNOCKDOWN:
      f.vx = 0;
      if (f.sf >= KD_FRAMES) {
        if (f.hp <= 0) break;
        setState(f, S_GETUP);
      }
      break;
    case S_GETUP:
      if (f.sf >= GETUP_FRAMES) {
        f.combo = 0;
        f.juggle = 0;
        setState(f, S_IDLE);
      }
      break;
    case S_THROWN:
      updateThrown(s, i, raw, press);
      break;
    case S_TECH:
      if (f.sf >= 18) setState(f, S_IDLE);
      break;
    case S_KO:
      f.vx = 0;
      break;
  }

  // physics
  if (f.state === S_THROWN) return;
  const m = curMove(f);
  const airborne = f.y > 0 || f.state === S_AIR || f.state === S_AIRHIT || (m && (m.air || m.gravity) && f.y > 0);
  f.x += f.vx;
  f.y += f.vy;
  if (airborne || f.vy > 0) {
    f.vy -= c.g;
    if (f.y <= 0) {
      f.y = 0;
      f.vy = 0;
      land(s, i);
    }
  } else {
    f.y = 0;
    f.vy = 0;
  }
  f.x = clamp(f.x, px(STAGE_MARGIN), px(STAGE_W - STAGE_MARGIN));
  if (Math.abs(f.x - o.x) > px(MAX_SEPARATION)) f.x = o.x + Math.sign(f.x - o.x) * px(MAX_SEPARATION);
}

function land(s: SimState, i: number): void {
  const f = s.f[i];
  if (f.state === S_AIRHIT) {
    setState(f, f.hp <= 0 ? S_KO : S_KNOCKDOWN);
    f.vx = 0;
    s.events.push({ t: 'knockdown', p: i, x: f.x, y: 0 });
    return;
  }
  if (f.state === S_KO) return;
  if (f.state === S_AIR || (f.state === S_ATTACK && curMove(f)?.air)) {
    setState(f, S_LAND);
    f.vx = 0;
    s.events.push({ t: 'land', p: i });
    return;
  }
  if (f.state === S_ATTACK) {
    const m = curMove(f)!;
    if (m.gravity && f.mf >= m.startup) {
      setState(f, S_LAND);
      f.vx = 0;
      s.events.push({ t: 'land', p: i });
    }
  }
}

function updateThrown(s: SimState, i: number, raw: number, press: number): void {
  const f = s.f[i];
  const a = s.f[f.grabbedBy];
  const m = curMove(a);
  f.grabT++;
  if (!m || !m.grab || a.state !== S_ATTACK) {
    setState(f, S_IDLE);
    f.grabbedBy = -1;
    return;
  }
  if (m.grab.tech && f.grabT <= 8 && press & (LP | LK) && raw & LP && raw & LK) {
    setState(f, S_TECH);
    setState(a, S_TECH);
    f.vx = -f.facing * px(4);
    a.vx = -a.facing * px(4);
    f.grabbedBy = -1;
    s.events.push({ t: 'tech', p: i, x: (f.x + a.x) >> 1, y: px(50) });
    return;
  }
  f.x = a.x + a.facing * px(24);
  if (f.grabT >= m.grab.frames) {
    applyThrowDamage(s, f.grabbedBy, m);
  }
}

export function applyThrowDamage(s: SimState, ai: number, m: CMove): void {
  const a = s.f[ai];
  const d = s.f[1 - ai];
  const g = m.grab!;
  const dmg = a.buff > 0 ? Math.floor((g.dmg * 5) / 4) : g.dmg;
  d.hp -= dmg;
  d.lastDmgFrame = s.frame;
  d.combo = 1;
  d.grabbedBy = -1;
  setState(d, S_AIRHIT);
  d.y = px(1);
  d.vy = px(5);
  d.vx = a.facing * px(g.toss ?? 4);
  d.facing = -a.facing;
  addMeter(a, Math.floor(dmg / 3));
  addMeter(d, Math.floor(dmg / 6));
  s.events.push({ t: 'throw', p: 1 - ai, x: d.x, y: px(50), k: 1 });
}

export { addMeter };
