import { describe, expect, it } from "vitest";
import { instrumentLabel, normalizeInstrument, parseInstruments, serializeInstruments } from "./instruments";

describe("normalizeInstrument", () => {
  it("giữ nguyên id hợp lệ", () => {
    expect(normalizeInstrument("guitar")).toBe("guitar");
    expect(normalizeInstrument("flute")).toBe("flute");
  });
  it("nhận diện dữ liệu nhập tay cũ", () => {
    expect(normalizeInstrument("Guitar")).toBe("guitar");
    expect(normalizeInstrument("Sáo C")).toBe("flute");
    expect(normalizeInstrument("Đàn piano")).toBe("piano");
    expect(normalizeInstrument("Alto Sax")).toBe("sax");
    expect(normalizeInstrument("Vĩ cầm")).toBe("violin");
    expect(normalizeInstrument("Violin")).toBe("violin");
  });
  it("rỗng khi chưa chọn, 'other' khi không nhận ra", () => {
    expect(normalizeInstrument("")).toBe("");
    expect(normalizeInstrument("  ")).toBe("");
    expect(normalizeInstrument("Đàn bầu")).toBe("other");
  });
  it("trả nhãn tiếng Việt", () => {
    expect(instrumentLabel("flute")).toBe("Sáo");
    expect(instrumentLabel("Sáo C")).toBe("Sáo");
    expect(instrumentLabel("")).toBe("");
  });
});

describe("parseInstruments / serializeInstruments", () => {
  it("tách, chuẩn hoá, bỏ trùng và xếp theo danh mục", () => {
    expect(parseInstruments("flute,guitar,flute")).toEqual(["guitar", "flute"]);
    expect(parseInstruments("Sáo C")).toEqual(["flute"]);
    expect(parseInstruments("")).toEqual([]);
  });
  it("ghi lại thành chuỗi gọn", () => {
    expect(serializeInstruments(["violin", "guitar"])).toBe("guitar,violin");
    expect(serializeInstruments(undefined)).toBe("");
  });
});
