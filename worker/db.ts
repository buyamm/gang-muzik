import type { PageImage, Song, SongSettings, SongSummary } from "@shared/types";

export interface SongRow {
  id: string;
  title: string;
  artist: string;
  instrument: string;
  kind: "sheet" | "text";
  text_content: string;
  settings_json: string;
  created_at: number;
  updated_at: number;
}
export interface PageRow {
  id: string;
  song_id: string;
  r2_key: string;
  position: number;
  width: number;
  height: number;
}

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

export function toSong(r: SongRow, pages: PageRow[]): Song {
  return {
    id: r.id,
    title: r.title,
    artist: r.artist,
    instrument: r.instrument,
    kind: r.kind,
    textContent: r.text_content,
    settings: parseSettings(r.settings_json),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    pages: pages.map(toPage),
  };
}

export function toSummary(r: SongRow & { page_count: number }): SongSummary {
  return {
    id: r.id,
    title: r.title,
    artist: r.artist,
    instrument: r.instrument,
    kind: r.kind,
    updatedAt: r.updated_at,
    pageCount: r.page_count,
  };
}

export async function loadSong(db: D1Database, id: string): Promise<Song | null> {
  const row = await db.prepare("SELECT * FROM songs WHERE id = ?").bind(id).first<SongRow>();
  if (!row) return null;
  const { results } = await db
    .prepare("SELECT * FROM pages WHERE song_id = ? ORDER BY position")
    .bind(id)
    .all<PageRow>();
  return toSong(row, results);
}
