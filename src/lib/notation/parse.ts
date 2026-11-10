/**
 * Parser cho bản nhạc dạng chữ — dùng cho mọi nhạc cụ:
 * - Cảm âm: một dòng lời, ngay dưới là một dòng nốt (Sol La Si Re2 ...)
 * - Hợp âm: một dòng hợp âm (Am  C  G7) đặt trên dòng lời, hoặc chèn trong lời: [Am]Đường về [C]chiều
 * - Tab guitar/bass: các dòng như  e|---0---3---|
 * Dòng trống = ngắt đoạn.
 */

export type NoteName = "Do" | "Re" | "Mi" | "Fa" | "Sol" | "La" | "Si";
export const NOTE_ORDER: NoteName[] = ["Do", "Re", "Mi", "Fa", "Sol", "La", "Si"];

export type Token =
  | { type: "note"; text: string; note: NoteName; octave: number }
  | { type: "sep"; text: string }
  | { type: "text"; text: string };

export interface Row {
  lyric?: string;
  notes?: Token[];
  /** dòng hợp âm, giữ nguyên khoảng trắng để canh đúng chữ bên dưới */
  chords?: string;
  /** khối tab (mỗi phần tử một dòng) */
  tab?: string[];
}

export interface LyricSegment {
  chord?: string;
  text: string;
}

export interface Section {
  rows: Row[];
}

const NOTE_ALIASES: Record<string, NoteName> = {
  do: "Do", "đô": "Do", "đo": "Do", d: "Do",
  re: "Re", "rê": "Re", r: "Re",
  mi: "Mi", m: "Mi",
  fa: "Fa", pha: "Fa", f: "Fa",
  sol: "Sol", son: "Sol", s: "Sol",
  la: "La", l: "La",
  si: "Si", xi: "Si",
};

const NOTE_RE = /^(đô|đo|do|rê|re|mi|pha|fa|sol|son|la|si|xi|d|r|m|f|s|l)(\d)?(['’]*)$/i;

export function matchNote(word: string): { note: NoteName; octave: number } | null {
  const m = NOTE_RE.exec(word.normalize("NFC"));
  if (!m) return null;
  const note = NOTE_ALIASES[m[1].toLowerCase()];
  if (!note) return null;
  const primes = m[3]?.length ?? 0;
  const octave = m[2] ? Number(m[2]) : 1 + primes;
  return { note, octave };
}

/** tách một dòng nốt thành token, giữ nguyên dấu nối (-), dấu chấm, phẩy... */
export function tokenizeNotes(line: string): Token[] {
  const tokens: Token[] = [];
  const parts = line.trim().split(/(\s+|[-–.,;:|/()~]+)/);
  for (const part of parts) {
    if (!part) continue;
    if (/^\s+$/.test(part)) {
      tokens.push({ type: "sep", text: " " });
      continue;
    }
    if (/^[-–.,;:|/()~]+$/.test(part)) {
      tokens.push({ type: "sep", text: part });
      continue;
    }
    const n = matchNote(part);
    tokens.push(n ? { type: "note", text: part, ...n } : { type: "text", text: part });
  }
  return tokens;
}

/** dòng được coi là dòng nốt khi ≥ 60% từ là nốt nhạc */
export function isNoteLine(line: string): boolean {
  const words = line
    .split(/[\s\-–.,;:|/()~]+/)
    .map((w) => w.trim())
    .filter(Boolean);
  if (!words.length) return false;
  const notes = words.filter((w) => matchNote(w)).length;
  return notes > 0 && notes / words.length >= 0.6;
}

const CHORD_RE =
  /^\(?[A-G](?:#|b|♯|♭)?(?:maj|min|dim|aug|sus|add|m|M|\+|°|ø)?\d*(?:(?:sus|add|maj|b|#)\d+)*(?:\/[A-G](?:#|b)?)?\)?$/;
const CHORD_FILLER = /^(?:\||\|\||-|\/|x\d+|N\.?C\.?|\.|%)$/i;

export function isChordToken(word: string): boolean {
  return CHORD_RE.test(word);
}

/** dòng chỉ gồm hợp âm (Am  C  G7  F/A) */
export function isChordLine(line: string): boolean {
  const words = line.trim().split(/\s+/).filter((w) => w && !CHORD_FILLER.test(w));
  if (!words.length || !words.every(isChordToken)) return false;
  // "D F" có thể là nốt cảm âm viết tắt — chỉ coi là hợp âm khi có dấu hiệu rõ ràng
  return words.some((w) => /[ABCEG]|[m#b\d/+°ø]/.test(w.slice(0, 1) === "D" || w.slice(0, 1) === "F" ? w.slice(1) : w));
}

/** dòng tab: e|---0---|, B|-1-3-|, ... */
export function isTabLine(line: string): boolean {
  const t = line.trim();
  return /^[A-Ga-g][#b]?\s*[|:]/.test(t) && /[-–]{2,}/.test(t);
}

/** tách lời có hợp âm chèn: "[Am]Đường về [C]chiều" */
export function splitInlineChords(lyric: string): LyricSegment[] | null {
  if (!/\[[^\]]+\]/.test(lyric)) return null;
  const segs: LyricSegment[] = [];
  const re = /\[([^\]]+)\]/g;
  let last = 0;
  let chord: string | undefined;
  let m: RegExpExecArray | null;
  while ((m = re.exec(lyric))) {
    const text = lyric.slice(last, m.index);
    if (text || chord) segs.push({ chord, text });
    chord = m[1].trim();
    last = m.index + m[0].length;
  }
  segs.push({ chord, text: lyric.slice(last) });
  return segs;
}

export function parseNotation(text: string): Section[] {
  const sections: Section[] = [];
  let rows: Row[] = [];
  let pendingChords: string | undefined;
  let pendingLyric: string | undefined;

  const flushPending = () => {
    if (pendingChords !== undefined || pendingLyric !== undefined) {
      const row: Row = {};
      if (pendingChords !== undefined) row.chords = pendingChords;
      if (pendingLyric !== undefined) row.lyric = pendingLyric;
      rows.push(row);
    }
    pendingChords = undefined;
    pendingLyric = undefined;
  };
  const flushSection = () => {
    flushPending();
    if (rows.length) sections.push({ rows });
    rows = [];
  };

  let lastWasTab = false;
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    const keep = raw.replace(/\s+$/, "").replace(/\t/g, "    ");
    if (!line) {
      flushSection();
      lastWasTab = false;
      continue;
    }
    if (isTabLine(line)) {
      flushPending();
      const prev = rows[rows.length - 1];
      if (lastWasTab && prev?.tab) prev.tab.push(keep);
      else rows.push({ tab: [keep] });
      lastWasTab = true;
      continue;
    }
    lastWasTab = false;
    if (isChordLine(line)) {
      flushPending();
      pendingChords = keep;
    } else if (isNoteLine(line)) {
      const row: Row = { notes: tokenizeNotes(line) };
      if (pendingChords !== undefined) row.chords = pendingChords;
      if (pendingLyric !== undefined) row.lyric = pendingLyric;
      rows.push(row);
      pendingChords = undefined;
      pendingLyric = undefined;
    } else {
      if (pendingLyric !== undefined) flushPending();
      // có dòng hợp âm phía trên: giữ khoảng trắng đầu dòng để canh cột
      pendingLyric = pendingChords !== undefined ? keep : line;
    }
  }
  flushSection();
  return sections;
}
