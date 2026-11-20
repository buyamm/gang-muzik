import { describe, expect, it } from "vitest";
import {
  concertFrequency,
  fingeringPageUrl,
  fingeringSearch,
  noteParam,
  parseFingeringParams,
  parseNoteParam,
  SAO_TYPES,
} from "./fingeringPage";
import { instrumentForPreset } from "./learnInstrument";

const q = (s: string) => new URLSearchParams(s);

describe("fingering page params", () => {
  it("parses note params", () => {
    expect(parseNoteParam("Sib1")).toBe(10);
    expect(parseNoteParam("Do#2")).toBe(13);
    expect(parseNoteParam("si♭0")).toBe(-2);
    expect(parseNoteParam("Xyz")).toBeNull();
    expect(parseNoteParam(null)).toBeNull();
    expect(noteParam({ note: "Si", accidental: "b", octave: 1 })).toBe("Sib1");
  });

  it("reads a shared URL and falls back on bad values", () => {
    expect(parseFingeringParams(q("i=sax&t=alto&n=Sib1"))).toEqual({ instrument: "sax", type: "alto", semi: 10 });
    expect(parseFingeringParams(q("i=sao&t=re&n=Do3"))).toEqual({ instrument: "sao", type: "re", semi: 24 });
    // out of the sáo range / unknown type → defaults
    expect(parseFingeringParams(q("i=sao&t=alto&n=Sib0"))).toEqual({ instrument: "sao", type: "do", semi: 0 });
    expect(parseFingeringParams(q(""), "sao").instrument).toBe("sao");
    expect(parseFingeringParams(q("i=piano")).instrument).toBe("sax");
  });

  it("round-trips through the search string", () => {
    const s = { instrument: "sax" as const, type: "tenor", semi: 13 };
    expect(parseFingeringParams(q(fingeringSearch(s)))).toEqual(s);
    expect(fingeringPageUrl("sax", 10)).toBe("/fingering?i=sax&n=Sib1");
    expect(fingeringPageUrl("sao", null)).toBe("/fingering?i=sao");
  });

  it("computes concert pitch", () => {
    // written C4 on alto sounds Eb3
    expect(concertFrequency("sax", "alto", 0)).toBeCloseTo(155.56, 1);
    // written A1 (La1) on soprano sounds G4 = 392 Hz
    expect(concertFrequency("sax", "soprano", 9)).toBeCloseTo(392, 0);
    // all holes closed on sáo Đô = C5
    expect(concertFrequency("sao", "do", 0)).toBeCloseTo(523.25, 1);
    expect(SAO_TYPES.map((t) => t.id)).toEqual(["do", "re", "mi", "fa", "sol", "la", "sib"]);
  });

  it("picks the diagram by preset family", () => {
    expect(instrumentForPreset("alto", "sao")).toBe("sax");
    expect(instrumentForPreset("sao-d", "sax")).toBe("sao");
    expect(instrumentForPreset("concert", "sao")).toBe("sao");
    expect(instrumentForPreset("custom", "sax")).toBe("sax");
  });
});
