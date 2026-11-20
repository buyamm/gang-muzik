/**
 * Saxophone range check and auto octave.
 *
 * Semitones are counted from Do1 (= C4) via `noteToSemitone`. The written sax range is Bb3..F#6,
 * i.e. cảm âm Sib0..Fa#3. Only "note" tokens are considered; any other token type is ignored.
 */
import type { Section } from "./parse";
import {
  detectKeyPc,
  hornPreset,
  isIdentity,
  noteToSemitone,
  resolveSpelling,
  semitoneToNote,
  type HornPreset,
  type NoteValue,
  type Spelling,
  type TransposeSetting,
} from "./transpose";

export interface WrittenRange {
  low: number;
  high: number;
}

/** written range of all saxophones: Sib0 (Bb3) .. Fa#3 (F#6) */
export const SAX_WRITTEN_RANGE: WrittenRange = { low: -2, high: 30 };

/** above Do#3 needs palm keys; below Re1 needs the low pinky keys: playable but awkward */
const EXTREME_HIGH = 25;
const EXTREME_LOW = 2;

/** a transposition resolved for one song (null = shown as written) */
export interface ResolvedShift {
  semitones: number;
  octave: number;
  spelling: Spelling;
  /** written range of the horn; only for sax presets */
  range?: WrittenRange;
  preset: HornPreset;
}

/** concert semitones of every note token, in order */
function noteSemitones(sections: Section[]): number[] {
  const out: number[] = [];
  for (const sec of sections)
    for (const row of sec.rows)
      for (const t of row.notes ?? []) if (t.type === "note") out.push(noteToSemitone(t));
  return out;
}

/** lowest / highest concert semitone and number of notes; null when the song has no cảm âm notes */
export function noteSpan(sections: Section[]): { min: number; max: number; count: number } | null {
  const all = noteSemitones(sections);
  if (!all.length) return null;
  return { min: Math.min(...all), max: Math.max(...all), count: all.length };
}

export function isOutOfRange(written: number, range: WrittenRange = SAX_WRITTEN_RANGE) {
  return written < range.low || written > range.high;
}

/** number of notes outside the sax range once transposed by `semitones` + `octave` */
export function countOutOfRange(sections: Section[], semitones: number, octave: number): number {
  const shift = semitones + octave * 12;
  return noteSemitones(sections).filter((s) => isOutOfRange(s + shift)).length;
}

/**
 * Octave (−1, 0, +1) that fits the song best on a sax: fewest notes out of range,
 * then fewest extreme notes (palm keys above Do#3 / low keys below Re1), then 0.
 */
export function bestOctave(sections: Section[], semitones: number): number {
  const notes = noteSemitones(sections);
  let best = 0;
  let bestScore: [number, number] | null = null;
  for (const octave of [0, -1, 1]) {
    const shift = semitones + octave * 12;
    let out = 0;
    let extreme = 0;
    for (const s of notes) {
      const w = s + shift;
      if (isOutOfRange(w)) out++;
      if (w > EXTREME_HIGH || w < EXTREME_LOW) extreme++;
    }
    if (!bestScore || out < bestScore[0] || (out === bestScore[0] && extreme < bestScore[1])) {
      best = octave;
      bestScore = [out, extreme];
    }
  }
  return best;
}

/**
 * Resolve a stored setting for one song: auto octave (sax presets with `autoOctave`), spelling and range.
 * `keyPc` is the song's major key (0..11); defaults to the key detected from its first chord.
 * Returns null when nothing changes (shown as written).
 */
export function resolveShift(setting: TransposeSetting, sections: Section[], keyPc?: number): ResolvedShift | null {
  const preset = setting.preset ?? "custom";
  const sax = hornPreset(preset)?.sax ?? false;
  const octave = sax && setting.autoOctave ? bestOctave(sections, setting.semitones) : setting.octave;
  const semitones = setting.semitones;
  if (isIdentity({ ...setting, semitones, octave })) return null;
  const spelling = resolveSpelling(setting.spelling, semitones, keyPc ?? detectKeyPc(sections));
  return sax ? { semitones, octave, spelling, range: SAX_WRITTEN_RANGE, preset } : { semitones, octave, spelling, preset };
}

export interface RangeSummary {
  /** lowest / highest written note */
  low: NoteValue;
  high: NoteValue;
  count: number;
  outOfRange: number;
}

/** written span of the song on the horn; null without a range (non-sax) or without cảm âm notes */
export function summarizeRange(sections: Section[], shift: ResolvedShift | null): RangeSummary | null {
  if (!shift?.range) return null;
  const span = noteSpan(sections);
  if (!span) return null;
  const d = shift.semitones + shift.octave * 12;
  return {
    low: semitoneToNote(span.min + d, shift.spelling),
    high: semitoneToNote(span.max + d, shift.spelling),
    count: span.count,
    outOfRange: countOutOfRange(sections, shift.semitones, shift.octave),
  };
}

const GLYPH = { "#": "♯", b: "♭" } as const;

/** "Re1", "Fa♯3", "Si♭0" */
export function formatNote(v: NoteValue): string {
  return `${v.note}${v.accidental ? GLYPH[v.accidental] : ""}${v.octave}`;
}
