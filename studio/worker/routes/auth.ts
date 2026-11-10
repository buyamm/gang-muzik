import { Hono, type Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { StudioEnv } from "../env";
import { sign, verifySigned } from "../crypto";
import { GOOGLE_TOKEN_URL, buildAuthUrl, decodeJwtPayload, newOAuthState, parseAdminEmails, pkceChallenge, validateClaims, type GoogleProfile } from "../oauth";
import { createSession, destroySession, toUser } from "../session";

const OAUTH_COOKIE = "gm_oauth";
const isLocal = (c: Context) => ["localhost", "127.0.0.1"].includes(new URL(c.req.url).hostname);
const redirectUri = (c: Context) => `${new URL(c.req.url).origin}/api/auth/google/callback`;
const fail = (c: Context, code: string) => c.redirect(`/login?error=${encodeURIComponent(code)}`);

/** tạo hoặc cập nhật user; vai trò admin chỉ dành cho email trong ADMIN_EMAILS */
async function upsertUser(c: Context<StudioEnv>, p: GoogleProfile) {
  const admins = parseAdminEmails(c.env.ADMIN_EMAILS);
  const role = admins.has(p.email) ? "admin" : "contributor";
  const now = Date.now();
  await c.env.DB.prepare(
    `INSERT INTO users (id, google_sub, email, name, avatar_url, role, status, created_at, last_login_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'active', ?7, ?7)
     ON CONFLICT(google_sub) DO UPDATE SET email = ?3, name = ?4, avatar_url = ?5, role = ?6, last_login_at = ?7`,
  )
    .bind(crypto.randomUUID(), p.sub, p.email, p.name, p.picture, role, now)
    .run();
  return c.env.DB.prepare("SELECT * FROM users WHERE google_sub = ?").bind(p.sub).first<Parameters<typeof toUser>[0]>();
}

export const auth = new Hono<StudioEnv>()
  .get("/me", (c) => c.json({ user: c.get("user"), devLogin: c.env.DEV_AUTH === "1" && isLocal(c), googleReady: !!c.env.GOOGLE_CLIENT_ID }))

  .get("/auth/google/start", async (c) => {
    if (!c.env.GOOGLE_CLIENT_ID || !c.env.COOKIE_SECRET) return fail(c, "not_configured");
    const { state, verifier } = newOAuthState();
    setCookie(c, OAUTH_COOKIE, await sign(c.env.COOKIE_SECRET, `${state}~${verifier}`), {
      httpOnly: true,
      secure: !isLocal(c),
      sameSite: "Lax",
      path: "/api/auth/google",
      maxAge: 600,
    });
    return c.redirect(
      buildAuthUrl({ clientId: c.env.GOOGLE_CLIENT_ID, redirectUri: redirectUri(c), state, challenge: await pkceChallenge(verifier) }),
    );
  })

  .get("/auth/google/callback", async (c) => {
    const raw = getCookie(c, OAUTH_COOKIE);
    deleteCookie(c, OAUTH_COOKIE, { path: "/api/auth/google" });
    if (c.req.query("error")) return fail(c, "cancelled");
    const payload = raw && c.env.COOKIE_SECRET ? await verifySigned(c.env.COOKIE_SECRET, raw) : null;
    const [state, verifier] = payload?.split("~") ?? [];
    if (!state || !verifier || state !== c.req.query("state")) return fail(c, "state");
    const code = c.req.query("code");
    if (!code) return fail(c, "code");

    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: c.env.GOOGLE_CLIENT_ID,
        client_secret: c.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri(c),
        grant_type: "authorization_code",
        code_verifier: verifier,
      }),
    });
    if (!res.ok) {
      console.error("google token exchange failed", res.status);
      return fail(c, "token");
    }
    const { id_token } = (await res.json()) as { id_token?: string };
    let profile: GoogleProfile;
    try {
      profile = validateClaims(decodeJwtPayload(id_token ?? ""), c.env.GOOGLE_CLIENT_ID);
    } catch (e) {
      console.error("invalid id_token", (e as Error).message);
      return fail(c, "token");
    }
    const user = await upsertUser(c, profile);
    if (!user) return fail(c, "token");
    if (user.status === "banned") return fail(c, "banned");
    await createSession(c, user.id);
    return c.redirect("/");
  })

  // đăng nhập giả CHỈ khi chạy local với DEV_AUTH=1 — để test không cần Google
  .post("/auth/dev", zValidator("json", z.object({ email: z.email(), name: z.string().max(100).optional() })), async (c) => {
    if (c.env.DEV_AUTH !== "1" || !isLocal(c)) return c.json({ error: "Not found" }, 404);
    const { email, name } = c.req.valid("json");
    const user = await upsertUser(c, { sub: `dev:${email.toLowerCase()}`, email: email.toLowerCase(), name: name ?? email, picture: "" });
    if (!user || user.status === "banned") return c.json({ error: "Tài khoản đã bị khoá" }, 403);
    await createSession(c, user.id);
    return c.json({ user: toUser(user) });
  })

  .post("/auth/logout", async (c) => {
    await destroySession(c);
    return c.json({ ok: true });
  });
