import { describe, expect, it } from "vitest";
import { isNoteLine, matchNote, parseNotation, tokenizeNotes } from "./parse";
import { transposeNote } from "./transpose";

const SAMPLE = `Đường về chiều mưa rơi, Thấy anh cùng ai bước chung
Sol La Si Re2 Re2. Si La Sol-Re La Re2 Si
Bỗng nhiên bao nhiêu ký ức quen thuộc. Cứ hiện lên làm em thấy buồn
Si La Sol Sol La Si La Sol. Re2 Si D2 Si D2 R2 La
Hình như anh đang vui . Vì thấy anh mỉm cười rất tươi
Sol La Si Re2 Re2. R2 Si La Sol La Re2 Si`;

describe("matchNote", () => {
  it("nhận diện tên nốt và quãng tám", () => {
    expect(matchNote("Sol")).toEqual({ note: "Sol", octave: 1 });
    expect(matchNote("Re2")).toEqual({ note: "Re", octave: 2 });
    expect(matchNote("D2")).toEqual({ note: "Do", octave: 2 });
    expect(matchNote("R2")).toEqual({ note: "Re", octave: 2 });
    expect(matchNote("Đô")).toEqual({ note: "Do", octave: 1 });
    expect(matchNote("mi'")).toEqual({ note: "Mi", octave: 2 });
    expect(matchNote("anh")).toBeNull();
  });

  it("nhận dấu thăng / giáng viết liền sau tên nốt", () => {
    expect(matchNote("Do#")).toEqual({ note: "Do", octave: 1, accidental: "#" });
    expect(matchNote("Reb")).toEqual({ note: "Re", octave: 1, accidental: "b" });
    expect(matchNote("Fa#2")).toEqual({ note: "Fa", octave: 2, accidental: "#" });
    expect(matchNote("Sib'")).toEqual({ note: "Si", octave: 2, accidental: "b" });
    expect(matchNote("Mi♭")).toEqual({ note: "Mi", octave: 1, accidental: "b" });
    expect(matchNote("Solb")).toEqual({ note: "Sol", octave: 1, accidental: "b" });
    expect(matchNote("D#2")).toEqual({ note: "Do", octave: 2, accidental: "#" });
    // nốt không dấu: không có khoá accidental
    expect(matchNote("Sol")).not.toHaveProperty("accidental");
    // "B" hoa không phải dấu giáng
    expect(matchNote("SB")).toBeNull();
    expect(matchNote("Dob2x")).toBeNull();
  });
});

describe("isNoteLine", () => {
  it("phân biệt dòng nốt và dòng lời", () => {
    expect(isNoteLine("Sol La Si Re2 Re2. Si La Sol-Re La Re2 Si")).toBe(true);
    expect(isNoteLine("Đường về chiều mưa rơi, Thấy anh cùng ai bước chung")).toBe(false);
    expect(isNoteLine("Hình như anh đang vui . Vì thấy anh mỉm cười rất tươi")).toBe(false);
    expect(isNoteLine("")).toBe(false);
  });
});

describe("tokenizeNotes", () => {
  it("giữ dấu nối và dấu chấm", () => {
    const t = tokenizeNotes("Sol-Re La. Si");
    expect(t.map((x) => x.text)).toEqual(["Sol", "-", "Re", " ", "La", ".", " ", "Si"]);
    expect(t.filter((x) => x.type === "note")).toHaveLength(4);
  });

  it("dòng nốt có dấu hoá vẫn là dòng nốt", () => {
    const line = "Sol Sib Do2 Re2- Mib2 Re2 Do2. La Fa#";
    expect(isNoteLine(line)).toBe(true);
    const notes = tokenizeNotes(line).filter((x) => x.type === "note");
    expect(notes).toHaveLength(9);
    expect(notes[1]).toMatchObject({ text: "Sib", note: "Si", accidental: "b", octave: 1 });
    expect(notes[4]).toMatchObject({ note: "Mi", accidental: "b", octave: 2 });
    expect(notes[8]).toMatchObject({ note: "Fa", accidental: "#" });
  });
});

