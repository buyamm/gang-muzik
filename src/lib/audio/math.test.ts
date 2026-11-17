import { describe, expect, it } from "vitest";
import {
  advanceTick,
  bpmToInterval,
  clampBpm,
  noteToFrequency,
  noteToMidi,
  pitchClass,
  pushTap,
  scheduleWindow,
  tapTempo,
  tickKind,
} from "./math";

describe("pitchClass", () => {
  it("hiểu tên chữ cái, thăng, giáng", () => {
    expect(pitchClass("C")).toBe(0);
    expect(pitchClass("C#")).toBe(1);
    expect(pitchClass("Db")).toBe(1);
    expect(pitchClass("a")).toBe(9);
    expect(pitchClass("B#")).toBe(0);
    expect(pitchClass("Cb")).toBe(11);
  });
  it("hiểu tên cảm âm có hoặc không dấu", () => {
    expect(pitchClass("Đô")).toBe(0);
    expect(pitchClass("Đô#")).toBe(1);
    expect(pitchClass("Rê")).toBe(2);
    expect(pitchClass("re")).toBe(2);
    expect(pitchClass("Sol")).toBe(7);
    expect(pitchClass("Si")).toBe(11);
    expect(pitchClass("Mib")).toBe(3);
  });
  it("nhận số và trả null khi không hiểu", () => {
    expect(pitchClass(14)).toBe(2);
    expect(pitchClass(-1)).toBe(11);
    expect(pitchClass("H")).toBeNull();
    expect(pitchClass("xyz")).toBeNull();
  });
});

describe("noteToFrequency", () => {
  it("A4 = 440Hz, C4 = MIDI 60", () => {
    expect(noteToFrequency("A", 4)).toBeCloseTo(440, 6);
    expect(noteToMidi("C", 4)).toBe(60);
    expect(noteToFrequency("C", 4)).toBeCloseTo(261.6256, 3);
    expect(noteToFrequency("La", 3)).toBeCloseTo(220, 6);
  });
  it("cho phép đổi chuẩn A4", () => {
    expect(noteToFrequency("A", 4, 442)).toBeCloseTo(442, 6);
    expect(noteToFrequency(9, 5, 432)).toBeCloseTo(864, 6);
  });
  it("tên nốt sai → NaN", () => {
    expect(noteToFrequency("Q", 4)).toBeNaN();
  });
});

describe("bpmToInterval / clampBpm", () => {
  it("đổi BPM sang giây mỗi tiếng", () => {
    expect(bpmToInterval(60)).toBe(1);
    expect(bpmToInterval(120)).toBe(0.5);
    expect(bpmToInterval(120, 2)).toBe(0.25);
  });
  it("giới hạn BPM trong 20–400", () => {
    expect(bpmToInterval(1)).toBe(3);
    expect(clampBpm(5)).toBe(20);
    expect(clampBpm(999)).toBe(400);
    expect(clampBpm(96.4)).toBe(96);
    expect(clampBpm(NaN)).toBe(20);
  });
});

describe("advanceTick / tickKind", () => {
  it("đi hết các phách rồi quay về phách mạnh", () => {
    let p = { beat: 0, sub: 0 };
    const kinds = [];
    for (let i = 0; i < 5; i++) {
      kinds.push(tickKind(p));
      p = advanceTick(p, 4);
    }
    expect(kinds).toEqual(["bar", "beat", "beat", "beat", "bar"]);
  });
  it("chia nhỏ phách", () => {
    let p = { beat: 0, sub: 0 };
    const seq = [];
    for (let i = 0; i < 5; i++) {
      seq.push(`${p.beat}.${p.sub}:${tickKind(p)}`);
      p = advanceTick(p, 2, 2);
    }
    expect(seq).toEqual(["0.0:bar", "0.1:sub", "1.0:beat", "1.1:sub", "0.0:bar"]);
  });
  it("chịu được việc giảm số phách giữa chừng", () => {
    expect(advanceTick({ beat: 5, sub: 0 }, 3)).toEqual({ beat: 0, sub: 0 });
  });
});

describe("scheduleWindow", () => {
  it("lên lịch các tiếng trong cửa sổ nhìn trước", () => {
    const r = scheduleWindow(1, 0.95, 0.1, 0.25);
    expect(r.times).toEqual([1]);
    expect(r.nextTime).toBe(1.25);
  });
  it("lên lịch nhiều tiếng khi nhịp nhanh", () => {
    const r = scheduleWindow(0, 0, 0.1, 0.03);
    expect(r.times.length).toBe(4);
    expect(r.nextTime).toBeCloseTo(0.12, 6);
  });
  it("chưa tới thì không lên lịch", () => {
    expect(scheduleWindow(2, 1, 0.1, 0.5)).toEqual({ times: [], nextTime: 2 });
  });
  it("bị trễ nhiều thì bắt nhịp lại, không phát dồn", () => {
    const r = scheduleWindow(0, 10, 0.1, 0.5);
    expect(r.times).toEqual([10]);
    expect(r.nextTime).toBe(10.5);
  });
});

describe("tapTempo / pushTap", () => {
  it("tính BPM từ các lần gõ đều", () => {
    expect(tapTempo([0, 500, 1000, 1500])).toBe(120);
    expect(tapTempo([0, 1000])).toBe(60);
  });
  it("cần ít nhất 2 lần gõ", () => {
    expect(tapTempo([])).toBeNull();
    expect(tapTempo([100])).toBeNull();
  });
  it("bỏ chuỗi gõ cũ khi ngừng quá lâu", () => {
    expect(tapTempo([0, 1000, 5000, 5500])).toBe(120);
    expect(tapTempo([0, 500, 4000])).toBeNull();
  });
  it("pushTap giữ tối đa số lần gõ và xoá khi ngắt quãng", () => {
    expect(pushTap([0, 500], 1000)).toEqual([0, 500, 1000]);
    expect(pushTap([0, 500], 5000)).toEqual([5000]);
    expect(pushTap([1, 2, 3], 4, 2000, 3)).toEqual([2, 3, 4]);
  });
});
