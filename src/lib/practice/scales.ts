/**
 * Âm giai cho trang luyện tập (hàm thuần, không đụng Web Audio).
 *
 * - Chủ âm chọn theo **giọng viết** (nốt người chơi đọc trên nhạc cụ). Concert = viết − bán cung dịch − 12 × quãng tám dịch,
 *   tức nghịch đảo của `transposeNote` trong module dịch giọng. Do1 concert = C4 (MIDI 60).
 * - Cách viết dấu theo giọng (letter-based): gam 7 nốt mỗi bậc một chữ nốt liên tiếp từ chữ của chủ âm
 *   (Fa trưởng → Sib, không La#); ngũ cung / blues lấy chữ của bậc tương ứng trong gam mẹ. Nốt cần dấu kép
 *   (vd Fa## trong Sol# thứ hoà âm) thì viết lại theo kiểu dấu (♯/♭) của giọng. Chromatic dùng kiểu dấu của giọng.
 */
import { midiToFrequency } from "@/lib/audio/math";
import type { Accidental, NoteName } from "@/lib/notation/parse";
import {
  noteToSemitone,
  resolveSpelling,
  semitoneToNote,
  type NoteValue,
  type Spelling,
  type SpellingPref,
  type TransposeSetting,
} from "@/lib/notation/transpose";

export type ScaleType =
  | "major"
  | "naturalMinor"
  | "harmonicMinor"
  | "majorPentatonic"
  | "minorPentatonic"
  | "blues"
  | "chromatic";
export type Exercise = "scale" | "arpeggio";
export type Pattern = "up" | "updown" | "thirds";

interface ScaleDef {
  id: ScaleType;
  label: string;
  /** bán cung tính từ chủ âm */
  intervals: number[];
  /** chữ nốt của từng bậc (0 = chữ của chủ âm, 2 = chữ thứ ba…); null = viết theo kiểu dấu của giọng */
  letters: number[] | null;
  minor: boolean;
}

export const SCALE_TYPES: ScaleDef[] = [
  { id: "major", label: "Trưởng", intervals: [0, 2, 4, 5, 7, 9, 11], letters: [0, 1, 2, 3, 4, 5, 6], minor: false },
  { id: "naturalMinor", label: "Thứ tự nhiên", intervals: [0, 2, 3, 5, 7, 8, 10], letters: [0, 1, 2, 3, 4, 5, 6], minor: true },
  { id: "harmonicMinor", label: "Thứ hoà âm", intervals: [0, 2, 3, 5, 7, 8, 11], letters: [0, 1, 2, 3, 4, 5, 6], minor: true },
  { id: "majorPentatonic", label: "Ngũ cung trưởng", intervals: [0, 2, 4, 7, 9], letters: [0, 1, 2, 4, 5], minor: false },
  { id: "minorPentatonic", label: "Ngũ cung thứ", intervals: [0, 3, 5, 7, 10], letters: [0, 2, 3, 4, 6], minor: true },
  { id: "blues", label: "Blues", intervals: [0, 3, 5, 6, 7, 10], letters: [0, 2, 3, 4, 4, 6], minor: true },
  { id: "chromatic", label: "Chromatic", intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], letters: null, minor: false },
];

export const PATTERNS: { id: Pattern; label: string }[] = [
  { id: "up", label: "Đi lên" },
  { id: "updown", label: "Lên rồi xuống" },
  { id: "thirds", label: "Quãng 3" },
];

export const EXERCISES: { id: Exercise; label: string }[] = [
  { id: "scale", label: "Âm giai" },
  { id: "arpeggio", label: "Hợp âm rải" },
];

export const scaleDef = (t: ScaleType) => SCALE_TYPES.find((s) => s.id === t) ?? SCALE_TYPES[0];

const LETTERS: NoteName[] = ["Do", "Re", "Mi", "Fa", "Sol", "La", "Si"];
const NOTE_PC: Record<NoteName, number> = { Do: 0, Re: 2, Mi: 4, Fa: 5, Sol: 7, La: 9, Si: 11 };
const LETTER_EN: Record<NoteName, string> = { Do: "C", Re: "D", Mi: "E", Fa: "F", Sol: "G", La: "A", Si: "B" };
/** Do1 concert = C4 */
export const DO1_MIDI = 60;

const mod12 = (n: number) => ((n % 12) + 12) % 12;

export interface KeyName {
  note: NoteName;
  accidental?: Accidental;
}

/** kiểu dấu của giọng: ép buộc theo người dùng, hoặc tự động theo giọng trưởng tương ứng (giọng giáng → ♭) */
export function keySpelling(tonicPc: number, minor: boolean, pref: SpellingPref): Spelling {
  return resolveSpelling(pref, 0, minor ? mod12(tonicPc + 3) : mod12(tonicPc));
}

