import type { Motion } from '../sim/input.ts';

// Boxes are in pixels, x measured forward from the fighter origin, y up from the feet.
export interface Box { x: number; y: number; w: number; h: number }

export type Level = 'high' | 'mid' | 'low' | 'overhead';

export type ProjKind =
  | 'chalk' | 'orb' | 'bigorb' | 'box' | 'zombie' | 'spud' | 'labeler' | 'gpu'
  | 'beam' | 'pr' | 'cloud' | 'rocket' | 'wave';

export interface ProjDef {
  kind: ProjKind;
  frame: number;          // move frame on which it spawns
  x: number; y: number;   // spawn offset (px, forward/up)
  vx: number; vy?: number; // px/frame
  gravity?: number;       // px/frame^2
  w: number; h: number;
  life: number;
  hits?: number;
  hitGap?: number;
  dmg: number;
  hitstun?: number;
  blockstun?: number;
  level?: Level;
  freeze?: number;        // extra hitstun as "frozen"
  launch?: number;
  kd?: boolean;
  count?: number;         // spawn several (rain / swarm)
  spread?: number;        // px between spawned copies
  atOpponent?: boolean;   // spawn above the opponent instead of at self
}

export type MoveFx =
  | 'counter' | 'teleport' | 'buff' | 'cmdgrab' | 'meter' | 'warp-behind';

export interface MoveDef {
  anim: string;
  name?: string;
  startup: number;
  active: number;
  recovery: number;
  dmg: number;
  chip?: number;
  hitstun: number;
  blockstun: number;
  hitstop?: number;
  push?: number;          // px pushback on hit/block
  level?: Level;
  hit?: Box;
  hits?: number;
  hitGap?: number;
  kd?: boolean;
  launch?: number;        // px/frame vertical launch on hit
  juggle?: boolean;
  vel?: [number, number, number, number?][]; // [fromFrame, toFrame, vx, vy?] px/frame (vy omitted = untouched)
  air?: boolean;
  cancel?: 0 | 1 | 2;     // 1: special+super cancellable, 2: super only
  chain?: boolean;        // light chain into itself
  inv?: [number, number];
  armor?: number;
  proj?: ProjDef;
  grab?: { range: number; dmg: number; tech: boolean; frames: number; toss?: number };
  cost?: number;
  isSuper?: boolean;
  fx?: MoveFx;
  fxArg?: number;
  gravity?: boolean;      // apply gravity during move (airborne specials)
  sfx?: 'light' | 'heavy' | 'special' | 'super';
}

export interface SpecialInput {
  motion: Motion;
  btn: 'P' | 'K';
  move: string;
  simple: 'n' | 'f' | 'd' | 'b';
  ex?: boolean;
}

export type HairStyle = 'short' | 'curly' | 'swept' | 'buzz' | 'messy' | 'side' | 'none';
export type TopStyle = 'tee' | 'hoodie' | 'jacket' | 'sweater' | 'suit' | 'turtleneck';

export interface Look {
  skin: string; hair: string; top: string; top2: string; pants: string; shoes: string; accent: string;
  hairStyle: HairStyle;
  topStyle: TopStyle;
  height: number; bulk: number;
  head?: 'normal' | 'potato';
  beard?: boolean;
  glasses?: boolean;
  shades?: boolean;
  chain?: boolean;
  visor?: string;
  emblem?: 'rocket' | 'chip' | 'box' | 'none';
  palette2?: Partial<Look>;
}

export interface CharacterDef {
  id: string;
  name: string;
  short: string;
  title: string;
  archetype: string;
  inspired: string;
  hp: number;
  walkF: number; walkB: number;
  jumpV: number; jumpX: number; gravity: number;
  dashF: number; dashB: number;
  height: number; width: number;
  look: Look;
  moves: Record<string, MoveDef>;
  specials: SpecialInput[];
  superMove: string;
  passive?: 'rehired';
  quotes: string[];
  stage: number;
}
