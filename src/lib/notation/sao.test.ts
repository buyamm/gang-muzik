import { describe, expect, it } from "vitest";
import { parseNotation } from "./parse";
import { bestOctave, rangeFor, resolveShift, SAO_WRITTEN_RANGE, SAX_WRITTEN_RANGE, summarizeRange } from "./range";
import {
  familyOf,
  hasRangeCheck,
  HORN_PRESETS,
  isSaoPreset,
  isSaxPreset,
  normalizeTranspose,
  saoSemitones,
  suggestSaoKey,
  transposeBadge,
  type TransposeSetting,
} from "./transpose";

const song = (notes: string) => parseNotation(`lời bài hát\n${notes}`);

describe("sáo presets", () => {
  it("lists sáo Đô..Sib in order with folded semitones", () => {
    const list = HORN_PRESETS.filter((p) => p.family === "sao");
    expect(list.map((p) => p.badge)).toEqual(["Sáo Đô", "Sáo Rê", "Sáo Mi", "Sáo Fa", "Sáo Sol", "Sáo La", "Sáo Sib"]);
    expect(list.map((p) => p.semitones)).toEqual([0, -2, -4, -5, 5, 3, 2]);
    for (const p of list) {
      expect(p.semitones).toBeGreaterThanOrEqual(-6);
      expect(p.semitones).toBeLessThanOrEqual(5);
      expect(p.sax).toBe(false);
    }
    expect(saoSemitones(7)).toBe(5);
    expect(saoSemitones(6)).toBe(-6);
  });

  it("families and helpers", () => {
    expect(familyOf("alto")).toBe("sax");
    expect(familyOf("sao-d")).toBe("sao");
    expect(familyOf("concert")).toBe("concert");
    expect(familyOf("custom")).toBe("custom");
    expect(familyOf(undefined)).toBe("custom");
    expect(isSaoPreset("sao-g")).toBe(true);
    expect(isSaxPreset("sao-g")).toBe(false);
    expect(hasRangeCheck("sao-g")).toBe(true);
    expect(hasRangeCheck("tenor")).toBe(true);
    expect(hasRangeCheck("concert")).toBe(false);
    for (const p of HORN_PRESETS) expect(p.sax).toBe(p.family === "sax");
  });

  it("normalizes stored sáo settings, fixing semitones from the preset", () => {
    const t = normalizeTranspose({ preset: "sao-d", semitones: 7, octave: 0, spelling: "auto", autoOctave: true });
    expect(t).toMatchObject({ preset: "sao-d", semitones: -2, autoOctave: true });
    expect(transposeBadge(t)).toBe("Sáo Rê");
    expect(transposeBadge({ ...t, autoOctave: false, octave: 1 })).toBe("Sáo Rê↑");
    // sáo Đô transposes nothing but still shows its badge
    expect(transposeBadge(normalizeTranspose({ preset: "sao-c", autoOctave: true }))).toBe("Sáo Đô");
  });
});

describe("rangeFor", () => {
  it("returns the instrument range", () => {
    expect(rangeFor("alto")).toBe(SAX_WRITTEN_RANGE);
    expect(rangeFor("sao-c")).toEqual({ low: 0, high: 24 });
    expect(rangeFor("sao-bb")).toBe(SAO_WRITTEN_RANGE);
    expect(rangeFor("concert")).toBeNull();
    expect(rangeFor("custom")).toBeNull();
  });

  it("auto octave and range check work for sáo", () => {
    // concert Re1..Re2 on sáo Rê = Đô1..Đô2: fits as written
    const s = song("Re1 Mi1 Re2");
    const sd: TransposeSetting = { semitones: -2, octave: 0, spelling: "auto", preset: "sao-d", autoOctave: true };
    expect(bestOctave(s, -2, SAO_WRITTEN_RANGE)).toBe(0);
    const shift = resolveShift(sd, s)!;
    expect(shift.range).toBe(SAO_WRITTEN_RANGE);
    expect(shift.octave).toBe(0);
    expect(summarizeRange(s, shift)!.outOfRange).toBe(0);
    // a low song moves up an octave on the flute
    expect(resolveShift(sd, song("Re0 La0 Re1"))!.octave).toBe(1);
  });

  it("sáo Đô keeps a range check without transposing", () => {
    const s = song("Do1 Re3");
    const sc: TransposeSetting = { semitones: 0, octave: 0, spelling: "auto", preset: "sao-c", autoOctave: false };
    const shift = resolveShift(sc, s)!;
    expect(shift).toMatchObject({ semitones: 0, octave: 0, range: SAO_WRITTEN_RANGE });
    expect(summarizeRange(s, shift)!.outOfRange).toBe(1);
    // concert stays "as written"
    expect(resolveShift({ ...sc, preset: "concert" }, s)).toBeNull();
  });
});

describe("suggestSaoKey", () => {
  it("major key → sáo of the same tonic", () => {
    expect(suggestSaoKey("C")).toBe("sao-c");
    expect(suggestSaoKey("D")).toBe("sao-d");
    expect(suggestSaoKey("G")).toBe("sao-g");
    expect(suggestSaoKey("Bb")).toBe("sao-bb");
    expect(suggestSaoKey("F")).toBe("sao-f");
  });
  it("minor key → relative major", () => {
    expect(suggestSaoKey("Am")).toBe("sao-c");
    expect(suggestSaoKey("Bm")).toBe("sao-d");
    expect(suggestSaoKey("Em")).toBe("sao-g");
    expect(suggestSaoKey("Gm")).toBe("sao-bb");
  });
  it("null for unknown keys or keys without a common sáo", () => {
    expect(suggestSaoKey(null)).toBeNull();
    expect(suggestSaoKey("H")).toBeNull();
    expect(suggestSaoKey("F#")).toBeNull();
    expect(suggestSaoKey("Cm")).toBeNull(); // Eb major
  });
});
