import { ROSTER } from '../content/roster.ts';
import type { CharacterDef, MoveDef } from '../content/types.ts';
import { HK, HP, KICKS, LK, LP, PUNCHES, type Motion } from './input.ts';
import { px } from './fixed.ts';

export interface CMove extends MoveDef {
  key: string;
  idx: number;
  total: number;
  nHits: number;
  fvel: [number, number, number, number | null][];
}

export interface CSpecial { motion: Motion; mask: number; move: number; simple: string; ex: boolean }

export interface CChar {
  def: CharacterDef;
  moves: CMove[];
  idx: Record<string, number>;
  normals: { s: number[]; c: number[]; j: number[] }; // indexed by button order HK,HP,LK,LP
  throwIdx: number;
  specials: CSpecial[];
  superIdx: number;
  walkF: number; walkB: number; jumpV: number; jumpX: number; g: number;
  dashF: number; dashB: number; h: number; w: number;
}

const PRIORITY: Record<string, number> = { '623': 0, '236236': 1, '[2]8': 2, '[4]6': 3, '214': 4, '236': 5 };
export const BTN_ORDER = [HK, HP, LK, LP];

function compile(def: CharacterDef): CChar {
  const keys = Object.keys(def.moves);
  const moves: CMove[] = keys.map((key, idx) => {
    const m = def.moves[key];
    const total = m.startup + m.active + m.recovery;
    return {
      ...m,
      key,
      idx,
      total,
      nHits: m.hits ?? 1,
      fvel: (m.vel ?? []).map(([a, b, vx, vy]) => [a, b, px(vx), vy === undefined || Number.isNaN(vy) ? null : px(vy)]),
    };
  });
  const idx: Record<string, number> = {};
  moves.forEach((m) => (idx[m.key] = m.idx));
  const need = (k: string) => {
    if (idx[k] === undefined) throw new Error(`${def.id}: missing move ${k}`);
    return idx[k];
  };
  return {
    def,
    moves,
    idx,
    normals: {
      s: [need('sHK'), need('sHP'), need('sLK'), need('sLP')],
      c: [need('cHK'), need('cHP'), need('cLK'), need('cLP')],
      j: [need('jK'), need('jP'), need('jK'), need('jP')],
    },
    throwIdx: need('throw'),
    specials: def.specials
      .map((s) => ({ motion: s.motion, mask: s.btn === 'P' ? PUNCHES : KICKS, move: need(s.move), simple: s.simple, ex: s.ex !== false }))
      .sort((a, b) => PRIORITY[a.motion] - PRIORITY[b.motion]),
    superIdx: need(def.superMove),
    walkF: px(def.walkF), walkB: px(def.walkB), jumpV: px(def.jumpV), jumpX: px(def.jumpX), g: px(def.gravity),
    dashF: px(def.dashF), dashB: px(def.dashB), h: def.height, w: def.width,
  };
}

export const CHARS: CChar[] = ROSTER.map(compile);
export { LP, HP, LK, HK };
