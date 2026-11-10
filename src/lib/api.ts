import type { PageImage, Song, SongInput, SongSummary } from "@shared/types";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, { credentials: "same-origin", ...init });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(res.status, body.error ?? `Lỗi ${res.status}`);
  return body as T;
}

const json = (method: string, data: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(data),
});

export const api = {
  me: () => request<{ admin: boolean }>("/me"),
  login: (pin: string) => request<{ admin: boolean }>("/login", json("POST", { pin })),
  logout: () => request<{ admin: boolean }>("/logout", { method: "POST" }),
  listSongs: () => request<SongSummary[]>("/songs"),
  getSong: (id: string) => request<Song>(`/songs/${id}`),
  createSong: (input: SongInput) => request<Song>("/songs", json("POST", input)),
  updateSong: (id: string, input: SongInput) => request<Song>(`/songs/${id}`, json("PUT", input)),
  deleteSong: (id: string) => request<{ ok: true }>(`/songs/${id}`, { method: "DELETE" }),
  uploadPage: (songId: string, file: Blob, width: number, height: number) => {
    const fd = new FormData();
    fd.append("file", file, "page");
    fd.append("width", String(width));
    fd.append("height", String(height));
    return request<PageImage>(`/songs/${songId}/pages`, { method: "POST", body: fd });
  },
  reorderPages: (songId: string, ids: string[]) => request<Song>(`/songs/${songId}/pages/order`, json("PUT", { ids })),
  deletePage: (id: string) => request<{ ok: true }>(`/pages/${id}`, { method: "DELETE" }),
};

export function songToInput(s: Song): SongInput {
  return {
    title: s.title,
    artist: s.artist,
    instrument: s.instrument,
    kind: s.kind,
    textContent: s.textContent,
    settings: s.settings,
  };
}
