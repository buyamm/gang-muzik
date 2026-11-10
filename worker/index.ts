import { Hono } from "hono";
import type { AppEnv } from "./env";
import { songs } from "./routes/songs";
import { files } from "./routes/files";
import { seo } from "./seo";

/** Worker công khai — chỉ đọc. Thêm / sửa / duyệt bài nằm ở Studio (studio/worker). */
const api = new Hono<AppEnv>();

api.use("*", async (c, next) => {
  if (c.req.method !== "GET" && c.req.method !== "HEAD") return c.json({ error: "Not found" }, 404);
  await next();
});
api.route("/songs", songs);
api.route("/files", files);
api.notFound((c) => c.json({ error: "Not found" }, 404));

const app = new Hono<AppEnv>();
app.route("/api", api);
// trang HTML có meta SEO + robots.txt + sitemap.xml (các đường dẫn khai báo trong run_worker_first)
app.route("/", seo);
// đường dẫn khác: để SPA tự xử lý
app.notFound((c) => (c.req.path.startsWith("/api/") ? c.json({ error: "Not found" }, 404) : c.env.ASSETS.fetch(c.req.raw)));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Lỗi máy chủ" }, 500);
});

export default app;
