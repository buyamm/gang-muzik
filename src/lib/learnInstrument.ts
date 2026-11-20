import { familyOf, type HornPreset } from "@/lib/notation/transpose";
import { readScalarPref, writePref } from "@/lib/prefs";

/** instrument whose fingerings are shown: saxophone or sáo trúc 6 lỗ */
export type LearnInstrument = "sax" | "sao";

/** fingering diagram used with the concert / custom presets */
export const LEARN_INSTRUMENT_KEY = "gm:learn-instrument";

export const isLearnInstrument = (v: unknown): v is LearnInstrument => v === "sax" || v === "sao";

export function readLearnInstrument(): LearnInstrument {
  return readScalarPref<LearnInstrument>(LEARN_INSTRUMENT_KEY, "sax", isLearnInstrument);
}

export function writeLearnInstrument(v: LearnInstrument) {
  writePref(LEARN_INSTRUMENT_KEY, v);
}

/** sax / sáo presets pick their own diagram; concert and custom fall back to the stored preference */
export function instrumentForPreset(preset: HornPreset | undefined, fallback: LearnInstrument): LearnInstrument {
  const f = familyOf(preset);
  return f === "sax" || f === "sao" ? f : fallback;
}
