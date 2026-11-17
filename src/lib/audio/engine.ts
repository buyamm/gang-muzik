/**
 * Âm thanh dùng chung (Web Audio API, không thư viện): một AudioContext tạo lười,
 * máy đếm nhịp (metronome) lập lịch kiểu lookahead, nốt nền (drone) và nốt tham chiếu ngắn.
 * Trang luyện âm giai sau này dùng lại module này.
 */
import { advanceTick, bpmToInterval, scheduleWindow, tickKind, type TickKind, type TickPos } from "./math";

export * from "./math";

type Ctor = typeof AudioContext;

let ctx: AudioContext | null = null;

/** AudioContext dùng chung; null nếu trình duyệt không hỗ trợ */
export function getAudioContext(): AudioContext | null {
  if (ctx) return ctx;
  if (typeof window === "undefined") return null;
  const C: Ctor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext;
  if (!C) return null;
  try {
    ctx = new C();
  } catch {
    return null;
  }
  return ctx;
}

export function isAudioSupported() {
  return (
    typeof window !== "undefined" &&
    !!(window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext)
  );
}

/** gọi trong sự kiện người dùng (click/chạm) — iOS/Safari chỉ cho phát tiếng sau thao tác */
export function resumeAudio(): AudioContext | null {
  const c = getAudioContext();
  if (c && c.state !== "running") void c.resume().catch(() => {});
  return c;
}

/** thời gian hiện tại của đồng hồ âm thanh (giây) */
export function audioNow(): number {
  return ctx?.currentTime ?? 0;
}

// ---------- quản lý mọi nguồn đang phát để tắt hết một lần ----------
const active = new Set<{ stop: () => void }>();

/** tắt mọi metronome / drone đang phát (rời trang, ẩn tab) */
export function stopAllAudio() {
  for (const a of [...active]) a.stop();
}

// ---------- click ----------
const CLICK_FREQ: Record<TickKind, number> = { bar: 1760, beat: 1046.5, sub: 784 };
const CLICK_GAIN: Record<TickKind, number> = { bar: 1, beat: 0.7, sub: 0.35 };

function scheduleClick(c: AudioContext, out: AudioNode, time: number, kind: TickKind) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = kind === "bar" ? "triangle" : "sine";
  osc.frequency.setValueAtTime(CLICK_FREQ[kind], time);
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(CLICK_GAIN[kind], time + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);
  osc.connect(g).connect(out);
  osc.start(time);
  osc.stop(time + 0.08);
}

/** một tiếng click lẻ (vd đếm vào); accent = tiếng mạnh */
export function playClick(accent = false, volume = 0.8) {
  const c = resumeAudio();
  if (!c) return;
  const g = c.createGain();
  g.gain.value = volume;
  g.connect(c.destination);
  scheduleClick(c, g, c.currentTime + 0.01, accent ? "bar" : "beat");
  window.setTimeout(() => g.disconnect(), 300);
}

// ---------- metronome ----------
export interface MetronomeOptions {
  bpm: number;
  beatsPerBar?: number;
  /** số tiếng trong một phách (1 = chỉ đúng phách, 2 = móc đơn…) */
  subdivision?: number;
  /** 0..1 */
  volume?: number;
  /** gọi lúc LÊN LỊCH (trước khi phát) — `time` là thời điểm phát theo audioNow() để đồng bộ hình */
  onBeat?: (beatIndex: number, time: number, sub: number) => void;
}

const LOOKAHEAD_SEC = 0.1;
const TIMER_MS = 25;

export class Metronome {
  bpm: number;
  beatsPerBar: number;
  subdivision: number;
  onBeat?: MetronomeOptions["onBeat"];
  private volume: number;
  private out: GainNode | null = null;
  private timer: number | null = null;
  private nextTime = 0;
  private pos: TickPos = { beat: 0, sub: 0 };

  constructor(o: MetronomeOptions) {
    this.bpm = o.bpm;
    this.beatsPerBar = o.beatsPerBar ?? 4;
    this.subdivision = o.subdivision ?? 1;
    this.volume = o.volume ?? 0.8;
    this.onBeat = o.onBeat;
  }

  get running() {
    return this.timer !== null;
  }

  start() {
    if (this.running) return;
    const c = resumeAudio();
    if (!c) return;
    this.out = c.createGain();
    this.out.gain.value = this.volume;
    this.out.connect(c.destination);
    this.pos = { beat: 0, sub: 0 };
    this.nextTime = c.currentTime + 0.06;
    this.timer = window.setInterval(() => this.tick(), TIMER_MS);
    active.add(this);
    this.tick();
  }

