import { describe, expect, it } from "vitest";
import { parseNotation } from "./parse";
import {
  detectKeyPc,
  isIdentity,
  keyFromChord,
  normalizeTranspose,
  noteToSemitone,
  presetOf,
  resolveSpelling,
  semitoneToNote,
  transposeBadge,
  transposeChord,
  transposeChordLine,
  transposeNote,
  TRANSPOSE_PRESETS,
} from "./transpose";

describe("nốt ↔ bán cung", () => {
  it("tính bán cung theo quãng tám, Do1 = 0", () => {
    expect(noteToSemitone({ note: "Do", octave: 1 })).toBe(0);
    expect(noteToSemitone({ note: "Si", octave: 1 })).toBe(11);
    expect(noteToSemitone({ note: "Do", octave: 2 })).toBe(12);
    expect(noteToSemitone({ note: "Fa", octave: 1, accidental: "#" })).toBe(6);
    expect(noteToSemitone({ note: "Si", octave: 1, accidental: "b" })).toBe(10);
    expect(noteToSemitone({ note: "Do", octave: 1, accidental: "b" })).toBe(-1);
  });

  it("đổi bán cung ra tên nốt theo kiểu dấu", () => {
    expect(semitoneToNote(1, "sharp")).toEqual({ note: "Do", octave: 1, accidental: "#" });
    expect(semitoneToNote(1, "flat")).toEqual({ note: "Re", octave: 1, accidental: "b" });
    expect(semitoneToNote(14, "sharp")).toEqual({ note: "Re", octave: 2 });
    expect(semitoneToNote(-1, "sharp")).toEqual({ note: "Si", octave: 0 });
    expect(semitoneToNote(-14, "flat")).toEqual({ note: "Si", octave: -1, accidental: "b" });
  });

  it("đi một vòng không đổi giá trị", () => {
    for (let s = -24; s <= 36; s++) {
      expect(noteToSemitone(semitoneToNote(s, "sharp"))).toBe(s);
      expect(noteToSemitone(semitoneToNote(s, "flat"))).toBe(s);
    }
  });
});

describe("transposeNote", () => {
  it("Bb (+2): Do → Re, Sib → Do quãng trên", () => {
    expect(transposeNote({ note: "Do", octave: 1 }, 2, "sharp")).toEqual({ note: "Re", octave: 1 });
    expect(transposeNote({ note: "Si", octave: 1, accidental: "b" }, 2, "sharp")).toEqual({ note: "Do", octave: 2 });
    expect(transposeNote({ note: "Mi", octave: 1 }, 2, "sharp")).toEqual({ note: "Fa", octave: 1, accidental: "#" });
  });

  it("Eb (+9): Do → La, Sol → Mi quãng trên", () => {
    expect(transposeNote({ note: "Do", octave: 1 }, 9, "sharp")).toEqual({ note: "La", octave: 1 });
    expect(transposeNote({ note: "Sol", octave: 1 }, 9, "sharp")).toEqual({ note: "Mi", octave: 2 });
    expect(transposeNote({ note: "Fa", octave: 1 }, 9, "flat")).toEqual({ note: "Re", octave: 2 });
    expect(transposeNote({ note: "Mi", octave: 1 }, 9, "sharp")).toEqual({ note: "Do", octave: 2, accidental: "#" });
    expect(transposeNote({ note: "Mi", octave: 1 }, 9, "flat")).toEqual({ note: "Re", octave: 2, accidental: "b" });
  });

  it("dịch quãng tám và số âm", () => {
    expect(transposeNote({ note: "Sol", octave: 1 }, 9, "sharp", -1)).toEqual({ note: "Mi", octave: 1 });
    expect(transposeNote({ note: "Re", octave: 2 }, 0, "sharp", 1)).toEqual({ note: "Re", octave: 3 });
    expect(transposeNote({ note: "Do", octave: 1 }, -2, "flat")).toEqual({ note: "Si", octave: 0, accidental: "b" });
  });
});

describe("transposeChord", () => {
  it("dịch gốc, giữ tính chất", () => {
    expect(transposeChord("C", 2, "sharp")).toBe("D");
    expect(transposeChord("Am", 9, "sharp")).toBe("F#m");
    expect(transposeChord("G7", 2, "sharp")).toBe("A7");
    expect(transposeChord("Bbmaj7", 2, "sharp")).toBe("Cmaj7");
    expect(transposeChord("Dsus4", 9, "sharp")).toBe("Bsus4");
    expect(transposeChord("Bm7b5", 2, "flat")).toBe("Dbm7b5");
    expect(transposeChord("Cadd9", -1, "sharp")).toBe("Badd9");
  });

  it("dịch cả bass sau dấu /", () => {
    expect(transposeChord("F#m7/C#", 2, "sharp")).toBe("G#m7/D#");
    expect(transposeChord("F#m7/C#", 2, "flat")).toBe("Abm7/Eb");
    expect(transposeChord("C/E", 9, "sharp")).toBe("A/C#");
    expect(transposeChord("C6/9", 2, "sharp")).toBe("D6/9");
  });

  it("giữ ngoặc, nhận ♯ ♭, bỏ qua thứ không phải hợp âm", () => {
    expect(transposeChord("(Am)", 2, "sharp")).toBe("(Bm)");
    expect(transposeChord("E♭", 2, "sharp")).toBe("F");
    expect(transposeChord("N.C.", 2, "sharp")).toBe("N.C.");
    expect(transposeChord("|", 2, "sharp")).toBe("|");
  });

  it("dịch 12 bán cung về lại đúng hợp âm", () => {
    expect(transposeChord("Ebm7/Bb", 12, "flat")).toBe("Ebm7/Bb");
  });
});

