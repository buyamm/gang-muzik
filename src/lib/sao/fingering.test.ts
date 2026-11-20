import { describe, expect, it } from "vitest";
import { SAO_WRITTEN_RANGE } from "@/lib/notation/range";
import { noteToSemitone } from "@/lib/notation/transpose";
import { SAO_FINGERINGS, SAO_HIGH, SAO_LOW, describeHoles, saoFingeringFor, saoNoteAt, type HoleState } from "./fingering";

const STATES: HoleState[] = ["closed", "half", "open"];
const code = (holes: readonly HoleState[]) => holes.map((s) => (s === "closed" ? "X" : s === "half" ? "H" : "O")).join("");

describe("sáo fingering table", () => {
  it("covers Đô1..Đô3 (0..24), matching the sáo range", () => {
    expect(SAO_LOW).toBe(SAO_WRITTEN_RANGE.low);
    expect(SAO_HIGH).toBe(SAO_WRITTEN_RANGE.high);
    for (let s = SAO_LOW; s <= SAO_HIGH; s++) expect(saoFingeringFor(s), `semitone ${s}`).not.toBeNull();
    expect(saoFingeringFor(-1)).toBeNull();
    expect(saoFingeringFor(25)).toBeNull();
    expect(Object.keys(SAO_FINGERINGS)).toHaveLength(25);
  });

  it("has 6 valid hole states and no duplicate alternates", () => {
    for (const [semi, f] of Object.entries(SAO_FINGERINGS)) {
      const all = [f, ...(f.alts ?? [])];
      for (const o of all) {
        expect(o.holes).toHaveLength(6);
        for (const s of o.holes) expect(STATES).toContain(s);
      }
      const keys = all.map((o) => code(o.holes) + o.breath);
      expect(new Set(keys).size, `semitone ${semi}`).toBe(keys.length);
      for (const a of f.alts ?? []) {
        expect(a.label.trim()).not.toBe("");
        expect(a.description.trim()).not.toBe("");
      }
    }
  });

  it("matches the Vietnamese sources for the natural notes", () => {
    const n = (note: "Do" | "Re" | "Mi" | "Fa" | "Sol" | "La" | "Si", octave = 1) => code(saoFingeringFor(noteToSemitone({ note, octave }))!.holes);
    expect(n("Do")).toBe("XXXXXX");
    expect(n("Re")).toBe("XXXXXO");
    expect(n("Mi")).toBe("XXXXOO");
    expect(n("Fa")).toBe("XXXOOO");
    expect(n("Sol")).toBe("XXOOOO");
    expect(n("La")).toBe("XOOOOO");
    expect(n("Si")).toBe("OOOOOO");
    expect(n("Do", 2)).toBe("OXXXXX"); // "Đố": hole 1 open
    expect(saoFingeringFor(2)!.breath).toBe("soft");
    expect(saoFingeringFor(14)!.breath).toBe("strong");
    expect(saoFingeringFor(14)!.holes).toEqual(saoFingeringFor(2)!.holes);
  });

  it("uses half holes for semitones and flags them as uncertain", () => {
    for (const s of [1, 3, 6, 8, 10, 13, 15, 18, 20, 22]) {
      const f = saoFingeringFor(s)!;
      expect(f.holes, `semitone ${s}`).toContain("half");
      expect(f.uncertain).toBe(true);
    }
    expect(saoFingeringFor(24)!.uncertain).toBe(true);
  });

  it("names and describes notes", () => {
    expect(saoNoteAt(10)).toEqual({ note: "Si", accidental: "b", octave: 1 });
    expect(saoNoteAt(13)).toEqual({ note: "Do", accidental: "#", octave: 2 });
    expect(describeHoles(saoFingeringFor(2)!.holes)).toBe("lỗ 1 bịt, lỗ 2 bịt, lỗ 3 bịt, lỗ 4 bịt, lỗ 5 bịt, lỗ 6 mở");
  });
});
