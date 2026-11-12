import { parseInstruments } from "../instruments";
import type { PageImage, Song, SongSettings, SongStatus, SongSummary } from "@shared/types";

export interface SongRow {
  id: string;
  title: string;
  artist: string;
  instrument: string;
  instruments: string;
  kind: "sheet" | "text";
  text_content: string;
  note: string;
  settings_json: string;
  created_at: number;
  updated_at: number;
  owner_id: string | null;
  status: SongStatus;
  review_note: string;
  reviewed_by: string | null;
  reviewed_at: number | null;
  submitted_at: number | null;
}

/** cột người đăng lấy qua LEFT JOIN users */
export interface OwnerCols {
  owner_name?: string | null;
  owner_email?: string | null;
}

export interface PageRow {
  id: string;
  song_id: string;
  r2_key: string;
  position: number;
  width: number;
  height: number;
}

export const OWNER_JOIN = "LEFT JOIN users u ON u.id = s.owner_id";
export const OWNER_SELECT = "u.name AS owner_name, u.email AS owner_email";

export const fileUrl = (key: string) => `/api/files/${key}`;

export function toPage(r: PageRow): PageImage {
  return { id: r.id, songId: r.song_id, url: fileUrl(r.r2_key), position: r.position, width: r.width, height: r.height };
}

function parseSettings(json: string): SongSettings {
  try {
    return JSON.parse(json) as SongSettings;
  } catch {
    return {};
  }
}

/** `withMeta`: kèm trạng thái duyệt + người đăng (chỉ Studio dùng) */
function meta(r: SongRow & OwnerCols, withMeta: boolean) {
  if (!withMeta) return {};
  return {
    status: r.status,
    reviewNote: r.review_note,
    owner: r.owner_id ? { id: r.owner_id, name: r.owner_name ?? "", email: r.owner_email ?? "" } : null,
  };
}

export function toSong(r: SongRow & OwnerCols, pages: PageRow[], withMeta = false): Song {
  return {
    id: r.id,
    title: r.title,
    artist: r.artist,
    instruments: parseInstruments(r.instruments),
    kind: r.kind,
    textContent: r.text_content,
    note: r.note ?? "",
    settings: parseSettings(r.settings_json),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    pages: pages.map(toPage),
    ...meta(r, withMeta),
  };
}

export function toSummary(r: SongRow & OwnerCols & { page_count: number }, withMeta = false): SongSummary {
  return {
    id: r.id,
    title: r.title,
    artist: r.artist,
    instruments: parseInstruments(r.instruments),
    kind: r.kind,
    updatedAt: r.updated_at,
    pageCount: r.page_count,
    ...meta(r, withMeta),
  };
}

export async function getSongRow(db: D1Database, id: string) {
  return db
    .prepare(`SELECT s.*, ${OWNER_SELECT} FROM songs s ${OWNER_JOIN} WHERE s.id = ?`)
    .bind(id)
    .first<SongRow & OwnerCols>();
}

export async function getPages(db: D1Database, songId: string) {
  const { results } = await db
    .prepare("SELECT * FROM pages WHERE song_id = ? ORDER BY position")
    .bind(songId)
    .all<PageRow>();
  return results;
}

export async function loadSong(db: D1Database, id: string, withMeta = false): Promise<Song | null> {
  const row = await getSongRow(db, id);
  if (!row) return null;
  return toSong(row, await getPages(db, id), withMeta);
}
