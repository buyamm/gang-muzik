import { describe, expect, it } from "vitest";
import { formatDuration, paginate, parseDuration, speedFromDuration } from "./math";

describe("speedFromDuration", () => {
  it("tính px/s", () => {
    expect(speedFromDuration(1800, 180)).toBe(10);
    expect(speedFromDuration(0, 180)).toBe(0);
    expect(speedFromDuration(100, 0)).toBe(0);
  });
});

describe("paginate", () => {
  it("một trang khi nội dung ngắn", () => {
    expect(paginate(500, 800)).toEqual([0]);
  });
  it("chia đều với overlap và trang cuối khớp đáy", () => {
    const s = paginate(3000, 1000, 0.1);
    expect(s[0]).toBe(0);
    expect(s[1]).toBe(900);
    expect(s.at(-1)).toBe(2000);
    for (let i = 1; i < s.length; i++) expect(s[i] - s[i - 1]).toBeLessThanOrEqual(1000);
  });
  it("ưu tiên điểm ngắt đoạn", () => {
    const s = paginate(3000, 1000, 0.1, [700, 1650]);
    expect(s[1]).toBe(700);
    expect(s[2]).toBe(1650);
    expect(s.at(-1)).toBe(2000);
  });
});

describe("duration", () => {
  it("format & parse", () => {
    expect(formatDuration(220)).toBe("3:40");
    expect(parseDuration("3:40")).toBe(220);
    expect(parseDuration("90")).toBe(90);
    expect(parseDuration("abc")).toBeNull();
  });
});

import { autoColumns, paginateBook } from "./math";

describe("paginateBook", () => {
  it("một trang khi vừa", () => {
    expect(paginateBook(500, 800)).toEqual([{ start: 0, height: 500 }]);
  });
  it("cắt ở điểm ngắt lớn nhất còn vừa trang", () => {
    const p = paginateBook(2000, 800, [300, 700, 750, 1400, 1500]);
    expect(p[0]).toEqual({ start: 0, height: 750 });
    expect(p[1]).toEqual({ start: 750, height: 750 });
    expect(p[2]).toEqual({ start: 1500, height: 500 });
  });
  it("cắt cứng có chồng lấn khi không có điểm ngắt", () => {
    const p = paginateBook(2000, 1000);
    expect(p[0]).toEqual({ start: 0, height: 1000 });
    expect(p[1].start).toBe(960);
    expect(p.at(-1)!.start + p.at(-1)!.height).toBe(2000);
  });
});

describe("autoColumns", () => {
  it("điện thoại 1 cột, tablet ngang 2, desktop 3", () => {
    expect(autoColumns(375, 800)).toBe(1);
    expect(autoColumns(1024, 700)).toBe(2);
    expect(autoColumns(1440, 850)).toBe(3);
    expect(autoColumns(820, 1180)).toBe(1);
  });
});
