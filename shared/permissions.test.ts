import { describe, expect, it } from "vitest";
import { canDelete, canEdit, canReview, canSubmit, canView, type Actor, type SongRef } from "./permissions";

const admin: Actor = { id: "a", role: "admin" };
const me: Actor = { id: "u1", role: "contributor" };
const other: Actor = { id: "u2", role: "contributor" };
const song = (status: SongRef["status"], ownerId: string | null = "u1"): SongRef => ({ ownerId, status });

describe("phân quyền", () => {
  it("contributor sửa / xoá bài của mình khi chưa duyệt", () => {
    for (const st of ["draft", "pending", "rejected"] as const) {
      expect(canEdit(me, song(st))).toBe(true);
      expect(canDelete(me, song(st))).toBe(true);
    }
  });
  it("bài đã duyệt bị khoá với contributor, admin vẫn sửa được", () => {
    expect(canEdit(me, song("approved"))).toBe(false);
    expect(canDelete(me, song("approved"))).toBe(false);
    expect(canEdit(admin, song("approved"))).toBe(true);
  });
  it("không đụng được bài của người khác", () => {
    for (const st of ["draft", "pending", "rejected", "approved"] as const) {
      expect(canEdit(other, song(st))).toBe(false);
      expect(canSubmit(other, song(st))).toBe(false);
    }
    expect(canView(other, song("draft"))).toBe(false);
    expect(canView(other, song("approved"))).toBe(true);
  });
  it("bài không có chủ (bài cũ) chỉ admin quản lý", () => {
    expect(canEdit(me, song("draft", null))).toBe(false);
    expect(canEdit(admin, song("draft", null))).toBe(true);
  });
  it("gửi duyệt chỉ từ Nháp / Bị từ chối", () => {
    expect(canSubmit(me, song("draft"))).toBe(true);
    expect(canSubmit(me, song("rejected"))).toBe(true);
    expect(canSubmit(me, song("pending"))).toBe(false);
    expect(canSubmit(me, song("approved"))).toBe(false);
  });
  it("chỉ admin được duyệt", () => {
    expect(canReview(admin)).toBe(true);
    expect(canReview(me)).toBe(false);
  });
});
