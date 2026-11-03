// Everything is synthesized at runtime: layered SFX through a shared room reverb,
// a synthwave sequencer, and the browser's speech voice as the announcer.
import type { SimEvent } from '../sim/types.ts';
import { FX, STAGE_W } from '../sim/fixed.ts';

let ac: AudioContext | null = null;
let master: GainNode;
let musicBus: GainNode;
let sfxBus: GainNode;
let reverb: ConvolverNode;
let revSend: GainNode;
let noiseBuf: AudioBuffer;
let shaper: WaveShaperNode;
let muted = typeof location !== 'undefined' && (new URLSearchParams(location.search).has('mute') || localStorage.getItem('ff-muted') === '1');
const MASTER = 0.8;

export function audioReady(): boolean {
  return !!ac;
}

function makeImpulse(ctx: AudioContext, secs: number, decay: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * secs);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      // darker as it decays, like a real room
      const k = 0.35 + 0.6 * (1 - i / len);
      lp = lp + k * ((Math.random() * 2 - 1) - lp);
      d[i] = lp * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

export function unlockAudio(): void {
  if (ac) {
    if (ac.state === 'suspended') void ac.resume();
    return;
  }
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  ac = new Ctor();
  master = ac.createGain();
  master.gain.value = muted ? 0 : MASTER;
  const warm = ac.createBiquadFilter();
  warm.type = 'highshelf';
  warm.frequency.value = 9000;
  warm.gain.value = -4;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 10;
  comp.ratio.value = 4;
  comp.attack.value = 0.004;
  comp.release.value = 0.18;
  master.connect(warm).connect(comp).connect(ac.destination);

  reverb = ac.createConvolver();
  reverb.buffer = makeImpulse(ac, 2.2, 3.2);
  revSend = ac.createGain();
  revSend.gain.value = 0.9;
  const revOut = ac.createGain();
  revOut.gain.value = 0.35;
  revSend.connect(reverb).connect(revOut).connect(master);

  musicBus = ac.createGain();
  musicBus.gain.value = 0.2;
  musicBus.connect(master);
  sfxBus = ac.createGain();
  sfxBus.gain.value = 0.95;
  sfxBus.connect(master);

  noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  shaper = ac.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * 6);
  }
  shaper.curve = curve;
  shaper.connect(sfxBus);
}

export function toggleMute(): boolean {
  muted = !muted;
  localStorage.setItem('ff-muted', muted ? '1' : '0');
  if (ac) master.gain.value = muted ? 0 : MASTER;
  if (muted && 'speechSynthesis' in window) speechSynthesis.cancel();
  return muted;
}

// ---------- building blocks ----------

let curPan = 0;
const rnd = (a: number) => 1 + (Math.random() * 2 - 1) * a;

interface Out { node: AudioNode }
// A per-sound output: optional stereo pan and a reverb send amount.
function out(rev = 0.15, bus: GainNode = sfxBus, pan = curPan): Out {
  const g = ac!.createGain();
  if (ac!.createStereoPanner && pan) {
    const p = ac!.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    g.connect(p).connect(bus);
  } else g.connect(bus);
  if (rev > 0) {
    const s = ac!.createGain();
    s.gain.value = rev;
    g.connect(s).connect(revSend);
  }
  return { node: g };
}

function shape(g: GainNode, t: number, att: number, vol: number, dur: number): void {
  g.gain.setValueAtTime(0.0001, t);
  if (att > 0.003) g.gain.linearRampToValueAtTime(vol, t + att);
  else g.gain.exponentialRampToValueAtTime(vol, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + att + dur);
}

interface OscOpt { to?: number; att?: number; dest?: Out; at?: number; detune?: number; lp?: number; lpTo?: number; q?: number }
function osc(freq: number, type: OscillatorType, dur: number, vol: number, o: OscOpt = {}): void {
  if (!ac) return;
  const t = ac.currentTime + (o.at ?? 0);
  const att = o.att ?? 0.002;
  const v = ac.createOscillator();
  v.type = type;
  v.frequency.setValueAtTime(freq, t);
  if (o.detune) v.detune.value = o.detune;
  if (o.to) v.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + att + dur * 0.8);
  const g = ac.createGain();
  shape(g, t, att, vol, dur);
  let src: AudioNode = v;
  if (o.lp) {
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(o.lp, t);
    if (o.lpTo) f.frequency.exponentialRampToValueAtTime(o.lpTo, t + att + dur);
    f.Q.value = o.q ?? 0.7;
    v.connect(f);
    src = f;
  }
  src.connect(g).connect((o.dest ?? out()).node);
  v.start(t);
  v.stop(t + att + dur + 0.05);
}

