import { Route, Routes } from "react-router";
import { Library } from "./routes/Library";
import { SongPage } from "./routes/SongPage";
import { NotFound } from "./routes/NotFound";
import { Privacy, Terms } from "./routes/Legal";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Library />} />
      <Route path="/s/:id" element={<SongPage />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
