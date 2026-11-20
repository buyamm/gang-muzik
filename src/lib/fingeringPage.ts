/**
 * State of the /fingering page as URL search params (shareable): `?i=sax&t=alto&n=Sib1`.
 * - i: "sax" | "sao"
 * - t: sax type (alto, tenor, soprano, baritone) or sáo key (do, re, mi, fa, sol, la, sib)
 * - n: written note in cảm âm ASCII form ("Sib1", "Do#2"), relative to the instrument
 */
import { SAO_KEYS, noteToSemitone, type NoteValue, type SaoPreset } from "@/lib/notation/transpose";
import { FINGERING_HIGH, FINGERING_LOW, saxNoteAt } from "@/lib/sax/fingering";
import { SAO_HIGH, SAO_LOW, saoNoteAt } from "@/lib/sao/fingering";
import type { LearnInstrument } from "@/lib/learnInstrument";

export interface InstrumentType {
  id: string;
  label: string;
  /** semitones from C4 of the sound for written Do1 (concert = written + offset) */
  offset: number;
  /** key in Vietnamese, e.g. "Mib", for the description line */
  key: string;
}

/** written C4 sounds: alto Eb3, tenor Bb2, soprano Bb3, baritone Eb2 */
export const SAX_TYPES: InstrumentType[] = [
  { id: "alto", label: "Alto", offset: -9, key: "Mib" },
  { id: "tenor", label: "Tenor", offset: -14, key: "Sib" },
  { id: "soprano", label: "Soprano", offset: -2, key: "Sib" },
  { id: "baritone", label: "Baritone", offset: -21, key: "Mib" },
];

const SAO_TYPE_IDS: Record<SaoPreset, string> = {
  "sao-c": "do",
  "sao-d": "re",
  "sao-e": "mi",
  "sao-f": "fa",
  "sao-g": "sol",
  "sao-a": "la",
  "sao-bb": "sib",
};

export const SAO_TYPES: InstrumentType[] = SAO_KEYS.map((k) => ({
  id: SAO_TYPE_IDS[k.id],
  label: `Sáo ${k.solfege}`,
  offset: k.concert,
  key: k.solfege,
}));

export const typesFor = (i: LearnInstrument) => (i === "sax" ? SAX_TYPES : SAO_TYPES);

/** written range of the fingering tables */
export const rangeOf = (i: LearnInstrument) =>
  i === "sax" ? { low: FINGERING_LOW, high: FINGERING_HIGH } : { low: SAO_LOW, high: SAO_HIGH };

export const noteAt = (i: LearnInstrument, semi: number): NoteValue => (i === "sax" ? saxNoteAt(semi) : saoNoteAt(semi));

/** "Sib1", "Do#2" (ASCII, for URLs) */
export function noteParam(n: NoteValue): string {
  return `${n.note}${n.accidental ?? ""}${n.octave}`;
}

const NOTE_PARAM = /^(Do|Re|Mi|Fa|Sol|La|Si)([#b]?)(-?\d)$/;

/** "Sib1" → 10; also accepts ♯/♭ glyphs and lowercase; invalid → null */
export function parseNoteParam(s: string | null | undefined): number | null {
  const t = (s ?? "").trim().replace(/♯/g, "#").replace(/♭/g, "b");
  const m = NOTE_PARAM.exec(t.charAt(0).toUpperCase() + t.slice(1));
  if (!m) return null;
  return noteToSemitone({ note: m[1] as NoteValue["note"], accidental: (m[2] || undefined) as NoteValue["accidental"], octave: Number(m[3]) });
}

export interface FingeringPageState {
  instrument: LearnInstrument;
  type: string;
  /** written semitone, always within the instrument's table */
  semi: number;
}

/** default note per instrument: Sol1 on sax (first note learners play), Đô1 on sáo */
const DEFAULT_SEMI: Record<LearnInstrument, number> = { sax: 7, sao: 0 };

export function parseFingeringParams(p: URLSearchParams, fallbackInstrument: LearnInstrument = "sax"): FingeringPageState {
  const raw = p.get("i");
  const instrument: LearnInstrument = raw === "sax" || raw === "sao" ? raw : fallbackInstrument;
  const types = typesFor(instrument);
  const type = types.find((t) => t.id === p.get("t"))?.id ?? types[0].id;
  const r = rangeOf(instrument);
  const n = parseNoteParam(p.get("n"));
  const semi = n !== null && n >= r.low && n <= r.high ? n : DEFAULT_SEMI[instrument];
  return { instrument, type, semi };
}

export function fingeringSearch(s: FingeringPageState): string {
  const p = new URLSearchParams({ i: s.instrument, t: s.type, n: noteParam(noteAt(s.instrument, s.semi)) });
  return `?${p.toString()}`;
}

/** link to the fingering page; type/note optional */
export function fingeringPageUrl(instrument: LearnInstrument, semi?: number | null): string {
  const p = new URLSearchParams({ i: instrument });
  if (semi !== null && semi !== undefined) p.set("n", noteParam(noteAt(instrument, semi)));
  return `/fingering?${p.toString()}`;
}

/** concert pitch (Hz) of a written note on the chosen instrument type */
export function concertFrequency(instrument: LearnInstrument, type: string, semi: number): number {
  const t = typesFor(instrument).find((x) => x.id === type) ?? typesFor(instrument)[0];
  return 261.6256 * 2 ** ((semi + t.offset) / 12);
}
