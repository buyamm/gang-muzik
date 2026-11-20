import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TextNotation } from "@/components/stage/TextNotation";
import { parseNotation } from "./parse";
import { resolveShift } from "./range";
import { formatKeyName, guessKeyName, keyMajorPc, keyRootPc, transposeKeyName, type TransposeSetting } from "./transpose";

describe("keyMajorPc / keyRootPc", () => {
  it("maps major keys to their own pc", () => {
    expect(keyMajorPc("C")).toBe(0);
    expect(keyMajorPc("Bb")).toBe(10);
    expect(keyMajorPc("F#")).toBe(6);
  });

  it("maps minor keys to the relative major for spelling", () => {
    expect(keyMajorPc("Am")).toBe(0);
    expect(keyMajorPc("F#m")).toBe(9);
    expect(keyMajorPc("Ebm")).toBe(6);
  });

  it("returns the tonic pc for the drone", () => {
    expect(keyRootPc("Am")).toBe(9);
    expect(keyRootPc("C")).toBe(0);
    expect(keyRootPc("Bb")).toBe(10);
    expect(keyRootPc("C#m")).toBe(1);
  });

  it("returns null for missing or invalid keys", () => {
    for (const k of [undefined, null, "", "H", "Cmaj", "c"]) {
      expect(keyMajorPc(k)).toBeNull();
      expect(keyRootPc(k)).toBeNull();
    }
  });
});

describe("guessKeyName", () => {
  it("uses the first chord of a chord line", () => {
    expect(guessKeyName(parseNotation("Intro\nAm7   F   C\nlời bài"))).toBe("Am");
    expect(guessKeyName(parseNotation("Bb/D   F\nlời bài"))).toBe("Bb");
  });

  it("uses inline chords and canonical root spelling", () => {
    expect(guessKeyName(parseNotation("[F#m]Đường về [D]chiều"))).toBe("F#m");
    expect(guessKeyName(parseNotation("[A#]Đường về"))).toBe("Bb");
    expect(guessKeyName(parseNotation("[Cmaj7]Đường về"))).toBe("C");
  });

  it("returns null when there are no chords", () => {
    expect(guessKeyName(parseNotation("Sol La Si"))).toBeNull();
  });
});

describe("transposeKeyName", () => {
  it("transposes root and keeps the minor suffix", () => {
    expect(transposeKeyName("Am", 9, "sharp")).toBe("F#m");
    expect(transposeKeyName("C", 2, "sharp")).toBe("D");
    expect(transposeKeyName("Ab", 9, "flat")).toBe("F");
    expect(transposeKeyName("Cm", 2, "flat")).toBe("Dm");
    expect(transposeKeyName("Eb", 9, "sharp")).toBe("C");
  });

  it("leaves invalid keys unchanged", () => {
    expect(transposeKeyName("Cmaj", 2, "sharp")).toBe("Cmaj");
  });
});

describe("formatKeyName", () => {
  it("renders accidentals as music glyphs", () => {
    expect(formatKeyName("F#m")).toBe("F♯m");
    expect(formatKeyName("Bb")).toBe("B♭");
    expect(formatKeyName("Ebm")).toBe("E♭m");
    expect(formatKeyName("Am")).toBe("Am");
  });
});

describe("TextNotation spelling with a stored key", () => {
  const altoSax: TransposeSetting = { semitones: 9, octave: 0, spelling: "auto" };
  // cảm âm only, no chords: without a key the song is assumed to be in C
  const text = "Do Re Mi Fa Sol";
  const sections = parseNotation(text);
  // Stage resolves the shift with the stored key, then TextNotation renders it
  const render = (songKey?: string) =>
    renderToStaticMarkup(
      createElement(TextNotation, { text, transpose: resolveShift(altoSax, sections, keyMajorPc(songKey) ?? undefined) }),
    );

  it("falls back to C (sharps for Eb instruments) without a key", () => {
    const html = render();
    expect(html).toContain("♯");
    expect(html).not.toContain("♭");
  });

  it("uses the stored key (Ab + Eb instrument = F major → flats)", () => {
    const html = render("Ab");
    expect(html).toContain("♭");
    expect(html).not.toContain("♯");
  });
});
