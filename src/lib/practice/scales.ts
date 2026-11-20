/**
 * Scales for the practice page (pure functions, no Web Audio).
 *
 * - The tonic is picked in the **written key** (what the player reads on the instrument). Concert = written − shift
 *   semitones − 12 × octave shift, i.e. the inverse of `transposeNote` in the transpose module. Do1 concert = C4 (MIDI 60).
 * - Letter-based spelling: in 7-note scales each degree takes the next letter after the tonic's letter
 *   (F major → Bb, not A#); pentatonic / blues take the letter of the matching degree in the parent scale. Notes that
 *   would need a double accidental (e.g. F## in G# harmonic minor) are respelled with the key's ♯/♭ style.
 *   Chromatic uses the key's ♯/♭ style.
 * - With an instrument range (`ScaleOptions.range`), the start octave is the lowest one that fits and notes
 *   outside the range are flagged.
 */
import { midiToFrequency } from "@/lib/audio/math";
import type { Accidental, NoteName } from "@/lib/notation/parse";
import { isOutOfRange, SAX_WRITTEN_RANGE, type WrittenRange } from "@/lib/notation/range";
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
  /** semitones above the tonic */
  intervals: number[];
  /** letter step of each degree (0 = tonic letter, 2 = third letter…); null = spell with the key's ♯/♭ style */
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

/** key spelling: forced by the user, or automatic from the relative major key (flat keys → ♭) */
export function keySpelling(tonicPc: number, minor: boolean, pref: SpellingPref): Spelling {
  return resolveSpelling(pref, 0, minor ? mod12(tonicPc + 3) : mod12(tonicPc));
}

/** tonic name per key (major: Db, Eb, F#, Ab, Bb; minor: C#, D#, F#, G#, Bb) */
export function keyName(tonicPc: number, minor: boolean, pref: SpellingPref): KeyName {
  const { note, accidental } = semitoneToNote(mod12(tonicPc), keySpelling(tonicPc, minor, pref));
  return accidental ? { note, accidental } : { note };
}

/** spell `abs` (semitones from Do1) with letter `letter`; null when a double accidental would be needed */
function spellWithLetter(abs: number, letter: NoteName): NoteValue | null {
  let diff = mod12(abs - NOTE_PC[letter]);
  if (diff > 6) diff -= 12;
  if (diff < -1 || diff > 1) return null;
  const octave = (abs - diff - NOTE_PC[letter]) / 12 + 1;
  return diff === 0 ? { note: letter, octave } : { note: letter, octave, accidental: diff > 0 ? "#" : "b" };
}

export interface PracticeNote {
  /** concert pitch, semitones from Do1 (= C4) */
  concert: number;
  /** concert frequency (Hz) */
  frequency: number;
  /** written note for the chosen instrument (cảm âm name + accidental + octave) */
  written: NoteValue;
  /** degree in the scale / chord, from 1 (tonic = 1, including the upper tonic) */
  degree: number;
  /** outside the instrument's written range (only set when a range is given) */
  outOfRange?: boolean;
}

export interface ScaleOptions {
  /** tonic in the written key, 0 = Do … 11 = Si */
  tonic: number;
  type: ScaleType;
  exercise?: Exercise;
  octaves: 1 | 2;
  pattern: Pattern;
  transpose: TransposeSetting;
  /** written start octave shift: −1, 0, +1 */
  octaveShift?: number;
  /** written range of the instrument (see `practiceRange`); null / missing = no range check */
  range?: WrittenRange | null;
}

/**
 * Written octave of the lowest tonic: the lowest octave whose tonic is still inside the range
 * (sax: Sib/Si start in octave 0, the rest in octave 1), plus the user's shift.
 * Without a range the sax's low end is used, which suits most instruments.
 */
export function startOctave(tonicPc: number, shift = 0, low = SAX_WRITTEN_RANGE.low) {
  const pc = mod12(tonicPc);
  const lowest = Math.ceil((low - pc) / 12) + 1;
  return lowest + Math.max(-1, Math.min(1, Math.round(shift) || 0));
}

/** written → concert: inverse of transposeNote(concert, semitones, _, octave) */
export function writtenToConcert(written: number, t: TransposeSetting) {
  return written - t.semitones - 12 * t.octave;
}

export function concertToFrequency(concert: number, a4?: number) {
  return midiToFrequency(DO1_MIDI + concert, a4);
}

const MAJOR_TRIAD = { intervals: [0, 4, 7], letters: [0, 2, 4] };
const MINOR_TRIAD = { intervals: [0, 3, 7], letters: [0, 2, 4] };

