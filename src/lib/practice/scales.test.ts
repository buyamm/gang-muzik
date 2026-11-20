import { describe, expect, it } from "vitest";
import { NO_TRANSPOSE, noteToSemitone, transposeNote, type TransposeSetting } from "@/lib/notation/transpose";
import {
  applyPattern,
  buildRange,
  concertKeyName,
  droneFrequency,
  keyName,
  longToneSequence,
  longToneStep,
  loopTicks,
  noteText,
  practiceSequence,
  scaleStep,
  scaleTitle,
  type ScaleOptions,
} from "./scales";
import { normalizePractice, PRACTICE_DEFAULTS } from "./settings";

const C: TransposeSetting = NO_TRANSPOSE;
const EB: TransposeSetting = { semitones: 9, octave: 0, spelling: "auto" };
const BB: TransposeSetting = { semitones: 2, octave: 0, spelling: "auto" };

const opts = (o: Partial<ScaleOptions>): ScaleOptions => ({
  tonic: 0,
  type: "major",
  octaves: 1,
  pattern: "up",
  transpose: C,
  ...o,
});

const names = (o: Partial<ScaleOptions>) => buildRange(opts(o)).map((n) => noteText(n.written));

describe("practice/scales", () => {
  it("C major over 1 octave: 8 notes, Do1 = C4 = 261.63 Hz", () => {
    const r = buildRange(opts({}));
    expect(r.map((n) => noteText(n.written))).toEqual(["Do", "Re", "Mi", "Fa", "Sol", "La", "Si", "Do"]);
    expect(r[0].written).toEqual({ note: "Do", octave: 1 });
    expect(r[7].written).toEqual({ note: "Do", octave: 2 });
    expect(r[0].frequency).toBeCloseTo(261.63, 1);
    expect(r.map((n) => n.degree)).toEqual([1, 2, 3, 4, 5, 6, 7, 1]);
  });

  it("F major is spelled with Bb, not A#", () => {
    expect(names({ tonic: 5 })).toEqual(["Fa", "Sol", "La", "Si♭", "Do", "Re", "Mi", "Fa"]);
  });

  it("F# major is spelled with E# (consecutive letters)", () => {
    expect(names({ tonic: 6 })).toEqual(["Fa♯", "Sol♯", "La♯", "Si", "Do♯", "Re♯", "Mi♯", "Fa♯"]);
  });

  it("key names: majors use Db/Eb/Ab/Bb, minors use C#/G#", () => {
    expect(noteText(keyName(1, false, "auto"))).toBe("Re♭");
    expect(noteText(keyName(8, false, "auto"))).toBe("La♭");
    expect(noteText(keyName(1, true, "auto"))).toBe("Do♯");
    expect(noteText(keyName(8, true, "auto"))).toBe("Sol♯");
    expect(noteText(keyName(2, true, "auto"))).toBe("Re"); // D minor → Bb in the scale
    expect(noteText(keyName(1, false, "sharp"))).toBe("Do♯");
  });

  it("D natural minor has Bb; A harmonic minor has G#", () => {
    expect(names({ tonic: 2, type: "naturalMinor" })).toEqual(["Re", "Mi", "Fa", "Sol", "La", "Si♭", "Do", "Re"]);
    expect(names({ tonic: 9, type: "harmonicMinor" })).toEqual(["La", "Si", "Do", "Re", "Mi", "Fa", "Sol♯", "La"]);
  });

  it("double sharps (G# harmonic minor, 7th = F##) are respelled as G", () => {
    const r = names({ tonic: 8, type: "harmonicMinor" });
    expect(r[6]).toBe("Sol");
    expect(r[0]).toBe("Sol♯");
  });

  it("pentatonic, blues, chromatic", () => {
    expect(names({ tonic: 0, type: "majorPentatonic" })).toEqual(["Do", "Re", "Mi", "Sol", "La", "Do"]);
    expect(names({ tonic: 9, type: "minorPentatonic" })).toEqual(["La", "Do", "Re", "Mi", "Sol", "La"]);
    expect(names({ tonic: 0, type: "blues" })).toEqual(["Do", "Mi♭", "Fa", "Sol♭", "Sol", "Si♭", "Do"]);
    const chrom = names({ tonic: 0, type: "chromatic" });
    expect(chrom).toHaveLength(13);
    expect(chrom[1]).toBe("Do♯");
    expect(names({ tonic: 5, type: "chromatic" })[1]).toBe("Sol♭"); // F key → flats
  });

  it("2 octaves: 15 notes, last note 24 semitones above the first", () => {
    const r = buildRange(opts({ octaves: 2, tonic: 2 }));
    expect(r).toHaveLength(15);
    expect(r[14].concert - r[0].concert).toBe(24);
  });

  it("Bb/B tonics start in octave 0; start octave shift", () => {
    expect(buildRange(opts({ tonic: 10 }))[0].written).toEqual({ note: "Si", octave: 0, accidental: "b" });
    expect(buildRange(opts({ tonic: 0, octaveShift: 1 }))[0].written).toEqual({ note: "Do", octave: 2 });
  });

  it("Eb horn: written C = concert Eb (written C4 → Eb3), consistent with transposeNote", () => {
    const r = buildRange(opts({ transpose: EB }));
    expect(r[0].written).toEqual({ note: "Do", octave: 1 });
    expect(r[0].concert).toBe(-9);
    expect(r[0].frequency).toBeCloseTo(155.56, 1);
    for (const n of r) {
      const back = transposeNote({ note: "Do", octave: 1 }, n.concert, "sharp");
      expect(noteToSemitone(back) + EB.semitones).toBe(noteToSemitone(n.written));
    }
    expect(noteText(concertKeyName(0, "major", EB))).toBe("Mi♭");
  });

  it("Bb horn + octave: concert is 14 semitones below written (tenor)", () => {
    const r = buildRange(opts({ transpose: { ...BB, octave: 1 } }));
    expect(noteToSemitone(r[0].written) - r[0].concert).toBe(14);
    expect(noteText(concertKeyName(0, "major", BB))).toBe("Si♭");
  });

  it("up-and-down and thirds patterns", () => {
    const a = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(applyPattern(a, "updown")).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1]);
    expect(applyPattern(a, "thirds")).toEqual([1, 3, 2, 4, 3, 5, 4, 6, 5, 7, 6, 8, 8, 6, 7, 5, 6, 4, 5, 3, 4, 2, 3, 1]);
    expect(applyPattern(a, "up")).toEqual(a);
  });

  it("arpeggio 1-3-5-8, minor for minor scales; no thirds pattern", () => {
    const maj = practiceSequence(opts({ exercise: "arpeggio" }));
    expect(maj.map((n) => noteText(n.written))).toEqual(["Do", "Mi", "Sol", "Do"]);
    const min = practiceSequence(opts({ exercise: "arpeggio", type: "naturalMinor", tonic: 9, pattern: "thirds" }));
    expect(min.map((n) => noteText(n.written))).toEqual(["La", "Do", "Mi", "La", "Mi", "Do", "La"]);
  });

  it("exercise titles", () => {
    expect(scaleTitle(keyName(7, false, "auto"), "major")).toBe("Sol trưởng");
    expect(scaleTitle(keyName(4, true, "auto"), "harmonicMinor")).toBe("Mi thứ hoà âm");
    expect(scaleTitle(keyName(9, true, "auto"), "naturalMinor", "arpeggio")).toBe("La thứ — hợp âm rải");
  });

  it("scale loop rounds up to whole bars, last note fills the remainder", () => {
    expect(loopTicks(15, 4)).toBe(16);
    expect(loopTicks(8, 4)).toBe(8);
    const o = { length: 15, ticksPerBar: 4, countInTicks: 4 };
    expect(scaleStep(0, o)).toEqual({ phase: "countin", tick: 0 });
    expect(scaleStep(4, o)).toEqual({ phase: "note", index: 0, loop: 0, ticks: 1 });
    expect(scaleStep(4 + 14, o)).toEqual({ phase: "note", index: 14, loop: 0, ticks: 2 });
    expect(scaleStep(4 + 15, o)).toEqual({ phase: "rest", index: 14, loop: 0 });
    expect(scaleStep(4 + 16, o)).toEqual({ phase: "note", index: 0, loop: 1, ticks: 1 });
  });

  it("long tones: hold N beats, rest M beats, repeat the sequence", () => {
    const o = { length: 3, hold: 4, rest: 2, countInTicks: 4 };
    expect(longToneStep(3, o).phase).toBe("countin");
    expect(longToneStep(4, o)).toEqual({ phase: "hold", index: 0, beat: 0, loop: 0 });
    expect(longToneStep(7, o)).toEqual({ phase: "hold", index: 0, beat: 3, loop: 0 });
    expect(longToneStep(8, o)).toEqual({ phase: "rest", index: 0, beat: 0, loop: 0 });
    expect(longToneStep(10, o)).toEqual({ phase: "hold", index: 1, beat: 0, loop: 0 });
    expect(longToneStep(4 + 18, o)).toEqual({ phase: "hold", index: 0, beat: 0, loop: 1 });
    expect(longToneStep(0, { ...o, rest: 0, countInTicks: 0 })).toEqual({ phase: "hold", index: 0, beat: 0, loop: 0 });
  });

  it("long-tone sequence has no adjacent repeats", () => {
    const seq = longToneSequence(opts({ pattern: "thirds" }));
    expect(seq).toHaveLength(15);
  });

  it("tonic drone stays within 90–330 Hz", () => {
    for (const c of [-30, -9, 0, 12, 30]) {
      const f = droneFrequency(c);
      expect(f).toBeGreaterThanOrEqual(90);
      expect(f).toBeLessThanOrEqual(330);
    }
  });
});

describe("practice/settings", () => {
  it("normalises badly typed stored settings to defaults", () => {
    expect(normalizePractice(null)).toEqual(PRACTICE_DEFAULTS);
    const n = normalizePractice({ tonic: 14, type: "xyz" as never, bpm: 9999, hold: 3 as never, octaves: 2, toneVolume: 5 });
    expect(n.tonic).toBe(2);
    expect(n.type).toBe("major");
    expect(n.bpm).toBe(400);
    expect(n.hold).toBe(4);
    expect(n.octaves).toBe(2);
    expect(n.toneVolume).toBe(1);
  });
});
