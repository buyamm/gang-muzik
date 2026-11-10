import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppEnv } from "../env";
import { COOKIE, MAX_AGE, createToken, isAdmin, safeEqual } from "../auth";

const WINDOW = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export const auth = new Hono<AppEnv>()
  .get("/me", async (c) => c.json({ admin: await isAdmin(c) }))
  .post("/login", zValidator("json", z.object({ pin: z.string().min(1).max(64) })), async (c) => {
    if (!c.env.ADMIN_PIN || !c.env.JWT_SECRET) {
      return c.json({ error: "Máy chủ chưa cấu hình ADMIN_PIN / JWT_SECRET" }, 503);
    }
    const ip = c.req.header("cf-connecting-ip") ?? "local";
    const now = Date.now();
    const row = await c.env.DB.prepare("SELECT count, window_start FROM login_attempts WHERE ip = ?")
      .bind(ip)
      .first<{ count: number; window_start: number }>();
    const fresh = !row || now - row.window_start > WINDOW;
    if (!fresh && row.count >= MAX_ATTEMPTS) {
      return c.json({ error: "Thử quá nhiều lần, đợi 15 phút." }, 429);
    }
    const { pin } = c.req.valid("json");
    if (!safeEqual(pin, c.env.ADMIN_PIN)) {
      await c.env.DB.prepare(
        "INSERT INTO login_attempts (ip, count, window_start) VALUES (?1, 1, ?2) ON CONFLICT(ip) DO UPDATE SET count = CASE WHEN ?2 - window_start > ?3 THEN 1 ELSE count + 1 END, window_start = CASE WHEN ?2 - window_start > ?3 THEN ?2 ELSE window_start END",
      )
        .bind(ip, now, WINDOW)
        .run();
      return c.json({ error: "Sai mã PIN" }, 401);
    }
    await c.env.DB.prepare("DELETE FROM login_attempts WHERE ip = ?").bind(ip).run();
    setCookie(c, COOKIE, await createToken(c.env.JWT_SECRET), {
      httpOnly: true,
      secure: new URL(c.req.url).protocol === "https:",
      sameSite: "Lax",
      path: "/",
      maxAge: MAX_AGE,
    });
    return c.json({ admin: true });
  })
  .post("/logout", (c) => {
    deleteCookie(c, COOKIE, { path: "/" });
    return c.json({ admin: false });
  });
