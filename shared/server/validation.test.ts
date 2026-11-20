import { describe, expect, it } from "vitest";
import { settingsSchema } from "./validation";

describe("settingsSchema.key", () => {
  it.each(["C", "F#m", "Bb", "Ebm", "Am", "G"])("accepts %s", (key) => {
    expect(settingsSchema.safeParse({ key }).success).toBe(true);
  });

  it.each(["H", "Cmaj", "c", "", "Am7", "C##"])("rejects %s", (key) => {
    expect(settingsSchema.safeParse({ key }).success).toBe(false);
  });

  it("allows settings without a key", () => {
    expect(settingsSchema.safeParse({ bpm: 90 }).success).toBe(true);
  });
});
