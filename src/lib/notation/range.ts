/**
 * Range check and auto octave for instruments with a fixed range (saxophone, sáo trúc).
 *
 * Semitones are counted from Do1 (= C4) via `noteToSemitone`. The written sax range is Bb3..F#6,
 * i.e. cảm âm Sib0..Fa#3; a 6-hole sáo trúc plays Đô1..Đô3 relative to the flute (0..24).
 * Only "note" tokens are considered; any other token type is ignored.
 */
import type { Section } from "./parse";
import {
  detectKeyPc,
  familyOf,
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

/** written range of a 6-hole sáo trúc, relative to the flute: Đô1 .. Đô3 */
export const SAO_WRITTEN_RANGE: WrittenRange = { low: 0, high: 24 };

/** written range of a preset; null for presets without a fixed range (concert, custom) */
export function rangeFor(preset: HornPreset | undefined): WrittenRange | null {
  const f = familyOf(preset);
  return f === "sax" ? SAX_WRITTEN_RANGE : f === "sao" ? SAO_WRITTEN_RANGE : null;
}

/** "awkward" edges of each range: palm keys / low pinky keys on sax, the top of octave 3 on sáo */
function extremesOf(range: WrittenRange): { low: number; high: number } {
  return range === SAO_WRITTEN_RANGE ? { low: range.low, high: 21 } : { low: EXTREME_LOW, high: EXTREME_HIGH };
}

/** above Do#3 needs palm keys; below Re1 needs the low pinky keys: playable but awkward */
const EXTREME_HIGH = 25;
const EXTREME_LOW = 2;

/** a transposition resolved for one song (null = shown as written) */
export interface ResolvedShift {
  semitones: number;
  octave: number;
  spelling: Spelling;
  /** written range of the instrument; only for presets with a range (sax, sáo) */
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

/** number of notes outside `range` (default: sax) once transposed by `semitones` + `octave` */
export function countOutOfRange(
  sections: Section[],
  semitones: number,
  octave: number,
  range: WrittenRange = SAX_WRITTEN_RANGE,
): number {
  const shift = semitones + octave * 12;
  return noteSemitones(sections).filter((s) => isOutOfRange(s + shift, range)).length;
}

/**
 * Octave (−1, 0, +1) that fits the song best: fewest notes out of range,
 * then fewest extreme notes (sax: palm keys above Do#3 / low keys below Re1; sáo: above La2), then 0.
 * `range` defaults to the sax range; pass `rangeFor(preset)` for other instruments.
 */
export function bestOctave(sections: Section[], semitones: number, range: WrittenRange = SAX_WRITTEN_RANGE): number {
  const extremes = extremesOf(range);
  const notes = noteSemitones(sections);
  let best = 0;
  let bestScore: [number, number] | null = null;
  for (const octave of [0, -1, 1]) {
    const shift = semitones + octave * 12;
    let out = 0;
    let extreme = 0;
    for (const s of notes) {
      const w = s + shift;
      if (isOutOfRange(w, range)) out++;
      if (w > extremes.high || w < extremes.low) extreme++;
    }
    if (!bestScore || out < bestScore[0] || (out === bestScore[0] && extreme < bestScore[1])) {
      best = octave;
      bestScore = [out, extreme];
    }
  }
  return best;
}

/**
 * Resolve a stored setting for one song: auto octave (sax / sáo presets with `autoOctave`), spelling and range.
 * `keyPc` is the song's major key (0..11); defaults to the key detected from its first chord.
 * Returns null when nothing changes (shown as written) and there is no range to check
 * (a sáo Đô keeps its range check even though nothing is transposed).
 */
export function resolveShift(setting: TransposeSetting, sections: Section[], keyPc?: number): ResolvedShift | null {
  const preset = setting.preset ?? "custom";
  const range = rangeFor(preset);
  const octave = range && setting.autoOctave ? bestOctave(sections, setting.semitones, range) : setting.octave;
  const semitones = setting.semitones;
  if (!range && isIdentity({ ...setting, semitones, octave })) return null;
  const spelling = resolveSpelling(setting.spelling, semitones, keyPc ?? detectKeyPc(sections));
  return range ? { semitones, octave, spelling, range, preset } : { semitones, octave, spelling, preset };
}

export interface RangeSummary {
  /** lowest / highest written note */
  low: NoteValue;
  high: NoteValue;
  count: number;
  outOfRange: number;
}

/** written span of the song on the instrument; null without a range (concert/custom) or without cảm âm notes */
export function summarizeRange(sections: Section[], shift: ResolvedShift | null): RangeSummary | null {
  if (!shift?.range) return null;
  const span = noteSpan(sections);
  if (!span) return null;
  const d = shift.semitones + shift.octave * 12;
  return {
    low: semitoneToNote(span.min + d, shift.spelling),
    high: semitoneToNote(span.max + d, shift.spelling),
    count: span.count,
    outOfRange: countOutOfRange(sections, shift.semitones, shift.octave, shift.range),
  };
}

const GLYPH = { "#": "♯", b: "♭" } as const;

/** "Re1", "Fa♯3", "Si♭0" */
export function formatNote(v: NoteValue): string {
  return `${v.note}${v.accidental ? GLYPH[v.accidental] : ""}${v.octave}`;
}