interface NzOpt { type?: BiquadFilterType; freq?: number; to?: number; q?: number; att?: number; dest?: Out | 'shaper'; at?: number }
function nz(dur: number, vol: number, o: NzOpt = {}): void {
  if (!ac) return;
  const t = ac.currentTime + (o.at ?? 0);
  const att = o.att ?? 0.001;
  const s = ac.createBufferSource();
  s.buffer = noiseBuf;
  const f = ac.createBiquadFilter();
  f.type = o.type ?? 'bandpass';
  f.frequency.setValueAtTime(o.freq ?? 1000, t);
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + att + dur);
  f.Q.value = o.q ?? 0.8;
  const g = ac.createGain();
  shape(g, t, att, vol, dur);
  const dest = o.dest === 'shaper' ? shaper : (o.dest ?? out()).node;
  s.connect(f).connect(g).connect(dest);
  s.start(t, Math.random() * Math.max(0, 1.9 - att - dur));
  s.stop(t + att + dur + 0.05);
}

// Inharmonic partials read as metal: guard clangs, counters, "shing".
function bell(freq: number, dur: number, vol: number, dest: Out, at = 0): void {
  for (const [r, v] of [[1, 1], [2.76, 0.5], [5.4, 0.25], [8.93, 0.12]] as const) osc(freq * r, 'sine', dur / r ** 0.3, vol * v, { dest, at });
}

// ---------- sound effects ----------

