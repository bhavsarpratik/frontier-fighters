export const S_IDLE = 0;
export const S_WALK = 1;
export const S_CROUCH = 2;
export const S_JUMPSQUAT = 3;
export const S_AIR = 4;
export const S_LAND = 5;
export const S_DASH = 6;
export const S_ATTACK = 7;
export const S_HITSTUN = 8;
export const S_BLOCKSTUN = 9;
export const S_AIRHIT = 10;
export const S_KNOCKDOWN = 11;
export const S_GETUP = 12;
export const S_THROWN = 13;
export const S_KO = 14;
export const S_WIN = 15;
export const S_INTRO = 16;
export const S_TECH = 17;

export const P_INTRO = 0;
export const P_FIGHT = 1;
export const P_KO = 2;
export const P_MATCH_END = 3;

export interface FighterState {
  char: number;
  x: number; y: number; vx: number; vy: number;
  facing: number;
  hp: number; meter: number;
  state: number; sf: number;
  move: number; mf: number;
  hitsDone: number; nextHit: number; connected: number;
  ex: number;
  stun: number;
  crouchHit: number;
  hitstop: number;
  combo: number; comboHits: number; juggle: number;
  hist: number[];
  prev: number;
  chargeB: number; chargeD: number; chargeBOk: number; chargeDOk: number;
  inv: number;
  armor: number;
  airUsed: number;
  dashDir: number;
  grabbedBy: number; grabT: number;
  wins: number;
  rehired: number;
  buff: number;
  frozen: number;
  lastDmgFrame: number;
  dir: number;
  buf: number; bufT: number;
  jumpDir: number;
}

export interface Projectile {
  id: number;
  owner: number;
  kind: string;
  x: number; y: number; vx: number; vy: number; g: number;
  w: number; h: number;
  life: number; age: number;
  hits: number; gap: number; cd: number;
  dmg: number; hitstun: number; blockstun: number;
  level: string;
  freeze: number; launch: number; kd: number;
  facing: number;
  isSuper: number;
}

export interface SimEvent {
  t: 'hit' | 'block' | 'whiff' | 'jump' | 'land' | 'special' | 'super' | 'ko' | 'round' | 'fight'
    | 'win' | 'throw' | 'tech' | 'proj' | 'clash' | 'armor' | 'counter' | 'rehired' | 'timeup'
    | 'perfect' | 'buff' | 'teleport' | 'dash' | 'knockdown';
  p: number;
  x?: number; y?: number;
  k?: number;
  s?: string;
}

export interface SimState {
  frame: number;
  seed: number;
  mode: number; // 0 versus, 1 training
  stage: number;
  phase: number; phaseT: number;
  round: number;
  timer: number;
  freeze: number; freezeOwner: number;
  slow: number;
  roundWinner: number;  // -1 none, 0/1, 2 draw
  matchWinner: number;
  timeUp: number;
  f: FighterState[];
  proj: Projectile[];
  nextId: number;
  events: SimEvent[];
}