/** tên chủ âm: Reb / Do# trưởng tuỳ giọng (trưởng: Reb, Mib, Fa#, Lab, Sib; thứ: Do#, Re#, Fa#, Sol#, Sib) */
export function keyName(tonicPc: number, minor: boolean, pref: SpellingPref): KeyName {
  const { note, accidental } = semitoneToNote(mod12(tonicPc), keySpelling(tonicPc, minor, pref));
  return accidental ? { note, accidental } : { note };
}

/** viết nốt `abs` (bán cung từ Do1) bằng chữ nốt `letter`; cần dấu kép → null */
function spellWithLetter(abs: number, letter: NoteName): NoteValue | null {
  let diff = mod12(abs - NOTE_PC[letter]);
  if (diff > 6) diff -= 12;
  if (diff < -1 || diff > 1) return null;
  const octave = (abs - diff - NOTE_PC[letter]) / 12 + 1;
  return diff === 0 ? { note: letter, octave } : { note: letter, octave, accidental: diff > 0 ? "#" : "b" };
}

export interface PracticeNote {
  /** concert, bán cung tính từ Do1 (= C4) */
  concert: number;
  /** tần số concert (Hz) */
  frequency: number;
  /** nốt viết cho nhạc cụ đã chọn (cảm âm + dấu + quãng tám) */
  written: NoteValue;
  /** bậc trong gam / hợp âm, tính từ 1 (chủ âm = 1, cả chủ âm ở quãng tám trên) */
  degree: number;
}

export interface ScaleOptions {
  /** chủ âm theo giọng viết, 0 = Do … 11 = Si */
  tonic: number;
  type: ScaleType;
  exercise?: Exercise;
  octaves: 1 | 2;
  pattern: Pattern;
  transpose: TransposeSetting;
  /** dịch quãng tám bắt đầu (viết): −1, 0, +1 */
  octaveShift?: number;
}

/** quãng tám (viết) của chủ âm thấp nhất: Sib/Si bắt đầu ở quãng 0 (vừa tầm sax Bb3…F6), còn lại quãng 1 */
export function startOctave(tonicPc: number, shift = 0) {
  return (mod12(tonicPc) >= 10 ? 0 : 1) + Math.max(-1, Math.min(1, Math.round(shift) || 0));
}

/** viết → concert: nghịch đảo của transposeNote(concert, semitones, _, octave) */
export function writtenToConcert(written: number, t: TransposeSetting) {
  return written - t.semitones - 12 * t.octave;
}

export function concertToFrequency(concert: number, a4?: number) {
  return midiToFrequency(DO1_MIDI + concert, a4);
}

const MAJOR_TRIAD = { intervals: [0, 4, 7], letters: [0, 2, 4] };
const MINOR_TRIAD = { intervals: [0, 3, 7], letters: [0, 2, 4] };

/** các nốt đi lên từ chủ âm thấp tới chủ âm cao (không theo kiểu chạy) */
export function buildRange(o: ScaleOptions): PracticeNote[] {
  const def = scaleDef(o.type);
  const tonicPc = mod12(o.tonic);
  const spelling = keySpelling(tonicPc, def.minor, o.transpose.spelling);
  const tonic = keyName(tonicPc, def.minor, o.transpose.spelling);
  const tonicLetter = LETTERS.indexOf(tonic.note);
  const base = tonicPc + 12 * (startOctave(tonicPc, o.octaveShift) - 1);
  const shape = o.exercise === "arpeggio" ? (def.minor ? MINOR_TRIAD : MAJOR_TRIAD) : def;

  const make = (written: number, letterStep: number | null, degree: number): PracticeNote => {
    const w =
      (letterStep !== null && spellWithLetter(written, LETTERS[(tonicLetter + letterStep) % 7])) ||
      semitoneToNote(written, spelling);
    const concert = writtenToConcert(written, o.transpose);
    return { concert, frequency: concertToFrequency(concert), written: w, degree };
  };

  const out: PracticeNote[] = [];
  for (let k = 0; k < o.octaves; k++) {
    shape.intervals.forEach((iv, i) => {
      const letterStep = shape.letters ? shape.letters[i] : i === 0 ? 0 : null;
      out.push(make(base + 12 * k + iv, letterStep, i + 1));
    });
  }
  out.push(make(base + 12 * o.octaves, 0, 1));
  return out;
}

/** áp kiểu chạy lên dãy nốt đi lên */
export function applyPattern<T>(asc: T[], pattern: Pattern): T[] {
  if (asc.length < 2 || pattern === "up") return asc.slice();
  if (pattern === "updown" || asc.length < 3) return [...asc, ...asc.slice(0, -1).reverse()];
  // quãng 3: 1-3, 2-4 … rồi xuống 8-6, 7-5 …
  const out: T[] = [];
  for (let i = 0; i + 2 < asc.length; i++) out.push(asc[i], asc[i + 2]);
  for (let i = asc.length - 1; i - 2 >= 0; i--) out.push(asc[i], asc[i - 2]);
  return out;
}

