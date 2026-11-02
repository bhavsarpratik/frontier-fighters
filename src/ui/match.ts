import { playEvents, playMusic, sfx } from '../audio/audio.ts';
import { Cpu, DUMMY_MODES, dummyInput } from '../ai/cpu.ts';
import { ROSTER } from '../content/roster.ts';
import { STAGES } from '../content/stages.ts';
import { RollbackSession } from '../net/rollback.ts';
import { drawText } from '../render/font.ts';
import { MatchScene } from '../render/scene.ts';
import { createMatch, step } from '../sim/step.ts';
import { numpad } from '../sim/input.ts';
import { P_MATCH_END, type SimEvent, type SimState } from '../sim/types.ts';
import { isHeld, padCount, readKeys, readPad, type MenuInput } from '../input/devices.ts';
import { app, type Screen } from './app.ts';
import { MenuList } from './menu.ts';
import { ResultsScreen } from './results.ts';
import { TitleScreen } from './title.ts';
import { CharSelect } from './select.ts';
import type { MatchConfig } from './vs.ts';

export class MatchScreen implements Screen {
  cfg: MatchConfig;
  state: SimState;
  scene: MatchScene;
  session: RollbackSession | null = null;
  cpu: Cpu | null = null;
  paused = false;
  pauseMenu: MenuList;
  endT = 0;
  dummyMode = 0;
  frameStep = false;
  stepOnce = false;
  inputLog: number[][] = [];
  netStatus = '';
  private fnPrev = new Set<string>();

  constructor(cfg: MatchConfig) {
    this.cfg = cfg;
    this.state = createMatch({ p1: cfg.p1, p2: cfg.p2, stage: cfg.stage, seed: cfg.seed, mode: cfg.mode === 'training' ? 'training' : 'versus' });
    this.scene = new MatchScene(cfg.stage, cfg.p1, cfg.p2);
    if (cfg.mode === 'cpu') this.cpu = new Cpu(cfg.cpu ?? 1, cfg.seed);
    if (cfg.mode === 'training') this.cpu = new Cpu(1, cfg.seed);
    if (cfg.mode === 'online' && cfg.net) {
      this.session = new RollbackSession({ local: cfg.net.local, transport: cfg.net.transport, init: this.state, delay: cfg.delay ?? 2 });
      cfg.net.onMsg = (m) => {
        if (m.t === 'leave') cfg.net!.closed = true;
      };
    }
    this.pauseMenu = new MenuList([
      { label: 'RESUME', act: () => { this.paused = false; } },
      { label: 'CHARACTER SELECT', act: () => app.go(new CharSelect(cfg.mode, undefined, [cfg.p1, cfg.p2])) },
      { label: 'MAIN MENU', act: () => app.go(new TitleScreen()) },
    ]);
  }

  enter(): void {
    playMusic(STAGES[this.cfg.stage].music);
  }

  private localInputs(): [number, number] {
    const pads = padCount();
    if (this.cfg.mode === 'local') {
      const p1 = readKeys('p1duo') | (pads >= 2 ? readPad(0) : 0);
      const p2 = readKeys('p2duo') | (pads >= 2 ? readPad(1) : readPad(0));
      return [p1, p2];
    }
    return [readKeys('solo') | readPad(0), 0];
  }

  private fnPressed(code: string): boolean {
    const now = isHeld(code);
    const was = this.fnPrev.has(code);
    if (now) this.fnPrev.add(code);
    else this.fnPrev.delete(code);
    return now && !was;
  }

  private handleEvents(evs: SimEvent[]): void {
    if (!evs.length) return;
    this.scene.onEvents(evs);
    playEvents(evs, this.state.f.map((f) => ROSTER[f.char].short));
  }

