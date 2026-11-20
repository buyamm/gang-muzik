/**
 * Fingerings for the Vietnamese 6-hole bamboo flute (sáo trúc 6 lỗ), by written note relative to the
 * flute: Do1 = all six holes closed = semitone 0, up to Do3 = 24 (`noteToSemitone`). A sáo is named after
 * that lowest note (sáo Rê: all closed sounds D), so the same table serves every sáo.
 *
 * Conventions
 * - `holes[0]` is hole 1, the finger hole NEAREST the blow hole (left index finger);
 *   `holes[5]` is hole 6, nearest the far end (right ring finger). Left hand covers holes 1–3, right hand 4–6.
 * - Each hole is "closed" (fully covered), "half" (half covered: slide the finger off about half the hole)
 *   or "open".
 * - `breath`: "soft" = octave 1, "strong" = octave 2 (same fingering, faster air), "very-strong" = octave 3.
 *
 * Sources (checked 2026-11-20)
 * - unica.vn/blog/cach-bam-cac-not-tren-sao-truc: all closed = Đô, opening holes from hole 6 upward gives
 *   Rê, Mi, Fa, Sol, La, Si (all six open = Si), blown softly; "Đố" = hole 1 open, the other five closed.
 * - vi.wikipedia.org/wiki/Sáo_trúc: the same octave-1 sequence ("thổi nhẹ ra nốt Đô"); octave 2 uses the
 *   same fingering with stronger air; octave 3 needs special fingerings (not described).
 * - cungtapnhac.com/bai-viet/sao-truc-can-ban: the key is the note with all holes closed; sáo Đô spans
 *   Đô1–Đô3; left hand covers the upper three holes, right hand the lower three.
 * - hocthoisao.com/sao-do-c5-la-gi, saotruchoanganh.com: all closed = Đô on a sáo Đô (C5).
 *
 * Uncertain (`uncertain: true`): no Vietnamese source above gives a chart for the half-hole semitones,
 * the cross-fingered Sib or the third octave. Those entries follow the usual practice on 6-hole diatonic
 * flutes (half-holing; overblowing to the 3rd/4th harmonic: harmonic 3 = an octave + a fifth above the
 * fingered note, harmonic 4 = two octaves) and should be checked by ear with a tuner.
 */

import { semitoneToNote, type NoteValue } from "@/lib/notation/transpose";

export type HoleState = "closed" | "half" | "open";
export type SaoHoles = readonly [HoleState, HoleState, HoleState, HoleState, HoleState, HoleState];
export type Breath = "soft" | "strong" | "very-strong";

export interface SaoOption {
  holes: SaoHoles;
  breath: Breath;
  /** not confirmed by a Vietnamese source: check by ear */
  uncertain?: boolean;
}

export interface SaoAlt extends SaoOption {
  label: string;
  /** when to use it (Vietnamese) */
  description: string;
}

export interface SaoFingering extends SaoOption {
  /** extra advice for the main fingering (Vietnamese) */
  note?: string;
  alts?: SaoAlt[];
}

export const SAO_LOW = 0;
export const SAO_HIGH = 24;
export const SAO_HOLE_COUNT = 6;

export const BREATH_LABELS: Record<Breath, string> = {
  soft: "Thổi nhẹ",
  strong: "Thổi mạnh",
  "very-strong": "Thổi rất mạnh",
};

/** "XXXXXO" → holes (X closed, H half, O open), hole 1 first */
function h(code: string): SaoHoles {
  const map: Record<string, HoleState> = { X: "closed", H: "half", O: "open" };
  const out = [...code].map((c) => map[c]);
  if (out.length !== SAO_HOLE_COUNT || out.some((s) => !s)) throw new Error(`bad hole code ${code}`);
  return out as unknown as SaoHoles;
}

const HALF_NOTE = "Bịt nửa lỗ: cao độ tuỳ độ hở, nên chỉnh theo máy lên dây.";

/** octave 1 (soft) and the matching octave-2 shape, by semitone within the octave */
const SCALE: { code: string; half?: boolean }[] = [
  { code: "XXXXXX" }, // Do
  { code: "XXXXXH", half: true }, // Do#
  { code: "XXXXXO" }, // Re
  { code: "XXXXHO", half: true }, // Re#
  { code: "XXXXOO" }, // Mi
  { code: "XXXOOO" }, // Fa
  { code: "XXHOOO", half: true }, // Fa#
  { code: "XXOOOO" }, // Sol
  { code: "XHOOOO", half: true }, // Sol#
  { code: "XOOOOO" }, // La
  { code: "HOOOOO", half: true }, // Sib
  { code: "OOOOOO" }, // Si
];

