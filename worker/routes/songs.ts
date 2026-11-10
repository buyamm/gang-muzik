import { Hono } from "hono";
import type { AppEnv } from "../env";
import { getPages, getSongRow, toSong, toSummary, type SongRow } from "@shared/server/db";

/** API công khai: CHỈ ĐỌC, chỉ bài đã được duyệt. Mọi thao tác ghi nằm ở Studio. */
export const songs = new Hono<AppEnv>()
  .get("/", async (c) => {
    const { results } = await c.env.DB.prepare(
      `SELECT s.*, (SELECT COUNT(*) FROM pages p WHERE p.song_id = s.id) AS page_count
       FROM songs s WHERE s.status = 'approved' ORDER BY s.updated_at DESC LIMIT 1000`,
    ).all<SongRow & { page_count: number }>();
    return c.json(results.map((r) => toSummary(r)));
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const row = await getSongRow(c.env.DB, id);
    if (!row || row.status !== "approved") return c.json({ error: "Không tìm thấy bài" }, 404);
    return c.json(toSong(row, await getPages(c.env.DB, id)));
  });
