import { describe, expect, it } from "vitest";
import { SAX_WRITTEN_RANGE } from "@/lib/notation/range";
import { HORN_PRESETS, NO_TRANSPOSE, noteToSemitone, type TransposeSetting } from "@/lib/notation/transpose";
import { practiceRange, practiceTranspose, selectPreset } from "./instrument";
import { buildRange, startOctave, type ScaleOptions } from "./scales";

const opts = (o: Partial<ScaleOptions>): ScaleOptions => ({
  tonic: 0,
  type: "major",
  octaves: 1,
  pattern: "up",
  transpose: NO_TRANSPOSE,
  ...o,
});

const custom: TransposeSetting = { semitones: 3, octave: 1, spelling: "auto", preset: "custom", autoOctave: false };

describe("practice/instrument", () => {
  it("sax presets use SAX_WRITTEN_RANGE; concert and custom have no range", () => {
    for (const id of ["alto", "tenor", "soprano", "baritone"] as const) expect(practiceRange(id)).toBe(SAX_WRITTEN_RANGE);
    expect(practiceRange("concert")).toBeNull();
    expect(practiceRange("custom")).toBeNull();
    expect(practiceRange(undefined)).toBeNull();
  });

  it("sax presets sound at the horn's real pitch (written C4)", () => {
    const concertOf = (preset: TransposeSetting["preset"]) => {
      const t = practiceTranspose(selectPreset(NO_TRANSPOSE, preset!));
      return buildRange(opts({ transpose: t }))[0].concert;
    };
    expect(concertOf("soprano")).toBe(-2); // Bb3
    expect(concertOf("alto")).toBe(-9); // Eb3
    expect(concertOf("tenor")).toBe(-14); // Bb2
    expect(concertOf("baritone")).toBe(-21); // Eb2
  });

  it("the octave stored for the Stage does not leak into sax practice", () => {
    const t = practiceTranspose({ semitones: 9, octave: -1, spelling: "auto", preset: "alto", autoOctave: false });
    expect(t.octave).toBe(0);
    expect(t.semitones).toBe(9);
  });

  it("concert and custom keep the stored semitones and octave", () => {
    expect(practiceTranspose(custom)).toEqual(custom);
    const concert = { ...NO_TRANSPOSE, octave: 1 };
    expect(practiceTranspose(concert)).toEqual(concert);
    expect(buildRange(opts({ transpose: custom }))[0].concert).toBe(-15);
  });

  it("selectPreset writes the shared TransposeSetting shape", () => {
    for (const p of HORN_PRESETS) {
      const t = selectPreset(custom, p.id);
      expect(t).toMatchObject({ preset: p.id, semitones: p.semitones, autoOctave: p.sax, spelling: "auto" });
    }
  });

  it("start octave follows the range's low end", () => {
    // sax (Sib0 = −2): Bb and B start in octave 0, the rest in octave 1
    expect(startOctave(10, 0, SAX_WRITTEN_RANGE.low)).toBe(0);
    expect(startOctave(11, 0, SAX_WRITTEN_RANGE.low)).toBe(0);
    expect(startOctave(0, 0, SAX_WRITTEN_RANGE.low)).toBe(1);
    expect(startOctave(9, 0, SAX_WRITTEN_RANGE.low)).toBe(1);
    // a range starting at Do1 (e.g. a 6-hole sáo, 0..24) always starts in octave 1
    for (let pc = 0; pc < 12; pc++) expect(startOctave(pc, 0, 0)).toBe(1);
    expect(startOctave(0, -1, 0)).toBe(0);
  });

  it("flags notes outside the range only when a range is given", () => {
    const high = buildRange(opts({ tonic: 5, octaves: 2, octaveShift: 1, range: SAX_WRITTEN_RANGE }));
    const flagged = high.filter((n) => n.outOfRange);
    expect(flagged.length).toBeGreaterThan(0);
    for (const n of high) expect(n.outOfRange).toBe(noteToSemitone(n.written) > SAX_WRITTEN_RANGE.high);
    expect(buildRange(opts({ tonic: 5, octaves: 2, octaveShift: 1 })).some((n) => "outOfRange" in n)).toBe(false);
    expect(buildRange(opts({ range: SAX_WRITTEN_RANGE })).every((n) => n.outOfRange === false)).toBe(true);
  });
});
