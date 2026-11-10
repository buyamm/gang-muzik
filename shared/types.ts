export type SongKind = "sheet" | "text";
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
  instrument: string;
  kind: SongKind;
  updatedAt: number;
  pageCount: number;
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
  instrument?: string;
  kind: SongKind;
  textContent?: string;
  settings?: SongSettings;
}
