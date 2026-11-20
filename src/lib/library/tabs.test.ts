import { describe, expect, it } from "vitest";
import { INSTRUMENTS_FOCUS_FIRST } from "@shared/instruments";
import { groupByTab, matchesSelection, otherInstrumentCounts, parseInstrumentParam, selectionToParam, tabOf } from "./tabs";

const song = (id: string, instruments: string[]) => ({ id, instruments });

describe("library tabs", () => {
  it("maps instruments to tabs", () => {
    expect(tabOf("sax")).toBe("sax");
    expect(tabOf("flute")).toBe("flute");
    expect(tabOf("guitar")).toBe("others");
    expect(tabOf("other")).toBe("others");
    expect(tabOf("none")).toBe("others");
  });

  it("parses the ?instrument= param, keeping legacy links", () => {
    expect(parseInstrumentParam(null)).toEqual({ tab: null, instrument: null });
    expect(parseInstrumentParam("")).toEqual({ tab: null, instrument: null });
    expect(parseInstrumentParam("sax")).toEqual({ tab: "sax", instrument: null });
    expect(parseInstrumentParam("flute")).toEqual({ tab: "flute", instrument: null });
    expect(parseInstrumentParam("others")).toEqual({ tab: "others", instrument: null });
    expect(parseInstrumentParam("guitar")).toEqual({ tab: "others", instrument: "guitar" });
    expect(parseInstrumentParam("none")).toEqual({ tab: "others", instrument: "none" });
    // free-text legacy values are normalized like before
    expect(parseInstrumentParam("Sáo")).toEqual({ tab: "flute", instrument: null });
    expect(parseInstrumentParam("xyz")).toEqual({ tab: "others", instrument: "other" });
  });

  it("round-trips selections to the URL param", () => {
    for (const v of ["sax", "flute", "others", "guitar", "none"]) expect(selectionToParam(parseInstrumentParam(v))).toBe(v);
    expect(selectionToParam({ tab: null, instrument: null })).toBeNull();
  });

  it("groups songs per tab, multi-instrument songs in each tab", () => {
    const songs = [song("a", ["sax"]), song("b", ["guitar", "flute"]), song("c", []), song("d", ["piano"])];
    const g = groupByTab(songs);
    expect(g.sax.map((s) => s.id)).toEqual(["a"]);
    expect(g.flute.map((s) => s.id)).toEqual(["b"]);
    expect(g.others.map((s) => s.id)).toEqual(["b", "c", "d"]);
  });

  it("filters by selection", () => {
    expect(matchesSelection(["sax"], { tab: null, instrument: null })).toBe(true);
    expect(matchesSelection(["sax"], { tab: "flute", instrument: null })).toBe(false);
    expect(matchesSelection(["guitar"], { tab: "others", instrument: null })).toBe(true);
    expect(matchesSelection(["guitar"], { tab: "others", instrument: "piano" })).toBe(false);
    expect(matchesSelection([], { tab: "others", instrument: "none" })).toBe(true);
    expect(matchesSelection(["sax"], { tab: "others", instrument: null })).toBe(false);
  });

  it("counts the other instruments in catalog order, unclassified last", () => {
    const songs = [song("a", ["violin", "sax"]), song("b", []), song("c", ["guitar"]), song("d", ["guitar", "piano"])];
    expect(otherInstrumentCounts(songs)).toEqual([
      { id: "guitar", count: 2 },
      { id: "piano", count: 1 },
      { id: "violin", count: 1 },
      { id: "none", count: 1 },
    ]);
  });

  it("lists sax and sáo first in the focus-first catalog", () => {
    expect(INSTRUMENTS_FOCUS_FIRST.map((i) => i.id).slice(0, 3)).toEqual(["sax", "flute", "guitar"]);
    expect(new Set(INSTRUMENTS_FOCUS_FIRST.map((i) => i.id)).size).toBe(INSTRUMENTS_FOCUS_FIRST.length);
  });
});
