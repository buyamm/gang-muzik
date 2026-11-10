import type { Context, Next } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { User } from "@shared/types";
import { randomToken, sha256 } from "./crypto";
import type { StudioEnv } from "./env";

export const SESSION_COOKIE = "gm_session";
const SESSION_DAYS = 30;

interface UserRow {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  role: "admin" | "contributor";
  status: "active" | "banned";
  created_at: number;
  last_login_at: number;
}

export function toUser(r: UserRow): User {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    avatarUrl: r.avatar_url,
    role: r.role,
    status: r.status,
    createdAt: r.created_at,
    lastLoginAt: r.last_login_at,
  };
}

const secure = (c: Context) => new URL(c.req.url).protocol === "https:";

export async function createSession(c: Context<StudioEnv>, userId: string) {
  const token = randomToken(32);
  const now = Date.now();
  await c.env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .bind(await sha256(token), userId, now + SESSION_DAYS * 86_400_000, now)
    .run();
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: secure(c),
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function destroySession(c: Context<StudioEnv>) {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) await c.env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  deleteCookie(c, SESSION_COOKIE, { path: "/", secure: secure(c) });
}

/** gắn user (hoặc null) vào context từ cookie phiên */
export async function loadUser(c: Context<StudioEnv>, next: Next) {
  c.set("user", null);
  const token = getCookie(c, SESSION_COOKIE);
  if (token && token.length < 200) {
    const row = await c.env.DB.prepare(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ? AND u.status = 'active'`,
    )
      .bind(await sha256(token), Date.now())
      .first<UserRow>();
    if (row) c.set("user", toUser(row));
  }
  await next();
}

export async function requireUser(c: Context<StudioEnv>, next: Next) {
  if (!c.get("user")) return c.json({ error: "Cần đăng nhập" }, 401);
  await next();
}

export async function requireAdmin(c: Context<StudioEnv>, next: Next) {
  const u = c.get("user");
  if (!u) return c.json({ error: "Cần đăng nhập" }, 401);
  if (u.role !== "admin") return c.json({ error: "Chỉ quản trị viên" }, 403);
  await next();
}

/**
 * Chống CSRF cho mọi request ghi: phải có header tuỳ biến (form/link của trang khác không gửi được)
 * và Origin trùng với chính Studio.
 */
export async function csrf(c: Context<StudioEnv>, next: Next) {
  const m = c.req.method;
  if (m !== "GET" && m !== "HEAD" && m !== "OPTIONS") {
    const origin = c.req.header("origin");
    const self = new URL(c.req.url).origin;
    if (c.req.header("x-gm-studio") !== "1" || origin !== self) {
      return c.json({ error: "Yêu cầu không hợp lệ (CSRF)" }, 403);
    }
  }
  await next();
}
