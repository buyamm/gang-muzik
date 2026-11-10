import { Hono } from "hono";
import type { AppEnv } from "./env";
import { auth } from "./routes/auth";
import { songs, pages } from "./routes/songs";
import { files } from "./routes/files";

const app = new Hono<AppEnv>().basePath("/api");

app.route("/", auth);
app.route("/songs", songs);
app.route("/pages", pages);
app.route("/files", files);

app.notFound((c) => c.json({ error: "Not found" }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Lỗi máy chủ" }, 500);
});

export default app;
