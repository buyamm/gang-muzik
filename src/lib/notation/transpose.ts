/**
 * Dịch giọng (transpose) cho nhạc cụ dịch giọng — saxophone, kèn, clarinet...
 *
 * - Nốt cảm âm: Do1 = 0 bán cung, mỗi quãng tám +12. `transposeNote` cộng n bán cung (+ dịch quãng tám)
 *   rồi viết lại tên nốt theo kiểu dấu (# hoặc b).
 * - Hợp âm: dịch gốc và bass sau "/", giữ nguyên phần tính chất (m7, sus4, b5, add9...).
 * - Kiểu dấu "auto": giọng đích (giọng gốc của bài + n) là giọng giáng (F, Bb, Eb, Ab, Db) → dùng b,
 *   còn lại dùng #. Giọng gốc lấy từ hợp âm đầu tiên của bài (hợp âm thứ → giọng trưởng song song),
 *   bài không có hợp âm thì coi như giọng C.
 * - Preset: nhạc cụ Bb (tenor/soprano sax, trumpet, clarinet) viết cao hơn concert 1 cung (+2);
 *   nhạc cụ Eb (alto/baritone sax) viết cao hơn concert một quãng 6 trưởng (+9).
 */
import { isChordToken, splitInlineChords, type Accidental, type NoteName, type Section } from "./parse";

export type Spelling = "sharp" | "flat";
export type SpellingPref = Spelling | "auto";

export interface TransposeSetting {
  /** bán cung, −11..+11 */
  semitones: number;
  /** dịch quãng tám khi hiện cảm âm: −1, 0, +1 */
  octave: number;
  spelling: SpellingPref;
}

export const NO_TRANSPOSE: TransposeSetting = { semitones: 0, octave: 0, spelling: "auto" };

export type PresetId = "C" | "Bb" | "Eb";
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

/** chuẩn hoá giá trị đọc từ localStorage (có thể thiếu / sai kiểu) */
export function normalizeTranspose(t: Partial<TransposeSetting> | null | undefined): TransposeSetting {
  const spelling = t?.spelling === "sharp" || t?.spelling === "flat" ? t.spelling : "auto";
  return { semitones: clampSemitones(Number(t?.semitones)), octave: clampOctave(Number(t?.octave)), spelling };
}

/** không dịch gì — hiển thị y như bản gốc */
export function isIdentity(t: TransposeSetting) {
  return t.semitones === 0 && t.octave === 0;
}

export function presetOf(semitones: number): PresetId | null {
  return TRANSPOSE_PRESETS.find((p) => p.semitones === semitones)?.id ?? null;
}

/** nhãn ngắn trên nút: "Eb", "Bb", "+3", "−2", kèm ↑/↓ khi dịch quãng tám; null khi không dịch */
export function transposeBadge(t: TransposeSetting): string | null {
  if (isIdentity(t)) return null;
  const preset = presetOf(t.semitones);
  const base = preset ?? (t.semitones > 0 ? `+${t.semitones}` : `−${-t.semitones}`);
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

// ---------- song key ("C", "Am", "F#m", "Bb") ----------

const KEY_NAME = /^([A-G])([#b]?)(m?)$/;
/** canonical root spelling for key names (matches the Studio key picker) */
export const KEY_ROOTS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

function parseKeyName(key: string | null | undefined): { pc: number; minor: boolean } | null {
  const m = KEY_NAME.exec(key ?? "");
  if (!m) return null;
  return { pc: rootPc(m[1], m[2]), minor: m[3] === "m" };
}

/** major key pc (0..11) used for accidental spelling; a minor key maps to its relative major (Am → C = 0) */
export function keyMajorPc(key: string | null | undefined): number | null {
  const k = parseKeyName(key);
  if (!k) return null;
  return k.minor ? mod12(k.pc + 3) : k.pc;
}

/** tonic pc (0..11) of the key, e.g. for a drone (Am → A = 9) */
export function keyRootPc(key: string | null | undefined): number | null {
  return parseKeyName(key)?.pc ?? null;
}

/** guess the song key from its first chord ("Am7" → "Am", "Bb/D" → "Bb"); no chord → null */
export function guessKeyName(sections: Section[]): string | null {
  for (const sec of sections) {
    for (const row of sec.rows) {
      const candidates: string[] = [];
      if (row.chords) candidates.push(...row.chords.trim().split(/\s+/));
      if (row.lyric) for (const seg of splitInlineChords(row.lyric) ?? []) if (seg.chord) candidates.push(seg.chord);
      for (const c of candidates) {
        if (!isChordToken(c)) continue;
        const m = CHORD_PARTS.exec(c);
        if (!m) continue;
        const minor = /^(m(?!aj)|min)/.test(m[4]);
        return KEY_ROOTS[rootPc(m[2], m[3])] + (minor ? "m" : "");
      }
    }
  }
  return null;
}

/** transpose a key name: "Am" +9 sharp → "F#m"; invalid key → returned unchanged */
export function transposeKeyName(key: string, semitones: number, spelling: Spelling): string {
  if (!parseKeyName(key)) return key;
  return transposeChord(key, semitones, spelling);
}

/** display form of a key name with music glyphs: "F#m" → "F♯m", "Bb" → "B♭" */
export function formatKeyName(key: string): string {
  return key.replace(/^([A-G])#/, "$1♯").replace(/^([A-G])b/, "$1♭");
}
