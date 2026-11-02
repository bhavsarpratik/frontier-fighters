import { CHARS } from './data.ts';
import { resolveCombat } from './combat.ts';
import { MAX_METER, ROUND_FRAMES, STAGE_W, px } from './fixed.ts';
import { newFighter, setState, updateFighter } from './fighter.ts';
import {
  P_FIGHT, P_INTRO, P_KO, P_MATCH_END, S_AIRHIT, S_HITSTUN, S_IDLE, S_KO, S_KNOCKDOWN, S_WIN,
  type SimState,
} from './types.ts';

export const INTRO_FRAMES = 100;
export const FIGHT_CALL = 66;
export const KO_FRAMES = 190;
export const ROUNDS_TO_WIN = 2;

export interface MatchOpts { p1: number; p2: number; stage: number; seed: number; mode?: 'versus' | 'training' }

export function createMatch(o: MatchOpts): SimState {
  const s: SimState = {
    frame: 0, seed: o.seed >>> 0 || 1, mode: o.mode === 'training' ? 1 : 0, stage: o.stage,
    phase: P_INTRO, phaseT: 0, round: 1, timer: ROUND_FRAMES,
    freeze: 0, freezeOwner: -1, slow: 0,
    roundWinner: -1, matchWinner: -1, timeUp: 0,
    f: [newFighter(o.p1, STAGE_W / 2 - 70, 1), newFighter(o.p2, STAGE_W / 2 + 70, -1)],
    proj: [], nextId: 1, events: [],
  };
  if (s.mode === 1) {
    s.phase = P_FIGHT;
    for (const f of s.f) setState(f, S_IDLE);
  }
  return s;
}

function resetRound(s: SimState): void {
  for (let i = 0; i < 2; i++) {
    const old = s.f[i];
    const nf = newFighter(old.char, STAGE_W / 2 + (i === 0 ? -70 : 70), i === 0 ? 1 : -1);
    nf.meter = old.meter;
    nf.wins = old.wins;
    nf.rehired = old.rehired;
    s.f[i] = nf;
  }
  s.proj = [];
  s.timer = ROUND_FRAMES;
  s.phase = P_INTRO;
  s.phaseT = 0;
  s.roundWinner = -1;
  s.timeUp = 0;
  s.round++;
}

function endRound(s: SimState, timeUp: boolean): void {
  const [a, b] = s.f;
  let w: number;
  if (timeUp) {
    const ra = Math.floor((Math.max(0, a.hp) * 1000) / CHARS[a.char].def.hp);
    const rb = Math.floor((Math.max(0, b.hp) * 1000) / CHARS[b.char].def.hp);
    w = ra > rb ? 0 : rb > ra ? 1 : 2;
    s.events.push({ t: 'timeup', p: -1 });
  } else {
    w = a.hp <= 0 && b.hp <= 0 ? 2 : a.hp <= 0 ? 1 : 0;
    s.events.push({ t: 'ko', p: w === 2 ? -1 : 1 - w });
  }
  for (let i = 0; i < 2; i++) {
    const f = s.f[i];
    if (f.hp <= 0 && f.state !== S_AIRHIT && f.state !== S_KO) {
      setState(f, S_AIRHIT);
      f.y = Math.max(f.y, px(1));
      f.vy = px(4);
      f.vx = -f.facing * px(2);
    }
  }
  s.roundWinner = w;
  s.timeUp = timeUp ? 1 : 0;
  s.phase = P_KO;
  s.phaseT = 0;
  if (w === 0 || w === 2) a.wins++;
  if (w === 1 || w === 2) b.wins++;
  if (w < 2 && s.f[w].hp === CHARS[s.f[w].char].def.hp) s.events.push({ t: 'perfect', p: w });
}

export function step(s: SimState, i1: number, i2: number): void {
  s.events.length = 0;
  s.frame++;
  if (s.freeze > 0) {
    s.freeze--;
    return;
  }
  const inputs = [i1, i2];
  switch (s.phase) {
    case P_INTRO: {
      s.phaseT++;
      if (s.phaseT === 1) s.events.push({ t: 'round', p: -1, k: s.round });
      if (s.phaseT === FIGHT_CALL) s.events.push({ t: 'fight', p: -1 });
      updateFighter(s, 0, 0);
      updateFighter(s, 1, 0);
      if (s.phaseT >= INTRO_FRAMES) {
        s.phase = P_FIGHT;
        s.phaseT = 0;
        for (const f of s.f) setState(f, S_IDLE);
      }
      break;
    }
    case P_FIGHT: {
      s.phaseT++;
      updateFighter(s, 0, inputs[0]);
      updateFighter(s, 1, inputs[1]);
      resolveCombat(s);
      if (s.mode === 1) {
        training(s);
        break;
      }
      for (let i = 0; i < 2; i++) {
        const f = s.f[i];
        if (f.hp <= 0 && CHARS[f.char].def.passive === 'rehired' && !f.rehired) {
          f.rehired = 1;
          f.hp = Math.floor(CHARS[f.char].def.hp / 10);
          f.inv = 60;
          s.events.push({ t: 'rehired', p: i });
        }
      }
      if (s.f[0].hp <= 0 || s.f[1].hp <= 0) endRound(s, false);
      else if (--s.timer <= 0) endRound(s, true);
      break;
    }
    case P_KO: {
      s.phaseT++;
      const slow = s.phaseT < 60 && s.phaseT % 2 === 1;
      if (!slow) {
        updateFighter(s, 0, 0);
        updateFighter(s, 1, 0);
        resolveCombat(s);
      }
      if (s.phaseT === 110) {
        const w = s.roundWinner;
        for (let i = 0; i < 2; i++) {
          const f = s.f[i];
          if ((w === i || w === 2 && f.hp > 0) && f.hp > 0) {
            setState(f, S_WIN);
            f.vx = 0;
          }
        }
        if (w < 2) s.events.push({ t: 'win', p: w });
      }
      if (s.phaseT >= KO_FRAMES) {
        const [a, b] = s.f;
        if (a.wins >= ROUNDS_TO_WIN || b.wins >= ROUNDS_TO_WIN) {
          s.phase = P_MATCH_END;
          s.phaseT = 0;
          s.matchWinner = a.wins >= ROUNDS_TO_WIN && b.wins >= ROUNDS_TO_WIN ? 2 : a.wins >= ROUNDS_TO_WIN ? 0 : 1;
        } else {
          resetRound(s);
        }
      }
      break;
    }
    case P_MATCH_END:
      s.phaseT++;
      updateFighter(s, 0, 0);
      updateFighter(s, 1, 0);
      break;
  }
}

function training(s: SimState): void {
  for (const f of s.f) {
    const max = CHARS[f.char].def.hp;
    if (f.hp <= 0) f.hp = 1;
    if (s.frame - f.lastDmgFrame > 70 && f.state !== S_HITSTUN && f.state !== S_AIRHIT && f.state !== S_KNOCKDOWN) {
      f.hp = max;
    }
    f.meter = MAX_METER;
  }
}

export function cloneState(s: SimState): SimState {
  return structuredClone(s);
}

export function hashState(s: SimState): number {
  const str = JSON.stringify(s, (k, v) => (k === 'events' ? undefined : v));
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

