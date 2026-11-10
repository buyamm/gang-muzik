import { Hono } from "hono";
import type { AppEnv } from "./env";
import { songs } from "./routes/songs";
import { files } from "./routes/files";

/** Worker công khai — chỉ đọc. Thêm / sửa / duyệt bài nằm ở Studio (studio/worker). */
const app = new Hono<AppEnv>().basePath("/api");

app.use("*", async (c, next) => {
  if (c.req.method !== "GET" && c.req.method !== "HEAD") return c.json({ error: "Not found" }, 404);
  await next();
});
app.route("/songs", songs);
app.route("/files", files);

app.notFound((c) => c.json({ error: "Not found" }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Lỗi máy chủ" }, 500);
});

export default app;
