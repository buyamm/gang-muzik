import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Center } from "@astryxdesign/core/Center";
import { Divider } from "@astryxdesign/core/Divider";
import { VStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useToast } from "@astryxdesign/core/Toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoMark } from "@/components/brand/Staff";
import { PUBLIC_URL } from "@/lib/links";
import { api } from "@studio/lib/api";
import { useMe } from "@studio/hooks/useMe";

const ERRORS: Record<string, string> = {
  cancelled: "Bạn đã huỷ đăng nhập.",
  state: "Phiên đăng nhập hết hạn, thử lại nhé.",
  token: "Không xác thực được với Google, thử lại nhé.",
  banned: "Tài khoản này đã bị khoá.",
  not_configured: "Studio chưa cấu hình đăng nhập Google.",
};

/** Google brand mark: its colors are fixed by Google's brand rules, not theme tokens */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}

/** Sign-in page (Astryx template "login-card"): Google first, a local-only dev login below a divider. */
export function Login() {
  const { user, data, refresh } = useMe();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [devEmail, setDevEmail] = useState("");
  const [devBusy, setDevBusy] = useState(false);
  const error = params.get("error");
  const showToast = useToast();

  if (user) return <Navigate to="/" replace />;

  const devLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setDevBusy(true);
    try {
      await api.devLogin(devEmail);
      await refresh();
      navigate("/", { replace: true });
    } catch (err) {
      showToast({ body: (err as Error).message, type: "error" });
    } finally {
      setDevBusy(false);
    }
  };

  const googleReady = !data || data.googleReady;

  return (
    <Center role="main" axis="both" padding={6} className="min-h-full bg-background">
      <title>Đăng nhập · Gang Muzik Studio</title>
      <VStack gap={4} hAlign="center" width="100%" maxWidth={400}>
        {/* Logo */}
        <VStack gap={2} hAlign="center">
          <LogoMark className="size-10" />
          <Text type="body" weight="bold" size="lg">
            Gang Muzik Studio
          </Text>
        </VStack>

        {/* Card */}
        <Card padding={8} width="100%">
          <VStack gap={4} hAlign="stretch">
            <VStack gap={1} hAlign="center">
              <Heading level={2} accessibilityLevel={1}>
                Đăng nhập để đóng góp
              </Heading>
              <Text type="body" color="secondary" size="sm" justify="center">
                Đăng sheet nhạc, cảm âm cho mọi nhạc cụ. Bài của bạn hiện trên thư viện sau khi được duyệt.
              </Text>
            </VStack>

            {error && <Banner status="error" title={ERRORS[error] ?? "Đăng nhập thất bại."} />}

            <VStack gap={1}>
              <Button
                href="/api/auth/google/start"
                variant="primary"
                size="lg"
                width="100%"
                label="Tiếp tục với Google"
                icon={<GoogleIcon />}
                isDisabled={!googleReady}
              />
              {!googleReady && (
                <Text type="supporting" color="secondary" justify="center">
                  (Chưa cấu hình Google Client ID)
                </Text>
              )}
            </VStack>

            {data?.devLogin && (
              <>
                <Divider label="Hoặc đăng nhập thử" />
                <form onSubmit={devLogin}>
                  <VStack gap={2}>
                    <TextInput
                      type="email"
                      label="Email"
                      description="Chỉ có khi chạy local, không cần mật khẩu."
                      placeholder="email@vi-du.test"
                      value={devEmail}
                      onChange={setDevEmail}
                      isRequired
                      size="lg"
                      width="100%"
                    />
                    <Button type="submit" variant="secondary" size="lg" width="100%" label="Đăng nhập thử" isLoading={devBusy} />
                  </VStack>
                </form>
              </>
            )}

            <VStack hAlign="center">
              <Text type="supporting" color="secondary">
                Chỉ muốn xem bài?{" "}
                <Link href={PUBLIC_URL} type="supporting">
                  Mở thư viện
                </Link>
              </Text>
            </VStack>
          </VStack>
        </Card>

        {/* Terms */}
        <VStack hAlign="center" width="100%">
          <Text type="supporting" color="secondary" justify="center">
            Khi đăng nhập, bạn đồng ý với{" "}
            <Link href={`${PUBLIC_URL}/terms`} type="supporting">
              Điều khoản
            </Link>{" "}
            và{" "}
            <Link href={`${PUBLIC_URL}/privacy`} type="supporting">
              Chính sách quyền riêng tư
            </Link>
            . Chúng tôi chỉ nhận tên, email và ảnh đại diện Google của bạn.
          </Text>
        </VStack>
        <ThemeToggle />
      </VStack>
    </Center>
  );
}
