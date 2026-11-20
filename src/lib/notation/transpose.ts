/**
 * Transposition for transposing instruments: saxophone, trumpet, clarinet...
 *
 * - Cảm âm notes: Do1 = semitone 0, each octave +12. `transposeNote` adds n semitones (+ an octave shift)
 *   and respells the note with the chosen accidental style (# or b).
 * - Chords: transpose the root and the bass after "/", keep the quality (m7, sus4, b5, add9...).
 * - "auto" spelling: when the target key (song key + n) is a flat key (F, Bb, Eb, Ab, Db) use b,
 *   otherwise #. The song key comes from the first chord (minor chord -> relative major);
 *   songs without chords count as C.
 * - Horn presets: Bb instruments (tenor/soprano sax, trumpet, clarinet) are written a whole step above
 *   concert (+2); Eb instruments (alto/baritone sax) a major sixth above (+9). The real octave
 *   (tenor +14, bari +21) is covered by the octave shift, picked automatically for sax (see range.ts).
 */
import { isChordToken, splitInlineChords, type Accidental, type NoteName, type Section } from "./parse";

export type Spelling = "sharp" | "flat";
export type SpellingPref = Spelling | "auto";

export type HornPreset = "concert" | "soprano" | "alto" | "tenor" | "baritone" | "custom";

export interface TransposeSetting {
  /** semitones, −11..+11 */
  semitones: number;
  /** octave shift for cảm âm notes: −1, 0, +1 (ignored while `autoOctave` is on for a sax preset) */
  octave: number;
  spelling: SpellingPref;
  /** chosen instrument; missing in legacy stored values (then derived from `semitones`) */
  preset?: HornPreset;
  /** sax presets: pick the octave that best fits the horn's range */
  autoOctave?: boolean;
}

export const NO_TRANSPOSE: TransposeSetting = { semitones: 0, octave: 0, spelling: "auto", preset: "concert", autoOctave: false };

export interface HornPresetInfo {
  id: Exclude<HornPreset, "custom">;
  /** UI label, e.g. "Alto sax (Mib)" */
  label: string;
  /** short toolbar badge */
  badge: string;
  /** name used inside sentences, e.g. "kèn alto" */
  name: string;
  semitones: number;
  /** saxophone: gets a range check and auto octave */
  sax: boolean;
}

/** instrument presets, in UI order */
export const HORN_PRESETS: HornPresetInfo[] = [
  { id: "concert", label: "Concert (C)", badge: "C", name: "concert", semitones: 0, sax: false },
  { id: "alto", label: "Alto sax (Mib)", badge: "Alto", name: "kèn alto", semitones: 9, sax: true },
  { id: "tenor", label: "Tenor sax (Sib)", badge: "Tenor", name: "kèn tenor", semitones: 2, sax: true },
  { id: "soprano", label: "Soprano sax (Sib)", badge: "Sop", name: "kèn soprano", semitones: 2, sax: true },
  { id: "baritone", label: "Baritone sax (Mib)", badge: "Bari", name: "kèn baritone", semitones: 9, sax: true },
];

/** preset info; null for "custom" / unknown */
export function hornPreset(id: HornPreset | undefined): HornPresetInfo | null {
  return HORN_PRESETS.find((p) => p.id === id) ?? null;
}

export function isSaxPreset(id: HornPreset | undefined): boolean {
  return hornPreset(id)?.sax ?? false;
}

/** preset for a legacy value that only stored semitones */
function legacyPreset(semitones: number): HornPreset {
  return semitones === 9 ? "alto" : semitones === 2 ? "tenor" : semitones === 0 ? "concert" : "custom";
}

/** @deprecated legacy C/Bb/Eb presets, superseded by HORN_PRESETS (kept exported for compatibility) */
export type PresetId = "C" | "Bb" | "Eb";
/** @deprecated use HORN_PRESETS */
export const TRANSPOSE_PRESETS: { id: PresetId; label: string; semitones: number }[] = [
  { id: "C", label: "Concert (C)", semitones: 0 },
  { id: "Bb", label: "Sib (Bb) — tenor/soprano", semitones: 2 },
  { id: "Eb", label: "Mib (Eb) — alto/baritone", semitones: 9 },
];

