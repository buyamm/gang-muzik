/** tiện ích mã hoá dùng Web Crypto (chạy trên Workers và Node) */
const enc = new TextEncoder();

export function base64url(bytes: ArrayBuffer | Uint8Array): string {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64url(s: string): Uint8Array {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function randomToken(bytes = 32): string {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function sha256(input: string): Promise<string> {
  return base64url(await crypto.subtle.digest("SHA-256", enc.encode(input)));
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

/** ký một chuỗi: `<payload>.<chữ ký>` */
export async function sign(secret: string, payload: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(payload));
  return `${payload}.${base64url(sig)}`;
}

/** trả về payload nếu chữ ký đúng, ngược lại null (so sánh hằng thời gian qua crypto.subtle.verify) */
export async function verifySigned(secret: string, value: string): Promise<string | null> {
  const i = value.lastIndexOf(".");
  if (i <= 0) return null;
  const payload = value.slice(0, i);
  let sig: Uint8Array;
  try {
    sig = fromBase64url(value.slice(i + 1));
  } catch {
    return null;
  }
  const ok = await crypto.subtle.verify("HMAC", await hmacKey(secret), sig, enc.encode(payload));
  return ok ? payload : null;
}
