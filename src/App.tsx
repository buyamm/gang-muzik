import { Route, Routes } from "react-router";
import { Library } from "./routes/Library";
import { SongPage } from "./routes/SongPage";
import { NotFound } from "./routes/NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Library />} />
      <Route path="/s/:id" element={<SongPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
