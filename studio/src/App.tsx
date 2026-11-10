import { Navigate, Outlet, Route, Routes } from "react-router";
import { useMe } from "@studio/hooks/useMe";
import { Layout } from "@studio/components/Layout";
import { Login } from "@studio/routes/Login";
import { MySongs } from "@studio/routes/MySongs";
import { SongEditor } from "@studio/routes/SongEditor";
import { Preview } from "@studio/routes/Preview";
import { Review } from "@studio/routes/Review";
import { AllSongs } from "@studio/routes/AllSongs";
import { Users } from "@studio/routes/Users";

function Spinner() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="size-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
    </div>
  );
}

/** chỉ cho vào khi đã đăng nhập (và là admin nếu `admin`) */
function Protected({ admin = false }: { admin?: boolean }) {
  const { user, isAdmin, isPending } = useMe();
  if (isPending) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (admin && !isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected />}>
        <Route path="/songs/:id/preview" element={<Preview />} />
        <Route element={<Layout />}>
          <Route index element={<MySongs />} />
          <Route path="/songs/new" element={<SongEditor />} />
          <Route path="/songs/:id" element={<SongEditor />} />
          <Route element={<Protected admin />}>
            <Route path="/review" element={<Review />} />
            <Route path="/all" element={<AllSongs />} />
            <Route path="/users" element={<Users />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
