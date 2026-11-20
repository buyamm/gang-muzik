import { describe, expect, it } from "vitest";
import { parseNotation } from "./parse";
import {
  bestOctave,
  countOutOfRange,
  formatNote,
  noteSpan,
  resolveShift,
  SAX_WRITTEN_RANGE,
  summarizeRange,
} from "./range";
import { noteToSemitone, type TransposeSetting } from "./transpose";

const song = (notes: string) => parseNotation(`lời bài hát\n${notes}`);

const alto: TransposeSetting = { semitones: 9, octave: 0, spelling: "auto", preset: "alto", autoOctave: true };

describe("sax written range", () => {
  it("boundaries are Sib0 and Fa#3", () => {
    expect(SAX_WRITTEN_RANGE.low).toBe(noteToSemitone({ note: "Si", octave: 0, accidental: "b" }));
    expect(SAX_WRITTEN_RANGE.high).toBe(noteToSemitone({ note: "Fa", octave: 3, accidental: "#" }));
  });

  it("counts notes outside the range (concert, no shift)", () => {
    expect(countOutOfRange(song("Sib0 Fa#3"), 0, 0)).toBe(0);
    expect(countOutOfRange(song("La0 Sol3 Do1"), 0, 0)).toBe(2);
    expect(countOutOfRange(song("Mi3"), 0, 1)).toBe(1);
  });
});

describe("noteSpan", () => {
  it("min / max / count over note tokens", () => {
    expect(noteSpan(song("Sol La - Si, Do2 Re2"))).toEqual({ min: 7, max: 14, count: 5 });
  });

  it("null without cảm âm notes", () => {
    expect(noteSpan(parseNotation("Am   C\nlời bài hát"))).toBeNull();
  });
});

describe("bestOctave", () => {
  it("Do1–Do3 melody on alto goes down an octave", () => {
    // oct 0: Si2, Do3 → written above Fa#3 (2 out); oct −1: only Do1 → La0 (1 out)
    const s = song("Do Re Mi Fa Sol La Si Do2 Re2 Mi2 Fa2 Sol2 La2 Si2 Do3");
    expect(bestOctave(s, 9)).toBe(-1);
  });

  it("low melody on tenor (+2) goes up", () => {
    // oct 0: La0, Si0 → Si0, Do#1 — written low notes are extreme; oct +1 is comfortable
    expect(bestOctave(song("La0 Si0 Re Mi"), 2)).toBe(1);
  });

  it("tie → 0", () => {
    expect(bestOctave(song("Mi Fa Sol"), 0)).toBe(0);
    expect(bestOctave(parseNotation("lời bài hát"), 9)).toBe(0);
  });
});

describe("resolveShift", () => {
  const s = song("Do Re Mi Fa Sol La Si Do2 Re2 Mi2 Fa2 Sol2 La2 Si2 Do3");

  it("auto octave for sax presets, with range", () => {
    expect(resolveShift(alto, s)).toEqual({ semitones: 9, octave: -1, spelling: "sharp", range: SAX_WRITTEN_RANGE, preset: "alto" });
  });

  it("manual octave when autoOctave is off", () => {
    expect(resolveShift({ ...alto, autoOctave: false, octave: 0 }, s)).toMatchObject({ octave: 0, range: SAX_WRITTEN_RANGE });
  });

  it("custom / concert: no range, autoOctave ignored", () => {
    const r = resolveShift({ semitones: 3, octave: 1, spelling: "auto", preset: "custom", autoOctave: true }, s);
    expect(r).toEqual({ semitones: 3, octave: 1, spelling: "flat", preset: "custom" });
    expect(resolveShift({ semitones: 0, octave: 0, spelling: "auto", preset: "concert" }, s)).toBeNull();
  });

  it("keyPc overrides the detected key", () => {
    const tenor: TransposeSetting = { semitones: 2, octave: 0, spelling: "auto", preset: "tenor", autoOctave: false };
    expect(resolveShift(tenor, s)?.spelling).toBe("sharp"); // C → D
    expect(resolveShift(tenor, s, 1)?.spelling).toBe("flat"); // Db → Eb
  });
});

describe("summarizeRange", () => {
  it("written span and out-of-range count", () => {
    const s = song("Do Sol2 Do3");
    const shift = resolveShift({ ...alto, autoOctave: false }, s);
    const sum = summarizeRange(s, shift);
    expect(sum && formatNote(sum.low)).toBe("La1");
    expect(sum && formatNote(sum.high)).toBe("La3");
    expect(sum).toMatchObject({ count: 3, outOfRange: 1 });
  });

  it("null for non-sax shifts", () => {
    const s = song("Do Re");
    expect(summarizeRange(s, resolveShift({ semitones: 3, octave: 0, spelling: "auto", preset: "custom" }, s))).toBeNull();
    expect(summarizeRange(s, null)).toBeNull();
  });
});
