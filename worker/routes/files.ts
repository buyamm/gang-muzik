import { Hono } from "hono";
import type { AppEnv } from "../env";

/** ảnh công khai: chỉ phục vụ ảnh thuộc bài đã duyệt */
export const files = new Hono<AppEnv>().get("/*", async (c) => {
  const key = decodeURIComponent(c.req.path.replace(/^\/api\/files\//, ""));
  if (!key.startsWith("songs/") || key.includes("..")) return c.notFound();
  const ok = await c.env.DB.prepare(
    "SELECT 1 FROM pages p JOIN songs s ON s.id = p.song_id WHERE p.r2_key = ? AND s.status = 'approved'",
  )
    .bind(key)
    .first();
  if (!ok) return c.notFound();
  const obj = await c.env.BUCKET.get(key);
  if (!obj) return c.notFound();
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(obj.body, { headers });
});
