import { describe, expect, it } from "vitest";
import { toSummary, type SongRow } from "./db";

const row = (settings_json: string): SongRow & { page_count: number } => ({
  id: "s1",
  title: "Song",
  artist: "",
  instrument: "",
  instruments: "[]",
  kind: "text",
  text_content: "",
  note: "",
  settings_json,
  created_at: 1,
  updated_at: 2,
  owner_id: null,
  status: "approved",
  review_note: "",
  reviewed_by: null,
  reviewed_at: null,
  submitted_at: null,
  page_count: 0,
});

describe("toSummary", () => {
  it("includes the song key from settings", () => {
    expect(toSummary(row('{"key":"Am","bpm":90}')).key).toBe("Am");
  });

  it("omits the key when it is not set", () => {
    expect("key" in toSummary(row('{"bpm":90}'))).toBe(false);
    expect("key" in toSummary(row("not json"))).toBe(false);
    expect("key" in toSummary(row("null"))).toBe(false);
  });
});