const sfxRaw = {
  hit(k: number) {
    const heavy = k >= 1;
    const p = rnd(0.06);
    const o = out(heavy ? 0.22 : 0.1);
    nz(0.012, 0.55, { type: 'highpass', freq: 3000, dest: o });
    nz(heavy ? 0.13 : 0.07, heavy ? 0.85 : 0.65, { freq: (heavy ? 900 : 1500) * p, q: 0.9, dest: o });
    osc((heavy ? 150 : 190) * p, 'sine', heavy ? 0.22 : 0.11, heavy ? 1 : 0.7, { to: heavy ? 42 : 60, dest: o });
    if (heavy) nz(0.16, 0.32, { type: 'lowpass', freq: 2600, to: 600, dest: 'shaper' });
    if (k === 2) {
      osc(62, 'sine', 0.5, 0.9, { to: 30, dest: out(0.45) });
      nz(0.4, 0.4, { type: 'lowpass', freq: 1200, to: 200, dest: out(0.5) });
    }
  },
  block() {
    const o = out(0.12);
    osc(210 * rnd(0.05), 'sine', 0.07, 0.55, { to: 120, dest: o });
    nz(0.05, 0.4, { freq: 2400, q: 1.6, dest: o });
    nz(0.04, 0.14, { type: 'highpass', freq: 5000, dest: o });
  },
  whoosh() {
    nz(0.16, 0.6, { freq: 380, to: 2000, q: 0.9, att: 0.035, dest: out(0.08) });
  },
  jump() {
    const o = out(0.05);
    nz(0.1, 0.32, { freq: 500, to: 1600, q: 0.8, att: 0.02, dest: o });
    nz(0.035, 0.3, { type: 'lowpass', freq: 900, dest: o });
  },
  land() {
    const o = out(0.06);
    osc(110, 'sine', 0.1, 0.45, { to: 48, dest: o });
    nz(0.06, 0.25, { type: 'lowpass', freq: 600, dest: o });
  },
  knockdown() {
    const o = out(0.3);
    osc(95, 'sine', 0.38, 0.95, { to: 34, dest: o });
    nz(0.26, 0.55, { type: 'lowpass', freq: 800, to: 180, dest: o });
    osc(80, 'sine', 0.16, 0.4, { to: 40, dest: o, at: 0.13 });
    nz(0.1, 0.25, { type: 'lowpass', freq: 700, dest: o, at: 0.13 });
  },
  proj() {
    const o = out(0.25);
    nz(0.28, 0.32, { freq: 300, to: 3200, q: 1.2, att: 0.02, dest: o });
    osc(220, 'sawtooth', 0.3, 0.1, { detune: -8, lp: 400, lpTo: 3200, dest: o });
    osc(220, 'sawtooth', 0.3, 0.1, { detune: 8, lp: 400, lpTo: 3200, dest: o });
    osc(85, 'sine', 0.2, 0.45, { to: 55, dest: o });
  },
  special() {
    const o = out(0.35);
    nz(0.22, 0.22, { type: 'highpass', freq: 2500, to: 7000, att: 0.03, dest: o });
    bell(740 * rnd(0.03), 0.5, 0.07, o, 0.02);
  },
  superStart() {
    const o = out(0.55);
    osc(58, 'sine', 0.9, 1, { to: 28, dest: o });
    nz(0.5, 0.5, { type: 'lowpass', freq: 1500, to: 150, dest: o });
    const r = out(0.5);
    nz(0.85, 0.42, { freq: 200, to: 6000, q: 1.4, att: 0.7, dest: r });
    for (const f of [55, 82.4, 110, 164.8]) {
      osc(f, 'sawtooth', 0.55, 0.06, { att: 0.5, lp: 200, lpTo: 4000, detune: Math.random() * 14 - 7, dest: r });
    }
    bell(1320, 1.2, 0.06, r, 0.75);
  },
  ko() {
    const o = out(0.7, sfxBus, 0);
    osc(72, 'sine', 1.5, 1, { to: 24, dest: o });
    nz(0.012, 0.8, { type: 'highpass', freq: 2500, dest: o });
    nz(0.9, 0.65, { type: 'lowpass', freq: 1100, to: 120, dest: o });
    nz(0.25, 0.4, { type: 'lowpass', freq: 3000, to: 500, dest: 'shaper' });
    for (const f of [110, 130.8, 164.8, 220]) {
      osc(f, 'sawtooth', 1.6, 0.05, { att: 0.02, lp: 1600, lpTo: 220, detune: Math.random() * 12 - 6, dest: o });
    }
  },
  menu() {
    const o = out(0.06, sfxBus, 0);
    osc(1700, 'sine', 0.03, 0.13, { dest: o });
    nz(0.012, 0.09, { type: 'highpass', freq: 6000, dest: o });
  },
  confirm() {
    const o = out(0.25, sfxBus, 0);
    osc(880, 'sine', 0.2, 0.12, { dest: o });
    osc(1760, 'sine', 0.1, 0.04, { dest: o });
    osc(1320, 'sine', 0.26, 0.11, { dest: o, at: 0.07 });
    osc(2640, 'sine', 0.12, 0.035, { dest: o, at: 0.07 });
  },
  back() {
    osc(560, 'sine', 0.12, 0.17, { to: 420, dest: out(0.12, sfxBus, 0) });
  },
  counter() {
    const o = out(0.4);
    bell(1500, 0.7, 0.1, o);
    nz(0.12, 0.3, { freq: 600, to: 2600, att: 0.02, dest: o });
  },
  throwSfx() {
    const o = out(0.15);
    nz(0.16, 0.42, { freq: 650, q: 0.8, att: 0.02, dest: o });
    osc(130, 'sine', 0.22, 0.65, { to: 45, dest: o, at: 0.08 });
  },
  tech() {
    const o = out(0.2);
    nz(0.03, 0.4, { freq: 3200, q: 4, dest: o });
    nz(0.03, 0.35, { freq: 2600, q: 4, dest: o, at: 0.06 });
    bell(1100, 0.3, 0.05, o, 0.02);
  },
};

// Audio stays locked until the first key press; sounds before that are dropped.
export const sfx = Object.fromEntries(
  Object.entries(sfxRaw).map(([k, fn]) => [k, (...a: unknown[]) => { if (ac) (fn as (...x: unknown[]) => void)(...a); }]),
) as typeof sfxRaw;

// ---------- announcer ----------

let voice: SpeechSynthesisVoice | null = null;
const PREFERRED = [/Google UK English Male/i, /Daniel/i, /Arthur/i, /Aaron/i, /Alex\b/i, /Google US English/i, /Fred/i];
export function announce(text: string, rate = 1): void {
  if (muted || !('speechSynthesis' in window)) return;
  const synth = window.speechSynthesis;
  if (!voice) {
    const vs = synth.getVoices().filter((v) => /^en/i.test(v.lang));
    for (const re of PREFERRED) {
      voice = vs.find((v) => re.test(v.name)) ?? null;
      if (voice) break;
    }
    voice ??= vs[0] ?? null;
  }
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  u.rate = Math.min(1.05, rate * 0.9);
  u.pitch = 0.82;
  u.volume = 1;
  synth.speak(u);
}