describe("parseNotation", () => {
  it("ghép lời và nốt thành từng cặp", () => {
    const sections = parseNotation(SAMPLE);
    expect(sections).toHaveLength(1);
    const rows = sections[0].rows;
    expect(rows).toHaveLength(3);
    expect(rows[0].lyric).toMatch(/^Đường về/);
    expect(rows[0].notes?.filter((t) => t.type === "note")).toHaveLength(12);
    expect(rows[1].notes?.find((t) => t.text === "D2")).toMatchObject({ note: "Do", octave: 2 });
  });

  it("dòng trống tách đoạn, lời đứng một mình vẫn giữ", () => {
    const s = parseNotation("Điệp khúc:\nDo Re Mi\n\nMi Fa Sol\n\nHết");
    expect(s).toHaveLength(3);
    expect(s[0].rows[0].lyric).toBe("Điệp khúc:");
    expect(s[1].rows[0].lyric).toBeUndefined();
    expect(s[2].rows[0]).toEqual({ lyric: "Hết" });
  });
});

import { isChordLine, isTabLine, splitInlineChords } from "./parse";

describe("hợp âm & tab (mọi nhạc cụ)", () => {
  it("nhận diện dòng hợp âm", () => {
    expect(isChordLine("Am      C       G7     F/A")).toBe(true);
    expect(isChordLine("C | G | Am | F")).toBe(true);
    expect(isChordLine("Dm  Bb  C")).toBe(true);
    expect(isChordLine("D F")).toBe(false); // có thể là nốt viết tắt
    expect(isChordLine("Sol La Si")).toBe(false);
    expect(isChordLine("Anh đi về")).toBe(false);
  });

  it("ghép dòng hợp âm với lời bên dưới, giữ khoảng trắng", () => {
    const s = parseNotation("Am       C\nĐường về chiều mưa rơi");
    expect(s[0].rows[0]).toEqual({ chords: "Am       C", lyric: "Đường về chiều mưa rơi" });
  });

  it("hợp âm chèn trong lời", () => {
    expect(splitInlineChords("[Am]Đường về [C]chiều mưa")).toEqual([
      { chord: "Am", text: "Đường về " },
      { chord: "C", text: "chiều mưa" },
    ]);
    expect(splitInlineChords("Đường [G]về")).toEqual([
      { chord: undefined, text: "Đường " },
      { chord: "G", text: "về" },
    ]);
    expect(splitInlineChords("không có hợp âm")).toBeNull();
  });

  it("gom các dòng tab thành một khối", () => {
    expect(isTabLine("e|---0---3---|")).toBe(true);
    expect(isTabLine("Em đi")).toBe(false);
    const s = parseNotation("Intro\ne|--0--|\nB|--1--|\nG|--0--|");
    expect(s[0].rows).toEqual([{ lyric: "Intro" }, { tab: ["e|--0--|", "B|--1--|", "G|--0--|"] }]);
  });
});

describe("breath marks", () => {
  it("tokenizes a standalone V between notes as a breath token", () => {
    const t = tokenizeNotes("Sol La V Si");
    expect(t.map((x) => x.type)).toEqual(["note", "sep", "note", "sep", "breath", "sep", "note"]);
    expect(t[4]).toEqual({ type: "breath", text: "V" });
    expect(tokenizeNotes("Sol v La")[2]).toEqual({ type: "breath", text: "v" });
    expect(tokenizeNotes("Sol 𝄒 La")[2]).toEqual({ type: "breath", text: "𝄒" });
  });

  it("a line with only breath marks is not a note line", () => {
    expect(isNoteLine("V")).toBe(false);
    expect(isNoteLine("V v 𝄒")).toBe(false);
    expect(parseNotation("V")[0].rows).toEqual([{ lyric: "V" }]);
  });

  it("breath marks do not dilute the note-line ratio", () => {
    expect(isNoteLine("Sol V La V Si V")).toBe(true);
    expect(isNoteLine("Do V V V")).toBe(true);
    const rows = parseNotation("Đường về chiều\nSol La V Si Re2 V")[0].rows;
    expect(rows[0].lyric).toBe("Đường về chiều");
    expect(rows[0].notes?.filter((x) => x.type === "breath")).toHaveLength(2);
    expect(rows[0].notes?.filter((x) => x.type === "note")).toHaveLength(4);
  });

  it("leaves lyric lines containing the word V untouched", () => {
    const rows = parseNotation("Chữ V trong lời ca\nSol La Si")[0].rows;
    expect(rows[0].lyric).toBe("Chữ V trong lời ca");
    expect(rows[0].notes?.some((x) => x.type === "breath")).toBe(false);
  });

  it("breath tokens are never notes, so transposition skips them", () => {
    expect(matchNote("V")).toBeNull();
    const shifted = tokenizeNotes("Sol V La").map((t) => (t.type === "note" ? transposeNote(t, 2, "sharp") : t));
    expect(shifted[2]).toEqual({ type: "breath", text: "V" });
    expect(shifted[0]).toMatchObject({ note: "La" });
  });
});
