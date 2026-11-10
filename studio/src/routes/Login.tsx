import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { api } from "@studio/lib/api";
import { useMe } from "@studio/hooks/useMe";

const ERRORS: Record<string, string> = {
  cancelled: "Bạn đã huỷ đăng nhập.",
  state: "Phiên đăng nhập hết hạn, thử lại nhé.",
  token: "Không xác thực được với Google, thử lại nhé.",
  banned: "Tài khoản này đã bị khoá.",
  not_configured: "Studio chưa cấu hình đăng nhập Google.",
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}

export function Login() {
  const { user, data, refresh } = useMe();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [devEmail, setDevEmail] = useState("");
  const error = params.get("error");

  if (user) return <Navigate to="/" replace />;

  const devLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.devLogin(devEmail);
      await refresh();
      navigate("/", { replace: true });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center p-6">
      <title>Đăng nhập · Gang Muzik Studio</title>
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm rounded-2xl border bg-card p-7 text-center shadow-sm">
        <h1 className="font-display text-3xl font-bold">
          Gang <span className="text-primary">Studio</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Đăng sheet nhạc, cảm âm, hợp âm, tab. Bài của bạn sẽ hiện trên thư viện sau khi được duyệt.
        </p>
        {error && <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{ERRORS[error] ?? "Đăng nhập thất bại."}</p>}
        <Button asChild size="lg" variant="outline" className="mt-6 w-full gap-3" disabled={data && !data.googleReady}>
          <a href="/api/auth/google/start">
            <GoogleIcon /> Tiếp tục với Google
          </a>
        </Button>
        {data && !data.googleReady && <p className="mt-2 text-xs text-muted-foreground">(Chưa cấu hình Google Client ID)</p>}

        {data?.devLogin && (
          <form onSubmit={devLogin} className="mt-6 space-y-2 border-t pt-5 text-left">
            <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">Đăng nhập thử (chỉ có khi chạy local)</div>
            <Input type="email" placeholder="email@vi-du.test" value={devEmail} onChange={(e) => setDevEmail(e.target.value)} required />
            <Button type="submit" variant="secondary" className="w-full">
              Đăng nhập thử
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