/** ascending notes from the low tonic to the high tonic (before any pattern) */
export function buildRange(o: ScaleOptions): PracticeNote[] {
  const def = scaleDef(o.type);
  const tonicPc = mod12(o.tonic);
  const spelling = keySpelling(tonicPc, def.minor, o.transpose.spelling);
  const tonic = keyName(tonicPc, def.minor, o.transpose.spelling);
  const tonicLetter = LETTERS.indexOf(tonic.note);
  const base = tonicPc + 12 * (startOctave(tonicPc, o.octaveShift, o.range?.low) - 1);
  const shape = o.exercise === "arpeggio" ? (def.minor ? MINOR_TRIAD : MAJOR_TRIAD) : def;

  const make = (written: number, letterStep: number | null, degree: number): PracticeNote => {
    const w =
      (letterStep !== null && spellWithLetter(written, LETTERS[(tonicLetter + letterStep) % 7])) ||
      semitoneToNote(written, spelling);
    const concert = writtenToConcert(written, o.transpose);
    const note: PracticeNote = { concert, frequency: concertToFrequency(concert), written: w, degree };
    if (o.range) note.outOfRange = isOutOfRange(written, o.range);
    return note;
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

/** apply a pattern to an ascending run */
export function applyPattern<T>(asc: T[], pattern: Pattern): T[] {
  if (asc.length < 2 || pattern === "up") return asc.slice();
  if (pattern === "updown" || asc.length < 3) return [...asc, ...asc.slice(0, -1).reverse()];
  // thirds: 1-3, 2-4 … then down 8-6, 7-5 …
  const out: T[] = [];
  for (let i = 0; i + 2 < asc.length; i++) out.push(asc[i], asc[i + 2]);
  for (let i = asc.length - 1; i - 2 >= 0; i--) out.push(asc[i], asc[i - 2]);
  return out;
}

/** the full practice sequence; arpeggios have no thirds pattern → up and down */
export function practiceSequence(o: ScaleOptions): PracticeNote[] {
  const pattern = o.exercise === "arpeggio" && o.pattern === "thirds" ? "updown" : o.pattern;
  return applyPattern(buildRange(o), pattern);
}

// ---------- display names ----------

const GLYPH = { "#": "♯", b: "♭" } as const;

/** "Si♭", "Fa♯", "Do" (no octave) */
export function noteText(n: { note: NoteName; accidental?: Accidental }) {
  return n.note + (n.accidental ? GLYPH[n.accidental] : "");
}

/** "B♭", "F♯" */
export function letterText(n: { note: NoteName; accidental?: Accidental }) {
  return LETTER_EN[n.note] + (n.accidental ? GLYPH[n.accidental] : "");
}

/** "Sol trưởng", "Mi thứ hoà âm", "Si♭ trưởng — hợp âm rải" */
export function scaleTitle(name: KeyName, type: ScaleType, exercise: Exercise = "scale") {
  const def = scaleDef(type);
  if (exercise === "arpeggio") return `${noteText(name)} ${def.minor ? "thứ" : "trưởng"} — hợp âm rải`;
  return `${noteText(name)} ${def.label.toLowerCase()}`;
}

/** concert key name for a written tonic (tonic − shift semitones) */
export function concertKeyName(writtenTonic: number, type: ScaleType, t: TransposeSetting): KeyName {
  return keyName(mod12(writtenTonic - t.semitones), scaleDef(type).minor, t.spelling);
}

/** tonic drone frequency (concert), folded into the comfortable 90–330 Hz band */
export function droneFrequency(firstConcert: number) {
  let f = concertToFrequency(firstConcert);
  while (f > 330) f /= 2;
  while (f < 90) f *= 2;
  return f;
}

// ---------- tick → step ----------

export type ScaleStep =
  | { phase: "countin"; tick: number }
  | { phase: "note"; index: number; loop: number; /** ticks the note lasts (the last note fills the bar) */ ticks: number }
  | { phase: "rest"; index: number; loop: number };

/** loop length in ticks, rounded up to whole bars so the next loop starts on the downbeat */
export function loopTicks(length: number, ticksPerBar: number) {
  const bar = Math.max(1, ticksPerBar);
  return Math.max(bar, Math.ceil(length / bar) * bar);
}

/** scale mode: one note per tick (beat or half beat); after the run, rest to the end of the bar, then repeat */
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

/** long tones: hold each note for `hold` beats, then rest `rest` beats */
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

/** long-tone sequence: up only (or up and down), without repeating adjacent notes */
export function longToneSequence(o: ScaleOptions): PracticeNote[] {
  const seq = practiceSequence({ ...o, pattern: o.pattern === "up" ? "up" : "updown" });
  return seq.filter((n, i) => i === 0 || noteToSemitone(n.written) !== noteToSemitone(seq[i - 1].written));
}
