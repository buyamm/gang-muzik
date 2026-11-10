export type SongKind = "sheet" | "text";
export type SongStatus = "draft" | "pending" | "approved" | "rejected";
export type Role = "admin" | "contributor";

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  role: Role;
  status: "active" | "banned";
  createdAt: number;
  lastLoginAt: number;
}

/** thông tin người đăng (hiển thị trong Studio) */
export interface Owner {
  id: string;
  name: string;
  email: string;
}
export type ViewMode = "scroll" | "pages";

export interface SongSettings {
  mode?: ViewMode;
  /** total song duration in seconds — used to derive scroll speed */
  durationSec?: number;
  /** explicit scroll speed (px/s at reference width), overrides durationSec */
  scrollSpeed?: number;
  fontScale?: number;
  /** seconds each page stays before auto-turning in pages mode */
  pageSeconds?: number;
  bpm?: number;
}

export interface PageImage {
  id: string;
  songId: string;
  url: string;
  position: number;
  width: number;
  height: number;
}

export interface SongSummary {
  id: string;
  title: string;
  artist: string;
  /** id trong shared/instruments.ts, có thể nhiều nhạc cụ */
  instruments: string[];
  kind: SongKind;
  updatedAt: number;
  pageCount: number;
  /** chỉ có trong Studio */
  status?: SongStatus;
  owner?: Owner | null;
  reviewNote?: string;
}

export interface Song extends Omit<SongSummary, "pageCount"> {
  textContent: string;
  settings: SongSettings;
  createdAt: number;
  pages: PageImage[];
}

export interface SongInput {
  title: string;
  artist?: string;
  instruments?: string[];
  kind: SongKind;
  textContent?: string;
  settings?: SongSettings;
}
