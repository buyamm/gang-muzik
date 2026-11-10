import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import type { StudioEnv } from "./env";
import { csrf, loadUser, requireAdmin, requireUser } from "./session";
import { auth } from "./routes/auth";
import { pages, songs } from "./routes/songs";
import { users } from "./routes/users";
import { files } from "./routes/files";

/** Worker Studio (CMS): đăng nhập Google, phân quyền, ghi dữ liệu vào D1/R2 dùng chung với site công khai. */
const app = new Hono<StudioEnv>().basePath("/api");

app.use("*", secureHeaders({ crossOriginResourcePolicy: "same-origin" }));
app.use("*", csrf);
app.use("*", loadUser);

app.route("/", auth);
app.use("/songs/*", requireUser);
app.use("/pages/*", requireUser);
app.use("/files/*", requireUser);
app.use("/users/*", requireAdmin);
app.route("/songs", songs);
app.route("/pages", pages);
app.route("/files", files);
app.route("/users", users);

app.notFound((c) => c.json({ error: "Not found" }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Lỗi máy chủ" }, 500);
});

export default app;
