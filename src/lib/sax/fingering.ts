/**
 * Standard saxophone fingerings for the written range Bb3..F#6, i.e. cảm âm Sib0..Fa#3
 * (Do1 = written C4 = semitone 0, see `noteToSemitone`). The same fingerings apply to every
 * saxophone (soprano / alto / tenor / baritone) because sax parts are written transposed.
 *
 * Verification notes (2026-11-20):
 * - Low C#, B, Bb are played with the left-pinky table keys only; the right-pinky low C key is
 *   not needed. On modern saxes the low B key closes the C# and C pads through the key linkage and
 *   the Bb touch is tabbed onto the B touch. Low C# only closes the C# pad (the open C tone hole
 *   is what sounds C#), so adding low C there would sound C instead.
 *   Sources: MusicMedic "Understanding the Left Hand Table" (B/Bb touch tab, G# tab), Jazzfuel
 *   "Saxophone Keys Guide" (left-pinky table for C#/B/Bb, right pinky for low C), the Yamaha /
 *   BetterSax / Sax Station charts (left-pinky key only for low B and Bb).
 * - High F#: high F fingering (octave + palm D, Eb, F + side E) plus the right-hand high F# key,
 *   which only exists on modern horns (Jazzfuel, Sax Station). Players without it use the front F
 *   or altissimo fingerings, so the entry carries a note.
 * - Middle Bb: bis is the standard fingering; "1 and 1" and the side Bb key are listed as alternates.
 * - Known-bad source: tunable.pages.dev (wrong on written Bb4 and F#6).
 */

import { semitoneToNote, type NoteValue } from "@/lib/notation/transpose";

export type SaxKey =
  | "octave"
  | "palmD"
  | "palmEb"
  | "palmF"
  | "frontF"
  | "l1"
  | "bis"
  | "l2"
  | "l3"
  | "gSharp"
  | "lowCSharp"
  | "lowB"
  | "lowBb"
  | "r1"
  | "r2"
  | "r3"
  | "sideE"
  | "sideC"
  | "sideBb"
  | "highFSharp"
  | "lowEb"
  | "lowC";

export const SAX_KEYS: SaxKey[] = [
  "octave",
  "palmD",
  "palmEb",
  "palmF",
  "frontF",
  "l1",
  "bis",
  "l2",
  "l3",
  "gSharp",
  "lowCSharp",
  "lowB",
  "lowBb",
  "r1",
  "r2",
  "r3",
  "sideE",
  "sideC",
  "sideBb",
  "highFSharp",
  "lowEb",
  "lowC",
];

/** Vietnamese key names, for aria-labels and legends */
export const SAX_KEY_LABELS: Record<SaxKey, string> = {
  octave: "phím octave (ngón cái trái)",
  palmD: "phím tay Re",
  palmEb: "phím tay Mib",
  palmF: "phím tay Fa",
  frontF: "phím Fa trước",
  l1: "ngón trỏ trái",
  bis: "phím bis",
  l2: "ngón giữa trái",
  l3: "ngón áp út trái",
  gSharp: "phím Sol# (út trái)",
  lowCSharp: "phím Do# trầm (út trái)",
  lowB: "phím Si trầm (út trái)",
  lowBb: "phím Sib trầm (út trái)",
  r1: "ngón trỏ phải",
  r2: "ngón giữa phải",
  r3: "ngón áp út phải",
  sideE: "phím cạnh Mi",
  sideC: "phím cạnh Do",
  sideBb: "phím cạnh Sib",
  highFSharp: "phím Fa# cao",
  lowEb: "phím Mib (út phải)",
  lowC: "phím Do trầm (út phải)",
};

export interface Fingering {
  keys: SaxKey[];
  alts?: { label: string; keys: SaxKey[] }[];
  note?: string;
}

/** lowest / highest written semitone covered (Sib0 = −2, Fa#3 = 30) */
export const FINGERING_LOW = -2;
export const FINGERING_HIGH = 30;

const SIX: SaxKey[] = ["l1", "l2", "l3", "r1", "r2", "r3"];

/** low octave, written Bb3 (−2) .. C#5 (13) */
const LOW: Record<number, Fingering> = {
  [-2]: { keys: [...SIX, "lowBb"] },
  [-1]: { keys: [...SIX, "lowB"] },
  0: { keys: [...SIX, "lowC"] },
  1: { keys: [...SIX, "lowCSharp"] },
  2: { keys: [...SIX] },
  3: { keys: [...SIX, "lowEb"] },
  4: { keys: ["l1", "l2", "l3", "r1", "r2"] },
  5: { keys: ["l1", "l2", "l3", "r1"] },
  6: { keys: ["l1", "l2", "l3", "r2"] },
  7: { keys: ["l1", "l2", "l3"] },
  8: { keys: ["l1", "l2", "l3", "gSharp"] },
  9: { keys: ["l1", "l2"] },
  10: {
    keys: ["l1", "bis"],
    alts: [
      { label: "1 và 1", keys: ["l1", "r1"] },
      { label: "Phím cạnh Sib", keys: ["l1", "sideBb"] },
    ],
  },
  11: { keys: ["l1"] },
  12: { keys: ["l2"], alts: [{ label: "Phím cạnh Do", keys: ["l1", "sideC"] }] },
  13: { keys: [] },
};

const withOctave = (f: Fingering): Fingering => ({
  keys: ["octave", ...f.keys],
  ...(f.alts && { alts: f.alts.map((a) => ({ label: a.label, keys: ["octave", ...a.keys] as SaxKey[] })) }),
});

const HIGH_F: SaxKey[] = ["octave", "palmD", "palmEb", "sideE", "palmF"];

function build(): Record<number, Fingering> {
  const table: Record<number, Fingering> = { ...LOW };
  // written D5 (14) .. C#6 (25): octave key + the fingering one octave lower
  for (let s = 14; s <= 25; s++) table[s] = withOctave(LOW[s - 12]);
  table[26] = { keys: ["octave", "palmD"] };
  table[27] = { keys: ["octave", "palmD", "palmEb"] };
  table[28] = { keys: ["octave", "palmD", "palmEb", "sideE"] };
  table[29] = { keys: [...HIGH_F] };
  table[30] = { keys: [...HIGH_F, "highFSharp"], note: "Cần kèn có phím Fa# cao" };
  return table;
}

export const FINGERINGS: Readonly<Record<number, Fingering>> = build();

/** fingering for a written semitone (from Do1); null when outside the sax range */
export function fingeringFor(semi: number): Fingering | null {
  return FINGERINGS[semi] ?? null;
}

/** written note at a semitone, spelled the way sax charts name it (Mib, Sib; Do#, Fa#, Sol#) */
export function saxNoteAt(semi: number): NoteValue {
  const pc = ((semi % 12) + 12) % 12;
  return semitoneToNote(semi, pc === 3 || pc === 10 ? "flat" : "sharp");
}
