/** địa chỉ Studio (CMS) — nơi đăng nhập Google để đóng góp / quản lý bài */
export const STUDIO_URL =
  typeof location !== "undefined" && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    ? "http://localhost:5174"
    : "https://gang-muzik-studio.lytruong.workers.dev";

/** Site creator, shown in the copyright line of every footer */
export const CREATOR_NAME = "buyamm";
export const CREATOR_URL = "https://github.com/buyamm";
