/**
 * Instrument handling for the practice page, built on the shared horn presets (`HORN_PRESETS`)
 * and the shared `gm:transpose` setting used by the Stage.
 */
import { SAX_WRITTEN_RANGE, type WrittenRange } from "@/lib/notation/range";
import { hornPreset, type HornPreset, type TransposeSetting } from "@/lib/notation/transpose";

/**
 * Written range used to place and check practice notes; null = no range (concert / custom).
 * This is the single place the range is looked up: swap the body for `rangeFor(preset)` once it exists.
 */
export function practiceRange(preset: HornPreset | undefined): WrittenRange | null {
  return hornPreset(preset)?.sax ? SAX_WRITTEN_RANGE : null;
}

/** octaves a sax sounds below the preset's `semitones` (tenor / baritone sound an extra octave lower) */
const SAX_SOUNDING_OCTAVE: Partial<Record<HornPreset, number>> = { soprano: 0, alto: 0, tenor: 1, baritone: 1 };

/**
 * The setting the practice page actually plays with. Sax presets use the horn's real sounding pitch
 * (written C4 on tenor = Bb2), ignoring the per-song octave stored for the Stage; concert / custom keep
 * the stored semitones and octave.
 */
export function practiceTranspose(t: TransposeSetting): TransposeSetting {
  const p = hornPreset(t.preset);
  if (!p?.sax) return t;
  return { ...t, semitones: p.semitones, octave: SAX_SOUNDING_OCTAVE[p.id] ?? 0 };
}

/** the stored setting after picking a preset in the practice page (same shape the Stage writes) */
export function selectPreset(t: TransposeSetting, id: HornPreset): TransposeSetting {
  const p = hornPreset(id);
  if (!p) return { ...t, preset: "custom" };
  return { ...t, preset: p.id, semitones: p.semitones, autoOctave: p.sax };
}
