import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppEnv } from "../env";
import { requireAdmin } from "../auth";
import { loadSong, toPage, toSummary, type PageRow, type SongRow } from "../db";

const settingsSchema = z
  .object({
    mode: z.enum(["scroll", "pages"]).optional(),
    durationSec: z.number().min(5).max(3600).optional(),
    scrollSpeed: z.number().min(1).max(1000).optional(),
    fontScale: z.number().min(0.5).max(4).optional(),
    pageSeconds: z.number().min(1).max(600).optional(),
    bpm: z.number().min(20).max(400).optional(),
  })
  .strict();

const songSchema = z.object({
  title: z.string().trim().min(1).max(200),
  artist: z.string().trim().max(200).optional(),
  instrument: z.string().trim().max(100).optional(),
  kind: z.enum(["sheet", "text"]),
  textContent: z.string().max(100_000).optional(),
  settings: settingsSchema.optional(),
});

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export const songs = new Hono<AppEnv>()
  .get("/", async (c) => {
    const { results } = await c.env.DB.prepare(
      `SELECT s.*, (SELECT COUNT(*) FROM pages p WHERE p.song_id = s.id) AS page_count
       FROM songs s ORDER BY s.updated_at DESC LIMIT 1000`,
    ).all<SongRow & { page_count: number }>();
    return c.json(results.map(toSummary));
  })
  .get("/:id", async (c) => {
    const song = await loadSong(c.env.DB, c.req.param("id"));
    if (!song) return c.json({ error: "Không tìm thấy bài" }, 404);
    return c.json(song);
  })
  .post("/", requireAdmin, zValidator("json", songSchema), async (c) => {
    const b = c.req.valid("json");
    const id = crypto.randomUUID();
    const now = Date.now();
    await c.env.DB.prepare(
      "INSERT INTO songs (id, title, artist, instrument, kind, text_content, settings_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(id, b.title, b.artist ?? "", b.instrument ?? "", b.kind, b.textContent ?? "", JSON.stringify(b.settings ?? {}), now, now)
      .run();
    return c.json(await loadSong(c.env.DB, id), 201);
  })
  .put("/:id", requireAdmin, zValidator("json", songSchema), async (c) => {
    const id = c.req.param("id");
    const b = c.req.valid("json");
    const res = await c.env.DB.prepare(
      "UPDATE songs SET title = ?, artist = ?, instrument = ?, kind = ?, text_content = ?, settings_json = ?, updated_at = ? WHERE id = ?",
    )
      .bind(b.title, b.artist ?? "", b.instrument ?? "", b.kind, b.textContent ?? "", JSON.stringify(b.settings ?? {}), Date.now(), id)
      .run();
    if (!res.meta.changes) return c.json({ error: "Không tìm thấy bài" }, 404);
    return c.json(await loadSong(c.env.DB, id));
  })
  .delete("/:id", requireAdmin, async (c) => {
    const id = c.req.param("id");
    const { results } = await c.env.DB.prepare("SELECT r2_key FROM pages WHERE song_id = ?").bind(id).all<{ r2_key: string }>();
    if (results.length) await c.env.BUCKET.delete(results.map((r) => r.r2_key));
    await c.env.DB.batch([
      c.env.DB.prepare("DELETE FROM pages WHERE song_id = ?").bind(id),
      c.env.DB.prepare("DELETE FROM songs WHERE id = ?").bind(id),
    ]);
    return c.json({ ok: true });
  })
  .post("/:id/pages", requireAdmin, async (c) => {
    const songId = c.req.param("id");
    const exists = await c.env.DB.prepare("SELECT id FROM songs WHERE id = ?").bind(songId).first();
    if (!exists) return c.json({ error: "Không tìm thấy bài" }, 404);
    const form = await c.req.formData();
    const file = form.get("file");
    const width = Number(form.get("width"));
    const height = Number(form.get("height"));
    if (!(file instanceof File)) return c.json({ error: "Thiếu file" }, 400);
    const ext = IMAGE_TYPES[file.type];
    if (!ext) return c.json({ error: "Chỉ hỗ trợ ảnh WebP/JPEG/PNG" }, 400);
    if (file.size > MAX_IMAGE_BYTES) return c.json({ error: "Ảnh quá lớn (tối đa 15MB)" }, 400);
    if (!(width > 0 && height > 0)) return c.json({ error: "Thiếu kích thước ảnh" }, 400);
    const pageId = crypto.randomUUID();
    const key = `songs/${songId}/${pageId}.${ext}`;
    await c.env.BUCKET.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
    const max = await c.env.DB.prepare("SELECT COALESCE(MAX(position), -1) AS m FROM pages WHERE song_id = ?")
      .bind(songId)
      .first<{ m: number }>();
    const row: PageRow = { id: pageId, song_id: String(songId), r2_key: key, position: (max?.m ?? -1) + 1, width: Math.round(width), height: Math.round(height) };
    await c.env.DB.batch([
      c.env.DB.prepare("INSERT INTO pages (id, song_id, r2_key, position, width, height) VALUES (?, ?, ?, ?, ?, ?)").bind(
        row.id, row.song_id, row.r2_key, row.position, row.width, row.height,
      ),
      c.env.DB.prepare("UPDATE songs SET updated_at = ? WHERE id = ?").bind(Date.now(), songId),
    ]);
    return c.json(toPage(row), 201);
  })
  .put("/:id/pages/order", requireAdmin, zValidator("json", z.object({ ids: z.array(z.string()).max(500) })), async (c) => {
    const songId = c.req.param("id");
    const { ids } = c.req.valid("json");
    if (ids.length) {
      await c.env.DB.batch(
        ids.map((pid, i) => c.env.DB.prepare("UPDATE pages SET position = ? WHERE id = ? AND song_id = ?").bind(i, pid, songId)),
      );
    }
    return c.json(await loadSong(c.env.DB, songId));
  });

export const pages = new Hono<AppEnv>().delete("/:id", requireAdmin, async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB.prepare("SELECT r2_key FROM pages WHERE id = ?").bind(id).first<{ r2_key: string }>();
  if (!row) return c.json({ error: "Không tìm thấy trang" }, 404);
  await c.env.BUCKET.delete(row.r2_key);
  await c.env.DB.prepare("DELETE FROM pages WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});
