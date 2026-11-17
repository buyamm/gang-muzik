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
  it("Do trưởng 1 quãng tám: 8 nốt, Do1 = C4 = 261.63 Hz", () => {
    const r = buildRange(opts({}));
    expect(r.map((n) => noteText(n.written))).toEqual(["Do", "Re", "Mi", "Fa", "Sol", "La", "Si", "Do"]);
    expect(r[0].written).toEqual({ note: "Do", octave: 1 });
    expect(r[7].written).toEqual({ note: "Do", octave: 2 });
    expect(r[0].frequency).toBeCloseTo(261.63, 1);
    expect(r.map((n) => n.degree)).toEqual([1, 2, 3, 4, 5, 6, 7, 1]);
  });

  it("Fa trưởng viết Sib, không phải La#", () => {
    expect(names({ tonic: 5 })).toEqual(["Fa", "Sol", "La", "Si♭", "Do", "Re", "Mi", "Fa"]);
  });

  it("Fa# trưởng viết Mi# (chữ nốt liên tiếp)", () => {
    expect(names({ tonic: 6 })).toEqual(["Fa♯", "Sol♯", "La♯", "Si", "Do♯", "Re♯", "Mi♯", "Fa♯"]);
  });

  it("tên giọng: trưởng dùng Reb/Mib/Lab/Sib, thứ dùng Do#/Sol#", () => {
    expect(noteText(keyName(1, false, "auto"))).toBe("Re♭");
    expect(noteText(keyName(8, false, "auto"))).toBe("La♭");
    expect(noteText(keyName(1, true, "auto"))).toBe("Do♯");
    expect(noteText(keyName(8, true, "auto"))).toBe("Sol♯");
    expect(noteText(keyName(2, true, "auto"))).toBe("Re"); // Re thứ → Sib trong gam
    expect(noteText(keyName(1, false, "sharp"))).toBe("Do♯");
  });

  it("Re thứ tự nhiên có Sib; La thứ hoà âm có Sol#", () => {
    expect(names({ tonic: 2, type: "naturalMinor" })).toEqual(["Re", "Mi", "Fa", "Sol", "La", "Si♭", "Do", "Re"]);
    expect(names({ tonic: 9, type: "harmonicMinor" })).toEqual(["La", "Si", "Do", "Re", "Mi", "Fa", "Sol♯", "La"]);
  });

  it("dấu kép (Sol# thứ hoà âm, bậc 7 = Fa##) viết lại thành Sol", () => {
    const r = names({ tonic: 8, type: "harmonicMinor" });
    expect(r[6]).toBe("Sol");
    expect(r[0]).toBe("Sol♯");
  });

  it("ngũ cung, blues, chromatic", () => {
    expect(names({ tonic: 0, type: "majorPentatonic" })).toEqual(["Do", "Re", "Mi", "Sol", "La", "Do"]);
    expect(names({ tonic: 9, type: "minorPentatonic" })).toEqual(["La", "Do", "Re", "Mi", "Sol", "La"]);
    expect(names({ tonic: 0, type: "blues" })).toEqual(["Do", "Mi♭", "Fa", "Sol♭", "Sol", "Si♭", "Do"]);
    const chrom = names({ tonic: 0, type: "chromatic" });
    expect(chrom).toHaveLength(13);
    expect(chrom[1]).toBe("Do♯");
    expect(names({ tonic: 5, type: "chromatic" })[1]).toBe("Sol♭"); // giọng Fa → giáng
  });

  it("2 quãng tám: 15 nốt, nốt cuối cao hơn nốt đầu 24 bán cung", () => {
    const r = buildRange(opts({ octaves: 2, tonic: 2 }));
    expect(r).toHaveLength(15);
    expect(r[14].concert - r[0].concert).toBe(24);
  });

  it("chủ âm Sib/Si bắt đầu ở quãng tám 0; dịch quãng tám bắt đầu", () => {
    expect(buildRange(opts({ tonic: 10 }))[0].written).toEqual({ note: "Si", octave: 0, accidental: "b" });
    expect(buildRange(opts({ tonic: 0, octaveShift: 1 }))[0].written).toEqual({ note: "Do", octave: 2 });
  });

  it("kèn Mib: Do viết = Mib concert (C4 viết → Eb3), khớp với transposeNote", () => {
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

  it("kèn Sib + nâng quãng tám: concert thấp hơn viết 14 bán cung (tenor)", () => {
    const r = buildRange(opts({ transpose: { ...BB, octave: 1 } }));
    expect(noteToSemitone(r[0].written) - r[0].concert).toBe(14);
    expect(noteText(concertKeyName(0, "major", BB))).toBe("Si♭");
  });

  it("kiểu chạy lên rồi xuống và quãng 3", () => {
    const a = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(applyPattern(a, "updown")).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1]);
    expect(applyPattern(a, "thirds")).toEqual([1, 3, 2, 4, 3, 5, 4, 6, 5, 7, 6, 8, 8, 6, 7, 5, 6, 4, 5, 3, 4, 2, 3, 1]);
    expect(applyPattern(a, "up")).toEqual(a);
  });

  it("hợp âm rải 1-3-5-8, thứ với gam thứ; không có kiểu quãng 3", () => {
    const maj = practiceSequence(opts({ exercise: "arpeggio" }));
    expect(maj.map((n) => noteText(n.written))).toEqual(["Do", "Mi", "Sol", "Do"]);
    const min = practiceSequence(opts({ exercise: "arpeggio", type: "naturalMinor", tonic: 9, pattern: "thirds" }));
    expect(min.map((n) => noteText(n.written))).toEqual(["La", "Do", "Mi", "La", "Mi", "Do", "La"]);
  });

  it("tên bài tập", () => {
    expect(scaleTitle(keyName(7, false, "auto"), "major")).toBe("Sol trưởng");
    expect(scaleTitle(keyName(4, true, "auto"), "harmonicMinor")).toBe("Mi thứ hoà âm");
    expect(scaleTitle(keyName(9, true, "auto"), "naturalMinor", "arpeggio")).toBe("La thứ — hợp âm rải");
  });

  it("vòng âm giai làm tròn đủ ô nhịp, nốt cuối ngân hết phần dư", () => {
    expect(loopTicks(15, 4)).toBe(16);
    expect(loopTicks(8, 4)).toBe(8);
    const o = { length: 15, ticksPerBar: 4, countInTicks: 4 };
    expect(scaleStep(0, o)).toEqual({ phase: "countin", tick: 0 });
    expect(scaleStep(4, o)).toEqual({ phase: "note", index: 0, loop: 0, ticks: 1 });
    expect(scaleStep(4 + 14, o)).toEqual({ phase: "note", index: 14, loop: 0, ticks: 2 });
    expect(scaleStep(4 + 15, o)).toEqual({ phase: "rest", index: 14, loop: 0 });
    expect(scaleStep(4 + 16, o)).toEqual({ phase: "note", index: 0, loop: 1, ticks: 1 });
  });

  it("nốt dài: giữ N phách, nghỉ M phách, lặp lại cả dãy", () => {
    const o = { length: 3, hold: 4, rest: 2, countInTicks: 4 };
    expect(longToneStep(3, o).phase).toBe("countin");
    expect(longToneStep(4, o)).toEqual({ phase: "hold", index: 0, beat: 0, loop: 0 });
    expect(longToneStep(7, o)).toEqual({ phase: "hold", index: 0, beat: 3, loop: 0 });
    expect(longToneStep(8, o)).toEqual({ phase: "rest", index: 0, beat: 0, loop: 0 });
    expect(longToneStep(10, o)).toEqual({ phase: "hold", index: 1, beat: 0, loop: 0 });
    expect(longToneStep(4 + 18, o)).toEqual({ phase: "hold", index: 0, beat: 0, loop: 1 });
    expect(longToneStep(0, { ...o, rest: 0, countInTicks: 0 })).toEqual({ phase: "hold", index: 0, beat: 0, loop: 0 });
  });

  it("dãy nốt dài không lặp nốt liền nhau", () => {
    const seq = longToneSequence(opts({ pattern: "thirds" }));
    expect(seq).toHaveLength(15);
  });

  it("drone chủ âm nằm trong khoảng 90–330 Hz", () => {
    for (const c of [-30, -9, 0, 12, 30]) {
      const f = droneFrequency(c);
      expect(f).toBeGreaterThanOrEqual(90);
      expect(f).toBeLessThanOrEqual(330);
    }
  });
});
