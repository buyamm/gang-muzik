import { Hono, type Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { User } from "@shared/types";
import { LIMITS, canDelete, canEdit, canSubmit, canView, isAdmin, type SongRef } from "@shared/permissions";
import { serializeInstruments } from "@shared/instruments";
import { OWNER_JOIN, OWNER_SELECT, getSongRow, loadSong, toPage, toSummary, type OwnerCols, type PageRow, type SongRow } from "@shared/server/db";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, songSchema } from "@shared/server/validation";
import type { StudioEnv } from "../env";
import { requireAdmin } from "../session";

const ref = (r: Pick<SongRow, "owner_id" | "status">): SongRef => ({ ownerId: r.owner_id, status: r.status });
const user = (c: Context<StudioEnv>) => c.get("user") as User;
const forbidden = (c: Context) => c.json({ error: "Bạn không có quyền với bài này" }, 403);
const notFound = (c: Context) => c.json({ error: "Không tìm thấy bài" }, 404);
const today = () => new Date().toISOString().slice(0, 10);

/** lấy bài + kiểm tra quyền; trả về Response nếu bị chặn */
async function guard(c: Context<StudioEnv>, id: string, check: (u: User, s: SongRef) => boolean) {
  const row = await getSongRow(c.env.DB, id);
  if (!row) return { res: notFound(c) };
  if (!check(user(c), ref(row))) return { res: forbidden(c) };
  return { row };
}

