import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { sign, verify } from "hono/jwt";
import type { AppEnv } from "./env";

export const COOKIE = "gm_admin";
export const MAX_AGE = 60 * 60 * 24 * 30;

export async function createToken(secret: string) {
  return sign({ role: "admin", exp: Math.floor(Date.now() / 1000) + MAX_AGE }, secret, "HS256");
}

export async function isAdmin(c: Context<AppEnv>) {
  const token = getCookie(c, COOKIE);
  if (!token || !c.env.JWT_SECRET) return false;
  try {
    const payload = await verify(token, c.env.JWT_SECRET, "HS256");
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export async function requireAdmin(c: Context<AppEnv>, next: Next) {
  if (!(await isAdmin(c))) return c.json({ error: "Unauthorized" }, 401);
  await next();
}

/** constant-time string compare */
export function safeEqual(a: string, b: string) {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}