export const SEMITONE_MIN = -11;
export const SEMITONE_MAX = 11;

const mod12 = (n: number) => ((n % 12) + 12) % 12;

export function clampSemitones(n: number) {
  return Math.min(SEMITONE_MAX, Math.max(SEMITONE_MIN, Math.round(n) || 0));
}

export function clampOctave(n: number) {
  return Math.min(1, Math.max(-1, Math.round(n) || 0));
}

const PRESET_IDS: HornPreset[] = ["concert", "soprano", "alto", "tenor", "baritone", "custom"];

/**
 * Normalize a value read from localStorage (fields may be missing / of the wrong type).
 * Legacy values (no `preset`) get a preset derived from semitones (9 → alto, 2 → tenor, 0 → concert,
 * else custom) and `autoOctave: false`, so the octave the user picked earlier is kept.
 */
export function normalizeTranspose(t: Partial<TransposeSetting> | null | undefined): TransposeSetting {
  const spelling = t?.spelling === "sharp" || t?.spelling === "flat" ? t.spelling : "auto";
  let semitones = clampSemitones(Number(t?.semitones));
  const octave = clampOctave(Number(t?.octave));
  const stored = t?.preset && PRESET_IDS.includes(t.preset) ? t.preset : null;
  if (!stored) return { semitones, octave, spelling, preset: legacyPreset(semitones), autoOctave: false };
  const fixed = hornPreset(stored);
  if (fixed) semitones = fixed.semitones;
  return { semitones, octave, spelling, preset: stored, autoOctave: t?.autoOctave === true };
}

/** no transposition at all: shown exactly as written */
export function isIdentity(t: TransposeSetting) {
  return t.semitones === 0 && t.octave === 0;
}

/** @deprecated legacy C/Bb/Eb lookup by semitones; use `preset` / `hornPreset` */
export function presetOf(semitones: number): PresetId | null {
  return TRANSPOSE_PRESETS.find((p) => p.semitones === semitones)?.id ?? null;
}

/**
 * Short toolbar badge: "Alto", "Tenor", "+3", "−2", plus ↑/↓ for a manual octave shift; null when nothing changes.
 * With auto octave there is no arrow (the octave depends on the song).
 */
export function transposeBadge(t: TransposeSetting): string | null {
  if (isIdentity(t)) return null;
  const preset = hornPreset(t.preset ?? legacyPreset(t.semitones));
  const base = preset ? preset.badge : t.semitones > 0 ? `+${t.semitones}` : t.semitones < 0 ? `−${-t.semitones}` : "0";
  if (t.autoOctave && preset?.sax) return base;
  return base + (t.octave > 0 ? "↑" : t.octave < 0 ? "↓" : "");
}

// ---------- nốt cảm âm ----------

const NOTE_PC: Record<NoteName, number> = { Do: 0, Re: 2, Mi: 4, Fa: 5, Sol: 7, La: 9, Si: 11 };

const SHARP_NOTES: [NoteName, Accidental?][] = [
  ["Do"], ["Do", "#"], ["Re"], ["Re", "#"], ["Mi"], ["Fa"], ["Fa", "#"], ["Sol"], ["Sol", "#"], ["La"], ["La", "#"], ["Si"],
];
const FLAT_NOTES: [NoteName, Accidental?][] = [
  ["Do"], ["Re", "b"], ["Re"], ["Mi", "b"], ["Mi"], ["Fa"], ["Sol", "b"], ["Sol"], ["La", "b"], ["La"], ["Si", "b"], ["Si"],
];

export interface NoteValue {
  note: NoteName;
  octave: number;
  accidental?: Accidental;
}

/** số bán cung tính từ Do1 (Do1 = 0, Do2 = 12, Si0 = −1) */
export function noteToSemitone(n: NoteValue): number {
  const acc = n.accidental === "#" ? 1 : n.accidental === "b" ? -1 : 0;
  return (n.octave - 1) * 12 + NOTE_PC[n.note] + acc;
}

