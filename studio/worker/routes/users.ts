import { Hono } from "hono";
import type { StudioEnv } from "../env";
import { toUser } from "../session";

/** quản lý người dùng — chỉ admin (middleware gắn ở index.ts) */
export const users = new Hono<StudioEnv>()
  .get("/", async (c) => {
    const { results } = await c.env.DB.prepare(
      `SELECT u.*,
         (SELECT COUNT(*) FROM songs s WHERE s.owner_id = u.id) AS song_count,
         (SELECT COUNT(*) FROM songs s WHERE s.owner_id = u.id AND s.status = 'approved') AS approved_count
       FROM users u ORDER BY u.last_login_at DESC LIMIT 1000`,
    ).all<Parameters<typeof toUser>[0] & { song_count: number; approved_count: number }>();
    return c.json(results.map((r) => ({ ...toUser(r), songCount: r.song_count, approvedCount: r.approved_count })));
  })
  .post("/:id/:action{ban|unban}", async (c) => {
    const id = c.req.param("id");
    const action = c.req.param("action");
    const target = await c.env.DB.prepare("SELECT role FROM users WHERE id = ?").bind(id).first<{ role: string }>();
    if (!target) return c.json({ error: "Không tìm thấy người dùng" }, 404);
    if (target.role === "admin") return c.json({ error: "Không thể khoá quản trị viên" }, 400);
    const status = action === "ban" ? "banned" : "active";
    const stmts = [c.env.DB.prepare("UPDATE users SET status = ? WHERE id = ?").bind(status, id)];
    // khoá: đăng xuất ngay mọi phiên + gỡ các bài chưa duyệt khỏi hàng chờ
    if (action === "ban") {
      stmts.push(c.env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id));
      stmts.push(
        c.env.DB.prepare("UPDATE songs SET status = 'rejected', review_note = 'Tài khoản bị khoá' WHERE owner_id = ? AND status = 'pending'").bind(id),
      );
    }
    await c.env.DB.batch(stmts);
    return c.json({ ok: true });
  });
