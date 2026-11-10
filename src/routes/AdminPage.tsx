import { Link, useNavigate } from "react-router";
import { LibraryBig, LogOut, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoginForm } from "@/components/LoginDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAdmin } from "@/hooks/useAdmin";

/** /admin — cửa vào quản trị */
export function AdminPage() {
  const { isAdmin, logout } = useAdmin();
  const navigate = useNavigate();
  return (
    <div className="flex min-h-full flex-col items-center justify-center p-6">
      <title>Quản trị · Gang Muzik</title>
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <ShieldCheck />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold">Quản trị</h1>
            <p className="text-sm text-muted-foreground">
              {isAdmin ? "Bạn đang đăng nhập quản trị." : "Nhập mã PIN để thêm, sửa, xoá bài."}
            </p>
          </div>
        </div>
        {isAdmin ? (
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link to="/admin/new">
                <Plus /> Thêm bài mới
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">
                <LibraryBig /> Thư viện (bấm ✎ trên mỗi bài để sửa)
              </Link>
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => logout.mutate()}>
              <LogOut /> Đăng xuất
            </Button>
          </div>
        ) : (
          <LoginForm onSuccess={() => navigate("/")} />
        )}
      </div>
      <Link to="/" className="mt-6 text-sm text-muted-foreground hover:text-foreground">
        ← Về thư viện
      </Link>
    </div>
  );
}