const CROSS_BB: SaoAlt = {
  label: "Bấm chéo",
  holes: h("OXXOOO"),
  breath: "soft",
  uncertain: true,
  description: "Mở lỗ 1, bịt lỗ 2–3. Dễ hơn bịt nửa lỗ 1 khi chơi nhanh; cao độ tuỳ cây sáo, thử với máy lên dây.",
};

function build(): Record<number, SaoFingering> {
  const t: Record<number, SaoFingering> = {};
  for (let i = 0; i < 12; i++) {
    const s = SCALE[i];
    t[i] = { holes: h(s.code), breath: "soft", ...(s.half && { uncertain: true, note: HALF_NOTE }) };
    t[i + 12] = { holes: h(s.code), breath: "strong", ...(s.half && { uncertain: true, note: HALF_NOTE }) };
  }
  t[0].note = "Bịt kín cả 6 lỗ, thổi nhẹ và đều hơi — nốt trầm nhất của sáo.";
  t[10].alts = [CROSS_BB];
  t[22].alts = [{ ...CROSS_BB, breath: "strong" }];

  // Do2: hole 1 vented makes the octave speak easily (unica.vn "Đố")
  t[12] = {
    holes: h("OXXXXX"),
    breath: "strong",
    note: "Mở lỗ 1, bịt 5 lỗ còn lại, thổi mạnh hơn quãng 1.",
    alts: [
      {
        label: "Bịt kín, thổi mạnh",
        holes: h("XXXXXX"),
        breath: "strong",
        description: "Giữ thế Đô1 và tăng hơi lên một quãng tám. Tiện khi nhảy quãng Đô1 → Đô2 mà không đổi ngón.",
      },
    ],
  };
  // harmonic 3 alternates: the fingering a twelfth below, overblown
  t[19].alts = [
    {
      label: "Bồi âm từ Đô1",
      holes: h("XXXXXX"),
      breath: "very-strong",
      uncertain: true,
      description: "Bịt kín 6 lỗ, thổi rất mạnh (bồi âm bậc 3). Tiếng mềm, dùng để luyến từ Đô hoặc làm hiệu ứng.",
    },
  ];
  t[21].alts = [
    {
      label: "Bồi âm từ Rê1",
      holes: h("XXXXXO"),
      breath: "very-strong",
      uncertain: true,
      description: "Thế Rê1, thổi rất mạnh (bồi âm bậc 3). Dùng khi luyến nhanh giữa Rê và La.",
    },
  ];
  t[23].alts = [
    {
      label: "Bồi âm từ Mi1",
      holes: h("XXXXOO"),
      breath: "very-strong",
      uncertain: true,
      description: "Thế Mi1, thổi rất mạnh (bồi âm bậc 3). Tiếng tròn hơn khi Si2 bị chua.",
    },
  ];
  // Do3: top of the range, overblown (third octave)
  t[24] = {
    holes: h("XXXOOO"),
    breath: "very-strong",
    uncertain: true,
    note: "Quãng 3: thế Fa, thổi rất mạnh và khép môi. Tầm cao nhất của sáo 6 lỗ, cần luyện hơi.",
    alts: [
      {
        label: "Bịt kín, thổi rất mạnh",
        holes: h("XXXXXX"),
        breath: "very-strong",
        uncertain: true,
        description: "Bồi âm bậc 4 của Đô1 (hai quãng tám). Khó phát âm, dùng khi vừa chơi Đô1/Đô2.",
      },
      {
        label: "Mở lỗ 1, thổi rất mạnh",
        holes: h("OXXXXX"),
        breath: "very-strong",
        uncertain: true,
        description: "Thế Đô2 thổi mạnh thêm. Dùng khi đi từ Đô2 lên Đô3.",
      },
    ],
  };
  return t;
}

export const SAO_FINGERINGS: Readonly<Record<number, SaoFingering>> = build();

/** fingering for a written semitone relative to the flute; null outside Đô1..Đô3 */
export function saoFingeringFor(semi: number): SaoFingering | null {
  return SAO_FINGERINGS[semi] ?? null;
}

/** written note name the way sáo charts spell it: ♯ except Sib */
export function saoNoteAt(semi: number): NoteValue {
  const pc = ((semi % 12) + 12) % 12;
  return semitoneToNote(semi, pc === 10 ? "flat" : "sharp");
}

const HOLE_WORD: Record<HoleState, string> = { closed: "bịt", half: "bịt nửa", open: "mở" };

/** Vietnamese description for screen readers: "Lỗ 1 bịt, lỗ 2 bịt, … lỗ 6 mở" */
export function describeHoles(holes: readonly HoleState[]): string {
  return holes.map((s, i) => `lỗ ${i + 1} ${HOLE_WORD[s]}`).join(", ");
}