  stop() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    const out = this.out;
    this.out = null;
    if (out && ctx) {
      // tắt nhẹ để tiếng đã lên lịch không bị cụt gây "bụp"
      out.gain.setTargetAtTime(0, ctx.currentTime, 0.01);
      window.setTimeout(() => out.disconnect(), 200);
    }
    active.delete(this);
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.out && ctx) this.out.gain.setTargetAtTime(v, ctx.currentTime, 0.02);
  }

  private tick() {
    const c = ctx;
    if (!c || !this.out) return;
    const interval = bpmToInterval(this.bpm, this.subdivision);
    const { times, nextTime } = scheduleWindow(this.nextTime, c.currentTime, LOOKAHEAD_SEC, interval);
    for (const t of times) {
      if (this.pos.beat >= this.beatsPerBar) this.pos = { beat: 0, sub: 0 };
      scheduleClick(c, this.out, t, tickKind(this.pos));
      this.onBeat?.(this.pos.beat, t, this.pos.sub);
      this.pos = advanceTick(this.pos, this.beatsPerBar, this.subdivision);
    }
    this.nextTime = nextTime;
  }
}

export function createMetronome(o: MetronomeOptions) {
  return new Metronome(o);
}

// ---------- drone + nốt tham chiếu ----------
/** nối dây âm ấm: sine + chút triangle (lệch nhẹ) qua low-pass */
function warmVoice(c: AudioContext, freq: number, out: AudioNode) {
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = Math.min(4000, Math.max(800, freq * 4));
  filter.Q.value = 0.5;
  filter.connect(out);

  const sine = c.createOscillator();
  sine.type = "sine";
  sine.frequency.value = freq;
  sine.connect(filter);

  const tri = c.createOscillator();
  tri.type = "triangle";
  tri.frequency.value = freq;
  tri.detune.value = 4;
  const triGain = c.createGain();
  triGain.gain.value = 0.25;
  tri.connect(triGain).connect(filter);

  const oscs = [sine, tri];
  return {
    oscs,
    filter,
    start(t: number) {
      for (const o of oscs) o.start(t);
    },
    stop(t: number) {
      for (const o of oscs) o.stop(t);
    },
    setFrequency(f: number, t: number) {
      for (const o of oscs) o.frequency.setTargetAtTime(f, t, 0.03);
      filter.frequency.setTargetAtTime(Math.min(4000, Math.max(800, f * 4)), t, 0.03);
    },
    disconnect() {
      for (const o of oscs) o.disconnect();
      triGain.disconnect();
      filter.disconnect();
    },
  };
}

const DRONE_PEAK = 0.35;
const FADE_SEC = 0.25;

export class Drone {
  private voice: ReturnType<typeof warmVoice> | null = null;
  private out: GainNode | null = null;
  private volume: number;
  frequency: number;

  constructor(frequency: number, volume = 0.6) {
    this.frequency = frequency;
    this.volume = volume;
  }

  get running() {
    return this.voice !== null;
  }

  start(frequency = this.frequency) {
    this.frequency = frequency;
    if (this.running) return this.setFrequency(frequency);
    const c = resumeAudio();
    if (!c || !Number.isFinite(frequency)) return;
    const now = c.currentTime;
    this.out = c.createGain();
    this.out.gain.setValueAtTime(0, now);
    this.out.gain.linearRampToValueAtTime(this.volume * DRONE_PEAK, now + FADE_SEC);
    this.out.connect(c.destination);
    this.voice = warmVoice(c, frequency, this.out);
    this.voice.start(now);
    active.add(this);
  }

  stop() {
    const c = ctx;
    const voice = this.voice;
    const out = this.out;
    this.voice = null;
    this.out = null;
    active.delete(this);
    if (!c || !voice || !out) return;
    const now = c.currentTime;
    out.gain.cancelScheduledValues(now);
    out.gain.setValueAtTime(out.gain.value, now);
    out.gain.linearRampToValueAtTime(0, now + FADE_SEC);
    voice.stop(now + FADE_SEC + 0.05);
    window.setTimeout(() => {
      voice.disconnect();
      out.disconnect();
    }, (FADE_SEC + 0.2) * 1000);
  }

  setFrequency(f: number) {
    if (!Number.isFinite(f)) return;
    this.frequency = f;
    if (this.voice && ctx) this.voice.setFrequency(f, ctx.currentTime);
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.out && ctx) this.out.gain.setTargetAtTime(v * DRONE_PEAK, ctx.currentTime, 0.05);
  }
}

export function createDrone(frequency: number, volume?: number) {
  return new Drone(frequency, volume);
}

/** phát một nốt ngắn (nốt tham chiếu); trả về thời điểm kết thúc theo audioNow() */
export function playTone(freq: number, durationSec = 1, volume = 0.6): number {
  const c = resumeAudio();
  if (!c || !Number.isFinite(freq) || durationSec <= 0) return 0;
  const now = c.currentTime + 0.01;
  const attack = Math.min(0.02, durationSec / 4);
  const release = Math.min(0.15, durationSec / 3);
  const end = now + durationSec;
  const g = c.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(volume * 0.5, now + attack);
  g.gain.setValueAtTime(volume * 0.5, end - release);
  g.gain.linearRampToValueAtTime(0, end);
  g.connect(c.destination);
  const voice = warmVoice(c, freq, g);
  voice.start(now);
  voice.stop(end + 0.02);
  window.setTimeout(() => {
    voice.disconnect();
    g.disconnect();
  }, (durationSec + 0.3) * 1000);
  return end;
}
