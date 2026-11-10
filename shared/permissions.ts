import type { Role, SongStatus } from "./types";

/** Quy tắc phân quyền dùng chung cho Studio API và giao diện Studio. */
export interface Actor {
  id: string;
  role: Role;
}
export interface SongRef {
  ownerId: string | null;
  status: SongStatus;
}

export const isAdmin = (a: Actor) => a.role === "admin";
const isOwner = (a: Actor, s: SongRef) => s.ownerId !== null && s.ownerId === a.id;

/** xem trong Studio: admin, chủ bài, hoặc bài đã duyệt */
export const canView = (a: Actor, s: SongRef) => isAdmin(a) || isOwner(a, s) || s.status === "approved";

/** sửa nội dung / ảnh: admin luôn được; chủ bài chỉ khi bài chưa được duyệt */
export const canEdit = (a: Actor, s: SongRef) => isAdmin(a) || (isOwner(a, s) && s.status !== "approved");

export const canDelete = canEdit;

/** gửi duyệt: từ Nháp hoặc Bị từ chối */
export const canSubmit = (a: Actor, s: SongRef) =>
  (isAdmin(a) || isOwner(a, s)) && (s.status === "draft" || s.status === "rejected");

export const canReview = (a: Actor) => isAdmin(a);

export const LIMITS = {
  /** số bài chưa duyệt tối đa của một contributor */
  maxUnapprovedSongs: 20,
  maxPagesPerSong: 40,
  maxUploadsPerDay: 150,
} as const;

export const STATUS_LABEL: Record<SongStatus, string> = {
  draft: "Nháp",
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Bị từ chối",
};
