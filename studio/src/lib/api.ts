import type { PageImage, Song, SongInput, SongStatus, SongSummary, User } from "@shared/types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: "same-origin",
    ...init,
    // header chống CSRF — server từ chối mọi request ghi thiếu header này
    headers: { "x-gm-studio": "1", ...(init.headers ?? {}) },
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(res.status, body.error ?? `Lỗi ${res.status}`);
  return body as T;
}

const json = (method: string, data: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(data),
});

export interface Me {
  user: User | null;
  devLogin: boolean;
  googleReady: boolean;
}
export interface UserWithStats extends User {
  songCount: number;
  approvedCount: number;
}

export const api = {
  me: () => request<Me>("/me"),
  devLogin: (email: string, name?: string) => request<{ user: User }>("/auth/dev", json("POST", { email, name })),
  logout: () => request<{ ok: true }>("/auth/logout", { method: "POST" }),

  listSongs: (opts: { scope?: "mine" | "all"; status?: SongStatus } = {}) => {
    const q = new URLSearchParams();
    if (opts.scope) q.set("scope", opts.scope);
    if (opts.status) q.set("status", opts.status);
    return request<SongSummary[]>(`/songs?${q}`);
  },
  getSong: (id: string) => request<Song>(`/songs/${id}`),
  createSong: (input: SongInput) => request<Song>("/songs", json("POST", input)),
  updateSong: (id: string, input: SongInput) => request<Song>(`/songs/${id}`, json("PUT", input)),
  deleteSong: (id: string) => request<{ ok: true }>(`/songs/${id}`, { method: "DELETE" }),
  submitSong: (id: string) => request<Song>(`/songs/${id}/submit`, { method: "POST" }),
  reviewSong: (id: string, decision: "approve" | "reject" | "unpublish", note?: string) =>
    request<Song>(`/songs/${id}/review`, json("POST", { decision, note })),

  uploadPage: (songId: string, file: Blob, width: number, height: number) => {
    const fd = new FormData();
    fd.append("file", file, "page");
    fd.append("width", String(width));
    fd.append("height", String(height));
    return request<PageImage>(`/songs/${songId}/pages`, { method: "POST", body: fd });
  },
  reorderPages: (songId: string, ids: string[]) => request<Song>(`/songs/${songId}/pages/order`, json("PUT", { ids })),
  deletePage: (id: string) => request<{ ok: true }>(`/pages/${id}`, { method: "DELETE" }),

  listUsers: () => request<UserWithStats[]>("/users"),
  setBanned: (id: string, banned: boolean) => request<{ ok: true }>(`/users/${id}/${banned ? "ban" : "unban"}`, { method: "POST" }),
};

export function songToInput(s: Song): SongInput {
  return { title: s.title, artist: s.artist, instruments: s.instruments, kind: s.kind, textContent: s.textContent, note: s.note, settings: s.settings };
}
