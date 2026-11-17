import { describe, expect, it } from "vitest";
import { cleanTranscription, fixNoteLyricOrder, joinTranscriptions } from "./transcribe";

describe("cleanTranscription", () => {
  it("reads the marker and strips separator", () => {
    const r = cleanTranscription("SOLFEGE: yes\n---\nĐường về chiều mưa rơi\nSol La Si Re2\n");
    expect(r).toEqual({ hasSolfege: true, text: "Đường về chiều mưa rơi\nSol La Si Re2" });
  });

  it("drops chatter before the marker and code fences", () => {
    const raw = "Here is the transcription:\n```\nSOLFEGE: no\n---\nMi Mi Fa Sol\n```\nHope this helps";
    const r = cleanTranscription(raw);
    expect(r.hasSolfege).toBe(false);
    expect(r.text).toBe("Mi Mi Fa Sol\nHope this helps");
  });

  it("tolerates markdown bold and Vietnamese answers", () => {
    expect(cleanTranscription("**SOLFEGE:** có\n---\nDo").hasSolfege).toBe(true);
    expect(cleanTranscription("solfege: không\n---\nDo").hasSolfege).toBe(false);
  });

  it("keeps text when the marker is missing and collapses blank lines", () => {
    const r = cleanTranscription("Do Re Mi\n\n\n\nFa Sol  \r\n");
    expect(r).toEqual({ hasSolfege: false, text: "Do Re Mi\n\nFa Sol" });
  });
});

describe("joinTranscriptions", () => {
  it("joins non-empty pages with a blank line", () => {
    expect(joinTranscriptions(["Do Re\n", "  ", "Mi Fa"])).toBe("Do Re\n\nMi Fa");
  });
});

describe("fixNoteLyricOrder", () => {
  const isNote = (l: string) => /^(Do|Re|Mi|Fa|Sol|La|Si)\S*( |$)/.test(l);

  it("swaps note-above-lyric pairs and separates systems", () => {
    const text = "Do Re Mi\nĐường về chiều\nSol La Si\nthấy anh cùng";
    expect(fixNoteLyricOrder(text, isNote)).toBe("Đường về chiều\nDo Re Mi\n\nthấy anh cùng\nSol La Si");
  });

  it("leaves correct or irregular blocks alone", () => {
    const ok = "Đường về chiều\nDo Re Mi\n\nthấy anh\nSol La";
    expect(fixNoteLyricOrder(ok, isNote)).toBe(ok);
    const odd = "Do Re Mi\nlời\nSol La";
    expect(fixNoteLyricOrder(odd, isNote)).toBe(odd);
  });
});
