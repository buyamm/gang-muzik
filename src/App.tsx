import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router";
import { Library } from "./routes/Library";
import { SongPage } from "./routes/SongPage";
import { NotFound } from "./routes/NotFound";
import { AdminPage } from "./routes/AdminPage";

// trình chỉnh sửa (dnd-kit, nén ảnh) chỉ tải khi admin cần
const SongEditor = lazy(() => import("./routes/SongEditor").then((m) => ({ default: m.SongEditor })));

export default function App() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-muted-foreground">Đang tải…</div>}>
      <Routes>
        <Route path="/" element={<Library />} />
        <Route path="/s/:id" element={<SongPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/new" element={<SongEditor />} />
        <Route path="/admin/songs/:id" element={<SongEditor />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
