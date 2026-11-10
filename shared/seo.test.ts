import { describe, expect, it } from "vitest";
import { homeSeo, songSeo, songJsonLd, truncate } from "./seo";

const song = {
  id: "abc",
  title: "Nối vòng tay lớn",
  artist: "Trịnh Công Sơn",
  instruments: ["guitar", "flute"] as ("guitar" | "flute")[],
  kind: "text" as const,
  pages: [],
  createdAt: 0,
  updatedAt: 86_400_000,
};

describe("seo", () => {
  it("truncate cắt ở ranh giới từ và không vượt giới hạn", () => {
    const t = truncate("một hai ba bốn năm sáu bảy tám chín mười ".repeat(10), 50);
    expect(t.length).toBeLessThanOrEqual(50);
    expect(t.endsWith("…")).toBe(true);
    expect(truncate("  ngắn   thôi ")).toBe("ngắn thôi");
  });

  it("songSeo có tên bài, nghệ sĩ, nhạc cụ", () => {
    const m = songSeo(song);
    expect(m.path).toBe("/s/abc");
    expect(m.title).toContain("Nối vòng tay lớn — Trịnh Công Sơn");
    expect(m.description).toContain("Guitar, Sáo");
    expect(m.description.length).toBeLessThanOrEqual(160);
  });

  it("homeSeo theo nhạc cụ, bỏ qua giá trị lạ", () => {
    expect(homeSeo("guitar").path).toBe("/?instrument=guitar");
    expect(homeSeo("xyz123").path).toBe("/");
    expect(homeSeo(null).path).toBe("/");
  });

  it("JSON-LD dùng URL tuyệt đối", () => {
    const [comp, crumbs] = songJsonLd(song, "https://x.test");
    expect(comp.url).toBe("https://x.test/s/abc");
    expect(comp.dateModified).toBe("1970-01-02T00:00:00.000Z");
    expect(crumbs.itemListElement[1].item).toBe("https://x.test/s/abc");
  });
});
