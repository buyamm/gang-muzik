import { base64url, fromBase64url, randomToken } from "./crypto";

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture: string;
}

/** PKCE: code_challenge = BASE64URL(SHA256(verifier)) */
export async function pkceChallenge(verifier: string): Promise<string> {
  return base64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
}

export function newOAuthState() {
  return { state: randomToken(16), verifier: randomToken(32) };
}

export function buildAuthUrl(p: { clientId: string; redirectUri: string; state: string; challenge: string }) {
  const u = new URL(GOOGLE_AUTH_URL);
  u.searchParams.set("client_id", p.clientId);
  u.searchParams.set("redirect_uri", p.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", "openid email profile");
  u.searchParams.set("state", p.state);
  u.searchParams.set("code_challenge", p.challenge);
  u.searchParams.set("code_challenge_method", "S256");
  u.searchParams.set("prompt", "select_account");
  return u.toString();
}

export function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const parts = jwt.split(".");
  if (parts.length !== 3) throw new Error("id_token không hợp lệ");
  return JSON.parse(new TextDecoder().decode(fromBase64url(parts[1]))) as Record<string, unknown>;
}

/**
 * Kiểm tra claim của id_token. Token được nhận trực tiếp từ Google qua kênh server–server (TLS),
 * nên theo OIDC Core §3.1.3.7 có thể bỏ qua xác minh chữ ký, nhưng vẫn phải kiểm iss / aud / exp.
 */
export function validateClaims(claims: Record<string, unknown>, clientId: string, nowMs = Date.now()): GoogleProfile {
  if (!GOOGLE_ISSUERS.includes(String(claims.iss))) throw new Error("Sai issuer");
  const aud = claims.aud;
  if (!(aud === clientId || (Array.isArray(aud) && aud.includes(clientId)))) throw new Error("Sai audience");
  if (typeof claims.exp !== "number" || claims.exp * 1000 < nowMs) throw new Error("Token đã hết hạn");
  if (claims.email_verified !== true) throw new Error("Email Google chưa được xác minh");
  if (typeof claims.sub !== "string" || !claims.sub) throw new Error("Thiếu sub");
  if (typeof claims.email !== "string" || !claims.email) throw new Error("Thiếu email");
  return {
    sub: claims.sub,
    email: claims.email.toLowerCase(),
    name: typeof claims.name === "string" ? claims.name : "",
    picture: typeof claims.picture === "string" ? claims.picture : "",
  };
}

/** danh sách email admin từ secret ADMIN_EMAILS (cách nhau bởi dấu phẩy / khoảng trắng) */
export function parseAdminEmails(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}
