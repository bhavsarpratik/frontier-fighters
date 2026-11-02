// Everything is synthesized at runtime: SFX, a small chiptune sequencer, announcer voice.
import type { SimEvent } from '../sim/types.ts';

let ac: AudioContext | null = null;
let master: GainNode;
let musicBus: GainNode;
let sfxBus: GainNode;
let noiseBuf: AudioBuffer;
let muted = typeof location !== 'undefined' && (new URLSearchParams(location.search).has('mute') || localStorage.getItem('ff-muted') === '1');

export function audioReady(): boolean {
  return !!ac;
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
  master.gain.value = muted ? 0 : 0.7;
  const comp = ac.createDynamicsCompressor();
  master.connect(comp).connect(ac.destination);
  musicBus = ac.createGain();
  musicBus.gain.value = 0.32;
  musicBus.connect(master);
  sfxBus = ac.createGain();
  sfxBus.gain.value = 0.9;
  sfxBus.connect(master);
  noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

export function toggleMute(): boolean {
  muted = !muted;
  localStorage.setItem('ff-muted', muted ? '1' : '0');
  if (ac) master.gain.value = muted ? 0 : 0.7;
  if (muted && 'speechSynthesis' in window) speechSynthesis.cancel();
  return muted;
}

function env(g: GainNode, t: number, a: number, peak: number, dec: number): void {
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, slide = 0, bus: GainNode = sfxBus, at = 0): void {
  if (!ac) return;
  const t = ac.currentTime + at;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
  env(g, t, 0.004, vol, dur);
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur: number, vol: number, freq: number, q = 1, type: BiquadFilterType = 'bandpass', sweep = 0): void {
  if (!ac) return;
  const t = ac.currentTime;
  const s = ac.createBufferSource();
  s.buffer = noiseBuf;
  const f = ac.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (sweep) f.frequency.exponentialRampToValueAtTime(freq * sweep, t + dur);
  f.Q.value = q;
  const g = ac.createGain();
  env(g, t, 0.002, vol, dur);
  s.connect(f).connect(g).connect(sfxBus);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.05);
}

export const sfx = {
  hit(k: number) {
    noise(k ? 0.16 : 0.08, k ? 0.9 : 0.6, k ? 900 : 1600, 0.8);
    tone(k ? 110 : 180, k ? 0.18 : 0.1, 'sine', k ? 0.9 : 0.6, 0.5);
    if (k === 2) tone(70, 0.3, 'square', 0.25, 0.5);
  },
  block() {
    noise(0.06, 0.4, 3200, 3);
    tone(900, 0.05, 'square', 0.15, 0.7);
  },
  whoosh() { noise(0.12, 0.25, 600, 1.2, 'bandpass', 3); },
  jump() { tone(220, 0.1, 'triangle', 0.18, 1.8); },
  land() { noise(0.05, 0.2, 300, 1, 'lowpass'); },
  proj() { tone(300, 0.25, 'sawtooth', 0.18, 2.5); noise(0.2, 0.2, 2000, 2, 'bandpass', 0.5); },
  special() { tone(520, 0.08, 'square', 0.2, 1.5); },
  superStart() {
    tone(110, 0.6, 'sawtooth', 0.35, 4);
    tone(220, 0.6, 'square', 0.2, 4);
    noise(0.6, 0.3, 400, 1, 'bandpass', 8);
  },
  ko() {
    tone(440, 0.9, 'square', 0.35, 0.25);
    tone(330, 0.9, 'sawtooth', 0.2, 0.25);
    noise(0.5, 0.6, 200, 0.7, 'lowpass');
  },
  menu() { tone(880, 0.05, 'square', 0.12); },
  confirm() { tone(660, 0.06, 'square', 0.15); tone(990, 0.1, 'square', 0.15, 1, sfxBus, 0.06); },
  back() { tone(440, 0.08, 'square', 0.12, 0.6); },
  counter() { tone(1200, 0.15, 'square', 0.25, 0.5); noise(0.15, 0.5, 2500, 2); },
  throwSfx() { noise(0.2, 0.6, 400, 1, 'lowpass'); tone(140, 0.2, 'sine', 0.6, 0.5); },
  tech() { tone(1400, 0.05, 'square', 0.2); tone(1800, 0.05, 'square', 0.2, 1, sfxBus, 0.05); },
};

let voice: SpeechSynthesisVoice | null = null;
export function announce(text: string, rate = 1): void {
  if (muted || !('speechSynthesis' in window)) return;
  const synth = window.speechSynthesis;
  if (!voice) {
    const vs = synth.getVoices();
    voice = vs.find((v) => /en[-_]US/i.test(v.lang) && /male|daniel|fred|alex/i.test(v.name)) ?? vs.find((v) => /^en/i.test(v.lang)) ?? null;
  }
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  u.rate = rate;
  u.pitch = 0.55;
  u.volume = 0.9;
  synth.speak(u);
}