describe("transposeChordLine — giữ cột", () => {
  it("cùng độ dài: giữ nguyên vị trí", () => {
    expect(transposeChordLine("Am      C       G7", 2, "sharp")).toBe("Bm      D       A7");
  });

  it("hợp âm dài ra: lấy bớt khoảng trắng phía sau, hợp âm sau vẫn đúng cột", () => {
    const line = "C       Am      F       G";
    const out = transposeChordLine(line, 1, "sharp");
    expect(out).toBe("C#      A#m     F#      G#");
    for (const col of [0, 8, 16, 24]) expect(out[col]).not.toBe(" ");
    expect(out.indexOf("A#m")).toBe(line.indexOf("Am"));
    expect(out.indexOf("G#")).toBe(line.indexOf("G"));
  });

  it("hợp âm ngắn lại: bù khoảng trắng", () => {
    expect(transposeChordLine("F#m  Bm", 1, "sharp")).toBe("Gm   Cm");
    expect(transposeChordLine("C#m7/G# E", -1, "sharp")).toBe("Cm7/G   D#");
  });

  it("không đủ chỗ: chừa 1 dấu cách rồi đẩy sang phải", () => {
    expect(transposeChordLine("C G", 1, "sharp")).toBe("C# G#");
    expect(transposeChordLine("E F", 1, "flat")).toBe("F Gb");
  });

  it("giữ khoảng trắng đầu dòng và các ký hiệu phụ", () => {
    expect(transposeChordLine("    Am | C  x2", 2, "sharp")).toBe("    Bm | D  x2");
  });

  it("dịch 0 cho ra đúng dòng cũ", () => {
    const line = "  Am      C/E     G7   F";
    expect(transposeChordLine(line, 0, "sharp")).toBe(line);
  });
});

describe("kiểu dấu & giọng", () => {
  it("auto: giọng đích giáng thì dùng b", () => {
    expect(resolveSpelling("auto", 2)).toBe("sharp"); // C → D
    expect(resolveSpelling("auto", 9)).toBe("sharp"); // C → A
    expect(resolveSpelling("auto", 3)).toBe("flat"); // C → Eb
    expect(resolveSpelling("auto", 9, 5)).toBe("sharp"); // F → D
    expect(resolveSpelling("auto", 2, 1)).toBe("flat"); // Db → Eb
    expect(resolveSpelling("auto", 9, 6)).toBe("flat"); // Gb → Eb
    expect(resolveSpelling("sharp", 3)).toBe("sharp");
    expect(resolveSpelling("flat", 2)).toBe("flat");
  });

  it("suy giọng từ hợp âm đầu tiên", () => {
    expect(keyFromChord("F")).toBe(5);
    expect(keyFromChord("Am")).toBe(0);
    expect(keyFromChord("Cmaj7")).toBe(0);
    expect(keyFromChord("Dm7")).toBe(5);
    expect(keyFromChord("xyz")).toBeNull();
    expect(detectKeyPc(parseNotation("Intro\nBb   F\nlời bài"))).toBe(10);
    expect(detectKeyPc(parseNotation("[Em]Đường về [C]chiều"))).toBe(7);
    expect(detectKeyPc(parseNotation("Sol La Si"))).toBe(0);
  });
});

describe("cài đặt dịch giọng", () => {
  it("preset Bb = +2, Eb = +9", () => {
    expect(TRANSPOSE_PRESETS.map((p) => [p.id, p.semitones])).toEqual([
      ["C", 0],
      ["Bb", 2],
      ["Eb", 9],
    ]);
    expect(presetOf(9)).toBe("Eb");
    expect(presetOf(4)).toBeNull();
  });

  it("nhãn nút", () => {
    expect(transposeBadge({ semitones: 0, octave: 0, spelling: "auto" })).toBeNull();
    expect(transposeBadge({ semitones: 9, octave: 0, spelling: "auto" })).toBe("Eb");
    expect(transposeBadge({ semitones: 2, octave: -1, spelling: "flat" })).toBe("Bb↓");
    expect(transposeBadge({ semitones: -3, octave: 0, spelling: "auto" })).toBe("−3");
    expect(transposeBadge({ semitones: 0, octave: 1, spelling: "auto" })).toBe("C↑");
  });

  it("chuẩn hoá giá trị lưu", () => {
    expect(normalizeTranspose(undefined)).toEqual({ semitones: 0, octave: 0, spelling: "auto" });
    expect(normalizeTranspose({ semitones: 40, octave: -5, spelling: "flat" })).toEqual({
      semitones: 11,
      octave: -1,
      spelling: "flat",
    });
    expect(isIdentity(normalizeTranspose({ semitones: 0, octave: 0 }))).toBe(true);
  });
});