export function semitoneToNote(abs: number, spelling: Spelling): NoteValue {
  const pc = mod12(abs);
  const octave = Math.floor(abs / 12) + 1;
  const [note, accidental] = (spelling === "flat" ? FLAT_NOTES : SHARP_NOTES)[pc];
  return accidental ? { note, octave, accidental } : { note, octave };
}

export function transposeNote(token: NoteValue, semitones: number, spelling: Spelling, octaveShift = 0): NoteValue {
  return semitoneToNote(noteToSemitone(token) + semitones + octaveShift * 12, spelling);
}

// ---------- hợp âm ----------

const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SHARP_ROOTS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_ROOTS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

const CHORD_PARTS = /^(\(?)([A-G])([#b♯♭]?)(.*?)(?:\/([A-G])([#b♯♭]?))?(\)?)$/;

function rootPc(letter: string, acc: string | undefined) {
  return mod12(LETTER_PC[letter] + (acc === "#" || acc === "♯" ? 1 : acc === "b" || acc === "♭" ? -1 : 0));
}

function rootName(pc: number, spelling: Spelling) {
  return (spelling === "flat" ? FLAT_ROOTS : SHARP_ROOTS)[mod12(pc)];
}

/** dịch một hợp âm: "F#m7/C#" +2 → "G#m7/D#". Không phải hợp âm → trả nguyên. */
export function transposeChord(chord: string, semitones: number, spelling: Spelling): string {
  const m = CHORD_PARTS.exec(chord);
  if (!m) return chord;
  const [, open, letter, acc, quality, bassLetter, bassAcc, close] = m;
  const root = rootName(rootPc(letter, acc) + semitones, spelling);
  const bass = bassLetter ? "/" + rootName(rootPc(bassLetter, bassAcc) + semitones, spelling) : "";
  return `${open}${root}${quality}${bass}${close}`;
}

/**
 * dịch cả dòng hợp âm mà vẫn giữ cột: mỗi hợp âm bắt đầu đúng cột cũ (để thẳng chữ trong lời bên dưới).
 * Hợp âm dài ra thì lấn vào khoảng trắng phía sau, ngắn lại thì bù thêm khoảng trắng;
 * khi khoảng trắng không đủ thì chừa đúng 1 dấu cách và đẩy hợp âm sau sang phải.
 */
export function transposeChordLine(line: string, semitones: number, spelling: Spelling): string {
  let out = "";
  for (const m of line.matchAll(/\S+/g)) {
    const word = m[0];
    const col = m.index ?? 0;
    const next = isChordToken(word) ? transposeChord(word, semitones, spelling) : word;
    if (out.length < col) out += " ".repeat(col - out.length);
    else if (out.length > 0) out += " ";
    out += next;
  }
  return out;
}

/** giọng trưởng (0..11) suy từ hợp âm: Am → C (9+3), F → F; không đọc được → null */
export function keyFromChord(chord: string): number | null {
  const m = CHORD_PARTS.exec(chord);
  if (!m) return null;
  const pc = rootPc(m[2], m[3]);
  const minor = /^(m(?!aj)|min)/.test(m[4]);
  return minor ? mod12(pc + 3) : pc;
}

/** giọng gốc của bài = hợp âm đầu tiên (dòng hợp âm hoặc [hợp âm chèn]); không có → C (0) */
export function detectKeyPc(sections: Section[]): number {
  for (const sec of sections) {
    for (const row of sec.rows) {
      const candidates: string[] = [];
      if (row.chords) candidates.push(...row.chords.trim().split(/\s+/));
      if (row.lyric) for (const seg of splitInlineChords(row.lyric) ?? []) if (seg.chord) candidates.push(seg.chord);
      for (const c of candidates) {
        if (!isChordToken(c)) continue;
        const k = keyFromChord(c);
        if (k !== null) return k;
      }
    }
  }
  return 0;
}

const FLAT_KEYS = new Set([1, 3, 5, 8, 10]); // Db, Eb, F, Ab, Bb

/** "auto": giọng đích là giọng giáng → b, còn lại → # */
export function resolveSpelling(pref: SpellingPref, semitones: number, fromKeyPc = 0): Spelling {
  if (pref !== "auto") return pref;
  return FLAT_KEYS.has(mod12(fromKeyPc + semitones)) ? "flat" : "sharp";
}
