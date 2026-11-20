import { describe, expect, it } from "vitest";
import { noteToSemitone } from "@/lib/notation/transpose";
import { FINGERINGS, FINGERING_HIGH, FINGERING_LOW, SAX_KEYS, fingeringFor, saxNoteAt } from "./fingering";

const SIX = ["l1", "l2", "l3", "r1", "r2", "r3"];
const sorted = (keys: readonly string[]) => [...keys].sort();

describe("fingering table", () => {
  it("covers every written semitone Sib0..Fa#3 and nothing else", () => {
    expect(FINGERING_LOW).toBe(noteToSemitone({ note: "Si", accidental: "b", octave: 0 }));
    expect(FINGERING_HIGH).toBe(noteToSemitone({ note: "Fa", accidental: "#", octave: 3 }));
    for (let s = FINGERING_LOW; s <= FINGERING_HIGH; s++) expect(fingeringFor(s), `semitone ${s}`).not.toBeNull();
    expect(fingeringFor(FINGERING_LOW - 1)).toBeNull();
    expect(fingeringFor(FINGERING_HIGH + 1)).toBeNull();
    expect(Object.keys(FINGERINGS)).toHaveLength(33);
  });

  it("matches standard fingerings", () => {
    expect(sorted(fingeringFor(7)!.keys)).toEqual(sorted(["l1", "l2", "l3"])); // Sol1
    expect(sorted(fingeringFor(14)!.keys)).toEqual(sorted(["octave", ...SIX])); // Re2
    expect(fingeringFor(13)!.keys).toEqual([]); // Do#2
    expect(fingeringFor(25)!.keys).toEqual(["octave"]); // Do#3
    expect(sorted(fingeringFor(-1)!.keys)).toEqual(sorted([...SIX, "lowB"])); // Si0: no right-pinky C
    expect(fingeringFor(10)!.keys).toEqual(["l1", "bis"]); // Sib1
    expect(fingeringFor(22)!.keys).toEqual(["octave", "l1", "bis"]); // Sib2
    expect(fingeringFor(30)!.keys).toContain("highFSharp");
    expect(fingeringFor(30)!.note).toBeTruthy();
  });

  it("has valid keys without duplicates, including alternates", () => {
    for (const [semi, f] of Object.entries(FINGERINGS)) {
      for (const keys of [f.keys, ...(f.alts ?? []).map((a) => a.keys)]) {
        expect(new Set(keys).size, `semitone ${semi}`).toBe(keys.length);
        for (const k of keys) expect(SAX_KEYS).toContain(k);
      }
      for (const a of f.alts ?? []) {
        expect(a.label.trim()).not.toBe("");
        expect(sorted(a.keys)).not.toEqual(sorted(f.keys));
      }
    }
  });

  it("names notes the way sax charts do", () => {
    expect(saxNoteAt(-2)).toEqual({ note: "Si", accidental: "b", octave: 0 });
    expect(saxNoteAt(8)).toEqual({ note: "Sol", accidental: "#", octave: 1 });
    expect(saxNoteAt(27)).toEqual({ note: "Mi", accidental: "b", octave: 3 });
  });
});