export function playEvents(evs: SimEvent[], names: string[]): void {
  for (const e of evs) {
    curPan = e.x !== undefined ? ((e.x / FX - STAGE_W / 2) / (STAGE_W / 2)) * 0.6 : 0;
    switch (e.t) {
      case 'hit': sfx.hit(e.k ?? 0); break;
      case 'block': sfx.block(); break;
      case 'jump': sfx.jump(); break;
      case 'land': sfx.land(); break;
      case 'dash': sfx.whoosh(); break;
      case 'proj': sfx.proj(); break;
      case 'special': sfx.special(); break;
      case 'super': sfx.superStart(); announce(e.s ?? 'super', 1.05); break;
      case 'ko': sfx.ko(); announce('K.O.', 0.85); break;
      case 'timeup': sfx.ko(); announce('Time!', 0.9); break;
      case 'round': announce(`Round ${e.k}`, 0.95); break;
      case 'fight': announce('Fight!', 1.05); sfx.hit(1); break;
      case 'win': if (e.p >= 0) announce(`${names[e.p]} wins`, 0.95); break;
      case 'perfect': announce('Perfect!', 0.9); break;
      case 'counter': sfx.counter(); break;
      case 'throw': sfx.throwSfx(); break;
      case 'tech': sfx.tech(); break;
      case 'armor': sfx.block(); break;
      case 'clash': sfx.counter(); break;
      case 'knockdown': sfx.knockdown(); break;
      case 'rehired': announce('Fired? Rehired!', 1.0); break;
      case 'buff': announce('Hardcore mode', 1.0); break;
      case 'teleport': sfx.whoosh(); break;
    }
    curPan = 0;
  }
}

// ---------- music: 90s arcade-fighter band, 8-bar songs (A + B sections, fill on the last bar) ----------

interface Song {
  bpm: number;
  chords: string[];      // one per bar, 8 bars
  lead: string;          // 8 bars of 16 steps, bars split by '|'; '.' rest, '-' hold
  bass: string;          // 16 steps: R root, O octave (slapped), 5 fifth, '.' rest
  stabs: string;         // 16 steps: 'x' brass stab
  drums: string;         // 16 steps: k s h o (open hat)
  fill: string;          // drum pattern for bar 8: adds t m l toms
}

