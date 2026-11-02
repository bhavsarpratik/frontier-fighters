export const FX = 256;

export const px = (v: number): number => Math.round(v * FX);

export const toPx = (v: number): number => Math.floor(v / FX);

export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

export const STAGE_W = 720;
export const SCREEN_W = 480;
export const SCREEN_H = 270;
export const STAGE_MARGIN = 20;
export const MAX_SEPARATION = 400;
export const ROUND_FRAMES = 60 * 60;
export const MAX_METER = 300;
export const BAR = 100;