  update(menu: MenuInput[]): void {
    if (this.fnPressed('F1')) app.boxes = !app.boxes;
    const online = !!this.session;
    if (!online && menu.some((m) => m.back) && this.state.phase !== P_MATCH_END) {
      this.paused = !this.paused;
      sfx.back();
      return;
    }
    if (this.paused) {
      this.pauseMenu.update(menu);
      return;
    }
    if (this.cfg.mode === 'training') {
      if (this.fnPressed('F2')) this.frameStep = !this.frameStep;
      if (this.fnPressed('F3') || this.fnPressed('Period')) this.stepOnce = true;
      if (this.fnPressed('F4')) this.dummyMode = (this.dummyMode + 1) % DUMMY_MODES.length;
      if (this.fnPressed('F5')) {
        this.state = createMatch({ p1: this.cfg.p1, p2: this.cfg.p2, stage: this.cfg.stage, seed: this.cfg.seed, mode: 'training' });
      }
    }
    if (online) {
      this.updateOnline();
    } else if (!this.frameStep || this.stepOnce) {
      this.stepOnce = false;
      const [a, b0] = this.localInputs();
      let b = b0;
      if (this.cfg.mode === 'cpu') b = this.cpu!.input(this.state, 1);
      if (this.cfg.mode === 'training') b = dummyInput(this.dummyMode, this.state, 1, this.cpu!);
      step(this.state, a, b);
      if (this.cfg.mode === 'training') this.logInput(a);
      this.handleEvents(this.state.events);
    }
    this.scene.update(this.state);
    if (this.state.phase === P_MATCH_END) {
      this.endT++;
      if (this.endT > 150) app.go(new ResultsScreen(this.cfg, this.state));
    }
  }

  private logInput(a: number): void {
    const f = this.state.f[0];
    const d = numpad(a, f.facing);
    const btn = (a >> 4) & 31;
    const last = this.inputLog[this.inputLog.length - 1];
    if (!last || last[0] !== d || last[1] !== btn) this.inputLog.push([d, btn]);
    if (this.inputLog.length > 40) this.inputLog.shift();
  }

  private updateOnline(): void {
    const s = this.session!;
    const net = this.cfg.net!;
    if (net.closed || s.connectionQuiet > 5000) {
      this.netStatus = 'OPPONENT DISCONNECTED';
      if (s.connectionQuiet > 5000 || net.closed) {
        this.endT++;
        if (this.endT > 180) app.go(new TitleScreen());
      }
      return;
    }
    const [a] = this.localInputs();
    const r = s.tick(a);
    this.state = r.state;
    this.handleEvents(r.events);
    this.netStatus = r.stalled ? 'WAITING FOR OPPONENT...' : '';
    if (r.desync) this.netStatus = 'DESYNC DETECTED';
  }

  render(ctx: CanvasRenderingContext2D): void {
    const training = this.cfg.mode === 'training';
    const labels: [string, string] =
      this.cfg.mode === 'online' ? (this.cfg.net!.local === 0 ? ['YOU', 'RIVAL'] : ['RIVAL', 'YOU'])
        : this.cfg.mode === 'cpu' ? ['P1', 'CPU'] : training ? ['P1', 'DUMMY'] : ['P1', 'P2'];
    this.scene.draw(ctx, this.state, { boxes: app.boxes || (training && this.frameStep), labels, training, inputDisplay: training ? this.inputLog : undefined });
    if (training) {
      drawText(ctx, `F1 BOXES  F2 ${this.frameStep ? 'RUN' : 'PAUSE'}  F3 STEP  F4 DUMMY: ${DUMMY_MODES[this.dummyMode]}  F5 RESET`, 240, 240, { align: 'center', color: '#bfe9ff' });
      this.frameAdvantage(ctx);
    }
    if (this.session) {
      const s = this.session;
      drawText(ctx, `PING ${Math.round(s.rtt)}MS  DELAY ${s.delay}  ROLLBACK ${s.maxRollbackSeen}`, 240, 46, { align: 'center', color: '#8a84a8' });
      if (this.netStatus) drawText(ctx, this.netStatus, 240, 150, { scale: 2, align: 'center', color: '#ffd23e', outline: '#000', shadow: null });
    }
    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, 480, 270);
      drawText(ctx, 'PAUSED', 240, 90, { scale: 3, align: 'center', color: '#fff', outline: '#000', shadow: null });
      this.pauseMenu.render(ctx, 240, 130, app.frame);
    }
  }

  private advT = 0;
  private advText = '';
  private frameAdvantage(ctx: CanvasRenderingContext2D): void {
    const [a, d] = this.state.f;
    const aFree = a.state <= 2;
    const dFree = d.state <= 2;
    if (!aFree || !dFree) {
      if (!aFree && dFree) this.advT--;
      else if (aFree && !dFree) this.advT++;
      else if (!aFree && !dFree) this.advT = 0;
      this.advText = 'pending';
    } else if (this.advText === 'pending') {
      this.advText = `FRAME ADV ${this.advT > 0 ? '+' : ''}${this.advT}`;
      this.advT = 0;
    }
    if (this.advText && this.advText !== 'pending') drawText(ctx, this.advText, 472, 64, { align: 'right', color: '#ffd23e' });
  }
}
