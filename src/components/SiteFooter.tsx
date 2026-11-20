import { Link } from "react-router";
import { INSTRUMENTS } from "@shared/instruments";
import { LogoMark } from "@/components/brand/Staff";
import { CREATOR_NAME, CREATOR_URL, FEEDBACK_URL, PUBLIC_URL, STUDIO_URL } from "@/lib/links";
import { cn } from "@/lib/utils";

const FIRST_YEAR = 2026;

function copyrightYears() {
  const year = new Date().getFullYear();
  return year > FIRST_YEAR ? `${FIRST_YEAR}–${year}` : `${FIRST_YEAR}`;
}

const linkClass = "text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline";

/** Copyright, creator and version — the bottom line of every footer */
function LegalBar({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between", className)}>
      <p>
        © {copyrightYears()} Gang Muzik. Bảo lưu mọi quyền. Thiết kế và phát triển bởi{" "}
        <a href={CREATOR_URL} target="_blank" rel="noreferrer" className="font-medium text-foreground underline-offset-4 hover:underline">
          {CREATOR_NAME}
        </a>
        .
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {children}
        <span className="tabular-nums" title="Phiên bản đang chạy">
          Phiên bản {__APP_VERSION__}
        </span>
      </div>
    </div>
  );
}

/** Full footer of the public site: about, instruments, contribute, info + legal bar */
export function SiteFooter() {
  const instruments = INSTRUMENTS.filter((i) => i.id !== "other");
  return (
    <footer className="border-t bg-card/40">
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-6 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-xs">
            <Link to="/" className="inline-flex items-center gap-2 font-display text-lg font-bold">
              <LogoMark className="size-7" /> Gang Muzik
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Thư viện sheet nhạc, cảm âm, hợp âm và tab tự cuộn, tự lật trang. Lật bằng pedal Bluetooth hoặc phím ← → Space để hai tay
              rảnh khi chơi.
            </p>
          </div>

          <FooterColumn title="Nhạc cụ" twoColumns>
            {instruments.map((i) => (
              <li key={i.id}>
                <Link to={`/?instrument=${i.id}`} className={linkClass}>
                  {i.label}
                </Link>
              </li>
            ))}
          </FooterColumn>

          <FooterColumn title="Đóng góp">
            <li>
              <a href={STUDIO_URL} className={linkClass}>
                Gửi bài của bạn
              </a>
            </li>
            <li>
              <a href={STUDIO_URL} className={linkClass}>
                Đăng nhập Studio
              </a>
            </li>
            <li>
              <a href={FEEDBACK_URL} target="_blank" rel="noreferrer" className={linkClass}>
                Báo lỗi và góp ý
              </a>
            </li>
          </FooterColumn>

          <FooterColumn title="Thông tin">
            <li>
              <Link to="/terms" className={linkClass}>
                Điều khoản sử dụng
              </Link>
            </li>
            <li>
              <Link to="/privacy" className={linkClass}>
                Chính sách quyền riêng tư
              </Link>
            </li>
          </FooterColumn>
        </div>

        <LegalBar className="mt-10 border-t pt-6" />
      </div>
    </footer>
  );
}

function FooterColumn({ title, twoColumns, children }: { title: string; twoColumns?: boolean; children: React.ReactNode }) {
  return (
    <nav aria-label={title}>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <ul className={cn("mt-3 grid gap-x-4 gap-y-2 text-sm", twoColumns ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-1")}>{children}</ul>
    </nav>
  );
}

/** Compact footer for Studio: one legal bar with links back to the public site */
export function CompactFooter({ className }: { className?: string }) {
  return (
    <LegalBar className={className}>
      <a href={`${PUBLIC_URL}/terms`} className={linkClass}>
        Điều khoản
      </a>
      <a href={`${PUBLIC_URL}/privacy`} className={linkClass}>
        Quyền riêng tư
      </a>
      <a href={FEEDBACK_URL} target="_blank" rel="noreferrer" className={linkClass}>
        Góp ý
      </a>
    </LegalBar>
  );
}