const SONGS: Song[] = [
  { // 0 GPU DATACENTER: driving A minor
    bpm: 150, chords: ['Am', 'G', 'F', 'E', 'Dm', 'Am', 'F', 'E'],
    lead: 'A4 . C5 . E5 - D5 C5 D5 - C5 . A4 - - .|G4 . B4 . D5 - C5 B4 C5 - B4 . G4 - - .|F4 . A4 . C5 - D5 E5 F5 - E5 . D5 . C5 .|B4 - - - G#4 - B4 - E5 - - - D#5 . E5 .'
      + '|D5 - F5 - A5 - - - G5 F5 E5 - D5 - - -|C5 - E5 - A5 - - - G5 E5 C5 - A4 - - -|A4 - C5 - F5 - - - E5 D5 C5 - A4 - C5 -|B4 - E5 - G#5 - - - B5 - - - A5 - G#5 -',
    bass: 'R . O R . O R . R . O R . O 5 .', stabs: 'x . . . . . x . . . . . x . . .',
    drums: 'k . h . s . h k k . h . s . h h', fill: 'k . h . s . s s t t m m l l s s' },
  { // 1 SF ROOFTOP: heroic D major
    bpm: 140, chords: ['D', 'Bm', 'G', 'A', 'G', 'A', 'Bm', 'A'],
    lead: 'F#5 - - . E5 . D5 . A4 - - - D5 - E5 -|F#5 - - . E5 . D5 . B4 - - - D5 - F#5 -|G5 - - . F#5 . E5 . D5 - - - B4 - D5 -|E5 - - - - - C#5 - A4 - - - - - - -'
      + '|B5 - - - A5 - G5 - F#5 - G5 - A5 - - -|C#6 - - - B5 - A5 - E5 - F#5 - G5 - - -|F#5 - - - D5 - F#5 - B5 - - - A5 - F#5 -|E5 - - - A5 - - - C#6 - - - E6 - - -',
    bass: 'R . . R O . R . R . . R O . 5 .', stabs: '. . x . . . x . . . x . . x . .',
    drums: 'k . . h s . h . k . k . s . h h', fill: 'k . . h s . h . t . m . l . s s' },
  { // 2 LABELING WAREHOUSE: funky E minor
    bpm: 122, chords: ['Em7', 'Am7', 'Em7', 'B7', 'C', 'D', 'Em', 'B7'],
    lead: 'E5 . . G5 . . E5 . D5 . B4 . . . . .|A4 . . C5 . . E5 . D5 . C5 . . . A4 .|E5 . . G5 . . B5 . A5 . G5 . E5 . . .|F#5 . . A5 . . F#5 . D#5 . B4 . . . . .'
      + '|G5 - - - E5 - G5 - C6 - - - B5 . G5 .|A5 - - - F#5 - A5 - D6 - - - C6 . A5 .|B5 - - - G5 - E5 - G5 - B5 - E6 - - -|D#6 - - - B5 - F#5 - D#5 - - - B4 - - -',
    bass: 'R . O . . R . O . R O . R . 5 O', stabs: '. . . x . . x . . . . x . . x .',
    drums: 'k . . h s . h k k . k h s . h .', fill: 'k . . h s . h k t t m m l . s s' },
  { // 3 THE RESET QUEUE: tense C# minor
    bpm: 132, chords: ['C#m', 'A', 'B', 'G#', 'F#m', 'C#m', 'D', 'G#'],
    lead: 'C#5 . C#5 . E5 . C#5 . G#5 - - - F#5 . E5 .|C#5 . C#5 . E5 . A5 . G#5 - - - E5 . C#5 .|D#5 . D#5 . F#5 . B5 . A5 - - - F#5 . D#5 .|C5 - - - D#5 - - - G#5 - - - C6 - - -'
      + '|A5 - - - G#5 - F#5 - C#5 - - - F#5 - A5 -|G#5 - - - E5 - C#5 - G#4 - - - C#5 - E5 -|F#5 - - - E5 - D5 - A4 - - - D5 - F#5 -|G#5 - - - - - - - C6 - - - D#6 - - -',
    bass: 'R R . R O . R . R R . R O . 5 O', stabs: 'x . . . x . . . x . . . x . . .',
    drums: 'k . h . s . . h k . h . s . h s', fill: 'k . h . s . s . t . m . l l s s' },
  { // 4 TITLE / SELECT: C minor anthem
    bpm: 128, chords: ['Cm', 'Ab', 'Bb', 'G', 'Ab', 'Bb', 'Cm', 'G'],
    lead: 'G4 - - . C5 - D5 - Eb5 - - - D5 - C5 -|C5 - - . Eb5 - F5 - G5 - - - F5 - Eb5 -|D5 - - . F5 - G5 - Bb5 - - - Ab5 - G5 -|G5 - - - F5 - Eb5 - D5 - - - B4 - - -'
      + '|Eb5 - C5 - Eb5 - Ab5 - G5 - - - F5 - Eb5 -|F5 - D5 - F5 - Bb5 - Ab5 - - - G5 - F5 -|G5 - - - Eb5 - - - C6 - - - Bb5 - G5 -|B5 - - - - - - - D6 - - - B5 - G5 -',
    bass: 'R . R O . R O . R . R O . 5 O .', stabs: 'x . . x . . x . . . x . x . . .',
    drums: 'k . h . s . h k k . h . s . h o', fill: 'k . h . s . h k t . t m m l s s' },
];

