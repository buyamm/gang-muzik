import type { Song, SongSummary } from "@shared/types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** API công khai (chỉ đọc) */
async function request<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`);
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(res.status, body.error ?? `Lỗi ${res.status}`);
  return body as T;
}

export const api = {
  listSongs: () => request<SongSummary[]>("/songs"),
  getSong: (id: string) => request<Song>(`/songs/${id}`),
};
