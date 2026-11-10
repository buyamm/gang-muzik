import { Hono } from "hono";
import type { User } from "@shared/types";
import { canView } from "@shared/permissions";
import type { StudioEnv } from "../env";

/** ảnh trong Studio: cần đăng nhập và có quyền xem bài chứa ảnh (kể cả bài chưa duyệt) */
export const files = new Hono<StudioEnv>().get("/*", async (c) => {
  const key = decodeURIComponent(c.req.path.replace(/^\/api\/files\//, ""));
  if (!key.startsWith("songs/") || key.includes("..")) return c.notFound();
  const song = await c.env.DB.prepare(
    "SELECT s.owner_id, s.status FROM pages p JOIN songs s ON s.id = p.song_id WHERE p.r2_key = ?",
  )
    .bind(key)
    .first<{ owner_id: string | null; status: "draft" | "pending" | "approved" | "rejected" }>();
  if (!song || !canView(c.get("user") as User, { ownerId: song.owner_id, status: song.status })) return c.notFound();
  const obj = await c.env.BUCKET.get(key);
  if (!obj) return c.notFound();
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  // riêng tư + luôn hỏi lại server (kèm etag → 304): đăng xuất xong không xem lại được từ cache
  headers.set("cache-control", "private, no-cache");
  return new Response(obj.body, { headers });
});