export const songs = new Hono<StudioEnv>()
  // ?scope=mine|all  &status=draft|pending|approved|rejected  (contributor luôn chỉ thấy bài của mình)
  .get("/", async (c) => {
    const u = user(c);
    const scope = isAdmin(u) && c.req.query("scope") === "all" ? "all" : "mine";
    const status = c.req.query("status");
    const where: string[] = [];
    const args: unknown[] = [];
    if (scope === "mine") {
      where.push("s.owner_id = ?");
      args.push(u.id);
    }
    if (status && ["draft", "pending", "approved", "rejected"].includes(status)) {
      where.push("s.status = ?");
      args.push(status);
    }
    const { results } = await c.env.DB.prepare(
      `SELECT s.*, ${OWNER_SELECT}, (SELECT COUNT(*) FROM pages p WHERE p.song_id = s.id) AS page_count
       FROM songs s ${OWNER_JOIN} ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY ${status === "pending" ? "s.submitted_at ASC" : "s.updated_at DESC"} LIMIT 1000`,
    )
      .bind(...args)
      .all<SongRow & OwnerCols & { page_count: number }>();
    return c.json(results.map((r) => toSummary(r, true)));
  })

  .get("/:id", async (c) => {
    const g = await guard(c, c.req.param("id"), canView);
    if (g.res) return g.res;
    return c.json(await loadSong(c.env.DB, c.req.param("id"), true));
  })

  .post("/", zValidator("json", songSchema), async (c) => {
    const u = user(c);
    if (!isAdmin(u)) {
      const n = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM songs WHERE owner_id = ? AND status != 'approved'")
        .bind(u.id)
        .first<{ n: number }>();
      if ((n?.n ?? 0) >= LIMITS.maxUnapprovedSongs) {
        return c.json({ error: `Bạn đã có ${LIMITS.maxUnapprovedSongs} bài chưa duyệt — chờ duyệt bớt rồi tạo tiếp` }, 429);
      }
    }
    const b = c.req.valid("json");
    const id = crypto.randomUUID();
    const now = Date.now();
    await c.env.DB.prepare(
      `INSERT INTO songs (id, title, artist, instruments, kind, text_content, note, settings_json, created_at, updated_at, owner_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
    )
      .bind(id, b.title, b.artist ?? "", serializeInstruments(b.instruments), b.kind, b.textContent ?? "", b.note ?? "", JSON.stringify(b.settings ?? {}), now, now, u.id)
      .run();
    return c.json(await loadSong(c.env.DB, id, true), 201);
  })

  .put("/:id", zValidator("json", songSchema), async (c) => {
    const id = c.req.param("id");
    const g = await guard(c, id, canEdit);
    if (g.res) return g.res;
    const b = c.req.valid("json");
    await c.env.DB.prepare(
      "UPDATE songs SET title = ?, artist = ?, instruments = ?, kind = ?, text_content = ?, note = ?, settings_json = ?, updated_at = ? WHERE id = ?",
    )
      .bind(b.title, b.artist ?? "", serializeInstruments(b.instruments), b.kind, b.textContent ?? "", b.note ?? "", JSON.stringify(b.settings ?? {}), Date.now(), id)
      .run();
    return c.json(await loadSong(c.env.DB, id, true));
  })

  .delete("/:id", async (c) => {
    const id = c.req.param("id");
    const g = await guard(c, id, canDelete);
    if (g.res) return g.res;
    const { results } = await c.env.DB.prepare("SELECT r2_key FROM pages WHERE song_id = ?").bind(id).all<{ r2_key: string }>();
    if (results.length) await c.env.BUCKET.delete(results.map((r) => r.r2_key));
    await c.env.DB.batch([
      c.env.DB.prepare("DELETE FROM pages WHERE song_id = ?").bind(id),
      c.env.DB.prepare("DELETE FROM songs WHERE id = ?").bind(id),
    ]);
    return c.json({ ok: true });
  })

  // ----- quy trình duyệt -----
  .post("/:id/submit", async (c) => {
    const id = c.req.param("id");
    const g = await guard(c, id, canSubmit);
    if (g.res) return g.res;
    const now = Date.now();
    await c.env.DB.prepare("UPDATE songs SET status = 'pending', submitted_at = ?, updated_at = ? WHERE id = ?").bind(now, now, id).run();
    return c.json(await loadSong(c.env.DB, id, true));
  })

  .post(
    "/:id/review",
    requireAdmin,
    zValidator("json", z.object({ decision: z.enum(["approve", "reject", "unpublish"]), note: z.string().trim().max(1000).optional() })),
    async (c) => {
      const id = c.req.param("id");
      const row = await getSongRow(c.env.DB, id);
      if (!row) return notFound(c);
      const { decision, note } = c.req.valid("json");
      const status = decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "draft";
      if (decision === "reject" && !note) return c.json({ error: "Hãy ghi lý do từ chối để người đăng biết cần sửa gì" }, 400);
      const now = Date.now();
      await c.env.DB.prepare(
        "UPDATE songs SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?",
      )
        .bind(status, decision === "approve" ? "" : (note ?? ""), user(c).id, now, now, id)
        .run();
      return c.json(await loadSong(c.env.DB, id, true));
    },
  )

  // ----- ảnh -----
  .post("/:id/pages", async (c) => {
    const songId = c.req.param("id");
    const g = await guard(c, songId, canEdit);
    if (g.res) return g.res;
    const u = user(c);
    const count = await c.env.DB.prepare("SELECT COUNT(*) AS n, COALESCE(MAX(position), -1) AS m FROM pages WHERE song_id = ?")
      .bind(songId)
      .first<{ n: number; m: number }>();
    if ((count?.n ?? 0) >= LIMITS.maxPagesPerSong) return c.json({ error: `Mỗi bài tối đa ${LIMITS.maxPagesPerSong} ảnh` }, 400);
    if (!isAdmin(u)) {
      const used = await c.env.DB.prepare("SELECT count FROM upload_counts WHERE user_id = ? AND day = ?")
        .bind(u.id, today())
        .first<{ count: number }>();
      if ((used?.count ?? 0) >= LIMITS.maxUploadsPerDay) return c.json({ error: "Bạn đã tải quá nhiều ảnh hôm nay, thử lại ngày mai" }, 429);
    }

    const form = await c.req.formData();
    const file = form.get("file");
    const width = Number(form.get("width"));
    const height = Number(form.get("height"));
    if (!(file instanceof File)) return c.json({ error: "Thiếu file" }, 400);
    const ext = IMAGE_TYPES[file.type];
    if (!ext) return c.json({ error: "Chỉ hỗ trợ ảnh WebP/JPEG/PNG" }, 400);
    if (file.size > MAX_IMAGE_BYTES) return c.json({ error: "Ảnh quá lớn (tối đa 15MB)" }, 400);
    if (!(width > 0 && height > 0 && width <= 20000 && height <= 20000)) return c.json({ error: "Kích thước ảnh không hợp lệ" }, 400);

    const pageId = crypto.randomUUID();
    const key = `songs/${songId}/${pageId}.${ext}`;
    await c.env.BUCKET.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
    const row: PageRow = { id: pageId, song_id: songId, r2_key: key, position: (count?.m ?? -1) + 1, width: Math.round(width), height: Math.round(height) };
    await c.env.DB.batch([
      c.env.DB.prepare("INSERT INTO pages (id, song_id, r2_key, position, width, height) VALUES (?, ?, ?, ?, ?, ?)").bind(
        row.id, row.song_id, row.r2_key, row.position, row.width, row.height,
      ),
      c.env.DB.prepare("UPDATE songs SET updated_at = ? WHERE id = ?").bind(Date.now(), songId),
      c.env.DB.prepare(
        "INSERT INTO upload_counts (user_id, day, count) VALUES (?, ?, 1) ON CONFLICT(user_id, day) DO UPDATE SET count = count + 1",
      ).bind(u.id, today()),
    ]);
    return c.json(toPage(row), 201);
  })

  .put("/:id/pages/order", zValidator("json", z.object({ ids: z.array(z.string()).max(500) })), async (c) => {
    const songId = c.req.param("id");
    const g = await guard(c, songId, canEdit);
    if (g.res) return g.res;
    const { ids } = c.req.valid("json");
    if (ids.length) {
      await c.env.DB.batch(
        ids.map((pid, i) => c.env.DB.prepare("UPDATE pages SET position = ? WHERE id = ? AND song_id = ?").bind(i, pid, songId)),
      );
    }
    return c.json(await loadSong(c.env.DB, songId, true));
  });

export const pages = new Hono<StudioEnv>().delete("/:id", async (c) => {
  const page = await c.env.DB.prepare("SELECT r2_key, song_id FROM pages WHERE id = ?")
    .bind(c.req.param("id"))
    .first<{ r2_key: string; song_id: string }>();
  if (!page) return c.json({ error: "Không tìm thấy ảnh" }, 404);
  const g = await guard(c, page.song_id, canEdit);
  if (g.res) return g.res;
  await c.env.BUCKET.delete(page.r2_key);
  await c.env.DB.prepare("DELETE FROM pages WHERE id = ?").bind(c.req.param("id")).run();
  return c.json({ ok: true });
});
