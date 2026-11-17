/** các hàm thuần cho âm thanh (không đụng Web Audio) — dễ test, dùng lại cho trang luyện âm giai */

export const BPM_MIN = 20;
export const BPM_MAX = 400;
export const DEFAULT_A4 = 440;

export interface NoteName {
  /** 0 = C/Đô … 11 = B/Si */
  pc: number;
  /** tên cảm âm */
  name: string;
  /** tên chữ cái */
  letter: string;
}

export const NOTE_NAMES: NoteName[] = [
  { pc: 0, name: "Đô", letter: "C" },
  { pc: 1, name: "Đô#", letter: "C#" },
  { pc: 2, name: "Rê", letter: "D" },
  { pc: 3, name: "Rê#", letter: "D#" },
  { pc: 4, name: "Mi", letter: "E" },
  { pc: 5, name: "Fa", letter: "F" },
  { pc: 6, name: "Fa#", letter: "F#" },
  { pc: 7, name: "Sol", letter: "G" },
  { pc: 8, name: "Sol#", letter: "G#" },
  { pc: 9, name: "La", letter: "A" },
  { pc: 10, name: "La#", letter: "A#" },
  { pc: 11, name: "Si", letter: "B" },
];

const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const VI_PC: Record<string, number> = { do: 0, re: 2, mi: 4, fa: 5, sol: 7, la: 9, si: 11 };

/** "C#", "Db", "Đô#", "Sol", "Re" … hoặc số 0..11 → lớp cao độ 0..11; không hiểu → null */
export function pitchClass(note: string | number): number | null {
  if (typeof note === "number") return Number.isInteger(note) ? ((note % 12) + 12) % 12 : null;
  const s = note.trim();
  const m = /^([A-Ga-g])([#b]?)$/.exec(s);
  let base: number | undefined;
  let acc = "";
  if (m) {
    base = LETTER_PC[m[1].toUpperCase()];
    acc = m[2];
  } else {
    const plain = s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/gi, "d")
      .toLowerCase();
    const v = /^(do|re|mi|fa|sol|la|si)([#b]?)$/.exec(plain);
    if (!v) return null;
    base = VI_PC[v[1]];
    acc = v[2];
  }
  if (base === undefined) return null;
  const shift = acc === "#" ? 1 : acc === "b" ? -1 : 0;
  return (base + shift + 12) % 12;
}

/** số MIDI (C4 = 60, A4 = 69) */
export function noteToMidi(note: string | number, octave: number): number | null {
  const pc = pitchClass(note);
  return pc === null ? null : (octave + 1) * 12 + pc;
}

export function midiToFrequency(midi: number, a4 = DEFAULT_A4): number {
  return a4 * 2 ** ((midi - 69) / 12);
}

/** tên nốt + quãng tám → tần số Hz (A4 mặc định 440). Không hiểu tên nốt → NaN */
export function noteToFrequency(note: string | number, octave: number, a4 = DEFAULT_A4): number {
  const midi = noteToMidi(note, octave);
  return midi === null ? NaN : midiToFrequency(midi, a4);
}

export function clampBpm(bpm: number): number {
  if (!Number.isFinite(bpm)) return BPM_MIN;
  return Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(bpm)));
}

/** khoảng cách (giây) giữa hai tiếng click; subdivision = số tiếng trong một phách */
export function bpmToInterval(bpm: number, subdivision = 1): number {
  const b = Math.min(BPM_MAX, Math.max(BPM_MIN, bpm));
  return 60 / b / Math.max(1, Math.floor(subdivision));
}

export type TickKind = "bar" | "beat" | "sub";

export interface TickPos {
  /** phách trong ô nhịp, 0 = phách mạnh */
  beat: number;
  /** tiếng chia nhỏ trong phách, 0 = đúng phách */
  sub: number;
}

/** loại tiếng: phách mạnh đầu ô nhịp, phách thường hay tiếng chia nhỏ */
export function tickKind(pos: TickPos): TickKind {
  if (pos.sub > 0) return "sub";
  return pos.beat === 0 ? "bar" : "beat";
}

/** vị trí tiếng tiếp theo; chịu được việc đổi số phách / chia nhỏ giữa chừng */
export function advanceTick(pos: TickPos, beatsPerBar: number, subdivision = 1): TickPos {
  const beats = Math.max(1, Math.floor(beatsPerBar));
  const subs = Math.max(1, Math.floor(subdivision));
  let sub = pos.sub + 1;
  let beat = pos.beat;
  if (sub >= subs) {
    sub = 0;
    beat += 1;
  }
  if (beat >= beats) beat = 0;
  return { beat, sub };
}

/**
 * Toán lập lịch kiểu "lookahead": từ thời điểm tiếng kế tiếp `nextTime`, liệt kê mọi tiếng
 * rơi vào trước `now + lookahead` và trả về thời điểm tiếng kế tiếp mới.
 * Nếu bị trễ quá nhiều (tab bị treo), bỏ qua các tiếng đã lỡ thay vì phát dồn.
 */
export function scheduleWindow(
  nextTime: number,
  now: number,
  lookahead: number,
  interval: number,
): { times: number[]; nextTime: number } {
  const times: number[] = [];
  let t = nextTime;
  if (interval <= 0) return { times, nextTime: t };
  if (t < now - interval) t = now; // trễ quá: bắt nhịp lại từ bây giờ
  while (t < now + lookahead) {
    times.push(t);
    t += interval;
  }
  return { times, nextTime: t };
}

/**
 * Gõ nhịp (tap tempo): `taps` là các mốc thời gian (ms) theo thứ tự. Chỉ tính chuỗi gõ liên tục cuối cùng
 * (ngắt nếu cách nhau > resetMs) và tối đa `maxTaps` lần gần nhất. Chưa đủ 2 lần → null.
 */
export function tapTempo(taps: number[], resetMs = 2000, maxTaps = 8): number | null {
  let start = taps.length - 1;
  while (start > 0 && taps[start] - taps[start - 1] <= resetMs && taps[start] > taps[start - 1]) start--;
  const run = taps.slice(Math.max(start, taps.length - maxTaps));
  if (run.length < 2) return null;
  const avg = (run[run.length - 1] - run[0]) / (run.length - 1);
  if (avg <= 0) return null;
  return clampBpm(60000 / avg);
}

/** giữ lại các lần gõ còn liên quan (dùng cho state của nút gõ nhịp) */
export function pushTap(taps: number[], now: number, resetMs = 2000, maxTaps = 8): number[] {
  const last = taps[taps.length - 1];
  const base = last !== undefined && now - last <= resetMs && now > last ? taps : [];
  return [...base, now].slice(-maxTaps);
}