/** dãy nốt luyện tập hoàn chỉnh. Hợp âm rải không có kiểu quãng 3 → lên rồi xuống */
export function practiceSequence(o: ScaleOptions): PracticeNote[] {
  const pattern = o.exercise === "arpeggio" && o.pattern === "thirds" ? "updown" : o.pattern;
  return applyPattern(buildRange(o), pattern);
}

// ---------- tên hiển thị ----------

const GLYPH = { "#": "♯", b: "♭" } as const;

/** "Si♭", "Fa♯", "Do" (không kèm quãng tám) */
export function noteText(n: { note: NoteName; accidental?: Accidental }) {
  return n.note + (n.accidental ? GLYPH[n.accidental] : "");
}

/** "B♭", "F♯" */
export function letterText(n: { note: NoteName; accidental?: Accidental }) {
  return LETTER_EN[n.note] + (n.accidental ? GLYPH[n.accidental] : "");
}

/** "Sol trưởng", "Mi thứ hoà âm", "Si♭ hợp âm rải trưởng" */
export function scaleTitle(name: KeyName, type: ScaleType, exercise: Exercise = "scale") {
  const def = scaleDef(type);
  if (exercise === "arpeggio") return `${noteText(name)} ${def.minor ? "thứ" : "trưởng"} — hợp âm rải`;
  return `${noteText(name)} ${def.label.toLowerCase()}`;
}

/** tên giọng concert ứng với chủ âm viết (chủ âm − bán cung dịch) */
export function concertKeyName(writtenTonic: number, type: ScaleType, t: TransposeSetting): KeyName {
  return keyName(mod12(writtenTonic - t.semitones), scaleDef(type).minor, t.spelling);
}

/** tần số drone chủ âm (concert), đưa về khoảng dễ nghe 90–330 Hz */
export function droneFrequency(firstConcert: number) {
  let f = concertToFrequency(firstConcert);
  while (f > 330) f /= 2;
  while (f < 90) f *= 2;
  return f;
}

// ---------- tick → bước ----------

export type ScaleStep =
  | { phase: "countin"; tick: number }
  | { phase: "note"; index: number; loop: number; /** số tick nốt ngân (nốt cuối ngân hết ô nhịp) */ ticks: number }
  | { phase: "rest"; index: number; loop: number };

/** độ dài một vòng (tick), làm tròn lên đủ ô nhịp để vòng sau bắt đầu ở phách mạnh */
export function loopTicks(length: number, ticksPerBar: number) {
  const bar = Math.max(1, ticksPerBar);
  return Math.max(bar, Math.ceil(length / bar) * bar);
}

/** chế độ âm giai: mỗi tick (phách hoặc nửa phách) một nốt; hết dãy thì nghỉ cho tròn ô rồi lặp */
export function scaleStep(tick: number, o: { length: number; ticksPerBar: number; countInTicks: number }): ScaleStep {
  if (tick < o.countInTicks) return { phase: "countin", tick };
  const len = Math.max(1, o.length);
  const loop = loopTicks(len, o.ticksPerBar);
  const k = tick - o.countInTicks;
  const pos = k % loop;
  const n = Math.floor(k / loop);
  if (pos < len - 1) return { phase: "note", index: pos, loop: n, ticks: 1 };
  if (pos === len - 1) return { phase: "note", index: pos, loop: n, ticks: loop - len + 1 };
  return { phase: "rest", index: len - 1, loop: n };
}

export type LongToneStep =
  | { phase: "countin"; tick: number }
  | { phase: "hold"; index: number; beat: number; loop: number }
  | { phase: "rest"; index: number; beat: number; loop: number };

/** nốt dài: mỗi nốt giữ `hold` phách rồi nghỉ `rest` phách */
export function longToneStep(
  tick: number,
  o: { length: number; hold: number; rest: number; countInTicks: number },
): LongToneStep {
  if (tick < o.countInTicks) return { phase: "countin", tick };
  const len = Math.max(1, o.length);
  const hold = Math.max(1, o.hold);
  const cycle = hold + Math.max(0, o.rest);
  const k = tick - o.countInTicks;
  const n = Math.floor(k / cycle);
  const index = n % len;
  const loop = Math.floor(n / len);
  const beat = k % cycle;
  return beat < hold ? { phase: "hold", index, beat, loop } : { phase: "rest", index, beat: beat - hold, loop };
}

/** dãy nốt dài: chỉ đi lên (rồi xuống nếu chọn), bỏ lặp nốt liền nhau */
export function longToneSequence(o: ScaleOptions): PracticeNote[] {
  const seq = practiceSequence({ ...o, pattern: o.pattern === "up" ? "up" : "updown" });
  return seq.filter((n, i) => i === 0 || noteToSemitone(n.written) !== noteToSemitone(seq[i - 1].written));
}
