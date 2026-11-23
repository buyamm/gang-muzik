import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useToast } from "@astryxdesign/core/Toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CompactFooter } from "@/components/SiteFooter";
import { LogoMark } from "@/components/brand/Staff";
import { api } from "@studio/lib/api";
import { useMe } from "@studio/hooks/useMe";

const PUBLIC_URL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
  ? "http://localhost:5173"
  : "https://gang-muzik.lytruong.workers.dev";

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
  const showToast = useToast();

  if (user) return <Navigate to="/" replace />;

  const devLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.devLogin(devEmail);
      await refresh();
      navigate("/", { replace: true });
    } catch (err) {
      showToast({ body: (err as Error).message, type: "error" });
    }
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center p-6">
      <title>Đăng nhập · Gang Muzik Studio</title>
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <Card padding={8} elevation="med">
          <div className="flex flex-col items-center text-center">
            <LogoMark className="mb-4 size-12" />
            <Heading level={1}>Gang Muzik Studio</Heading>
            <Text color="secondary" as="p">
              <span className="mt-2 block">
                Đăng sheet nhạc, cảm âm cho saxophone, sáo trúc và các nhạc cụ khác. Bài của bạn sẽ hiện trên thư viện sau khi được duyệt.
              </span>
            </Text>
          </div>
          {error && (
            <div className="mt-4">
              <Banner status="error" title={ERRORS[error] ?? "Đăng nhập thất bại."} />
            </div>
          )}
          <div className="mt-6">
            <Button
              href="/api/auth/google/start"
              size="lg"
              width="100%"
              label="Tiếp tục với Google"
              icon={<GoogleIcon />}
              isDisabled={!!data && !data.googleReady}
            />
          </div>
          {data && !data.googleReady && (
            <p className="mt-2 text-center text-xs text-muted-foreground">(Chưa cấu hình Google Client ID)</p>
          )}
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Khi đăng nhập, bạn đồng ý với <Link href={`${PUBLIC_URL}/terms`}>Điều khoản</Link> và{" "}
            <Link href={`${PUBLIC_URL}/privacy`}>Chính sách quyền riêng tư</Link>. Chúng tôi chỉ nhận tên, email và ảnh đại diện Google
            của bạn.
          </p>

          {data?.devLogin && (
            <form onSubmit={devLogin} className="mt-6 space-y-3 border-t border-border pt-5">
              <TextInput
                type="email"
                label="Đăng nhập thử (chỉ có khi chạy local)"
                placeholder="email@vi-du.test"
                value={devEmail}
                onChange={setDevEmail}
                isRequired
                width="100%"
              />
              <Button type="submit" width="100%" label="Đăng nhập thử" />
            </form>
          )}
        </Card>
      </div>
      <CompactFooter className="mt-8 w-full max-w-3xl border-t border-border pt-4" />
    </div>
  );
}