const NOTE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function midi(tok: string): number {
  const m = /^([A-G])(#|b)?(\d)$/.exec(tok);
  if (!m) return 0;
  return 12 * (Number(m[3]) + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
function chordTones(name: string): { root: number; tones: number[] } {
  const m = /^([A-G])(#|b)?(m7|m|7)?$/.exec(name)!;
  const root = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const q = m[3] ?? '';
  const iv = q === 'm' ? [0, 3, 7] : q === 'm7' ? [0, 3, 7, 10] : q === '7' ? [0, 4, 7, 10] : [0, 4, 7];
  return { root: (root + 12) % 12, tones: iv };
}
// Lead line as [midi, lengthInSteps] events per step index.
function parseLead(s: string): (number[] | null)[] {
  const toks = s.split('|').flatMap((b) => b.trim().split(/\s+/));
  const out: (number[] | null)[] = toks.map(() => null);
  for (let i = 0; i < toks.length; i++) {
    const n = midi(toks[i]);
    if (!n) continue;
    let len = 1;
    while (toks[i + len] === '-') len++;
    out[i] = [n, len];
  }
  return out;
}
const steps = (s: string) => s.split(/\s+/);

let musicTimer: number | null = null;
let songIdx = -1;
let musicOut: GainNode | null = null;

const hz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export function playMusic(i: number): void {
  if (!ac) return;
  if (songIdx === i && musicTimer !== null) return;
  stopMusic();
  songIdx = i;
  const song = SONGS[i % SONGS.length];
  const ctx = ac;
  const stepDur = 60 / song.bpm / 4;
  const lead = parseLead(song.lead);
  const bass = steps(song.bass);
  const stabs = steps(song.stabs);
  const drums = steps(song.drums);
  const fill = steps(song.fill);

  const songOut = ctx.createGain();
  songOut.gain.setValueAtTime(0.0001, ctx.currentTime);
  songOut.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.3);
  songOut.connect(musicBus);
  const wet = ctx.createGain();
  wet.gain.value = 0.45;
  songOut.connect(wet).connect(revSend);
  musicOut = songOut;
  const room = ctx.createGain(); // extra-wet bus for snare / brass, the gated-80s sound
  room.gain.value = 1;
  room.connect(songOut);
  const roomSend = ctx.createGain();
  roomSend.gain.value = 0.9;
  room.connect(roomSend).connect(revSend);

  const voice = (f: number, t: number, dur: number, type: OscillatorType, vol: number, o: {
    att?: number; rel?: number; lp?: number; lpPeak?: number; lpT?: number; q?: number; detune?: number; vib?: number; dest?: AudioNode;
  } = {}) => {
    const v = ctx.createOscillator();
    v.type = type;
    v.frequency.setValueAtTime(f, t);
    if (o.detune) v.detune.value = o.detune;
    if (o.vib && dur > 0.18) {
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = 5.6;
      depth.gain.setValueAtTime(0, t);
      depth.gain.linearRampToValueAtTime(o.vib, t + 0.18);
      lfo.connect(depth).connect(v.detune);
      lfo.start(t);
      lfo.stop(t + dur + 0.3);
    }
    const g = ctx.createGain();
    const att = o.att ?? 0.004;
    const rel = o.rel ?? 0.06;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + att);
    g.gain.setValueAtTime(vol, t + Math.max(att, dur - rel));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
    let src: AudioNode = v;
    if (o.lp) {
      const fl = ctx.createBiquadFilter();
      fl.type = 'lowpass';
      fl.Q.value = o.q ?? 1;
      fl.frequency.setValueAtTime(o.lpPeak ?? o.lp, t);
      if (o.lpPeak) fl.frequency.exponentialRampToValueAtTime(o.lp, t + (o.lpT ?? 0.15));
      v.connect(fl);
      src = fl;
    }
    src.connect(g).connect(o.dest ?? songOut);
    v.start(t);
    v.stop(t + dur + rel + 0.05);
  };
  const noiseAt = (t: number, dur: number, vol: number, type: BiquadFilterType, freq: number, dest: AudioNode = songOut, q = 0.8) => {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(dest);
    s.start(t, Math.random() * Math.max(0, 1.9 - dur));
    s.stop(t + dur + 0.05);
  };
  const thump = (t: number, f0: number, f1: number, dur: number, vol: number, dest: AudioNode = songOut) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.5);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  };
  const drum = (ch: string, t: number) => {
    switch (ch) {
      case 'k': thump(t, 170, 48, 0.3, 0.95); noiseAt(t, 0.01, 0.3, 'highpass', 3500); break;
      case 's': thump(t, 230, 170, 0.09, 0.4, room); noiseAt(t, 0.17, 0.55, 'bandpass', 2000, room, 0.6); noiseAt(t, 0.06, 0.3, 'highpass', 7000); break;
      case 'h': noiseAt(t, 0.03, 0.13, 'highpass', 8500); break;
      case 'o': noiseAt(t, 0.16, 0.13, 'highpass', 7500); break;
      case 't': thump(t, 240, 160, 0.22, 0.55, room); break;
      case 'm': thump(t, 180, 120, 0.25, 0.55, room); break;
      case 'l': thump(t, 130, 80, 0.3, 0.6, room); break;
    }
  };
  const crash = (t: number) => noiseAt(t, 1.2, 0.18, 'highpass', 5000);
  // brass section: stacked detuned saws with a bright filter "blat" on the attack
  const brass = (tones: number[], t: number, dur: number, vol: number) => {
    for (const n of tones) {
      for (const d of [-9, 9]) voice(hz(n), t, dur, 'sawtooth', vol, { att: 0.012, rel: 0.08, lp: 1300, lpPeak: 4200, lpT: 0.09, q: 1.5, detune: d, dest: room });
    }
  };
  const orchHit = (tones: number[], t: number) => {
    brass(tones.map((n) => n + 12), t, 0.2, 0.05);
    thump(t, 90, 40, 0.5, 0.6, room);
    noiseAt(t, 0.25, 0.3, 'lowpass', 2500, room);
    crash(t);
  };
  const slap = (n: number, t: number, pop: boolean) => {
    const f = hz(n);
    voice(f, t, stepDur * (pop ? 0.7 : 1.3), 'sawtooth', pop ? 0.2 : 0.26, { lp: pop ? 900 : 480, lpPeak: pop ? 5200 : 2600, lpT: pop ? 0.05 : 0.11, q: 4 });
    voice(f, t, stepDur * 1.2, 'square', 0.07, { lp: 700, lpPeak: 2000, lpT: 0.08 });
    if (!pop) voice(f / 2, t, stepDur * 1.4, 'sine', 0.32);
    else noiseAt(t, 0.015, 0.12, 'bandpass', 3000);
  };
  const leadNote = (n: number, t: number, len: number) => {
    const dur = len * stepDur * 0.96;
    voice(hz(n), t, dur, 'square', 0.055, { lp: 3200, lpPeak: 5000, lpT: 0.06, vib: 16, rel: 0.08, dest: room });
    voice(hz(n), t, dur, 'sawtooth', 0.04, { lp: 2600, detune: 7, vib: 16, rel: 0.08, dest: room });
    voice(hz(n + 12), t, Math.min(dur, 0.12), 'sine', 0.02);
  };
  const pad = (tones: number[], t: number) => {
    for (const n of tones) for (const d of [-6, 6]) voice(hz(n), t, stepDur * 16, 'sawtooth', 0.012, { att: stepDur * 3, rel: 0.3, lp: 1100, detune: d });
  };

  let step = 0;
  let next = ctx.currentTime + 0.1;
  const tick = () => {
    if (!ac) return;
    while (next < ctx.currentTime + 0.2) {
      const bar = Math.floor(step / 16) % 8;
      const s16 = step % 16;
      const ch = chordTones(song.chords[bar]);
      const bassRoot = 33 + ((ch.root - 9 + 12) % 12); // A1..G#2
      const stabRoot = 55 + ((ch.root - 7 + 12) % 12); // G3..F#4
      const stabTones = ch.tones.slice(0, 3).map((x) => stabRoot + x);
      const loopStart = step % 128 === 0;
      if (loopStart) orchHit(stabTones, next);
      else if (s16 === 0 && bar === 4) crash(next);
      const bt = bass[s16];
      if (bt === 'R') slap(bassRoot, next, false);
      else if (bt === 'O') slap(bassRoot + 12, next, true);
      else if (bt === '5') slap(bassRoot + 7, next, false);
      if (stabs[s16] === 'x' && !loopStart) brass(stabTones, next, stepDur * 1.2, bar >= 4 ? 0.024 : 0.02);
      if (bar >= 4 && s16 === 0) pad(stabTones.map((x) => x + 12), next);
      const ln = lead[(step % 128)];
      if (ln) leadNote(ln[0], next, ln[1]);
      drum((bar === 7 ? fill : drums)[s16], next);
      next += stepDur;
      step++;
    }
  };
  tick();
  musicTimer = window.setInterval(tick, 40);
}

export function stopMusic(): void {
  if (musicTimer !== null) clearInterval(musicTimer);
  musicTimer = null;
  songIdx = -1;
  if (musicOut && ac) {
    const g = musicOut;
    const t = ac.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(0.0001, t + 0.35);
    setTimeout(() => g.disconnect(), 500);
  }
  musicOut = null;
}