export function playEvents(evs: SimEvent[], names: string[]): void {
  for (const e of evs) {
    switch (e.t) {
      case 'hit': sfx.hit(e.k ?? 0); break;
      case 'block': sfx.block(); break;
      case 'jump': sfx.jump(); break;
      case 'land': sfx.land(); break;
      case 'dash': sfx.whoosh(); break;
      case 'proj': sfx.proj(); break;
      case 'special': sfx.special(); break;
      case 'super': sfx.superStart(); announce(e.s ?? 'super', 1.1); break;
      case 'ko': sfx.ko(); announce('K O!', 0.8); break;
      case 'timeup': sfx.ko(); announce('Time!', 0.9); break;
      case 'round': announce(`Round ${e.k}`, 0.95); break;
      case 'fight': announce('Fight!', 1.1); sfx.confirm(); break;
      case 'win': if (e.p >= 0) announce(`${names[e.p]} wins`, 0.95); break;
      case 'perfect': announce('Perfect!', 0.9); break;
      case 'counter': sfx.counter(); break;
      case 'throw': sfx.throwSfx(); break;
      case 'tech': sfx.tech(); break;
      case 'armor': sfx.block(); break;
      case 'clash': sfx.block(); break;
      case 'knockdown': sfx.land(); break;
      case 'rehired': announce('Fired? Rehired!', 1.05); break;
      case 'buff': announce('Hardcore mode', 1.1); break;
      case 'teleport': sfx.whoosh(); break;
    }
  }
}

// --- music: 16-step patterns, 4 voices (bass, lead, arp, drums) ---
interface Song { bpm: number; bass: number[]; lead: number[]; arp: number[]; drums: string; leadType: OscillatorType }
const N = (s: string) => s.split(' ').map((x) => (x === '.' ? 0 : Number(x)));

const SONGS: Song[] = [
  { bpm: 138, leadType: 'square',
    bass: N('45 . 45 . 57 . 45 . 43 . 43 . 55 . 43 . 41 . 41 . 53 . 41 . 43 . 43 . 55 . 47 .'),
    lead: N('69 . 72 . 76 . 74 72 71 . 67 . 69 . . . 65 . 69 . 72 . 71 69 67 . 71 . 74 . . .'),
    arp: N('81 84 88 84 79 83 86 83 77 81 84 81 79 83 86 83'),
    drums: 'k.h.s.h.k.khs.h.' },
  { bpm: 120, leadType: 'triangle',
    bass: N('48 . . 48 55 . 52 . 45 . . 45 52 . 50 . 41 . . 41 48 . 45 . 43 . . 43 50 . 47 .'),
    lead: N('72 . 76 79 . 77 76 . 74 . 72 . 69 . . . 72 . 74 76 . 79 81 . 79 . 77 . 74 . . .'),
    arp: N('84 88 91 88 81 84 88 84 77 81 84 81 79 83 86 83'),
    drums: 'k..hs.h.k.k.s.hh' },
  { bpm: 150, leadType: 'sawtooth',
    bass: N('40 40 . 40 52 . 40 . 43 43 . 43 55 . 43 . 38 38 . 38 50 . 38 . 45 45 . 45 57 . 47 .'),
    lead: N('64 . 67 . 71 . 69 67 64 . 62 . 64 . . . 67 . 71 . 74 . 72 71 69 . 67 . 69 . . .'),
    arp: N('76 79 83 79 79 83 86 83 74 77 81 77 81 84 88 84'),
    drums: 'k.hsk.hsk.hsk.ss' },
  { bpm: 112, leadType: 'square',
    bass: N('38 . . 38 . . 41 . 36 . . 36 . . 40 . 38 . . 38 . . 45 . 44 . . 44 . 43 41 .'),
    lead: N('62 . 65 . 69 . 68 . 67 . 65 . 62 . 61 . 62 . 65 . 69 . 72 . 70 69 68 . 67 . . .'),
    arp: N('74 77 81 77 72 76 79 76 74 77 81 77 80 83 86 83'),
    drums: 'k...s..hk.k.s..h' },
];

let musicTimer: number | null = null;
let songIdx = -1;

const hz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export function playMusic(i: number): void {
  if (!ac) return;
  if (songIdx === i && musicTimer !== null) return;
  stopMusic();
  songIdx = i;
  const song = SONGS[i % SONGS.length];
  const stepDur = 60 / song.bpm / 4;
  let step = 0;
  let next = ac.currentTime + 0.1;
  const voiceAt = (freq: number, t: number, dur: number, type: OscillatorType, vol: number) => {
    const o = ac!.createOscillator();
    const g = ac!.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    env(g, t, 0.005, vol, dur);
    o.connect(g).connect(musicBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  };
  const drum = (ch: string, t: number) => {
    if (ch === 'k') {
      const o = ac!.createOscillator();
      const g = ac!.createGain();
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      env(g, t, 0.002, 0.9, 0.14);
      o.connect(g).connect(musicBus);
      o.start(t);
      o.stop(t + 0.2);
    } else if (ch === 's' || ch === 'h') {
      const s = ac!.createBufferSource();
      s.buffer = noiseBuf;
      const f = ac!.createBiquadFilter();
      f.type = ch === 's' ? 'bandpass' : 'highpass';
      f.frequency.value = ch === 's' ? 1800 : 7000;
      const g = ac!.createGain();
      env(g, t, 0.001, ch === 's' ? 0.5 : 0.18, ch === 's' ? 0.12 : 0.04);
      s.connect(f).connect(g).connect(musicBus);
      s.start(t, Math.random() * 0.5);
      s.stop(t + 0.2);
    }
  };
  const tick = () => {
    if (!ac) return;
    while (next < ac.currentTime + 0.15) {
      const b = song.bass[step % song.bass.length];
      const l = song.lead[step % song.lead.length];
      const a = song.arp[step % song.arp.length];
      if (b) voiceAt(hz(b - 12), next, stepDur * 1.6, 'triangle', 0.55);
      if (l) voiceAt(hz(l), next, stepDur * 1.8, song.leadType, 0.16);
      if (a && step % 2 === 0) voiceAt(hz(a), next, stepDur * 0.6, 'square', 0.05);
      drum(song.drums[step % song.drums.length], next);
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
}
