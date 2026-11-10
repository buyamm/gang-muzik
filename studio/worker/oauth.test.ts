import { describe, expect, it } from "vitest";
import { sign, verifySigned, sha256 } from "./crypto";
import { buildAuthUrl, decodeJwtPayload, parseAdminEmails, pkceChallenge, validateClaims } from "./oauth";

const CLIENT = "client-123.apps.googleusercontent.com";
const now = 1_800_000_000_000;
const good = {
  iss: "https://accounts.google.com",
  aud: CLIENT,
  exp: now / 1000 + 600,
  email_verified: true,
  sub: "1234567890",
  email: "Nguoi.Dung@Example.com",
  name: "Người Dùng",
  picture: "https://lh3.googleusercontent.com/a/x",
};

describe("validateClaims", () => {
  it("chấp nhận token hợp lệ, email viết thường", () => {
    expect(validateClaims(good, CLIENT, now)).toMatchObject({ sub: "1234567890", email: "nguoi.dung@example.com" });
  });
  it("từ chối sai issuer / audience / hết hạn / email chưa xác minh", () => {
    expect(() => validateClaims({ ...good, iss: "https://evil.example" }, CLIENT, now)).toThrow();
    expect(() => validateClaims({ ...good, aud: "other-client" }, CLIENT, now)).toThrow();
    expect(() => validateClaims({ ...good, exp: now / 1000 - 1 }, CLIENT, now)).toThrow();
    expect(() => validateClaims({ ...good, email_verified: false }, CLIENT, now)).toThrow();
    expect(() => validateClaims({ ...good, sub: "" }, CLIENT, now)).toThrow();
  });
});

describe("chữ ký cookie", () => {
  it("xác minh đúng, phát hiện sửa đổi và sai khoá", async () => {
    const v = await sign("k1", "state.verifier");
    expect(await verifySigned("k1", v)).toBe("state.verifier");
    expect(await verifySigned("k2", v)).toBeNull();
    expect(await verifySigned("k1", v.replace("state", "STATE"))).toBeNull();
    expect(await verifySigned("k1", "garbage")).toBeNull();
  });
});

describe("PKCE & URL đăng nhập", () => {
  it("challenge theo RFC 7636", async () => {
    // ví dụ chuẩn trong RFC 7636 Appendix B
    expect(await pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
  it("URL có đủ tham số", () => {
    const u = new URL(buildAuthUrl({ clientId: CLIENT, redirectUri: "https://s.test/cb", state: "st", challenge: "ch" }));
    expect(u.searchParams.get("code_challenge_method")).toBe("S256");
    expect(u.searchParams.get("scope")).toBe("openid email profile");
    expect(u.searchParams.get("state")).toBe("st");
  });
  it("giải mã payload JWT", () => {
    const p = btoa(JSON.stringify({ a: 1 })).replace(/=+$/, "");
    expect(decodeJwtPayload(`h.${p}.s`)).toEqual({ a: 1 });
    expect(() => decodeJwtPayload("bad")).toThrow();
  });
});

describe("tiện ích", () => {
  it("ADMIN_EMAILS tách & viết thường", () => {
    expect([...parseAdminEmails(" A@x.com, b@y.com ;c@z.com ")]).toEqual(["a@x.com", "b@y.com", "c@z.com"]);
    expect(parseAdminEmails(undefined).size).toBe(0);
  });
  it("sha256 ổn định", async () => {
    expect(await sha256("abc")).toBe(await sha256("abc"));
    expect(await sha256("abc")).not.toBe(await sha256("abd"));
  });
});
